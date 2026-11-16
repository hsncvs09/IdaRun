import { supabase, isSupabaseConfigured } from "./supabase";
import { loadDemoStore, saveDemoStore } from "./demoData";
import { isActivityInSchedule, reorderCheckpoints } from "./routeMath";

function nextRecentDateForDay(dayOfWeek, hour, minute) {
  const now = new Date();
  const diff = (now.getDay() - dayOfWeek + 7) % 7;
  const d = new Date(now);
  d.setDate(now.getDate() - diff);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export async function fetchDashboardBundle(isDemo) {
  if (isDemo || !isSupabaseConfigured) {
    const store = loadDemoStore();
    return {
      settings: store.groupSettings,
      checkpoints: [...store.checkpoints].sort((a, b) => a.order_index - b.order_index),
      profiles: store.profiles,
      activities: [...store.activities].sort(
        (a, b) => new Date(b.start_date) - new Date(a.start_date)
      ),
    };
  }

  const [settingsRes, checkpointsRes, profilesRes, activitiesRes] = await Promise.all([
    supabase.from("group_settings").select("*").eq("id", 1).single(),
    supabase.from("checkpoints").select("*").order("order_index", { ascending: true }),
    supabase.from("profiles").select("id, strava_athlete_id, full_name, avatar_url, role, is_verified"),
    supabase.from("activities").select("*").order("start_date", { ascending: false }),
  ]);

  if (settingsRes.error) throw settingsRes.error;
  if (checkpointsRes.error) throw checkpointsRes.error;
  if (profilesRes.error) throw profilesRes.error;
  if (activitiesRes.error) throw activitiesRes.error;

  return {
    settings: settingsRes.data,
    checkpoints: checkpointsRes.data || [],
    profiles: profilesRes.data || [],
    activities: activitiesRes.data || [],
  };
}

export async function verifyJoinCode(joinCode, userId, isDemo) {
  const normalized = String(joinCode || "").trim().toUpperCase();
  if (!normalized) {
    throw new Error("Lütfen katılım kodunu girin.");
  }

  if (isDemo || !isSupabaseConfigured) {
    const store = loadDemoStore();
    if (normalized !== String(store.groupSettings.join_code).trim().toUpperCase()) {
      throw new Error("Katılım kodu geçersiz. (Demo varsayılan kod: IDARUN2026)");
    }
    const profile = store.profiles.find((p) => p.id === userId);
    if (profile) {
      profile.is_verified = true;
      saveDemoStore(store);
    }
    return profile;
  }

  const { data, error } = await supabase.functions.invoke("strava-oauth", {
    body: { action: "verify_join_code", joinCode: normalized },
  });
  if (error) throw new Error(error.message || "Katılım kodu doğrulanamadı.");
  if (data?.error) throw new Error(data.error);
  return data.profile;
}

export async function syncStravaActivities(userId, isDemo) {
  if (isDemo || !isSupabaseConfigured) {
    const store = loadDemoStore();
    const settings = store.groupSettings;
    const enabledWindow = settings.run_schedule.find((w) => w.enabled !== false) || {
      day: 2,
      start: "19:00",
    };
    const [startH, startM] = enabledWindow.start.split(":").map(Number);

    const candidateRuns = [
      {
        name: "IdaRun Akşam Grup Koşusu",
        distance_meters: 10850,
        moving_time_seconds: 3190,
        elapsed_time_seconds: 3260,
        total_elevation_gain: 74,
        average_speed: 3.4,
        activity_type: "Run",
        start_date: nextRecentDateForDay(enabledWindow.day, startH, startM + 15),
      },
      {
        name: "Öğle Arası Bireysel Koşu (Takvim Dışı)",
        distance_meters: 6200,
        moving_time_seconds: 1920,
        elapsed_time_seconds: 1980,
        total_elevation_gain: 25,
        average_speed: 3.23,
        activity_type: "Run",
        start_date: nextRecentDateForDay((enabledWindow.day + 1) % 7, 13, 15),
      },
    ];

    let syncedCount = 0;
    let filteredOutCount = 0;

    for (const run of candidateRuns) {
      const qualifies =
        !settings.enforce_schedule ||
        isActivityInSchedule(run.start_date, settings.run_schedule, settings.timezone);

      if (!qualifies) {
        filteredOutCount++;
        continue;
      }

      const uniqueId = Date.now() + syncedCount;
      store.activities.unshift({
        id: `demo-sync-${uniqueId}`,
        user_id: userId,
        strava_activity_id: uniqueId,
        ...run,
        start_date_local: run.start_date,
        is_valid: true,
      });
      syncedCount++;
    }

    const nowIso = new Date().toISOString();
    store.groupSettings.last_sync_at = nowIso;
    saveDemoStore(store);
    return { syncedCount, filteredOutCount, nonRunCount: 0, lastSyncAt: nowIso };
  }

  const { data, error } = await supabase.functions.invoke("strava-sync", {
    body: {},
  });
  if (error) throw new Error(error.message || "Strava senkronizasyonu başarısız.");
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function triggerBatchSync(isDemo) {
  if (isDemo || !isSupabaseConfigured) {
    const store = loadDemoStore();
    const settings = store.groupSettings;
    const verifiedMembers = store.profiles.filter((p) => p.is_verified !== false);
    const enabledWindow = settings.run_schedule.find((w) => w.enabled !== false) || {
      day: 2,
      start: "19:00",
    };
    const [startH, startM] = enabledWindow.start.split(":").map(Number);

    let syncedCount = 0;
    let filteredOutCount = 0;
    const nowMs = Date.now();

    verifiedMembers.slice(0, 2).forEach((member, idx) => {
      const candidateStart = nextRecentDateForDay(enabledWindow.day, startH, startM + 10 + idx * 5);
      const qualifies =
        !settings.enforce_schedule ||
        isActivityInSchedule(candidateStart, settings.run_schedule, settings.timezone);

      if (!qualifies) {
        filteredOutCount++;
        return;
      }

      const uniqueId = nowMs + idx;
      store.activities.unshift({
        id: `demo-batch-${uniqueId}`,
        user_id: member.id,
        strava_activity_id: uniqueId,
        name: "Toplu Senkronize Grup Koşusu",
        distance_meters: 9400 + idx * 1200,
        moving_time_seconds: 2850 + idx * 320,
        elapsed_time_seconds: 2920 + idx * 340,
        total_elevation_gain: 55 + idx * 20,
        average_speed: 3.3,
        activity_type: "Run",
        start_date: candidateStart,
        start_date_local: candidateStart,
        is_valid: true,
      });
      syncedCount++;
    });

    const ranAt = new Date().toISOString();
    const summary = {
      trigger: "manual",
      totalUsers: verifiedMembers.length,
      syncedUsers: verifiedMembers.length,
      syncedCount,
      filteredOutCount,
      nonRunCount: 0,
      failedCount: 0,
      ranAt,
    };

    store.groupSettings.last_sync_at = ranAt;
    store.groupSettings.last_batch_sync_at = ranAt;
    store.groupSettings.last_batch_sync_summary = summary;
    saveDemoStore(store);

    return { skipped: false, ...summary, lastSyncAt: ranAt };
  }

  const { data, error } = await supabase.functions.invoke("strava-batch-sync", {
    body: { trigger: "manual" },
  });
  if (error) throw new Error(error.message || "Toplu Strava senkronizasyonu başarısız.");
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function updateGroupSettings(updates, isDemo) {
  if (isDemo || !isSupabaseConfigured) {
    const store = loadDemoStore();
    store.groupSettings = {
      ...store.groupSettings,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    saveDemoStore(store);
    return store.groupSettings;
  }

  const { data, error } = await supabase
    .from("group_settings")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", 1)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function saveCheckpoint(checkpoint, isDemo) {
  const normalizedInput = {
    ...checkpoint,
    order_index: Number(checkpoint.order_index),
    target_km: Number(checkpoint.target_km),
    lat: Number(checkpoint.lat),
    lng: Number(checkpoint.lng),
  };

  if (isDemo || !isSupabaseConfigured) {
    const store = loadDemoStore();
    const prepared = normalizedInput.id
      ? normalizedInput
      : { ...normalizedInput, id: `cp-${Date.now()}` };
    store.checkpoints = reorderCheckpoints(store.checkpoints, prepared);
    saveDemoStore(store);
    return store.checkpoints;
  }

  const { data: currentCheckpoints, error: fetchError } = await supabase
    .from("checkpoints")
    .select("*")
    .order("order_index", { ascending: true })
    .order("target_km", { ascending: true });
  if (fetchError) throw fetchError;

  const existingList = currentCheckpoints || [];
  const tempNewId = "__new_checkpoint__";
  const incoming = normalizedInput.id
    ? normalizedInput
    : { ...normalizedInput, id: tempNewId };

  const reordered = reorderCheckpoints(existingList, incoming);
  const originalOrderMap = new Map(
    existingList.map((cp) => [cp.id, Number(cp.order_index)])
  );

  const shiftUpdates = reordered
    .filter((cp) => cp.id !== incoming.id && originalOrderMap.get(cp.id) !== cp.order_index)
    .map((cp) =>
      supabase
        .from("checkpoints")
        .update({ order_index: cp.order_index })
        .eq("id", cp.id)
    );

  if (shiftUpdates.length > 0) {
    const shiftResults = await Promise.all(shiftUpdates);
    const failedShift = shiftResults.find((r) => r.error);
    if (failedShift) throw failedShift.error;
  }

  const targetItem = reordered.find((cp) => cp.id === incoming.id);

  if (checkpoint.id) {
    const { error } = await supabase
      .from("checkpoints")
      .update({
        order_index: targetItem.order_index,
        name: targetItem.name,
        country: targetItem.country,
        description: targetItem.description,
        target_km: targetItem.target_km,
        lat: targetItem.lat,
        lng: targetItem.lng,
      })
      .eq("id", checkpoint.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("checkpoints").insert({
      order_index: targetItem.order_index,
      name: targetItem.name,
      country: targetItem.country,
      description: targetItem.description,
      target_km: targetItem.target_km,
      lat: targetItem.lat,
      lng: targetItem.lng,
    });
    if (error) throw error;
  }

  const { data, error } = await supabase
    .from("checkpoints")
    .select("*")
    .order("order_index", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function deleteCheckpoint(checkpointId, isDemo) {
  if (isDemo || !isSupabaseConfigured) {
    const store = loadDemoStore();
    const remaining = store.checkpoints.filter((c) => c.id !== checkpointId);
    store.checkpoints = reorderCheckpoints(remaining);
    saveDemoStore(store);
    return store.checkpoints;
  }

  const { error } = await supabase.from("checkpoints").delete().eq("id", checkpointId);
  if (error) throw error;

  const { data: currentCheckpoints, error: fetchError } = await supabase
    .from("checkpoints")
    .select("*")
    .order("order_index", { ascending: true })
    .order("target_km", { ascending: true });
  if (fetchError) throw fetchError;

  const existingList = currentCheckpoints || [];
  const reordered = reorderCheckpoints(existingList);
  const originalOrderMap = new Map(
    existingList.map((cp) => [cp.id, Number(cp.order_index)])
  );

  const shiftUpdates = reordered
    .filter((cp) => originalOrderMap.get(cp.id) !== cp.order_index)
    .map((cp) =>
      supabase
        .from("checkpoints")
        .update({ order_index: cp.order_index })
        .eq("id", cp.id)
    );

  if (shiftUpdates.length > 0) {
    const shiftResults = await Promise.all(shiftUpdates);
    const failedShift = shiftResults.find((r) => r.error);
    if (failedShift) throw failedShift.error;
  }

  return reordered;
}

export async function toggleActivityValidity(activityId, nextValid, isDemo) {
  if (isDemo || !isSupabaseConfigured) {
    const store = loadDemoStore();
    store.activities = store.activities.map((a) =>
      a.id === activityId ? { ...a, is_valid: nextValid } : a
    );
    saveDemoStore(store);
    return;
  }

  const { error } = await supabase
    .from("activities")
    .update({ is_valid: nextValid })
    .eq("id", activityId);
  if (error) throw error;
}

export async function deleteActivity(activityId, isDemo) {
  if (isDemo || !isSupabaseConfigured) {
    const store = loadDemoStore();
    store.activities = store.activities.filter((a) => a.id !== activityId);
    saveDemoStore(store);
    return;
  }

  const { error } = await supabase.from("activities").delete().eq("id", activityId);
  if (error) throw error;
}

export async function disconnectStravaAccount(userId, isDemo) {
  if (isDemo || !isSupabaseConfigured) {
    const store = loadDemoStore();
    const beforeCount = store.activities.length;
    store.activities = store.activities.filter((a) => a.user_id !== userId);
    const deletedActivities = beforeCount - store.activities.length;
    saveDemoStore(store);
    return {
      revoked: true,
      deletedActivities,
      deletedAt: new Date().toISOString(),
    };
  }

  const { data, error } = await supabase.functions.invoke("strava-oauth", {
    body: { action: "disconnect" },
  });
  if (error) throw new Error(error.message || "Strava bağlantısı kaldırılamadı.");
  if (data?.error) throw new Error(data.error);
  return data;
}
