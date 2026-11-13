import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";
import { corsHeaders } from "../_shared/cors.ts";

interface ScheduleWindow {
  id: string;
  day: number;
  label: string;
  start: string;
  end: string;
  enabled?: boolean;
}

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function parseMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function isInSchedule(isoDate: string, schedule: ScheduleWindow[], timeZone: string): boolean {
  const date = new Date(isoDate);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const weekdayStr = parts.find((p) => p.type === "weekday")?.value || "";
  const hourStr = parts.find((p) => p.type === "hour")?.value || "0";
  const minuteStr = parts.find((p) => p.type === "minute")?.value || "0";
  const day = WEEKDAY_MAP[weekdayStr];
  const minutes = (Number(hourStr) % 24) * 60 + Number(minuteStr);

  return schedule.some((win) => {
    if (win.enabled === false) return false;
    if (Number(win.day) !== day) return false;
    const startMin = parseMinutes(win.start);
    const endMin = parseMinutes(win.end);
    return minutes >= startMin && minutes <= endMin;
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const stravaClientId = Deno.env.get("STRAVA_CLIENT_ID")!;
    const stravaClientSecret = Deno.env.get("STRAVA_CLIENT_SECRET")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Yetkilendirme başlığı eksik." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Oturum geçersiz." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_verified")
      .eq("id", user.id)
      .single();

    if (!profile?.is_verified) {
      return new Response(JSON.stringify({ error: "Önce grup katılım kodunu doğrulamalısınız." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tokenRow, error: tokenErr } = await supabaseAdmin
      .from("strava_tokens")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (tokenErr || !tokenRow) {
      return new Response(JSON.stringify({ error: "Strava token kaydı bulunamadı. Tekrar giriş yapın." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken = tokenRow.access_token;
    const nowEpoch = Math.floor(Date.now() / 1000);

    if (Number(tokenRow.expires_at) <= nowEpoch + 300) {
      const refreshRes = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: stravaClientId,
          client_secret: stravaClientSecret,
          grant_type: "refresh_token",
          refresh_token: tokenRow.refresh_token,
        }),
      });
      const refreshData = await refreshRes.json();
      if (!refreshRes.ok || !refreshData.access_token) {
        return new Response(JSON.stringify({ error: "Strava oturumu yenilenemedi." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      accessToken = refreshData.access_token;
      await supabaseAdmin
        .from("strava_tokens")
        .update({
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token,
          expires_at: refreshData.expires_at,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
    }

    const { data: settings, error: settingsErr } = await supabaseAdmin
      .from("group_settings")
      .select("*")
      .eq("id", 1)
      .single();
    if (settingsErr) throw settingsErr;

    const afterEpoch = Math.floor(new Date(settings.challenge_start_date).getTime() / 1000);
    const activitiesRes = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${afterEpoch}&per_page=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const rawActivities = await activitiesRes.json();
    if (!activitiesRes.ok || !Array.isArray(rawActivities)) {
      return new Response(JSON.stringify({ error: "Strava aktiviteleri alınamadı." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allowedTypes = new Set(["Run", "TrailRun"]);
    const schedule = (settings.run_schedule || []) as ScheduleWindow[];
    const timeZone = settings.timezone || "Europe/Istanbul";

    const qualifying = [];
    let filteredOutCount = 0;
    let nonRunCount = 0;

    for (const act of rawActivities) {
      const actType = act.sport_type || act.type;
      if (!allowedTypes.has(actType)) {
        nonRunCount++;
        continue;
      }

      if (settings.enforce_schedule && !isInSchedule(act.start_date, schedule, timeZone)) {
        filteredOutCount++;
        continue;
      }

      qualifying.push({
        user_id: user.id,
        strava_activity_id: Number(act.id),
        name: act.name || "Grup Koşusu",
        distance_meters: Number(act.distance || 0),
        moving_time_seconds: Number(act.moving_time || 0),
        elapsed_time_seconds: Number(act.elapsed_time || act.moving_time || 0),
        total_elevation_gain: Number(act.total_elevation_gain || 0),
        average_speed: Number(act.average_speed || 0),
        activity_type: actType,
        start_date: act.start_date,
        start_date_local: act.start_date_local || act.start_date,
      });
    }

    if (qualifying.length > 0) {
      const { error: upsertErr } = await supabaseAdmin
        .from("activities")
        .upsert(qualifying, { onConflict: "strava_activity_id", ignoreDuplicates: false });
      if (upsertErr) throw upsertErr;
    }

    return new Response(
      JSON.stringify({
        syncedCount: qualifying.length,
        filteredOutCount,
        nonRunCount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message || "Senkronizasyon hatası." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
