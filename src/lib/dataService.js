import { supabase, isSupabaseConfigured } from "./supabase";
import { loadDemoStore, saveDemoStore } from "./demoData";
import { isActivityInSchedule } from "./routeMath";

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

    saveDemoStore(store);
    return { syncedCount, filteredOutCount, nonRunCount: 0 };
  }

  const { data, error } = await supabase.functions.invoke("strava-sync", {
    body: {},
  });
  if (error) throw new Error(error.message || "Strava senkronizasyonu başarısız.");
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
  if (isDemo || !isSupabaseConfigured) {
    const store = loadDemoStore();
    if (checkpoint.id) {
      store.checkpoints = store.checkpoints.map((cp) =>
        cp.id === checkpoint.id ? { ...cp, ...checkpoint } : cp
      );
    } else {
      store.checkpoints.push({
        ...checkpoint,
        id: `cp-${Date.now()}`,
      });
    }
    store.checkpoints.sort((a, b) => Number(a.order_index) - Number(b.order_index));
    saveDemoStore(store);
    return store.checkpoints;
  }

  if (checkpoint.id) {
    const { error } = await supabase
      .from("checkpoints")
      .update({
        order_index: Number(checkpoint.order_index),
        name: checkpoint.name,
        country: checkpoint.country,
        description: checkpoint.description,
        target_km: Number(checkpoint.target_km),
        lat: Number(checkpoint.lat),
        lng: Number(checkpoint.lng),
      })
      .eq("id", checkpoint.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("checkpoints").insert({
      order_index: Number(checkpoint.order_index),
      name: checkpoint.name,
      country: checkpoint.country,
      description: checkpoint.description,
      target_km: Number(checkpoint.target_km),
      lat: Number(checkpoint.lat),
      lng: Number(checkpoint.lng),
    });
    if (error) throw error;
  }

  const { data, error } = await supabase
    .from("checkpoints")
    .select("*")
    .order("order_index", { ascending: true });
  if (error) throw error;
  return data;
}

export async function deleteCheckpoint(checkpointId, isDemo) {
  if (isDemo || !isSupabaseConfigured) {
    const store = loadDemoStore();
    store.checkpoints = store.checkpoints.filter((c) => c.id !== checkpointId);
    saveDemoStore(store);
    return store.checkpoints;
  }

  const { error } = await supabase.from("checkpoints").delete().eq("id", checkpointId);
  if (error) throw error;
  const { data } = await supabase.from("checkpoints").select("*").order("order_index", { ascending: true });
  return data || [];
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
