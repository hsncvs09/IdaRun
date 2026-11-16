import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import { Flag, MapPin, Maximize2, Navigation } from "lucide-react";
import { interpolatePositionOnRoute } from "../lib/routeMath";

function MapController({ checkpoints, runnerPosition, focusTarget, fitTrigger, markerRefs, runnerMarkerRef }) {
  const map = useMap();
  const hasFittedOnce = useRef(false);
  const lastFitTrigger = useRef(0);

  useEffect(() => {
    map.attributionControl?.remove();
    if (!checkpoints || checkpoints.length === 0) return;
    const isExplicitFitAll = fitTrigger !== lastFitTrigger.current;
    if (hasFittedOnce.current && !isExplicitFitAll) return;

    if (isExplicitFitAll) {
      lastFitTrigger.current = fitTrigger;
      map.closePopup();
    }

    const coords = checkpoints.map((c) => [c.lat, c.lng]);
    if (runnerPosition) coords.push(runnerPosition);
    const bounds = L.latLngBounds(coords);
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 6 });
    hasFittedOnce.current = true;
  }, [checkpoints, runnerPosition, fitTrigger, map]);

  useEffect(() => {
    if (!focusTarget) return;
    if (focusTarget.type === "runner" && runnerPosition) {
      map.flyTo(runnerPosition, 7, { duration: 0.9 });
      const timer = setTimeout(() => {
        runnerMarkerRef.current?.openPopup();
      }, 350);
      return () => clearTimeout(timer);
    }

    if (focusTarget.type === "checkpoint" && focusTarget.checkpoint) {
      const cp = focusTarget.checkpoint;
      map.flyTo([cp.lat, cp.lng], 7, { duration: 0.9 });
      const timer = setTimeout(() => {
        markerRefs.current?.[cp.id]?.openPopup();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [focusTarget, runnerPosition, map, markerRefs, runnerMarkerRef]);

  return null;
}

function createCheckpointIcon(isReached, isNext, isSelected) {
  const bg = isReached ? "#10B981" : isNext ? "#FF5722" : "#243041";
  const ring = isSelected ? "#FFFFFF" : isReached ? "#34D399" : isNext ? "#FF7849" : "#64748B";
  const size = isSelected ? 18 : 14;
  return L.divIcon({
    className: "idarun-cp-pin",
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${bg};border:2.5px solid ${ring};box-shadow:0 0 12px rgba(0,0,0,0.75);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function createRunnerIcon() {
  return L.divIcon({
    className: "idarun-runner-pin",
    html: `
      <div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
        <span style="position:absolute;inset:0;border-radius:9999px;background:rgba(255,87,34,0.35);animation:pulseRing 2s cubic-bezier(0.215,0.61,0.355,1) infinite;"></span>
        <span style="position:relative;width:26px;height:26px;border-radius:9999px;background:#FF5722;border:2.5px solid #FFFFFF;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(255,87,34,0.65);animation:runnerBob 1s ease-in-out infinite;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="17" cy="4" r="2"/>
            <path d="m15.5 7.5-3 3 2.5 2.5-2 5"/>
            <path d="m9 11 3-3 3.5 3.5"/>
            <path d="m6 19 4-4"/>
          </svg>
        </span>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

export default function MapTracker({ checkpoints = [], totalGroupKm = 0, targetDistanceKm = 9500 }) {
  const route = useMemo(
    () => interpolatePositionOnRoute(checkpoints, totalGroupKm, targetDistanceKm),
    [checkpoints, totalGroupKm, targetDistanceKm]
  );

  const runnerIcon = useMemo(() => createRunnerIcon(), []);
  const markerRefs = useRef({});
  const runnerMarkerRef = useRef(null);

  const [selectedId, setSelectedId] = useState(null);
  const [focusTarget, setFocusTarget] = useState(null);
  const [fitTrigger, setFitTrigger] = useState(0);

  const handleSelectCheckpoint = (cp) => {
    setSelectedId(cp.id);
    setFocusTarget({ type: "checkpoint", checkpoint: cp, ts: Date.now() });
  };

  const handleFocusRunner = () => {
    setSelectedId(null);
    setFocusTarget({ type: "runner", ts: Date.now() });
  };

  const handleFitAll = () => {
    setSelectedId(null);
    setFocusTarget(null);
    setFitTrigger((c) => c + 1);
  };

  return (
    <section className="rounded-2xl border border-obsidian-700 bg-obsidian-800 overflow-hidden shadow-xl">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-obsidian-700 px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-ember-400" />
            <h2 className="font-display text-lg font-bold text-sand-100">
              Akçay → Tokyo Canlı Rota
            </h2>
          </div>
          <p className="text-xs text-sand-400 mt-0.5">
            {route.currentCheckpoint ? (
              <>
                Son geçilen durak:{" "}
                <span className="text-pine-400 font-semibold">{route.currentCheckpoint.name}</span>
                {route.nextCheckpoint && (
                  <>
                    {" "}
                    · Sıradaki hedef:{" "}
                    <span className="text-ember-400 font-semibold">
                      {route.nextCheckpoint.name} (
                      {Math.max(0, route.nextCheckpoint.target_km - totalGroupKm).toFixed(0)} km kaldı)
                    </span>
                  </>
                )}
              </>
            ) : (
              "Rota durakları yükleniyor..."
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="block font-mono text-lg font-bold text-sand-100 tabular-nums">
              {totalGroupKm.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} /{" "}
              {Number(targetDistanceKm).toLocaleString("tr-TR")} km
            </span>
            <span className="block text-[11px] font-medium text-pine-400 tabular-nums">
              %{route.progressPct.toFixed(1)} tamamlandı
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-obsidian-900">
        <div
          className="h-full bg-gradient-to-r from-pine-500 via-ember-500 to-ember-400 transition-all duration-700"
          style={{ width: `${Math.min(100, route.progressPct)}%` }}
        />
      </div>

      {/* Leaflet Map */}
      <div
        data-testid="map-wrapper"
        className="relative z-0 isolate h-[340px] sm:h-[420px] w-full"
      >
        {/* Map Quick Actions */}
        <div
          data-testid="map-quick-actions"
          className="absolute top-3 right-3 z-20 flex items-center gap-2"
        >
          <button
            type="button"
            onClick={handleFocusRunner}
            className="inline-flex items-center gap-1.5 rounded-lg border border-obsidian-600 bg-obsidian-800/90 hover:bg-obsidian-700 px-2.5 py-1.5 text-xs font-semibold text-ember-400 shadow-lg backdrop-blur-sm transition-colors"
            title="Grubun aktif konumuna odaklan"
          >
            <Navigation className="h-3.5 w-3.5" />
            Konum
          </button>
          <button
            type="button"
            onClick={handleFitAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-obsidian-600 bg-obsidian-800/90 hover:bg-obsidian-700 px-2.5 py-1.5 text-xs font-semibold text-sand-200 shadow-lg backdrop-blur-sm transition-colors"
            title="Tüm Akçay - Tokyo rotasını göster"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Tüm Rota
          </button>
        </div>

        <MapContainer
          center={route.runnerPosition}
          zoom={4}
          scrollWheelZoom={false}
          attributionControl={false}
          className="h-full w-full z-10"
        >
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            className="idarun-dark-tiles"
          />

          <MapController
            checkpoints={checkpoints}
            runnerPosition={route.runnerPosition}
            focusTarget={focusTarget}
            fitTrigger={fitTrigger}
            markerRefs={markerRefs}
            runnerMarkerRef={runnerMarkerRef}
          />

          {route.remainingPath.length >= 2 && (
            <Polyline
              positions={route.remainingPath}
              pathOptions={{
                color: "#475569",
                weight: 3,
                dashArray: "6 8",
                opacity: 0.75,
              }}
            />
          )}

          {route.completedPath.length >= 2 && (
            <Polyline
              positions={route.completedPath}
              pathOptions={{
                color: "#FF5722",
                weight: 4,
                opacity: 0.95,
              }}
            />
          )}

          {checkpoints.map((cp) => {
            const isReached = totalGroupKm >= Number(cp.target_km);
            const isNext = route.nextCheckpoint?.id === cp.id;
            const isSelected = selectedId === cp.id;
            return (
              <Marker
                key={cp.id}
                position={[cp.lat, cp.lng]}
                icon={createCheckpointIcon(isReached, isNext, isSelected)}
                ref={(ref) => {
                  if (ref) markerRefs.current[cp.id] = ref;
                }}
              >
                <Popup>
                  <div className="min-w-[180px] space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display font-bold text-sm text-sand-100">
                        {cp.order_index}. {cp.name}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          isReached
                            ? "bg-pine-500/20 text-pine-400"
                            : "bg-obsidian-700 text-sand-300"
                        }`}
                      >
                        {isReached ? "Geçildi" : `${cp.target_km} km`}
                      </span>
                    </div>
                    <p className="text-[11px] text-sand-400">{cp.country}</p>
                    {cp.description && (
                      <p className="text-xs text-sand-300 leading-snug pt-1">{cp.description}</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          <Marker
            position={route.runnerPosition}
            icon={runnerIcon}
            zIndexOffset={1000}
            ref={runnerMarkerRef}
          >
            <Popup>
              <div className="space-y-1">
                <p className="font-display font-bold text-sm text-ember-400">
                  IdaRun Grup Konumu
                </p>
                <p className="font-mono text-xs text-sand-100">
                  Toplam: {totalGroupKm.toFixed(1)} km
                </p>
                {route.nextCheckpoint && (
                  <p className="text-xs text-sand-300">
                    Sonraki durak: {route.nextCheckpoint.name}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        </MapContainer>
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
          className="absolute bottom-1.5 right-2 z-20 rounded bg-obsidian-900/75 px-1.5 py-0.5 text-[10px] text-sand-500 hover:text-sand-300 transition-colors"
        >
          © OpenStreetMap
        </a>
      </div>

      {/* Horizontal Checkpoint Milestones */}
      <div className="border-t border-obsidian-700 bg-obsidian-900/60 px-4 py-3 overflow-x-auto">
        <div className="flex items-center gap-2.5 min-w-max">
          {checkpoints.map((cp) => {
            const reached = totalGroupKm >= Number(cp.target_km);
            const isNext = route.nextCheckpoint?.id === cp.id;
            const isSelected = selectedId === cp.id;
            return (
              <button
                key={cp.id}
                type="button"
                onClick={() => handleSelectCheckpoint(cp)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-all cursor-pointer ${
                  isSelected
                    ? "ring-2 ring-ember-400/80 border-ember-400 bg-obsidian-800 text-sand-100"
                    : reached
                    ? "border-pine-500/40 bg-pine-500/10 hover:bg-pine-500/20 text-sand-100"
                    : isNext
                    ? "border-ember-500/50 bg-ember-500/10 hover:bg-ember-500/20 text-sand-100"
                    : "border-obsidian-700 bg-obsidian-800/70 hover:border-obsidian-500 hover:bg-obsidian-800 text-sand-400"
                }`}
              >
                {cp.order_index === checkpoints.length ? (
                  <Flag className={`h-3.5 w-3.5 ${reached ? "text-pine-400" : "text-ember-400"}`} />
                ) : (
                  <MapPin
                    className={`h-3.5 w-3.5 ${
                      reached ? "text-pine-400" : isNext ? "text-ember-400" : "text-sand-500"
                    }`}
                  />
                )}
                <div>
                  <span className="font-semibold block leading-none">{cp.name}</span>
                  <span className="font-mono text-[10px] opacity-80 tabular-nums">
                    {cp.target_km} km
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
