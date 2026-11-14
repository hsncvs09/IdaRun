const STORAGE_KEY = "idarun_demo_store_v1";

function daysAgoIso(daysAgo, hour = 19, minute = 30) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function getRecentScheduleDate(targetDay, weeksAgo = 0, hour = 19, minute = 30) {
  const now = new Date();
  const currentDay = now.getDay();
  let diff = currentDay - targetDay;
  if (diff < 0) diff += 7;
  const d = new Date(now);
  d.setDate(now.getDate() - diff - weeksAgo * 7);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export const INITIAL_DEMO_DATA = {
  groupSettings: {
    id: 1,
    challenge_title: "Akçay'dan Tokyo'ya Kolektif Koşu",
    origin_name: "Akçay",
    destination_name: "Tokyo",
    target_distance_km: 9500,
    join_code: "IDARUN2026",
    challenge_start_date: "2026-01-01T00:00:00+03:00",
    timezone: "Europe/Istanbul",
    enforce_schedule: true,
    auto_sync_enabled: true,
    auto_sync_mode: "after_schedule",
    auto_sync_delay_minutes: 60,
    auto_sync_time: "22:30",
    last_sync_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    last_batch_sync_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    last_batch_sync_summary: {
      trigger: "scheduled",
      totalUsers: 6,
      syncedUsers: 6,
      syncedCount: 9,
      filteredOutCount: 1,
      failedCount: 0,
    },
    run_schedule: [
      { id: "tue-eve", day: 2, label: "Salı Akşam", start: "19:00", end: "21:30", enabled: true },
      { id: "thu-eve", day: 4, label: "Perşembe Akşam", start: "19:00", end: "21:30", enabled: true },
      { id: "sun-morn", day: 0, label: "Pazar Sabah", start: "07:30", end: "11:00", enabled: true },
    ],
  },
  checkpoints: [
    { id: "cp-1", order_index: 1, name: "Akçay", country: "Türkiye", description: "Kazdağları eteklerinden büyük yolculuğun başlangıç noktası.", target_km: 0, lat: 39.5858, lng: 26.9242 },
    { id: "cp-2", order_index: 2, name: "İstanbul", country: "Türkiye", description: "Boğaz geçişi ve Asya kıtasına ilk adım.", target_km: 380, lat: 41.0082, lng: 28.9784 },
    { id: "cp-3", order_index: 3, name: "Tiflis", country: "Gürcistan", description: "Kafkas dağlarının kapısı ve Kura Nehri vadisi.", target_km: 1820, lat: 41.7151, lng: 44.8271 },
    { id: "cp-4", order_index: 4, name: "Bakü", country: "Azerbaycan", description: "Hazar Denizi kıyısında rüzgarlı sahil etabı.", target_km: 2370, lat: 40.4093, lng: 49.8671 },
    { id: "cp-5", order_index: 5, name: "Taşkent", country: "Özbekistan", description: "İpek Yolu'nun kalbinde Orta Asya geçişi.", target_km: 3950, lat: 41.2995, lng: 69.2401 },
    { id: "cp-6", order_index: 6, name: "Almatı", country: "Kazakistan", description: "Tanrı Dağları eteklerinde yüksek irtifa durağı.", target_km: 4760, lat: 43.222, lng: 76.8512 },
    { id: "cp-7", order_index: 7, name: "Urumçi", country: "Çin", description: "Gobi ve Taklamakan eşiğinde Doğu'ya doğru.", target_km: 5780, lat: 43.8256, lng: 87.6168 },
    { id: "cp-8", order_index: 8, name: "Lanzhou", country: "Çin", description: "Sarı Nehir kıyısında tarihi İpek Yolu kavşağı.", target_km: 7150, lat: 36.0611, lng: 103.8343 },
    { id: "cp-9", order_index: 9, name: "Pekin", country: "Çin", description: "Uzak Doğu'nun metropol kapısı ve son binlik öncesi.", target_km: 8320, lat: 39.9042, lng: 116.4074 },
    { id: "cp-10", order_index: 10, name: "Seul", country: "Güney Kore", description: "Han Nehri boyunca hızlı tempo Kore etabı.", target_km: 8950, lat: 37.5665, lng: 126.978 },
    { id: "cp-11", order_index: 11, name: "Osaka", country: "Japonya", description: "Pasifik adalarına varış ve son 220 km geri sayımı.", target_km: 9280, lat: 34.6937, lng: 135.5023 },
    { id: "cp-12", order_index: 12, name: "Tokyo", country: "Japonya", description: "Büyük hedef! IdaRun kolektif koşu grubunun varış noktası.", target_km: 9500, lat: 35.6762, lng: 139.6503 },
  ],
  profiles: [
    { id: "demo-member-1", strava_athlete_id: 100101, full_name: "Deniz Kaya", avatar_url: null, role: "member", is_verified: true },
    { id: "demo-admin-1", strava_athlete_id: 100102, full_name: "Hasan Çavuş", avatar_url: null, role: "admin", is_verified: true },
    { id: "demo-member-2", strava_athlete_id: 100103, full_name: "Ece Yılmaz", avatar_url: null, role: "member", is_verified: true },
    { id: "demo-member-3", strava_athlete_id: 100104, full_name: "Mert Aksoy", avatar_url: null, role: "member", is_verified: true },
    { id: "demo-member-4", strava_athlete_id: 100105, full_name: "Zeynep Demir", avatar_url: null, role: "member", is_verified: true },
    { id: "demo-member-5", strava_athlete_id: 100106, full_name: "Caner Özkan", avatar_url: null, role: "member", is_verified: true },
  ],
  activities: [
    {
      id: "act-1",
      user_id: "demo-admin-1",
      strava_activity_id: 90001,
      name: "Kazdağları Uzun Pazar Koşusu",
      distance_meters: 24500,
      moving_time_seconds: 7350,
      elapsed_time_seconds: 7600,
      total_elevation_gain: 540,
      average_speed: 3.33,
      activity_type: "TrailRun",
      start_date: getRecentScheduleDate(0, 0, 8, 0),
      start_date_local: getRecentScheduleDate(0, 0, 8, 0),
      is_valid: true,
    },
    {
      id: "act-2",
      user_id: "demo-admin-1",
      strava_activity_id: 90002,
      name: "Akçay Sahil Tempo",
      distance_meters: 14200,
      moving_time_seconds: 3980,
      elapsed_time_seconds: 4050,
      total_elevation_gain: 68,
      average_speed: 3.57,
      activity_type: "Run",
      start_date: getRecentScheduleDate(2, 0, 19, 30),
      start_date_local: getRecentScheduleDate(2, 0, 19, 30),
      is_valid: true,
    },
    {
      id: "act-3",
      user_id: "demo-member-1",
      strava_activity_id: 90003,
      name: "Altınkum – Güre İnterval",
      distance_meters: 12400,
      moving_time_seconds: 3600,
      elapsed_time_seconds: 3720,
      total_elevation_gain: 85,
      average_speed: 3.44,
      activity_type: "Run",
      start_date: getRecentScheduleDate(4, 0, 19, 45),
      start_date_local: getRecentScheduleDate(4, 0, 19, 45),
      is_valid: true,
    },
    {
      id: "act-4",
      user_id: "demo-member-1",
      strava_activity_id: 90004,
      name: "Zeytinli Çayı Pazar Etabı",
      distance_meters: 18600,
      moving_time_seconds: 5620,
      elapsed_time_seconds: 5800,
      total_elevation_gain: 210,
      average_speed: 3.31,
      activity_type: "Run",
      start_date: getRecentScheduleDate(0, 1, 8, 15),
      start_date_local: getRecentScheduleDate(0, 1, 8, 15),
      is_valid: true,
    },
    {
      id: "act-5",
      user_id: "demo-member-2",
      strava_activity_id: 90005,
      name: "Salı Grup Koşusu — Akçay",
      distance_meters: 15800,
      moving_time_seconds: 4520,
      elapsed_time_seconds: 4610,
      total_elevation_gain: 95,
      average_speed: 3.5,
      activity_type: "Run",
      start_date: getRecentScheduleDate(2, 0, 19, 15),
      start_date_local: getRecentScheduleDate(2, 0, 19, 15),
      is_valid: true,
    },
    {
      id: "act-6",
      user_id: "demo-member-2",
      strava_activity_id: 90006,
      name: "Sütüven Şelalesi Tırmanışı",
      distance_meters: 21200,
      moving_time_seconds: 6900,
      elapsed_time_seconds: 7200,
      total_elevation_gain: 620,
      average_speed: 3.07,
      activity_type: "TrailRun",
      start_date: getRecentScheduleDate(0, 2, 7, 45),
      start_date_local: getRecentScheduleDate(0, 2, 7, 45),
      is_valid: true,
    },
    {
      id: "act-7",
      user_id: "demo-member-3",
      strava_activity_id: 90007,
      name: "Perşembe Hız Antrenmanı",
      distance_meters: 11200,
      moving_time_seconds: 2980,
      elapsed_time_seconds: 3040,
      total_elevation_gain: 42,
      average_speed: 3.76,
      activity_type: "Run",
      start_date: getRecentScheduleDate(4, 0, 20, 0),
      start_date_local: getRecentScheduleDate(4, 0, 20, 0),
      is_valid: true,
    },
    {
      id: "act-8",
      user_id: "demo-member-4",
      strava_activity_id: 90008,
      name: "Edremit Körfez Uzun Koşusu",
      distance_meters: 16500,
      moving_time_seconds: 5150,
      elapsed_time_seconds: 5300,
      total_elevation_gain: 135,
      average_speed: 3.2,
      activity_type: "Run",
      start_date: getRecentScheduleDate(0, 0, 8, 30),
      start_date_local: getRecentScheduleDate(0, 0, 8, 30),
      is_valid: true,
    },
    {
      id: "act-9",
      user_id: "demo-member-5",
      strava_activity_id: 90009,
      name: "Kordon Akşam Temposu",
      distance_meters: 10300,
      moving_time_seconds: 3180,
      elapsed_time_seconds: 3250,
      total_elevation_gain: 38,
      average_speed: 3.24,
      activity_type: "Run",
      start_date: getRecentScheduleDate(2, 1, 19, 20),
      start_date_local: getRecentScheduleDate(2, 1, 19, 20),
      is_valid: true,
    },
    // Geçmiş birikimli grup mesafesi (Akçay -> Tiflis sonrası Hazar yolu ~2,145 km)
    {
      id: "act-10",
      user_id: "demo-admin-1",
      strava_activity_id: 90010,
      name: "Kış Sezonu Toplam Birikim Etabı",
      distance_meters: 520000,
      moving_time_seconds: 158000,
      elapsed_time_seconds: 162000,
      total_elevation_gain: 4250,
      average_speed: 3.29,
      activity_type: "Run",
      start_date: daysAgoIso(45, 8, 30),
      start_date_local: daysAgoIso(45, 8, 30),
      is_valid: true,
    },
    {
      id: "act-11",
      user_id: "demo-member-1",
      strava_activity_id: 90011,
      name: "Bahar Hazırlık Serisi",
      distance_meters: 410000,
      moving_time_seconds: 127000,
      elapsed_time_seconds: 130000,
      total_elevation_gain: 2950,
      average_speed: 3.23,
      activity_type: "Run",
      start_date: daysAgoIso(38, 19, 30),
      start_date_local: daysAgoIso(38, 19, 30),
      is_valid: true,
    },
    {
      id: "act-12",
      user_id: "demo-member-2",
      strava_activity_id: 90012,
      name: "Kazdağları Ultra Antrenman Bloğu",
      distance_meters: 485000,
      moving_time_seconds: 154000,
      elapsed_time_seconds: 158000,
      total_elevation_gain: 6800,
      average_speed: 3.15,
      activity_type: "TrailRun",
      start_date: daysAgoIso(34, 8, 0),
      start_date_local: daysAgoIso(34, 8, 0),
      is_valid: true,
    },
    {
      id: "act-13",
      user_id: "demo-member-3",
      strava_activity_id: 90013,
      name: "Körfez Maraton Bloğu",
      distance_meters: 365000,
      moving_time_seconds: 102000,
      elapsed_time_seconds: 104500,
      total_elevation_gain: 1850,
      average_speed: 3.58,
      activity_type: "Run",
      start_date: daysAgoIso(32, 19, 40),
      start_date_local: daysAgoIso(32, 19, 40),
      is_valid: true,
    },
    {
      id: "act-14",
      user_id: "demo-member-4",
      strava_activity_id: 90014,
      name: "Sabah Kulüp Etabı",
      distance_meters: 220000,
      moving_time_seconds: 71000,
      elapsed_time_seconds: 72500,
      total_elevation_gain: 1400,
      average_speed: 3.1,
      activity_type: "Run",
      start_date: daysAgoIso(31, 9, 0),
      start_date_local: daysAgoIso(31, 9, 0),
      is_valid: true,
    },
  ],
};

export function loadDemoStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DEMO_DATA));
      return structuredClone(INITIAL_DEMO_DATA);
    }
    return JSON.parse(raw);
  } catch {
    return structuredClone(INITIAL_DEMO_DATA);
  }
}

export function saveDemoStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function resetDemoStore() {
  const fresh = structuredClone(INITIAL_DEMO_DATA);
  saveDemoStore(fresh);
  return fresh;
}
