import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";
import { corsHeaders } from "../_shared/cors.ts";
import { SyncHttpError, syncUserStravaActivities } from "../_shared/syncHelpers.ts";

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

    const { data: settings, error: settingsErr } = await supabaseAdmin
      .from("group_settings")
      .select("*")
      .eq("id", 1)
      .single();
    if (settingsErr) throw settingsErr;

    const result = await syncUserStravaActivities(
      supabaseAdmin,
      user.id,
      settings,
      stravaClientId,
      stravaClientSecret
    );

    const lastSyncAt = new Date().toISOString();
    await supabaseAdmin
      .from("group_settings")
      .update({ last_sync_at: lastSyncAt })
      .eq("id", 1);

    return new Response(
      JSON.stringify({
        ...result,
        lastSyncAt,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const status = err instanceof SyncHttpError ? err.status : 500;
    return new Response(JSON.stringify({ error: err?.message || "Senkronizasyon hatası." }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
