import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";
import { corsHeaders } from "../_shared/cors.ts";
import {
  evaluateScheduledSyncDue,
  syncUserStravaActivities,
} from "../_shared/syncHelpers.ts";

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
    const cronSecret = (Deno.env.get("CRON_SECRET") || "").trim();

    let body: { trigger?: string } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const headerCronSecret = (req.headers.get("x-cron-secret") || "").trim();
    const authHeader = req.headers.get("Authorization") || "";
    const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();

    const isCronAuthorized =
      Boolean(cronSecret) &&
      (headerCronSecret === cronSecret || bearerToken === cronSecret);
    const isServiceRoleAuthorized = Boolean(serviceRoleKey) && bearerToken === serviceRoleKey;

    let trigger: "manual" | "scheduled" =
      body?.trigger === "manual" ? "manual" : "scheduled";

    if (!isCronAuthorized && !isServiceRoleAuthorized) {
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

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        return new Response(
          JSON.stringify({ error: "Toplu senkronizasyon için yönetici yetkisi gerekiyor." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!body?.trigger) {
        trigger = "manual";
      }
    }

    const { data: settings, error: settingsErr } = await supabaseAdmin
      .from("group_settings")
      .select("*")
      .eq("id", 1)
      .single();
    if (settingsErr) throw settingsErr;

    const now = new Date();

    if (trigger === "scheduled") {
      const decision = evaluateScheduledSyncDue(settings, now);
      if (!decision.shouldRun) {
        return new Response(
          JSON.stringify({
            skipped: true,
            reason: decision.reason,
            targetSyncAt: decision.targetSyncAt || null,
            lastBatchSyncAt: settings.last_batch_sync_at || null,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Yalnızca doğrulanmış üyelerin Strava token kayıtlarını al
    const { data: verifiedProfiles, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .eq("is_verified", true);
    if (profErr) throw profErr;

    const { data: tokens, error: tokErr } = await supabaseAdmin
      .from("strava_tokens")
      .select("user_id");
    if (tokErr) throw tokErr;

    const tokenUserSet = new Set((tokens || []).map((t) => t.user_id));
    const eligibleProfiles = (verifiedProfiles || []).filter((p) => tokenUserSet.has(p.id));

    let syncedUsers = 0;
    let syncedCount = 0;
    let filteredOutCount = 0;
    let nonRunCount = 0;
    const failedUsers: Array<{ userId: string; fullName: string; error: string }> = [];

    for (const member of eligibleProfiles) {
      try {
        const res = await syncUserStravaActivities(
          supabaseAdmin,
          member.id,
          settings,
          stravaClientId,
          stravaClientSecret
        );
        syncedUsers++;
        syncedCount += res.syncedCount;
        filteredOutCount += res.filteredOutCount;
        nonRunCount += res.nonRunCount;
      } catch (err) {
        failedUsers.push({
          userId: member.id,
          fullName: member.full_name,
          error: err?.message || "Senkronizasyon hatası",
        });
      }
    }

    const ranAt = new Date().toISOString();
    const summary = {
      trigger,
      totalUsers: eligibleProfiles.length,
      syncedUsers,
      syncedCount,
      filteredOutCount,
      nonRunCount,
      failedCount: failedUsers.length,
      failedUsers: failedUsers.slice(0, 10),
      ranAt,
    };

    const { error: updateErr } = await supabaseAdmin
      .from("group_settings")
      .update({
        last_sync_at: ranAt,
        last_batch_sync_at: ranAt,
        last_batch_sync_summary: summary,
      })
      .eq("id", 1);
    if (updateErr) throw updateErr;

    return new Response(
      JSON.stringify({
        skipped: false,
        ...summary,
        lastSyncAt: ranAt,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err?.message || "Toplu senkronizasyon hatası." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
