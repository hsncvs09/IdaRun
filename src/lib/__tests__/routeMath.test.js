import { describe, expect, it } from "vitest";
import {
  buildLeaderboard,
  computeScheduledSyncPreview,
  formatPace,
  formatSyncTimestamp,
  interpolatePositionOnRoute,
  isActivityInSchedule,
  reorderCheckpoints,
} from "../routeMath";

const SAMPLE_SCHEDULE = [
  { id: "tue", day: 2, label: "Salı Akşam", start: "19:00", end: "21:30", enabled: true },
  { id: "sun", day: 0, label: "Pazar Sabah", start: "07:30", end: "11:00", enabled: true },
  { id: "off", day: 3, label: "Çarşamba", start: "12:00", end: "14:00", enabled: false },
];

const SAMPLE_CHECKPOINTS = [
  { id: "1", order_index: 1, name: "Akçay", target_km: 0, lat: 40.0, lng: 27.0 },
  { id: "2", order_index: 2, name: "İstanbul", target_km: 400, lat: 41.0, lng: 29.0 },
  { id: "3", order_index: 3, name: "Tokyo", target_km: 1000, lat: 35.0, lng: 139.0 },
];

describe("isActivityInSchedule (Europe/Istanbul)", () => {
  it("Salı 19:30 Istanbul saatindeki koşuyu kabul eder", () => {
    // 2026-11-10 is Tuesday. 19:30 TRT (UTC+3) = 16:30 UTC
    expect(isActivityInSchedule("2026-11-10T16:30:00Z", SAMPLE_SCHEDULE, "Europe/Istanbul")).toBe(true);
  });

  it("Salı 21:31 Istanbul saatindeki koşuyu reddeder", () => {
    expect(isActivityInSchedule("2026-11-10T18:31:00Z", SAMPLE_SCHEDULE, "Europe/Istanbul")).toBe(false);
  });

  it("Devre dışı penceredeki Çarşamba koşusunu reddeder", () => {
    // 2026-11-11 is Wednesday. 12:30 TRT = 09:30 UTC
    expect(isActivityInSchedule("2026-11-11T09:30:00Z", SAMPLE_SCHEDULE, "Europe/Istanbul")).toBe(false);
  });
});

describe("interpolatePositionOnRoute", () => {
  it("0 km iken başlangıç noktasını döner", () => {
    const res = interpolatePositionOnRoute(SAMPLE_CHECKPOINTS, 0, 1000);
    expect(res.runnerPosition).toEqual([40.0, 27.0]);
    expect(res.currentCheckpoint.name).toBe("Akçay");
    expect(res.nextCheckpoint.name).toBe("İstanbul");
    expect(res.progressPct).toBe(0);
  });

  it("200 km iken Akçay ve İstanbul orta noktasını döner", () => {
    const res = interpolatePositionOnRoute(SAMPLE_CHECKPOINTS, 200, 1000);
    expect(res.runnerPosition[0]).toBeCloseTo(40.5, 4);
    expect(res.runnerPosition[1]).toBeCloseTo(28.0, 4);
    expect(res.progressPct).toBeCloseTo(20, 4);
  });

  it("hedef aşıldığında Tokyo'da %100 olarak sabitlenir", () => {
    const res = interpolatePositionOnRoute(SAMPLE_CHECKPOINTS, 1500, 1000);
    expect(res.runnerPosition).toEqual([35.0, 139.0]);
    expect(res.progressPct).toBe(100);
    expect(res.nextCheckpoint).toBeNull();
  });
});

describe("formatPace & buildLeaderboard", () => {
  it("pace formatını doğru hesaplar", () => {
    expect(formatPace(3000, 10000)).toBe("5:00");
    expect(formatPace(0, 0)).toBe("--:--");
  });

  it("geçersiz aktiviteleri hariç tutup metriğe göre sıralar", () => {
    const profiles = [
      { id: "u1", full_name: "Ali", role: "member" },
      { id: "u2", full_name: "Veli", role: "member" },
    ];
    const activities = [
      {
        user_id: "u1",
        distance_meters: 10000,
        moving_time_seconds: 3000,
        total_elevation_gain: 50,
        start_date: "2026-11-10T16:30:00Z",
        is_valid: true,
      },
      {
        user_id: "u2",
        distance_meters: 15000,
        moving_time_seconds: 5400,
        total_elevation_gain: 300,
        start_date: "2026-11-10T16:30:00Z",
        is_valid: true,
      },
      {
        user_id: "u1",
        distance_meters: 99000,
        moving_time_seconds: 3000,
        total_elevation_gain: 999,
        start_date: "2026-11-10T16:30:00Z",
        is_valid: false,
      },
    ];

    const byDistance = buildLeaderboard(profiles, activities, { period: "all", sortBy: "distance" });
    expect(byDistance[0].userId).toBe("u2");
    expect(byDistance[1].totalDistanceKm).toBe(10);

    const byPace = buildLeaderboard(profiles, activities, { period: "all", sortBy: "pace" });
    expect(byPace[0].userId).toBe("u1"); // 5:00/km faster than 6:00/km
  });
});

describe("computeScheduledSyncPreview & formatSyncTimestamp", () => {
  it("koşu takvimi bitişine göre çalışma anlarını ve gece yarısı taşmasını hesaplar", () => {
    expect(
      computeScheduledSyncPreview({
        run_schedule: SAMPLE_SCHEDULE,
        auto_sync_enabled: true,
        auto_sync_mode: "after_schedule",
        auto_sync_delay_minutes: 60,
      })
    ).toEqual(["Salı 22:30", "Pazar 12:00"]);

    expect(
      computeScheduledSyncPreview({
        run_schedule: [{ id: "late", day: 6, label: "Cts", start: "22:00", end: "23:30", enabled: true }],
        auto_sync_enabled: true,
        auto_sync_mode: "after_schedule",
        auto_sync_delay_minutes: 60,
      })
    ).toEqual(["Pazar 00:30"]);
  });

  it("sabit saat modu ve kapalı durum için doğru önizleme döner", () => {
    expect(
      computeScheduledSyncPreview({
        auto_sync_enabled: true,
        auto_sync_mode: "fixed_daily",
        auto_sync_time: "23:15",
      })
    ).toEqual(["Her gün 23:15"]);

    expect(
      computeScheduledSyncPreview({
        run_schedule: SAMPLE_SCHEDULE,
        auto_sync_enabled: false,
      })
    ).toEqual([]);
  });

  it("son senkronizasyon tarihini formatlar ve geçersiz değerde null döner", () => {
    expect(formatSyncTimestamp(null)).toBeNull();
    expect(formatSyncTimestamp("invalid-date")).toBeNull();
    expect(formatSyncTimestamp("2026-11-10T16:30:00Z")).toBeTruthy();
  });
});

describe("reorderCheckpoints", () => {
  it("araya yeni durak eklendiğinde sonraki durakların sırasını 1'den N'e yeniden düzenler", () => {
    const result = reorderCheckpoints(SAMPLE_CHECKPOINTS, {
      id: "new-cp",
      order_index: 2,
      name: "Bursa",
      target_km: 200,
    });

    expect(result.map((c) => [c.name, c.order_index])).toEqual([
      ["Akçay", 1],
      ["Bursa", 2],
      ["İstanbul", 3],
      ["Tokyo", 4],
    ]);
  });

  it("mevcut bir durağın sırası güncellendiğinde tüm durakları çakışmasız yeniden sıralar", () => {
    const four = [
      { id: "1", order_index: 1, name: "Akçay", target_km: 0 },
      { id: "2", order_index: 2, name: "İstanbul", target_km: 400 },
      { id: "3", order_index: 3, name: "Tiflis", target_km: 1800 },
      { id: "4", order_index: 4, name: "Tokyo", target_km: 9500 },
    ];

    // #4 olan durağı #2'ye taşı
    const movedUp = reorderCheckpoints(four, { id: "4", order_index: 2, name: "Tokyo" });
    expect(movedUp.map((c) => [c.name, c.order_index])).toEqual([
      ["Akçay", 1],
      ["Tokyo", 2],
      ["İstanbul", 3],
      ["Tiflis", 4],
    ]);

    // #1 olan durağı #3'e taşı
    const movedDown = reorderCheckpoints(four, { id: "1", order_index: 3, name: "Akçay" });
    expect(movedDown.map((c) => [c.name, c.order_index])).toEqual([
      ["İstanbul", 1],
      ["Tiflis", 2],
      ["Akçay", 3],
      ["Tokyo", 4],
    ]);
  });

  it("önceden aynı sıra numarasına sahip duraklar varsa veya aradan durak silindiyse boşluk/çakışma bırakmaz", () => {
    const duplicated = [
      { id: "1", order_index: 1, name: "Akçay", target_km: 0 },
      { id: "2", order_index: 2, name: "Bursa", target_km: 200 },
      { id: "3", order_index: 2, name: "İstanbul", target_km: 400 },
      { id: "4", order_index: 5, name: "Tokyo", target_km: 9500 },
    ];

    const repaired = reorderCheckpoints(duplicated);
    expect(repaired.map((c) => [c.name, c.order_index])).toEqual([
      ["Akçay", 1],
      ["Bursa", 2],
      ["İstanbul", 3],
      ["Tokyo", 4],
    ]);

    const afterInsert = reorderCheckpoints(duplicated, {
      id: "3",
      order_index: 2,
      name: "İstanbul",
    });
    expect(afterInsert.map((c) => [c.name, c.order_index])).toEqual([
      ["Akçay", 1],
      ["İstanbul", 2],
      ["Bursa", 3],
      ["Tokyo", 4],
    ]);
  });

  it("sınır dışı sıra numaralarını [1, N] aralığına sabitler", () => {
    const tooLow = reorderCheckpoints(SAMPLE_CHECKPOINTS, {
      id: "new-low",
      order_index: -3,
      name: "Başlangıç",
      target_km: 0,
    });
    expect(tooLow[0]).toMatchObject({ name: "Başlangıç", order_index: 1 });

    const tooHigh = reorderCheckpoints(SAMPLE_CHECKPOINTS, {
      id: "new-high",
      order_index: 99,
      name: "Son",
      target_km: 9900,
    });
    expect(tooHigh[tooHigh.length - 1]).toMatchObject({ name: "Son", order_index: 4 });
  });
});
