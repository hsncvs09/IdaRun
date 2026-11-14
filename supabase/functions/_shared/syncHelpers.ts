import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

export interface ScheduleWindow {
  id: string;
  day: number;
  label: string;
  start: string;
  end: string;
  enabled?: boolean;
}

export interface GroupSettingsRow {
  id: number;
  challenge_start_date: string;
  timezone?: string | null;
  run_schedule?: ScheduleWindow[] | null;
  enforce_schedule?: boolean;
  auto_sync_enabled?: boolean;
  auto_sync_mode?: "after_schedule" | "fixed_daily" | string;
  auto_sync_delay_minutes?: number | null;
  auto_sync_time?: string | null;
  last_sync_at?: string | null;
  last_batch_sync_at?: string | null;
}

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const CATCH_UP_WINDOW_MS = 4 * 60 * 60 * 1000; // 4 saatlik telafi penceresi

export function parseMinutes(hhmm: string): number {
  const [h, m] = (hhmm || "00:00").split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

export function getZonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value || "0";
  const weekdayStr = parts.find((p) => p.type === "weekday")?.value || "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: WEEKDAY_MAP[weekdayStr] ?? 0,
    hour: Number(get("hour")) % 24,
    minute: Number(get("minute")),
    second: Number(get("second")),
  };
}

export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  const local = getZonedParts(utcGuess, timeZone);
  const guessLocalAsUtc = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute,
    0,
    0
  );
  const offsetMs = guessLocalAsUtc - utcGuess.getTime();
  const adjusted = new Date(utcGuess.getTime() - offsetMs);

  // DST sınırları için ikinci doğrulama adımı
  const local2 = getZonedParts(adjusted, timeZone);
  const local2AsUtc = Date.UTC(
    local2.year,
    local2.month - 1,
    local2.day,
    local2.hour,
    local2.minute,
    0,
    0
  );
  const offsetMs2 = local2AsUtc - adjusted.getTime();
  return new Date(utcGuess.getTime() - offsetMs2);
}

export function isInSchedule(
  isoDate: string,
  schedule: ScheduleWindow[],
  timeZone: string
): boolean {
  const date = new Date(isoDate);
  const local = getZonedParts(date, timeZone);
  const minutes = local.hour * 60 + local.minute;

  return schedule.some((win) => {
    if (win.enabled === false) return false;
    if (Number(win.day) !== local.weekday) return false;
    const startMin = parseMinutes(win.start);
    const endMin = parseMinutes(win.end);
    return minutes >= startMin && minutes <= endMin;
  });
}

export interface ScheduledSyncDecision {
  shouldRun: boolean;
  reason: string;
  targetSyncAt?: string;
}

export function evaluateScheduledSyncDue(
  settings: GroupSettingsRow,
  now: Date = new Date()
): ScheduledSyncDecision {
  if (settings.auto_sync_enabled === false) {
    return { shouldRun: false, reason: "Otomatik toplu senkronizasyon pasif." };
  }

  const timeZone = settings.timezone || "Europe/Istanbul";
  const mode = settings.auto_sync_mode === "fixed_daily" ? "fixed_daily" : "after_schedule";
  const delayMinutes = Math.max(0, Math.min(720, Number(settings.auto_sync_delay_minutes ?? 60)));
  const candidates: Date[] = [];

  for (const dayOffset of [-1, 0]) {
    const refDate = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    const localRef = getZonedParts(refDate, timeZone);

    if (mode === "fixed_daily") {
      const [h, m] = (settings.auto_sync_time || "22:30").split(":").map(Number);
      const target = zonedTimeToUtc(
        localRef.year,
        localRef.month,
        localRef.day,
        Number.isFinite(h) ? h : 22,
        Number.isFinite(m) ? m : 30,
        timeZone
      );
      const diffMs = now.getTime() - target.getTime();
      if (diffMs >= 0 && diffMs <= CATCH_UP_WINDOW_MS) {
        candidates.push(target);
      }
    } else {
      const schedule = (settings.run_schedule || []) as ScheduleWindow[];
      for (const win of schedule) {
        if (win.enabled === false) continue;
        if (Number(win.day) !== localRef.weekday) continue;
        const [endH, endM] = (win.end || "21:30").split(":").map(Number);
        const winEndUtc = zonedTimeToUtc(
          localRef.year,
          localRef.month,
          localRef.day,
          Number.isFinite(endH) ? endH : 21,
          Number.isFinite(endM) ? endM : 30,
          timeZone
        );
        const target = new Date(winEndUtc.getTime() + delayMinutes * 60_000);
        const diffMs = now.getTime() - target.getTime();
        if (diffMs >= 0 && diffMs <= CATCH_UP_WINDOW_MS) {
          candidates.push(target);
        }
      }
    }
  }

  if (candidates.length === 0) {
    return {
      shouldRun: false,
      reason: "Şu an planlanmış bir senkronizasyon penceresi içinde değil.",
    };
  }

  candidates.sort((a, b) => b.getTime() - a.getTime());
  const latestTarget = candidates[0];
  const lastBatchAt = settings.last_batch_sync_at
    ? new Date(settings.last_batch_sync_at)
    : null;

  if (lastBatchAt && !Number.isNaN(lastBatchAt.getTime()) && lastBatchAt.getTime() >= latestTarget.getTime()) {
    return {
      shouldRun: false,
      reason: "Bu zaman penceresi için toplu senkronizasyon zaten tamamlandı.",
      targetSyncAt: latestTarget.toISOString(),
    };
  }

  return {
    shouldRun: true,
    reason: "Planlanan senkronizasyon zamanı geldi.",
    targetSyncAt: latestTarget.toISOString(),
  };
}

export class SyncHttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function syncUserStravaActivities(
  supabaseAdmin: SupabaseClient,
  userId: string,
  settings: GroupSettingsRow,
  stravaClientId: string,
  stravaClientSecret: string
) {
  const { data: tokenRow, error: tokenErr } = await supabaseAdmin
    .from("strava_tokens")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (tokenErr || !tokenRow) {
    throw new SyncHttpError("Strava token kaydı bulunamadı. Tekrar giriş yapın.", 404);
  }

  let accessToken = tokenRow.access_token;
  const nowEpoch = Math.floor(Date.now() / 1000);

  if (Number(tokenRow.expires_at) <= nowEpoch + 300) {
    const refreshRes = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: stravaClientId,
        client_secret: stravaClientSecret,
        grant_type: "refresh_token",
        refresh_token: tokenRow.refresh_token,
      }),
    });
    const refreshData = await refreshRes.json();
    if (!refreshRes.ok || !refreshData.access_token) {
      throw new SyncHttpError("Strava oturumu yenilenemedi.", 401);
    }

    accessToken = refreshData.access_token;
    await supabaseAdmin
      .from("strava_tokens")
      .update({
        access_token: refreshData.access_token,
        refresh_token: refreshData.refresh_token,
        expires_at: refreshData.expires_at,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
  }

  const afterEpoch = Math.floor(new Date(settings.challenge_start_date).getTime() / 1000);
  const rawActivities: any[] = [];
  const perPage = 200;

  for (let page = 1; page <= 5; page++) {
    const activitiesRes = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${afterEpoch}&per_page=${perPage}&page=${page}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const pageData = await activitiesRes.json();
    if (!activitiesRes.ok || !Array.isArray(pageData)) {
      throw new SyncHttpError("Strava aktiviteleri alınamadı.", 502);
    }
    rawActivities.push(...pageData);
    if (pageData.length < perPage) break;
  }

  const allowedTypes = new Set(["Run", "TrailRun"]);
  const schedule = (settings.run_schedule || []) as ScheduleWindow[];
  const timeZone = settings.timezone || "Europe/Istanbul";

  const qualifying = [];
  let filteredOutCount = 0;
  let nonRunCount = 0;

  for (const act of rawActivities) {
    const actType = act.sport_type || act.type;
    if (!allowedTypes.has(actType)) {
      nonRunCount++;
      continue;
    }

    if (settings.enforce_schedule && !isInSchedule(act.start_date, schedule, timeZone)) {
      filteredOutCount++;
      continue;
    }

    qualifying.push({
      user_id: userId,
      strava_activity_id: Number(act.id),
      name: act.name || "Grup Koşusu",
      distance_meters: Number(act.distance || 0),
      moving_time_seconds: Number(act.moving_time || 0),
      elapsed_time_seconds: Number(act.elapsed_time || act.moving_time || 0),
      total_elevation_gain: Number(act.total_elevation_gain || 0),
      average_speed: Number(act.average_speed || 0),
      activity_type: actType,
      start_date: act.start_date,
      start_date_local: act.start_date_local || act.start_date,
    });
  }

  if (qualifying.length > 0) {
    const { error: upsertErr } = await supabaseAdmin
      .from("activities")
      .upsert(qualifying, { onConflict: "strava_activity_id", ignoreDuplicates: false });
    if (upsertErr) throw upsertErr;
  }

  return {
    syncedCount: qualifying.length,
    filteredOutCount,
    nonRunCount,
  };
}
