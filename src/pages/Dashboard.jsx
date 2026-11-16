import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Flame, Mountain, Users, Loader2, RefreshCw } from "lucide-react";
import Navbar from "../components/Navbar";
import MapTracker from "../components/MapTracker";
import Leaderboard from "../components/Leaderboard";
import PwaInstallPrompt from "../components/PwaInstallPrompt";
import { PoweredByStravaBadge } from "../components/StravaBranding";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/ToastProvider";
import { fetchDashboardBundle, syncStravaActivities } from "../lib/dataService";
import { DAY_NAMES_TR, formatSyncTimestamp } from "../lib/routeMath";

export default function Dashboard() {
  const { user, profile, isDemo } = useAuth();
  const { showToast } = useToast();

  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchDashboardBundle(isDemo);
      setBundle(data);
    } catch (err) {
      showToast(err.message || "Veriler yüklenirken hata oluştu.", "error");
    } finally {
      setLoading(false);
    }
  }, [isDemo, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      const res = await syncStravaActivities(user.id, isDemo);
      await loadData();
      showToast(
        `${res.syncedCount} koşu senkronize edildi` +
          (res.filteredOutCount > 0
            ? ` (${res.filteredOutCount} koşu grup saati dışında olduğu için filtrelendi).`
            : "."),
        res.syncedCount > 0 ? "success" : "info"
      );
    } catch (err) {
      showToast(err.message || "Strava senkronizasyonu başarısız.", "error");
    } finally {
      setSyncing(false);
    }
  };

  const stats = useMemo(() => {
    if (!bundle) return { totalKm: 0, totalElevation: 0, validRuns: 0, activeRunners: 0 };
    const valid = bundle.activities.filter((a) => a.is_valid !== false);
    const totalMeters = valid.reduce((sum, a) => sum + Number(a.distance_meters || 0), 0);
    const totalElevation = valid.reduce((sum, a) => sum + Number(a.total_elevation_gain || 0), 0);
    const activeRunners = new Set(valid.map((a) => a.user_id)).size;
    return {
      totalKm: totalMeters / 1000,
      totalElevation,
      validRuns: valid.length,
      activeRunners,
    };
  }, [bundle]);

  if (loading) {
    return (
      <div className="min-h-screen bg-obsidian-900">
        <Navbar />
        <div className="flex h-[60vh] items-center justify-center gap-3 text-sand-300">
          <Loader2 className="h-6 w-6 animate-spin text-ember-400" />
          <span>IdaRun verileri yükleniyor...</span>
        </div>
      </div>
    );
  }

  const settings = bundle?.settings;
  const activeSchedule = (settings?.run_schedule || []).filter((w) => w.enabled !== false);
  const lastSyncFormatted = formatSyncTimestamp(
    settings?.last_sync_at || settings?.last_batch_sync_at
  );

  return (
    <div className="min-h-screen bg-obsidian-900 pb-24 md:pb-10">
      <Navbar onSync={handleSync} syncing={syncing} />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-5 space-y-6">
        <PwaInstallPrompt />

        {/* Group Challenge Summary Header */}
        <section className="rounded-2xl border border-obsidian-700 bg-obsidian-800 p-5 sm:p-6 shadow-xl space-y-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-ember-400">
                Kolektif Hedef
              </span>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-sand-100 mt-0.5">
                {settings?.challenge_title || "Akçay'dan Tokyo'ya Kolektif Koşu"}
              </h1>
              <p
                data-testid="last-sync-indicator"
                className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-sand-400"
              >
                <RefreshCw className="h-3 w-3 text-sand-500" />
                <span>
                  Son senkronizasyon:{" "}
                  <span className="font-mono text-sand-300">
                    {lastSyncFormatted || "Henüz yapılmadı"}
                  </span>
                </span>
              </p>
            </div>

            {activeSchedule.length > 0 && (
              <div
                data-testid="group-schedule-container"
                className="flex flex-col gap-2 md:items-end"
              >
                <span className="inline-flex items-center gap-1.5 text-xs text-sand-400">
                  <CalendarClock className="h-3.5 w-3.5 text-pine-400" />
                  Grup Takvimi:
                </span>
                <div
                  data-testid="group-schedule-pills"
                  className="flex flex-wrap items-center gap-2 md:justify-end"
                >
                  {activeSchedule.map((win) => (
                    <span
                      key={win.id}
                      className="rounded-lg border border-obsidian-600 bg-obsidian-900 px-2.5 py-1 font-mono text-[11px] text-sand-200 whitespace-nowrap"
                    >
                      {DAY_NAMES_TR[win.day]} {win.start}–{win.end}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-obsidian-700 bg-obsidian-900/70 p-4">
              <div className="flex items-center justify-between text-sand-400 text-xs mb-1">
                <span>Toplam Mesafe</span>
                <Flame className="h-4 w-4 text-ember-400" />
              </div>
              <p className="font-mono text-xl sm:text-2xl font-bold text-sand-100 tabular-nums">
                {stats.totalKm.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} km
              </p>
            </div>

            <div className="rounded-xl border border-obsidian-700 bg-obsidian-900/70 p-4">
              <div className="flex items-center justify-between text-sand-400 text-xs mb-1">
                <span>Toplam İrtifa</span>
                <Mountain className="h-4 w-4 text-pine-400" />
              </div>
              <p className="font-mono text-xl sm:text-2xl font-bold text-sand-100 tabular-nums">
                {Math.round(stats.totalElevation).toLocaleString("tr-TR")} m
              </p>
            </div>

            <div className="rounded-xl border border-obsidian-700 bg-obsidian-900/70 p-4">
              <div className="flex items-center justify-between text-sand-400 text-xs mb-1">
                <span>Geçerli Koşu</span>
                <CalendarClock className="h-4 w-4 text-ember-400" />
              </div>
              <p className="font-mono text-xl sm:text-2xl font-bold text-sand-100 tabular-nums">
                {stats.validRuns}
              </p>
            </div>

            <div className="rounded-xl border border-obsidian-700 bg-obsidian-900/70 p-4">
              <div className="flex items-center justify-between text-sand-400 text-xs mb-1">
                <span>Aktif Koşucu</span>
                <Users className="h-4 w-4 text-pine-400" />
              </div>
              <p className="font-mono text-xl sm:text-2xl font-bold text-sand-100 tabular-nums">
                {stats.activeRunners} / {bundle?.profiles?.length || 0}
              </p>
            </div>
          </div>
        </section>

        {/* Interactive Akçay -> Tokyo Map */}
        <MapTracker
          checkpoints={bundle?.checkpoints || []}
          totalGroupKm={stats.totalKm}
          targetDistanceKm={settings?.target_distance_km || 9500}
        />

        {/* Leaderboard */}
        <Leaderboard
          profiles={bundle?.profiles || []}
          activities={bundle?.activities || []}
          currentUserId={profile?.id || user?.id}
        />

        <footer className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left text-xs text-sand-500">
          <span>
            IdaRun · Kulüp içi ortak koşu hedefi takibi. Strava verileri üye açık rızasıyla senkronize edilir.
          </span>
          <PoweredByStravaBadge />
        </footer>
      </main>
    </div>
  );
}
