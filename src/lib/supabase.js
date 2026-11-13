import { createClient } from "@supabase/supabase-js";

const rawSupabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, "");
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes("your-project-id") &&
    !supabaseAnonKey.includes("your-supabase-anon-key")
);

export const stravaClientId = import.meta.env.VITE_STRAVA_CLIENT_ID || "";
export const isStravaConfigured = Boolean(
  stravaClientId && !stravaClientId.includes("your-strava-client-id")
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function buildStravaAuthUrl() {
  const redirectUri =
    import.meta.env.VITE_STRAVA_REDIRECT_URI || `${window.location.origin}/login`;
  const params = new URLSearchParams({
    client_id: stravaClientId,
    response_type: "code",
    redirect_uri: redirectUri,
    approval_prompt: "auto",
    scope: "read,activity:read_all",
  });
  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}
