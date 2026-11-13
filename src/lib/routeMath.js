export const DAY_NAMES_TR = [
  "Pazar",
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
];

const WEEKDAY_MAP = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function parseTimeToMinutes(hhmm) {
  if (!hhmm || !hhmm.includes(":")) return 0;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Verilen aktivite başlangıç zamanının (ISO string) belirtilen saat dilimi ve
 * grup koşu takvimi pencerelerinden birine düşüp düşmediğini kontrol eder.
 */
export function isActivityInSchedule(isoDate, runSchedule = [], timeZone = "Europe/Istanbul") {
  if (!isoDate || !Array.isArray(runSchedule) || runSchedule.length === 0) {
    return false;
  }

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return false;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const weekdayStr = parts.find((p) => p.type === "weekday")?.value || "";
  const hourStr = parts.find((p) => p.type === "hour")?.value || "0";
  const minuteStr = parts.find((p) => p.type === "minute")?.value || "0";
  const day = WEEKDAY_MAP[weekdayStr];
  const minutes = (Number(hourStr) % 24) * 60 + Number(minuteStr);

  return runSchedule.some((win) => {
    if (win.enabled === false) return false;
    if (Number(win.day) !== day) return false;
    const startMin = parseTimeToMinutes(win.start);
    const endMin = parseTimeToMinutes(win.end);
    return minutes >= startMin && minutes <= endMin;
  });
}

/**
 * İki koordinat arasındaki Haversine mesafesini (km) döner.
 */
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Toplam grup kilometresine göre Akçay -> Tokyo checkpoint polyline'ı üzerinde
 * aktif koşucu konumunu, tamamlanan çizgiyi, kalan çizgiyi ve mevcut/sıradaki durağı hesaplar.
 */
export function interpolatePositionOnRoute(checkpoints = [], totalGroupKm = 0, targetDistanceKm = 9500) {
  const sorted = [...checkpoints].sort((a, b) => Number(a.target_km) - Number(b.target_km));
  if (sorted.length === 0) {
    return {
      runnerPosition: [39.5858, 26.9242],
      completedPath: [],
      remainingPath: [],
      currentCheckpoint: null,
      nextCheckpoint: null,
      progressPct: 0,
    };
  }

  const clampedKm = Math.max(0, Number(totalGroupKm) || 0);
  const effectiveTarget = Math.max(
    1,
    Number(targetDistanceKm) || Number(sorted[sorted.length - 1].target_km) || 9500
  );
  const progressPct = Math.min(100, (clampedKm / effectiveTarget) * 100);

  if (sorted.length === 1 || clampedKm <= Number(sorted[0].target_km)) {
    const first = [sorted[0].lat, sorted[0].lng];
    return {
      runnerPosition: first,
      completedPath: [first],
      remainingPath: sorted.map((c) => [c.lat, c.lng]),
      currentCheckpoint: sorted[0],
      nextCheckpoint: sorted[1] || null,
      progressPct,
    };
  }

  const last = sorted[sorted.length - 1];
  if (clampedKm >= Number(last.target_km)) {
    const full = sorted.map((c) => [c.lat, c.lng]);
    return {
      runnerPosition: [last.lat, last.lng],
      completedPath: full,
      remainingPath: [[last.lat, last.lng]],
      currentCheckpoint: last,
      nextCheckpoint: null,
      progressPct: 100,
    };
  }

  const completedPath = [];
  const remainingPath = [];
  let runnerPosition = [sorted[0].lat, sorted[0].lng];
  let currentCheckpoint = sorted[0];
  let nextCheckpoint = sorted[1];

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    const aKm = Number(a.target_km);
    const bKm = Number(b.target_km);

    if (clampedKm >= aKm && clampedKm <= bKm) {
      const span = Math.max(0.0001, bKm - aKm);
      const ratio = (clampedKm - aKm) / span;
      const lat = a.lat + (b.lat - a.lat) * ratio;
      const lng = a.lng + (b.lng - a.lng) * ratio;
      runnerPosition = [lat, lng];
      currentCheckpoint = a;
      nextCheckpoint = b;

      for (let j = 0; j <= i; j++) {
        completedPath.push([sorted[j].lat, sorted[j].lng]);
      }
      completedPath.push(runnerPosition);

      remainingPath.push(runnerPosition);
      for (let j = i + 1; j < sorted.length; j++) {
        remainingPath.push([sorted[j].lat, sorted[j].lng]);
      }
      break;
    }
  }

  return {
    runnerPosition,
    completedPath,
    remainingPath,
    currentCheckpoint,
    nextCheckpoint,
    progressPct,
  };
}

export function formatPace(movingTimeSeconds, distanceMeters) {
  if (!distanceMeters || distanceMeters <= 0 || !movingTimeSeconds || movingTimeSeconds <= 0) {
    return "--:--";
  }
  const paceSecondsPerKm = movingTimeSeconds / (distanceMeters / 1000);
  const mins = Math.floor(paceSecondsPerKm / 60);
  const secs = Math.round(paceSecondsPerKm % 60);
  if (secs === 60) {
    return `${mins + 1}:00`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function formatDuration(totalSeconds) {
  const secs = Math.max(0, Math.round(totalSeconds || 0));
  const hrs = Math.floor(secs / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  if (hrs > 0) {
    return `${hrs}s ${mins}dk`;
  }
  return `${mins}dk`;
}

export function getPeriodCutoff(period, now = new Date()) {
  if (period === "week") {
    const d = new Date(now);
    const day = d.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diffToMonday);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  }
  return null;
}

/**
 * Aktiviteleri kullanıcı bazında toplayıp seçili zaman aralığı ve sıralama metriğine göre sıralar.
 */
export function buildLeaderboard(profiles = [], activities = [], { period = "all", sortBy = "distance", now = new Date() } = {}) {
  const cutoff = getPeriodCutoff(period, now);
  const byUser = new Map();

  for (const p of profiles) {
    byUser.set(p.id, {
      userId: p.id,
      fullName: p.full_name,
      avatarUrl: p.avatar_url,
      role: p.role,
      totalDistanceMeters: 0,
      totalElevationGain: 0,
      totalMovingTimeSeconds: 0,
      runCount: 0,
      avgPaceSeconds: null,
    });
  }

  for (const act of activities) {
    if (act.is_valid === false) continue;
    const actDate = new Date(act.start_date);
    if (cutoff && actDate < cutoff) continue;

    if (!byUser.has(act.user_id)) {
      byUser.set(act.user_id, {
        userId: act.user_id,
        fullName: act.profiles?.full_name || "Koşucu",
        avatarUrl: act.profiles?.avatar_url || null,
        role: "member",
        totalDistanceMeters: 0,
        totalElevationGain: 0,
        totalMovingTimeSeconds: 0,
        runCount: 0,
        avgPaceSeconds: null,
      });
    }

    const row = byUser.get(act.user_id);
    row.totalDistanceMeters += Number(act.distance_meters || 0);
    row.totalElevationGain += Number(act.total_elevation_gain || 0);
    row.totalMovingTimeSeconds += Number(act.moving_time_seconds || 0);
    row.runCount += 1;
  }

  const rows = Array.from(byUser.values()).map((row) => {
    const km = row.totalDistanceMeters / 1000;
    const avgPaceSeconds = km > 0 ? row.totalMovingTimeSeconds / km : null;
    return {
      ...row,
      totalDistanceKm: km,
      avgPaceSeconds,
      formattedPace: formatPace(row.totalMovingTimeSeconds, row.totalDistanceMeters),
    };
  });

  rows.sort((a, b) => {
    if (sortBy === "elevation") {
      return b.totalElevationGain - a.totalElevationGain || b.totalDistanceMeters - a.totalDistanceMeters;
    }
    if (sortBy === "count") {
      return b.runCount - a.runCount || b.totalDistanceMeters - a.totalDistanceMeters;
    }
    if (sortBy === "pace") {
      if (a.avgPaceSeconds === null && b.avgPaceSeconds === null) return 0;
      if (a.avgPaceSeconds === null) return 1;
      if (b.avgPaceSeconds === null) return -1;
      return a.avgPaceSeconds - b.avgPaceSeconds;
    }
    return b.totalDistanceMeters - a.totalDistanceMeters;
  });

  return rows;
}
