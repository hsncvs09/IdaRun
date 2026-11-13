import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";
import { corsHeaders } from "../_shared/cors.ts";

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

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json();
    const action = body?.action;

    if (action === "exchange") {
      const code = body?.code;
      if (!code) {
        return new Response(JSON.stringify({ error: "Strava yetki kodu eksik." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tokenRes = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: stravaClientId,
          client_secret: stravaClientSecret,
          code,
          grant_type: "authorization_code",
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.athlete) {
        return new Response(
          JSON.stringify({ error: tokenData?.message || "Strava token değişimi başarısız oldu." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const athlete = tokenData.athlete;
      const athleteId = Number(athlete.id);
      const fullName = [athlete.firstname, athlete.lastname].filter(Boolean).join(" ").trim() || `Koşucu #${athleteId}`;
      const avatarUrl = athlete.profile || athlete.profile_medium || null;
      const syntheticEmail = `strava_${athleteId}@idarun.local`;

      // Check existing profile
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("strava_athlete_id", athleteId)
        .maybeSingle();

      let userId = existingProfile?.id;

      if (!userId) {
        const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: syntheticEmail,
          email_confirm: true,
          user_metadata: {
            strava_athlete_id: athleteId,
            full_name: fullName,
            avatar_url: avatarUrl,
          },
        });

        if (createError && !createError.message.toLowerCase().includes("already")) {
          throw createError;
        }

        if (createdUser?.user?.id) {
          userId = createdUser.user.id;
        } else {
          const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers();
          const matched = usersPage?.users?.find((u) => u.email === syntheticEmail);
          if (!matched) throw new Error("Kullanıcı hesabı eşleştirilemedi.");
          userId = matched.id;
        }

        const { error: upsertProfileErr } = await supabaseAdmin.from("profiles").upsert({
          id: userId,
          strava_athlete_id: athleteId,
          full_name: fullName,
          avatar_url: avatarUrl,
          role: "member",
          is_verified: false,
        });
        if (upsertProfileErr) throw upsertProfileErr;
      } else {
        await supabaseAdmin
          .from("profiles")
          .update({ full_name: fullName, avatar_url: avatarUrl })
          .eq("id", userId);
      }

      const { error: tokenErr } = await supabaseAdmin.from("strava_tokens").upsert({
        user_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: tokenData.expires_at,
        updated_at: new Date().toISOString(),
      });
      if (tokenErr) throw tokenErr;

      // Issue magic link token for client session verification
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: syntheticEmail,
      });
      if (linkError) throw linkError;

      return new Response(
        JSON.stringify({
          token_hash: linkData.properties?.hashed_token,
          email: syntheticEmail,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify_join_code") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Yetkisiz istek." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabaseUser = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
      if (userErr || !user) {
        return new Response(JSON.stringify({ error: "Oturum doğrulanamadı." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const inputCode = String(body?.joinCode || "").trim().toUpperCase();
      const { data: settings, error: settingsErr } = await supabaseAdmin
        .from("group_settings")
        .select("join_code")
        .eq("id", 1)
        .single();
      if (settingsErr) throw settingsErr;

      if (!inputCode || inputCode !== String(settings.join_code).trim().toUpperCase()) {
        return new Response(JSON.stringify({ error: "Katılım kodu hatalı. Lütfen grup yöneticisinden doğru kodu alın." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: updatedProfile, error: updateErr } = await supabaseAdmin
        .from("profiles")
        .update({ is_verified: true })
        .eq("id", user.id)
        .select("*")
        .single();
      if (updateErr) throw updateErr;

      return new Response(JSON.stringify({ profile: updatedProfile }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Geçersiz işlem." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message || "Beklenmeyen sunucu hatası." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
