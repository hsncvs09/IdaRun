import React, { useMemo, useState } from "react";
import { Trophy, Mountain, Gauge, Footprints, Medal } from "lucide-react";
import { buildLeaderboard } from "../lib/routeMath";

const PERIODS = [
  { id: "week", label: "Bu Hafta" },
  { id: "month", label: "Bu Ay" },
  { id: "all", label: "Tüm Zamanlar" },
];

const METRICS = [
  { id: "distance", label: "Mesafe", icon: Trophy },
  { id: "elevation", label: "İrtifa", icon: Mountain },
  { id: "pace", label: "Pace", icon: Gauge },
  { id: "count", label: "Koşu Adedi", icon: Footprints },
];

export default function Leaderboard({ profiles = [], activities = [], currentUserId }) {
  const [period, setPeriod] = useState("all");
  const [sortBy, setSortBy] = useState("distance");

  const rows = useMemo(
    () => buildLeaderboard(profiles, activities, { period, sortBy }),
    [profiles, activities, period, sortBy]
  );

  return (
    <section className="rounded-2xl border border-obsidian-700 bg-obsidian-800 shadow-xl overflow-hidden">
      {/* Header & Controls */}
      <div className="border-b border-obsidian-700 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-sand-100 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-ember-400" />
              Grup Liderlik Tablosu
            </h2>
            <p className="text-xs text-sand-400 mt-0.5">
              Yalnızca geçerli grup takvimine uyan ve onaylı koşular hesaplanır.
            </p>
          </div>

          {/* Period switcher */}
          <div className="inline-flex rounded-xl border border-obsidian-600 bg-obsidian-900 p-1">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  period === p.id
                    ? "bg-obsidian-700 text-sand-100 shadow-sm"
                    : "text-sand-400 hover:text-sand-100"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Metric tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {METRICS.map((m) => {
            const Icon = m.icon;
            const active = sortBy === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSortBy(m.id)}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                  active
                    ? "border-ember-500/50 bg-ember-500/15 text-ember-400"
                    : "border-obsidian-600 bg-obsidian-900/60 text-sand-300 hover:bg-obsidian-700/60"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table / Cards */}
      <div className="divide-y divide-obsidian-700/70">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-sand-400">
            Seçili dönem için henüz koşu kaydı bulunmuyor.
          </div>
        ) : (
          rows.map((row, idx) => {
            const rank = idx + 1;
            const isCurrent = row.userId === currentUserId;
            const medalColor =
              rank === 1
                ? "text-amber-400"
                : rank === 2
                ? "text-slate-300"
                : rank === 3
                ? "text-orange-400"
                : "text-sand-500";

            return (
              <div
                key={row.userId}
                className={`flex items-center justify-between gap-3 px-5 py-3.5 transition-colors ${
                  isCurrent ? "bg-ember-500/10" : "hover:bg-obsidian-700/40"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 text-center shrink-0">
                    {rank <= 3 ? (
                      <Medal className={`h-5 w-5 mx-auto ${medalColor}`} />
                    ) : (
                      <span className="font-mono text-sm font-bold text-sand-400 tabular-nums">
                        {rank}
                      </span>
                    )}
                  </div>

                  {row.avatarUrl ? (
                    <img
                      src={row.avatarUrl}
                      alt={row.fullName}
                      className="h-9 w-9 rounded-full object-cover border border-obsidian-600 shrink-0"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-obsidian-700 border border-obsidian-600 flex items-center justify-center font-display text-xs font-bold text-sand-100 shrink-0">
                      {row.fullName
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-sand-100 truncate">
                        {row.fullName}
                      </span>
                      {isCurrent && (
                        <span className="rounded bg-ember-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-ember-400">
                          Sen
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-sand-400 tabular-nums">
                      {row.runCount} koşu · Ort. {row.formattedPace} dk/km
                    </p>
                  </div>
                </div>

                {/* Metrics */}
                <div className="flex items-center gap-4 sm:gap-6 shrink-0 text-right">
                  <div className="hidden sm:block">
                    <span className="block font-mono text-xs font-semibold text-sand-200 tabular-nums">
                      {Math.round(row.totalElevationGain).toLocaleString("tr-TR")} m
                    </span>
                    <span className="block text-[10px] text-sand-500">İrtifa</span>
                  </div>

                  <div className="hidden sm:block">
                    <span className="block font-mono text-xs font-semibold text-sand-200 tabular-nums">
                      {row.formattedPace}
                    </span>
                    <span className="block text-[10px] text-sand-500">Pace</span>
                  </div>

                  <div>
                    <span
                      className={`block font-mono text-sm sm:text-base font-bold tabular-nums ${
                        sortBy === "distance" ? "text-ember-400" : "text-sand-100"
                      }`}
                    >
                      {sortBy === "elevation"
                        ? `${Math.round(row.totalElevationGain).toLocaleString("tr-TR")} m`
                        : sortBy === "pace"
                        ? `${row.formattedPace} /km`
                        : sortBy === "count"
                        ? `${row.runCount} koşu`
                        : `${row.totalDistanceKm.toFixed(1)} km`}
                    </span>
                    <span className="block text-[10px] text-sand-500 sm:hidden">
                      {Math.round(row.totalElevationGain)} m irtifa
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
