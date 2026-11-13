import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Gauge, Mountain, Route, Loader2, CheckCircle2, Ban } from "lucide-react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/ToastProvider";
import { fetchDashboardBundle, syncStravaActivities } from "../lib/dataService";
import { formatDuration, formatPace } from "../lib/routeMath";

export default function Profile() {
  const { user, profile, isDemo } = useAuth();
  const { showToast } = useToast();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const loadActivities = useCallback(async () => {
    try {
      const bundle = await fetchDashboardBundle(isDemo);
      const mine = bundle.activities.filter((a) => a.user_id === (profile?.id || user?.id));
      setActivities(mine);
    } catch (err) {
      showToast(err.message || "Profil verileri yüklenemedi.", "error");
    } finally {
      setLoading(false);
    }
  }, [isDemo, profile?.id, user?.id, showToast]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      const res = await syncStravaActivities(user.id, isDemo);
      await loadActivities();
      showToast(`${res.syncedCount} koşu senkronize edildi.`, "success");
    } catch (err) {
      showToast(err.message || "Senkronizasyon hatası.", "error");
    } finally {
      setSyncing(false);
    }
  };

  const summary = useMemo(() => {
    const valid = activities.filter((a) => a.is_valid !== false);
    const meters = valid.reduce((s, a) => s + Number(a.distance_meters || 0), 0);
    const elev = valid.reduce((s, a) => s + Number(a.total_elevation_gain || 0), 0);
    const seconds = valid.reduce((s, a) => s + Number(a.moving_time_seconds || 0), 0);
    return {
      km: meters / 1000,
      elev,
      count: valid.length,
      avgPace: formatPace(seconds, meters),
    };
  }, [activities]);

  return (
    <div className="min-h-screen bg-obsidian-900 pb-24 md:pb-10">
      <Navbar onSync={handleSync} syncing={syncing} />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 pt-6 space-y-6">
        {/* Profile Banner */}
        <section className="rounded-2xl border border-obsidian-700 bg-obsidian-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="h-16 w-16 rounded-2xl object-cover border border-obsidian-600"
              />
            ) : (
              <div className="h-16 w-16 rounded-2xl bg-ember-500/15 border border-ember-500/30 flex items-center justify-center font-display text-xl font-extrabold text-ember-400">
                {(profile?.full_name || "IR")
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-extrabold text-sand-100">
                  {profile?.full_name || "IdaRun Koşucusu"}
                </h1>
                <span className="rounded-md bg-pine-500/15 border border-pine-500/30 px-2 py-0.5 text-[11px] font-semibold text-pine-400">
                  {profile?.role === "admin" ? "Yönetici" : "Onaylı Üye"}
                </span>
              </div>
              <p className="text-xs text-sand-400 font-mono mt-1">
                Strava Sporcu ID: #{profile?.strava_athlete_id || "—"}
              </p>
            </div>
          </div>
        </section>

        {/* Personal KPIs */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-obsidian-700 bg-obsidian-800 p-4">
            <div className="flex items-center justify-between text-xs text-sand-400 mb-1">
              <span>Katkım</span>
              <Route className="h-4 w-4 text-ember-400" />
            </div>
            <p className="font-mono text-xl font-bold text-sand-100 tabular-nums">
              {summary.km.toFixed(1)} km
            </p>
          </div>
          <div className="rounded-xl border border-obsidian-700 bg-obsidian-800 p-4">
            <div className="flex items-center justify-between text-xs text-sand-400 mb-1">
              <span>İrtifa</span>
              <Mountain className="h-4 w-4 text-pine-400" />
            </div>
            <p className="font-mono text-xl font-bold text-sand-100 tabular-nums">
              {Math.round(summary.elev)} m
            </p>
          </div>
          <div className="rounded-xl border border-obsidian-700 bg-obsidian-800 p-4">
            <div className="flex items-center justify-between text-xs text-sand-400 mb-1">
              <span>Ortalama Pace</span>
              <Gauge className="h-4 w-4 text-ember-400" />
            </div>
            <p className="font-mono text-xl font-bold text-sand-100 tabular-nums">
              {summary.avgPace} /km
            </p>
          </div>
          <div className="rounded-xl border border-obsidian-700 bg-obsidian-800 p-4">
            <div className="flex items-center justify-between text-xs text-sand-400 mb-1">
              <span>Koşu Adedi</span>
              <Activity className="h-4 w-4 text-pine-400" />
            </div>
            <p className="font-mono text-xl font-bold text-sand-100 tabular-nums">
              {summary.count}
            </p>
          </div>
        </section>

        {/* Personal Activities */}
        <section className="rounded-2xl border border-obsidian-700 bg-obsidian-800 overflow-hidden">
          <div className="border-b border-obsidian-700 px-5 py-4">
            <h2 className="font-display text-lg font-bold text-sand-100">
              Koşu Geçmişim
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-sand-400">
              <Loader2 className="h-5 w-5 animate-spin text-ember-400" />
              <span>Yükleniyor...</span>
            </div>
          ) : activities.length === 0 ? (
            <div className="p-8 text-center text-sm text-sand-400">
              Henüz senkronize edilmiş koşun bulunmuyor. Sağ üstten &ldquo;Strava Senkronize Et&rdquo;
              butonunu kullanabilirsin.
            </div>
          ) : (
            <div className="divide-y divide-obsidian-700/70">
              {activities.map((act) => (
                <div
                  key={act.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-sand-100">{act.name}</span>
                      <span className="rounded bg-obsidian-700 px-1.5 py-0.5 font-mono text-[10px] text-sand-300">
                        {act.activity_type}
                      </span>
                      {act.is_valid === false ? (
                        <span className="inline-flex items-center gap-1 rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-400">
                          <Ban className="h-3 w-3" /> Geçersiz
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-pine-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-pine-400">
                          <CheckCircle2 className="h-3 w-3" /> Onaylı
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-sand-400 mt-1">
                      {new Date(act.start_date).toLocaleString("tr-TR")}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 font-mono text-xs sm:text-sm tabular-nums">
                    <span className="font-bold text-ember-400">
                      {(act.distance_meters / 1000).toFixed(2)} km
                    </span>
                    <span className="text-sand-300">
                      {formatPace(act.moving_time_seconds, act.distance_meters)} /km
                    </span>
                    <span className="text-sand-400">
                      {formatDuration(act.moving_time_seconds)}
                    </span>
                    <span className="text-pine-400">+{Math.round(act.total_elevation_gain)} m</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
