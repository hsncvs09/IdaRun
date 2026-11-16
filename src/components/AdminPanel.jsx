import React, { useEffect, useState } from "react";
import {
  Settings,
  Clock,
  MapPin,
  Activity,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  CheckCircle,
  Ban,
  Edit3,
  RefreshCw,
  Loader2,
} from "lucide-react";
import {
  DAY_NAMES_TR,
  computeScheduledSyncPreview,
  formatDuration,
  formatPace,
  formatSyncTimestamp,
} from "../lib/routeMath";
import {
  updateGroupSettings,
  saveCheckpoint,
  deleteCheckpoint,
  toggleActivityValidity,
  deleteActivity,
  triggerBatchSync,
} from "../lib/dataService";
import { resetDemoStore } from "../lib/demoData";
import { useToast } from "./ToastProvider";
import { PoweredByStravaBadge, ViewOnStravaLink } from "./StravaBranding";

const TABS = [
  { id: "settings", label: "Genel & Katılım Kodu", icon: Settings },
  { id: "schedule", label: "Koşu Takvimi", icon: Clock },
  { id: "checkpoints", label: "Rota Durakları", icon: MapPin },
  { id: "activities", label: "Aktivite Denetimi", icon: Activity },
];

const EMPTY_CHECKPOINT = {
  id: null,
  order_index: 1,
  name: "",
  country: "",
  description: "",
  target_km: 0,
  lat: 39.5858,
  lng: 26.9242,
};

export default function AdminPanel({
  settings,
  checkpoints = [],
  activities = [],
  profiles = [],
  isDemo,
  onRefresh,
}) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("settings");
  const [saving, setSaving] = useState(false);
  const [batchSyncing, setBatchSyncing] = useState(false);

  // Settings form state
  const [challengeTitle, setChallengeTitle] = useState(settings?.challenge_title || "");
  const [targetKm, setTargetKm] = useState(settings?.target_distance_km || 9500);
  const [joinCode, setJoinCode] = useState(settings?.join_code || "IDARUN2026");
  const [startDate, setStartDate] = useState(
    settings?.challenge_start_date ? settings.challenge_start_date.slice(0, 10) : "2026-01-01"
  );

  // Schedule state
  const [enforceSchedule, setEnforceSchedule] = useState(settings?.enforce_schedule ?? true);
  const [scheduleList, setScheduleList] = useState(settings?.run_schedule || []);
  const [newWin, setNewWin] = useState({ day: 6, label: "Cumartesi Sabah", start: "08:00", end: "10:30" });

  // Auto batch sync schedule state
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(settings?.auto_sync_enabled ?? true);
  const [autoSyncMode, setAutoSyncMode] = useState(settings?.auto_sync_mode || "after_schedule");
  const [autoSyncDelayMinutes, setAutoSyncDelayMinutes] = useState(
    settings?.auto_sync_delay_minutes ?? 60
  );
  const [autoSyncTime, setAutoSyncTime] = useState(settings?.auto_sync_time || "22:30");

  useEffect(() => {
    setEnforceSchedule(settings?.enforce_schedule ?? true);
    setScheduleList(settings?.run_schedule || []);
    setAutoSyncEnabled(settings?.auto_sync_enabled ?? true);
    setAutoSyncMode(settings?.auto_sync_mode || "after_schedule");
    setAutoSyncDelayMinutes(settings?.auto_sync_delay_minutes ?? 60);
    setAutoSyncTime(settings?.auto_sync_time || "22:30");
  }, [settings]);

  // Checkpoint form state
  const [cpForm, setCpForm] = useState({
    ...EMPTY_CHECKPOINT,
    order_index: checkpoints.length + 1,
  });

  useEffect(() => {
    setCpForm((prev) =>
      prev.id ? prev : { ...prev, order_index: checkpoints.length + 1 }
    );
  }, [checkpoints.length]);

  // Activity filter
  const [activitySearch, setActivitySearch] = useState("");

  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateGroupSettings(
        {
          challenge_title: challengeTitle.trim(),
          target_distance_km: Number(targetKm),
          join_code: joinCode.trim().toUpperCase(),
          challenge_start_date: `${startDate}T00:00:00+03:00`,
        },
        isDemo
      );
      await onRefresh();
      showToast("Grup ayarları ve katılım kodu güncellendi.", "success");
    } catch (err) {
      showToast(err.message || "Ayarlar kaydedilemedi.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSchedule = async () => {
    try {
      setSaving(true);
      await updateGroupSettings(
        {
          enforce_schedule: enforceSchedule,
          run_schedule: scheduleList,
        },
        isDemo
      );
      await onRefresh();
      showToast("Koşu gün ve saat takvimi güncellendi.", "success");
    } catch (err) {
      showToast(err.message || "Takvim kaydedilemedi.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAutoSync = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const clampedDelay = Math.max(0, Math.min(720, Number(autoSyncDelayMinutes) || 0));
      await updateGroupSettings(
        {
          auto_sync_enabled: autoSyncEnabled,
          auto_sync_mode: autoSyncMode,
          auto_sync_delay_minutes: clampedDelay,
          auto_sync_time: autoSyncTime || "22:30",
        },
        isDemo
      );
      await onRefresh();
      showToast("Otomatik toplu senkronizasyon parametreleri kaydedildi.", "success");
    } catch (err) {
      showToast(err.message || "Senkronizasyon ayarları kaydedilemedi.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleManualBatchSync = async () => {
    try {
      setBatchSyncing(true);
      const res = await triggerBatchSync(isDemo);
      await onRefresh();
      const failNote = res.failedCount > 0 ? ` (${res.failedCount} üyede hata)` : "";
      showToast(
        `Toplu senkronizasyon tamamlandı: ${res.syncedUsers}/${res.totalUsers} üye · ${res.syncedCount} koşu işlendi${failNote}.`,
        res.failedCount > 0 ? "info" : "success"
      );
    } catch (err) {
      showToast(err.message || "Toplu senkronizasyon çalıştırılamadı.", "error");
    } finally {
      setBatchSyncing(false);
    }
  };

  const handleAddWindow = (e) => {
    e.preventDefault();
    const id = `win-${Date.now()}`;
    setScheduleList((prev) => [
      ...prev,
      {
        id,
        day: Number(newWin.day),
        label: newWin.label.trim() || DAY_NAMES_TR[Number(newWin.day)],
        start: newWin.start,
        end: newWin.end,
        enabled: true,
      },
    ]);
  };

  const handleSaveCheckpoint = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const isEditing = Boolean(cpForm.id);
      const savedList = await saveCheckpoint(
        {
          ...cpForm,
          order_index: Number(cpForm.order_index),
          target_km: Number(cpForm.target_km),
          lat: Number(cpForm.lat),
          lng: Number(cpForm.lng),
        },
        isDemo
      );
      const nextOrder = Array.isArray(savedList)
        ? savedList.length + 1
        : checkpoints.length + (isEditing ? 1 : 2);
      setCpForm({ ...EMPTY_CHECKPOINT, order_index: nextOrder });
      await onRefresh();
      showToast(
        isEditing
          ? "Durak güncellendi ve rota sıralaması düzenlendi."
          : "Yeni durak eklendi ve durak sıralaması düzenlendi.",
        "success"
      );
    } catch (err) {
      showToast(err.message || "Durak kaydedilemedi.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCheckpoint = async (id) => {
    try {
      setSaving(true);
      const remainingList = await deleteCheckpoint(id, isDemo);
      if (cpForm.id === id) {
        const nextOrder = Array.isArray(remainingList)
          ? remainingList.length + 1
          : Math.max(1, checkpoints.length);
        setCpForm({ ...EMPTY_CHECKPOINT, order_index: nextOrder });
      }
      await onRefresh();
      showToast("Durak rotadan kaldırıldı ve sıra numaraları güncellendi.", "info");
    } catch (err) {
      showToast(err.message || "Durak silinemedi.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActivity = async (act) => {
    try {
      await toggleActivityValidity(act.id, !act.is_valid, isDemo);
      await onRefresh();
      showToast(
        act.is_valid ? "Aktivite geçersiz (kaçak) işaretlendi." : "Aktivite tekrar onaylandı.",
        "info"
      );
    } catch (err) {
      showToast(err.message || "Aktivite durumu güncellenemedi.", "error");
    }
  };

  const handleDeleteActivity = async (id) => {
    try {
      await deleteActivity(id, isDemo);
      await onRefresh();
      showToast("Aktivite kalıcı olarak silindi.", "success");
    } catch (err) {
      showToast(err.message || "Aktivite silinemedi.", "error");
    }
  };

  const handleResetDemo = async () => {
    resetDemoStore();
    await onRefresh();
    showToast("Demo verileri varsayılan haline sıfırlandı.", "info");
  };

  const filteredActivities = activities.filter((act) => {
    if (!activitySearch.trim()) return true;
    const q = activitySearch.toLowerCase();
    const runner = profileMap.get(act.user_id)?.full_name?.toLowerCase() || "";
    return act.name.toLowerCase().includes(q) || runner.includes(q);
  });

  const scheduledPreview = computeScheduledSyncPreview({
    run_schedule: scheduleList,
    auto_sync_enabled: autoSyncEnabled,
    auto_sync_mode: autoSyncMode,
    auto_sync_delay_minutes: autoSyncDelayMinutes,
    auto_sync_time: autoSyncTime,
  });
  const lastBatchFormatted = formatSyncTimestamp(
    settings?.last_batch_sync_at || settings?.last_sync_at
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-sand-100">
            Admin Yönetim Paneli
          </h1>
          <p className="text-sm text-sand-400">
            Hedef mesafe, grup takvimi, Akçay → Tokyo durakları ve aktivite denetimi.
          </p>
          <p className="mt-1 text-xs text-sand-400">
            Son toplu senkronizasyon:{" "}
            <span className="font-mono text-sand-200">
              {lastBatchFormatted || "Henüz çalıştırılmadı"}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            id="admin-batch-sync-btn"
            type="button"
            onClick={handleManualBatchSync}
            disabled={batchSyncing}
            className="inline-flex items-center gap-2 rounded-xl bg-ember-500 hover:bg-ember-600 disabled:opacity-60 px-4 py-2 text-xs sm:text-sm font-semibold text-white transition-colors"
          >
            {batchSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {batchSyncing ? "Senkronize Ediliyor..." : "Tüm Üyeleri Senkronize Et"}
          </button>

          {isDemo && (
            <button
              type="button"
              onClick={handleResetDemo}
              className="inline-flex items-center gap-2 rounded-xl border border-obsidian-600 bg-obsidian-800 hover:bg-obsidian-700 px-3.5 py-2 text-xs font-semibold text-sand-300 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Demo Verisini Sıfırla
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors ${
                active
                  ? "border-ember-500/50 bg-ember-500/15 text-ember-400"
                  : "border-obsidian-700 bg-obsidian-800 text-sand-300 hover:bg-obsidian-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Settings & Join Code */}
      {activeTab === "settings" && (
        <form
          onSubmit={handleSaveSettings}
          className="rounded-2xl border border-obsidian-700 bg-obsidian-800 p-5 sm:p-6 space-y-5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-sand-400 mb-1.5">
                Challenge Başlığı
              </label>
              <input
                type="text"
                value={challengeTitle}
                onChange={(e) => setChallengeTitle(e.target.value)}
                required
                className="w-full rounded-xl border border-obsidian-600 bg-obsidian-900 px-3.5 py-2.5 text-sm text-sand-100 focus:border-ember-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-sand-400 mb-1.5">
                Hedef Mesafe (km)
              </label>
              <input
                type="number"
                min="10"
                step="1"
                value={targetKm}
                onChange={(e) => setTargetKm(e.target.value)}
                required
                className="w-full rounded-xl border border-obsidian-600 bg-obsidian-900 px-3.5 py-2.5 font-mono text-sm text-sand-100 focus:border-ember-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-sand-400 mb-1.5">
                Grup Katılım Kodu
              </label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                required
                className="w-full rounded-xl border border-obsidian-600 bg-obsidian-900 px-3.5 py-2.5 font-mono text-sm tracking-widest text-ember-400 focus:border-ember-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-sand-400 mb-1.5">
                Sayım Başlangıç Tarihi
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full rounded-xl border border-obsidian-600 bg-obsidian-900 px-3.5 py-2.5 font-mono text-sm text-sand-100 focus:border-ember-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-ember-500 hover:bg-ember-600 disabled:opacity-50 px-5 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            <Save className="h-4 w-4" />
            Ayarları Kaydet
          </button>
        </form>
      )}

      {/* Tab 2: Schedule */}
      {activeTab === "schedule" && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-obsidian-700 bg-obsidian-800 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-base font-bold text-sand-100">
                  Sabit Gün/Saat Filtresi (Europe/Istanbul)
                </h3>
                <p className="text-xs text-sand-400">
                  Aktif edildiğinde Strava senkronizasyonu yalnızca aşağıdaki zaman pencerelerinde başlayan koşuları kabul eder.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={enforceSchedule}
                  onChange={(e) => setEnforceSchedule(e.target.checked)}
                  className="h-4 w-4 accent-ember-500"
                />
                <span className="text-xs font-semibold text-sand-100">
                  {enforceSchedule ? "Aktif" : "Kapalı"}
                </span>
              </label>
            </div>

            <div className="space-y-2">
              {scheduleList.map((win) => (
                <div
                  key={win.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-obsidian-600 bg-obsidian-900 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={win.enabled !== false}
                      onChange={() =>
                        setScheduleList((prev) =>
                          prev.map((item) =>
                            item.id === win.id
                              ? { ...item, enabled: item.enabled === false }
                              : item
                          )
                        )
                      }
                      className="h-4 w-4 accent-pine-500"
                    />
                    <div>
                      <span className="font-semibold text-sm text-sand-100">{win.label}</span>
                      <span className="ml-2 font-mono text-xs text-sand-400">
                        {DAY_NAMES_TR[win.day]} · {win.start}–{win.end}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setScheduleList((prev) => prev.filter((item) => item.id !== win.id))
                    }
                    className="rounded-lg p-1.5 text-sand-400 hover:bg-red-500/15 hover:text-red-400 transition-colors"
                    aria-label="Pencereyi sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleSaveSchedule}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-ember-500 hover:bg-ember-600 disabled:opacity-50 px-5 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              <Save className="h-4 w-4" />
              Takvimi Uygula
            </button>
          </div>

          <form
            onSubmit={handleAddWindow}
            className="rounded-2xl border border-obsidian-700 bg-obsidian-800 p-5 sm:p-6 space-y-4"
          >
            <h4 className="font-display text-sm font-bold text-sand-100">
              Yeni Koşu Penceresi Ekle
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <select
                value={newWin.day}
                onChange={(e) => setNewWin({ ...newWin, day: Number(e.target.value) })}
                className="rounded-xl border border-obsidian-600 bg-obsidian-900 px-3 py-2 text-sm text-sand-100"
              >
                {DAY_NAMES_TR.map((d, idx) => (
                  <option key={d} value={idx}>
                    {d}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Etiket (ör. Cumartesi Trail)"
                value={newWin.label}
                onChange={(e) => setNewWin({ ...newWin, label: e.target.value })}
                className="rounded-xl border border-obsidian-600 bg-obsidian-900 px-3 py-2 text-sm text-sand-100"
              />
              <input
                type="time"
                value={newWin.start}
                onChange={(e) => setNewWin({ ...newWin, start: e.target.value })}
                className="rounded-xl border border-obsidian-600 bg-obsidian-900 px-3 py-2 font-mono text-sm text-sand-100"
              />
              <input
                type="time"
                value={newWin.end}
                onChange={(e) => setNewWin({ ...newWin, end: e.target.value })}
                className="rounded-xl border border-obsidian-600 bg-obsidian-900 px-3 py-2 font-mono text-sm text-sand-100"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl border border-obsidian-600 bg-obsidian-700 hover:bg-obsidian-600 px-4 py-2 text-xs font-semibold text-sand-100 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Listeye Ekle (Sonra Takvimi Uygula&apos;ya bas)
            </button>
          </form>

          <form
            onSubmit={handleSaveAutoSync}
            className="rounded-2xl border border-obsidian-700 bg-obsidian-800 p-5 sm:p-6 space-y-4"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="font-display text-base font-bold text-sand-100">
                  Otomatik Toplu Strava Senkronizasyonu
                </h4>
                <p className="text-xs text-sand-400">
                  Üyeler uygulamaya girmese bile Strava koşularını otomatik toplar ve Supabase&apos;i aktif tutar.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={autoSyncEnabled}
                  onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                  className="h-4 w-4 accent-ember-500"
                />
                <span className="text-xs font-semibold text-sand-100">
                  {autoSyncEnabled ? "Aktif" : "Kapalı"}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAutoSyncMode("after_schedule")}
                className={`rounded-xl border p-3.5 text-left transition-colors ${
                  autoSyncMode === "after_schedule"
                    ? "border-ember-500/60 bg-ember-500/10"
                    : "border-obsidian-600 bg-obsidian-900 hover:bg-obsidian-900/70"
                }`}
              >
                <p className="text-sm font-semibold text-sand-100">
                  Koşu Takvimine Göre (Önerilen)
                </p>
                <p className="text-xs text-sand-400 mt-0.5">
                  Yukarıdaki aktif koşu günleri değiştikçe çalışma anı otomatik güncellenir.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setAutoSyncMode("fixed_daily")}
                className={`rounded-xl border p-3.5 text-left transition-colors ${
                  autoSyncMode === "fixed_daily"
                    ? "border-ember-500/60 bg-ember-500/10"
                    : "border-obsidian-600 bg-obsidian-900 hover:bg-obsidian-900/70"
                }`}
              >
                <p className="text-sm font-semibold text-sand-100">
                  Her Gün Sabit Saatte
                </p>
                <p className="text-xs text-sand-400 mt-0.5">
                  Koşu takviminden bağımsız olarak her gün belirlenen saatte çalışır.
                </p>
              </button>
            </div>

            {autoSyncMode === "after_schedule" ? (
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-sand-400">
                  Koşu Bitişinden Kaç Dakika Sonra Çalışsın?
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="720"
                    step="15"
                    value={autoSyncDelayMinutes}
                    onChange={(e) => setAutoSyncDelayMinutes(e.target.value)}
                    className="w-28 rounded-xl border border-obsidian-600 bg-obsidian-900 px-3 py-2 font-mono text-sm text-sand-100 focus:border-ember-500 focus:outline-none"
                  />
                  {[30, 60, 90, 120].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAutoSyncDelayMinutes(preset)}
                      className={`rounded-lg border px-2.5 py-1.5 font-mono text-xs transition-colors ${
                        Number(autoSyncDelayMinutes) === preset
                          ? "border-ember-500/60 bg-ember-500/15 text-ember-400"
                          : "border-obsidian-600 bg-obsidian-900 text-sand-300 hover:bg-obsidian-700"
                      }`}
                    >
                      +{preset} dk
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-sand-400">
                  Günlük Çalışma Saati ({settings?.timezone || "Europe/Istanbul"})
                </label>
                <input
                  type="time"
                  value={autoSyncTime}
                  onChange={(e) => setAutoSyncTime(e.target.value)}
                  className="w-40 rounded-xl border border-obsidian-600 bg-obsidian-900 px-3 py-2 font-mono text-sm text-sand-100 focus:border-ember-500 focus:outline-none"
                />
              </div>
            )}

            <div className="rounded-xl border border-obsidian-600 bg-obsidian-900/70 p-3.5 space-y-2">
              <p className="text-xs font-semibold text-sand-300">
                Hesaplanan Toplu Senkronizasyon Zamanları ({settings?.timezone || "Europe/Istanbul"})
              </p>
              {!autoSyncEnabled ? (
                <p className="text-xs text-sand-500">
                  Otomatik toplu senkronizasyon şu an kapalı.
                </p>
              ) : scheduledPreview.length === 0 ? (
                <p className="text-xs text-sand-500">
                  Aktif koşu penceresi bulunmadığı için zamanlama hesaplanamadı.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {scheduledPreview.map((slot, idx) => (
                    <span
                      key={`${slot}-${idx}`}
                      className="rounded-lg border border-pine-500/30 bg-pine-500/10 px-2.5 py-1 font-mono text-xs text-pine-400"
                    >
                      {slot}
                    </span>
                  ))}
                </div>
              )}
              {settings?.last_batch_sync_summary && (
                <p className="text-[11px] text-sand-400 pt-1 border-t border-obsidian-700/70">
                  Son toplu çalışma:{" "}
                  <span className="font-mono text-sand-200">
                    {settings.last_batch_sync_summary.syncedUsers}/
                    {settings.last_batch_sync_summary.totalUsers} üye ·{" "}
                    {settings.last_batch_sync_summary.syncedCount} koşu
                  </span>{" "}
                  ({settings.last_batch_sync_summary.trigger === "manual" ? "manuel" : "otomatik"})
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-ember-500 hover:bg-ember-600 disabled:opacity-50 px-5 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              <Save className="h-4 w-4" />
              Senkronizasyon Ayarlarını Kaydet
            </button>
          </form>
        </div>
      )}

      {/* Tab 3: Checkpoints */}
      {activeTab === "checkpoints" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <form
            onSubmit={handleSaveCheckpoint}
            className="lg:col-span-2 rounded-2xl border border-obsidian-700 bg-obsidian-800 p-5 space-y-4 h-fit"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-sand-100">
                {cpForm.id ? "Durağı Düzenle" : "Yeni Durak Ekle"}
              </h3>
              {cpForm.id && (
                <button
                  type="button"
                  onClick={() =>
                    setCpForm({ ...EMPTY_CHECKPOINT, order_index: checkpoints.length + 1 })
                  }
                  className="text-xs text-ember-400 hover:underline"
                >
                  Vazgeç
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="checkpoint-order-input" className="block text-[11px] text-sand-400 mb-1">
                  Sıra No
                </label>
                <input
                  id="checkpoint-order-input"
                  type="number"
                  min={1}
                  max={cpForm.id ? Math.max(1, checkpoints.length) : checkpoints.length + 1}
                  required
                  value={cpForm.order_index}
                  onChange={(e) => setCpForm({ ...cpForm, order_index: e.target.value })}
                  className="w-full rounded-xl border border-obsidian-600 bg-obsidian-900 px-3 py-2 font-mono text-sm text-sand-100"
                />
              </div>
              <div>
                <label className="block text-[11px] text-sand-400 mb-1">Hedef Km</label>
                <input
                  type="number"
                  required
                  value={cpForm.target_km}
                  onChange={(e) => setCpForm({ ...cpForm, target_km: e.target.value })}
                  className="w-full rounded-xl border border-obsidian-600 bg-obsidian-900 px-3 py-2 font-mono text-sm text-sand-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-sand-400 mb-1">Şehir / Durak Adı</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Semerkant"
                  value={cpForm.name}
                  onChange={(e) => setCpForm({ ...cpForm, name: e.target.value })}
                  className="w-full rounded-xl border border-obsidian-600 bg-obsidian-900 px-3 py-2 text-sm text-sand-100"
                />
              </div>
              <div>
                <label className="block text-[11px] text-sand-400 mb-1">Ülke</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Özbekistan"
                  value={cpForm.country}
                  onChange={(e) => setCpForm({ ...cpForm, country: e.target.value })}
                  className="w-full rounded-xl border border-obsidian-600 bg-obsidian-900 px-3 py-2 text-sm text-sand-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-sand-400 mb-1">Enlem (Lat)</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={cpForm.lat}
                  onChange={(e) => setCpForm({ ...cpForm, lat: e.target.value })}
                  className="w-full rounded-xl border border-obsidian-600 bg-obsidian-900 px-3 py-2 font-mono text-sm text-sand-100"
                />
              </div>
              <div>
                <label className="block text-[11px] text-sand-400 mb-1">Boylam (Lng)</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={cpForm.lng}
                  onChange={(e) => setCpForm({ ...cpForm, lng: e.target.value })}
                  className="w-full rounded-xl border border-obsidian-600 bg-obsidian-900 px-3 py-2 font-mono text-sm text-sand-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-sand-400 mb-1">Açıklama</label>
              <textarea
                rows={2}
                value={cpForm.description}
                onChange={(e) => setCpForm({ ...cpForm, description: e.target.value })}
                className="w-full rounded-xl border border-obsidian-600 bg-obsidian-900 px-3 py-2 text-sm text-sand-100"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-ember-500 hover:bg-ember-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              <Save className="h-4 w-4" />
              {cpForm.id ? "Durağı Güncelle" : "Durak Ekle"}
            </button>
          </form>

          <div className="lg:col-span-3 rounded-2xl border border-obsidian-700 bg-obsidian-800 divide-y divide-obsidian-700/70">
            {[...checkpoints]
              .sort((a, b) => Number(a.order_index) - Number(b.order_index))
              .map((cp) => (
              <div key={cp.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-ember-400 font-bold">
                      #{cp.order_index}
                    </span>
                    <span className="font-semibold text-sm text-sand-100 truncate">
                      {cp.name}, {cp.country}
                    </span>
                    <span className="rounded bg-obsidian-700 px-2 py-0.5 font-mono text-[11px] text-sand-300">
                      {cp.target_km} km
                    </span>
                  </div>
                  <p className="text-xs text-sand-400 truncate mt-0.5">{cp.description}</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setCpForm(cp)}
                    className="rounded-lg p-1.5 text-sand-400 hover:bg-obsidian-700 hover:text-sand-100"
                    title="Düzenle"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCheckpoint(cp.id)}
                    className="rounded-lg p-1.5 text-sand-400 hover:bg-red-500/15 hover:text-red-400"
                    title="Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Activity Moderation */}
      {activeTab === "activities" && (
        <div className="rounded-2xl border border-obsidian-700 bg-obsidian-800 overflow-hidden">
          <div className="border-b border-obsidian-700 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="font-display text-base font-bold text-sand-100">
                Tüm Grup Aktiviteleri ({filteredActivities.length})
              </h3>
              <PoweredByStravaBadge />
            </div>
            <input
              type="search"
              placeholder="Koşucu veya koşu adı ara..."
              value={activitySearch}
              onChange={(e) => setActivitySearch(e.target.value)}
              className="w-full sm:w-64 rounded-xl border border-obsidian-600 bg-obsidian-900 px-3.5 py-2 text-sm text-sand-100 placeholder:text-sand-500 focus:border-ember-500 focus:outline-none"
            />
          </div>

          <div className="divide-y divide-obsidian-700/70 max-h-[520px] overflow-y-auto">
            {filteredActivities.map((act) => {
              const runner = profileMap.get(act.user_id);
              return (
                <div
                  key={act.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 ${
                    act.is_valid === false ? "opacity-55 bg-red-950/10" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-sand-100">{act.name}</span>
                      <span className="text-xs text-ember-400 font-medium">
                        {runner?.full_name || "Koşucu"}
                      </span>
                      {act.is_valid === false && (
                        <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-red-400">
                          Geçersiz
                        </span>
                      )}
                      <ViewOnStravaLink activityId={act.strava_activity_id} />
                    </div>
                    <p className="text-xs text-sand-400 font-mono mt-0.5 tabular-nums">
                      {(act.distance_meters / 1000).toFixed(2)} km ·{" "}
                      {formatDuration(act.moving_time_seconds)} ·{" "}
                      {formatPace(act.moving_time_seconds, act.distance_meters)} /km ·{" "}
                      {new Date(act.start_date).toLocaleString("tr-TR")}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleActivity(act)}
                      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                        act.is_valid === false
                          ? "border-pine-500/40 text-pine-400 hover:bg-pine-500/15"
                          : "border-obsidian-600 text-sand-300 hover:bg-obsidian-700"
                      }`}
                    >
                      {act.is_valid === false ? (
                        <>
                          <CheckCircle className="h-3.5 w-3.5" /> Onayla
                        </>
                      ) : (
                        <>
                          <Ban className="h-3.5 w-3.5" /> Geçersiz Kıl
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteActivity(act.id)}
                      className="rounded-lg border border-red-500/30 p-1.5 text-red-400 hover:bg-red-500/15 transition-colors"
                      title="Kalıcı Sil"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
