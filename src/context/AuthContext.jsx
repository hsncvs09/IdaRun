import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { loadDemoStore, saveDemoStore } from "../lib/demoData";
import { verifyJoinCode as verifyJoinCodeService } from "../lib/dataService";
import { useToast } from "../components/ToastProvider";

const AuthContext = createContext(null);
const DEMO_SESSION_KEY = "idarun_demo_session_v1";
const oauthPromisesByCode = new Map();

function exchangeStravaCodeOnce(code) {
  if (!oauthPromisesByCode.has(code)) {
    const p = (async () => {
      const { data, error } = await supabase.functions.invoke("strava-oauth", {
        body: { action: "exchange", code },
      });
      if (error || data?.error) {
        throw new Error(data?.error || error?.message || "Strava girişi başarısız.");
      }

      const { data: otpData, error: otpErr } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: "magiclink",
      });
      if (otpErr) throw otpErr;
      return otpData;
    })();
    oauthPromisesByCode.set(code, p);
  }
  return oauthPromisesByCode.get(code);
}

export function AuthProvider({ children }) {
  const { showToast } = useToast();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isDemo, setIsDemo] = useState(!isSupabaseConfigured);
  const [loading, setLoading] = useState(true);
  const [oauthProcessing, setOauthProcessing] = useState(false);

  const loadSupabaseProfile = useCallback(async (authUser) => {
    if (!authUser || !supabase) {
      setProfile(null);
      return null;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .single();

    if (error) throw error;
    setProfile(data);
    return data;
  }, []);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const params = new URLSearchParams(window.location.search);
        const stravaCode = params.get("code");

        // 1. Handle Strava OAuth callback (?code=...) before demo fallback
        if (stravaCode && isSupabaseConfigured && supabase) {
          localStorage.removeItem(DEMO_SESSION_KEY);
          setOauthProcessing(true);

          const otpData = await exchangeStravaCodeOnce(stravaCode);
          window.history.replaceState({}, document.title, window.location.pathname);

          if (mounted && otpData?.user) {
            setIsDemo(false);
            setUser(otpData.user);
            await loadSupabaseProfile(otpData.user);
            showToast("Strava hesabınız bağlandı.", "success");
          }
          return;
        }

        // 2. Check demo session
        const savedDemo = localStorage.getItem(DEMO_SESSION_KEY);
        if (savedDemo) {
          const parsed = JSON.parse(savedDemo);
          const store = loadDemoStore();
          const matchedProfile = store.profiles.find((p) => p.id === parsed.userId);
          if (matchedProfile && mounted) {
            setIsDemo(true);
            setUser({ id: matchedProfile.id, email: "demo@idarun.local" });
            setProfile({ ...matchedProfile, is_verified: parsed.isVerified ?? matchedProfile.is_verified });
            setLoading(false);
            return;
          }
        }

        // 3. Check existing Supabase session
        if (isSupabaseConfigured && supabase) {
          const { data: sessionData } = await supabase.auth.getSession();
          const currentUser = sessionData?.session?.user || null;
          if (mounted && currentUser) {
            setIsDemo(false);
            setUser(currentUser);
            await loadSupabaseProfile(currentUser);
          }
        }
      } catch (err) {
        if (mounted) {
          showToast(err.message || "Oturum başlatılırken bir hata oluştu.", "error");
        }
      } finally {
        if (mounted) {
          setOauthProcessing(false);
          setLoading(false);
        }
      }
    }

    bootstrap();

    if (isSupabaseConfigured && supabase) {
      const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (!mounted) return;
        const authUser = session?.user || null;
        if (authUser) {
          setIsDemo(false);
          setUser(authUser);
          try {
            await loadSupabaseProfile(authUser);
          } catch {
            // handled on login flow
          }
        } else if (!localStorage.getItem(DEMO_SESSION_KEY)) {
          setUser(null);
          setProfile(null);
        }
      });
      return () => {
        mounted = false;
        listener.subscription.unsubscribe();
      };
    }

    return () => {
      mounted = false;
    };
  }, [loadSupabaseProfile, showToast]);

  const loginAsDemo = useCallback(
    (role = "member", requireJoinCode = false) => {
      const store = loadDemoStore();
      const targetId = role === "admin" ? "demo-admin-1" : "demo-member-1";
      const found = store.profiles.find((p) => p.id === targetId) || store.profiles[0];
      const verified = requireJoinCode ? false : true;

      if (!verified) {
        found.is_verified = false;
        saveDemoStore(store);
      } else {
        found.is_verified = true;
        saveDemoStore(store);
      }

      localStorage.setItem(
        DEMO_SESSION_KEY,
        JSON.stringify({ userId: found.id, isVerified: verified })
      );
      setIsDemo(true);
      setUser({ id: found.id, email: "demo@idarun.local" });
      setProfile({ ...found });
      showToast(
        role === "admin"
          ? "Demo Yönetici (Admin) hesabı ile giriş yapıldı."
          : "Demo Üye hesabı ile giriş yapıldı.",
        "success"
      );
    },
    [showToast]
  );

  const verifyJoinCode = useCallback(
    async (code) => {
      if (!user) throw new Error("Önce giriş yapmalısınız.");
      const updated = await verifyJoinCodeService(code, user.id, isDemo);
      if (isDemo) {
        localStorage.setItem(
          DEMO_SESSION_KEY,
          JSON.stringify({ userId: user.id, isVerified: true })
        );
      }
      setProfile((prev) => ({ ...prev, ...updated, is_verified: true }));
      showToast("Katılım kodu doğrulandı. IdaRun'a hoş geldin!", "success");
      return updated;
    },
    [user, isDemo, showToast]
  );

  const logout = useCallback(async () => {
    localStorage.removeItem(DEMO_SESSION_KEY);
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    showToast("Oturum kapatıldı.", "info");
  }, [showToast]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isDemo,
        loading,
        oauthProcessing,
        loginAsDemo,
        verifyJoinCode,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
