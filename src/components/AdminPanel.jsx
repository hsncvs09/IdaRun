import React, { useState } from "react";
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
} from "lucide-react";
import { DAY_NAMES_TR, formatDuration, formatPace } from "../lib/routeMath";
import {
  updateGroupSettings,
  saveCheckpoint,
  deleteCheckpoint,
  toggleActivityValidity,
  deleteActivity,
} from "../lib/dataService";
import { resetDemoStore } from "../lib/demoData";
import { useToast } from "./ToastProvider";

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

  // Checkpoint form state
  const [cpForm, setCpForm] = useState({
    ...EMPTY_CHECKPOINT,
    order_index: checkpoints.length + 1,
  });

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
      await saveCheckpoint(
        {
          ...cpForm,
          order_index: Number(cpForm.order_index),
          target_km: Number(cpForm.target_km),
          lat: Number(cpForm.lat),
          lng: Number(cpForm.lng),
        },
        isDemo
      );
      setCpForm({ ...EMPTY_CHECKPOINT, order_index: checkpoints.length + 2 });
      await onRefresh();
      showToast(cpForm.id ? "Durak güncellendi." : "Yeni durak eklendi.", "success");
    } catch (err) {
      showToast(err.message || "Durak kaydedilemedi.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCheckpoint = async (id) => {
    try {
      setSaving(true);
      await deleteCheckpoint(id, isDemo);
      await onRefresh();
      showToast("Durak rotadan kaldırıldı.", "info");
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
        </div>

        {isDemo && (
          <button
            type="button"
            onClick={handleResetDemo}
            className="inline-flex items-center gap-2 rounded-xl border border-obsidian-600 bg-obsidian-800 hover:bg-obsidian-700 px-3.5 py-2 text-xs font-semibold text-sand-300 transition-colors self-start"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Demo Verisini Sıfırla
          </button>
        )}
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
                <label className="block text-[11px] text-sand-400 mb-1">Sıra No</label>
                <input
                  type="number"
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
            {checkpoints.map((cp) => (
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
            <h3 className="font-display text-base font-bold text-sand-100">
              Tüm Grup Aktiviteleri ({filteredActivities.length})
            </h3>
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
