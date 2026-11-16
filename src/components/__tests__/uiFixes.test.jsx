import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Leaderboard from "../Leaderboard";
import Navbar from "../Navbar";

const mockMap = {
  attributionControl: { remove: vi.fn() },
  fitBounds: vi.fn(),
  flyTo: vi.fn(),
  closePopup: vi.fn(),
};

const mockOpenPopup = vi.fn();

vi.mock("react-leaflet", async () => {
  const ReactMod = await import("react");
  return {
    MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
    TileLayer: () => null,
    Polyline: () => null,
    Popup: ({ children }) => <div>{children}</div>,
    Marker: ReactMod.forwardRef(({ children }, ref) => {
      ReactMod.useImperativeHandle(ref, () => ({
        openPopup: mockOpenPopup,
      }));
      return <div>{children}</div>;
    }),
    useMap: () => mockMap,
  };
});

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    profile: { id: "u1", role: "member", full_name: "Test Koşucu" },
    isDemo: true,
    logout: vi.fn(),
  }),
}));

import MapTracker from "../MapTracker";

describe("Leaderboard varsayılan dönem seçimi", () => {
  it("ilk açılışta 'Bu Hafta' seçili gelir", () => {
    const now = new Date();
    const lastMonth = new Date(now);
    lastMonth.setDate(now.getDate() - 40);

    const profiles = [
      { id: "u1", full_name: "Bu Hafta Koşucusu", role: "member" },
      { id: "u2", full_name: "Eski Koşucu", role: "member" },
    ];
    const activities = [
      {
        id: "a1",
        user_id: "u1",
        distance_meters: 10000,
        moving_time_seconds: 3000,
        total_elevation_gain: 50,
        start_date: now.toISOString(),
        is_valid: true,
      },
      {
        id: "a2",
        user_id: "u2",
        distance_meters: 50000,
        moving_time_seconds: 15000,
        total_elevation_gain: 200,
        start_date: lastMonth.toISOString(),
        is_valid: true,
      },
    ];

    render(<Leaderboard profiles={profiles} activities={activities} currentUserId="u1" />);

    const thisWeekBtn = screen.getByRole("button", { name: "Bu Hafta" });
    const allTimeBtn = screen.getByRole("button", { name: "Tüm Zamanlar" });

    expect(thisWeekBtn.className).toContain("bg-obsidian-700");
    expect(allTimeBtn.className).not.toContain("bg-obsidian-700");

    // Bu Hafta seçiliyken u1 10.0 km ile 0.0 km olan u2'nin önünde olmalı
    const distanceTexts = screen.getAllByText(/\d+\.\d km/);
    expect(distanceTexts[0].textContent).toBe("10.0 km");

    // Tüm Zamanlar'a geçince 50.0 km öne geçmeli
    fireEvent.click(allTimeBtn);
    expect(allTimeBtn.className).toContain("bg-obsidian-700");
    const updatedDistances = screen.getAllByText(/\d+\.\d km/);
    expect(updatedDistances[0].textContent).toBe("50.0 km");
  });
});

describe("MapTracker Tüm Rota davranışı", () => {
  const checkpoints = [
    { id: "cp-1", order_index: 1, name: "Akçay", country: "Türkiye", target_km: 0, lat: 39.58, lng: 26.92 },
    { id: "cp-2", order_index: 2, name: "İstanbul", country: "Türkiye", target_km: 380, lat: 41.0, lng: 28.97 },
    { id: "cp-3", order_index: 3, name: "Tokyo", country: "Japonya", target_km: 9500, lat: 35.67, lng: 139.65 },
  ];

  beforeEach(() => {
    vi.useFakeTimers();
    mockMap.fitBounds.mockClear();
    mockMap.flyTo.mockClear();
    mockMap.closePopup.mockClear();
    mockOpenPopup.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("durak seçildikten sonra Tüm Rota butonuna basıldığında açık durak kartını (popup) kapatır", () => {
    render(<MapTracker checkpoints={checkpoints} totalGroupKm={120} targetDistanceKm={9500} />);

    // İlk yüklemede otomatik fitBounds çalışır, closePopup çağrılmaz
    expect(mockMap.fitBounds).toHaveBeenCalledTimes(1);
    expect(mockMap.closePopup).not.toHaveBeenCalled();

    // Bir durak seçilir
    const istanbulBtn = screen.getByRole("button", { name: /İstanbul/i });
    fireEvent.click(istanbulBtn);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(mockMap.flyTo).toHaveBeenCalledTimes(1);
    expect(mockOpenPopup).toHaveBeenCalledTimes(1);

    // Tüm Rota butonuna tıklanınca popup kapatılmalı ve fitBounds tekrar çalışmalı
    const fitAllBtn = screen.getByRole("button", { name: /Tüm Rota/i });
    fireEvent.click(fitAllBtn);
    expect(mockMap.closePopup).toHaveBeenCalledTimes(1);
    expect(mockMap.fitBounds).toHaveBeenCalledTimes(2);
  });

  it("durak seçimi hemen ardından Tüm Rota'ya basılırsa bekleyen popup açma zamanlayıcısını iptal eder", () => {
    render(<MapTracker checkpoints={checkpoints} totalGroupKm={120} targetDistanceKm={9500} />);

    fireEvent.click(screen.getByRole("button", { name: /İstanbul/i }));
    // 350ms dolmadan Tüm Rota'ya basılır
    fireEvent.click(screen.getByRole("button", { name: /Tüm Rota/i }));

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(mockMap.closePopup).toHaveBeenCalledTimes(1);
    expect(mockOpenPopup).not.toHaveBeenCalled();
  });
  it("harita üzerindeki Konum ve Tüm Rota butonları alt menü (z-40) altında kalacak şekilde izole edilir", () => {
    render(<MapTracker checkpoints={checkpoints} totalGroupKm={120} targetDistanceKm={9500} />);

    const mapWrapper = screen.getByTestId("map-wrapper");
    expect(mapWrapper.className).toContain("z-0");
    expect(mapWrapper.className).toContain("isolate");

    const quickActions = screen.getByTestId("map-quick-actions");
    expect(quickActions.className).toContain("z-20");
    expect(quickActions.className).not.toContain("z-[400]");
  });
});

describe("Navbar iPhone PWA safe-area desteği", () => {
  it("üst başlık çubuğunda env(safe-area-inset-top) boşluğu ve 'Kazdağları Running' başlığı bulunur", () => {
    const { container } = render(
      <MemoryRouter>
        <Navbar onSync={vi.fn()} syncing={false} />
      </MemoryRouter>
    );

    const header = container.querySelector("header");
    expect(header).not.toBeNull();
    expect(header.className).toContain("pt-[env(safe-area-inset-top)]");
    expect(header.className).toContain("z-40");
    expect(screen.getByText("Kazdağları Running")).toBeInTheDocument();
    expect(document.getElementById("navbar-sync-btn")).toBeInTheDocument();
    expect(document.getElementById("logout-btn")).toBeInTheDocument();
  });
});

describe("AdminPanel toplu senkronizasyon ve zamanlama parametreleri", () => {
  it("admin manuel toplu senkronizasyon butonunu çalıştırır ve zamanlama önizlemesini gösterir", async () => {
    const { default: AdminPanel } = await import("../AdminPanel");
    const { ToastProvider } = await import("../ToastProvider");
    const dataService = await import("../../lib/dataService");
    const batchSpy = vi.spyOn(dataService, "triggerBatchSync").mockResolvedValue({
      skipped: false,
      syncedUsers: 2,
      totalUsers: 2,
      syncedCount: 3,
      failedCount: 0,
    });
    const onRefresh = vi.fn().mockResolvedValue(undefined);

    const settings = {
      challenge_title: "IdaRun Test",
      target_distance_km: 9500,
      join_code: "IDARUN2026",
      challenge_start_date: "2026-01-01T00:00:00+03:00",
      timezone: "Europe/Istanbul",
      enforce_schedule: true,
      auto_sync_enabled: true,
      auto_sync_mode: "after_schedule",
      auto_sync_delay_minutes: 60,
      auto_sync_time: "22:30",
      last_batch_sync_at: "2026-11-10T19:30:00Z",
      run_schedule: [
        { id: "tue-eve", day: 2, label: "Salı Akşam", start: "19:00", end: "21:30", enabled: true },
      ],
    };

    render(
      <MemoryRouter>
        <ToastProvider>
          <AdminPanel
            settings={settings}
            checkpoints={[]}
            activities={[]}
            profiles={[]}
            isDemo={true}
            onRefresh={onRefresh}
          />
        </ToastProvider>
      </MemoryRouter>
    );

    const batchBtn = document.getElementById("admin-batch-sync-btn");
    expect(batchBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(batchBtn);
    });

    expect(batchSpy).toHaveBeenCalledWith(true);
    expect(onRefresh).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Koşu Takvimi/i }));
    expect(screen.getByText("Otomatik Toplu Strava Senkronizasyonu")).toBeInTheDocument();
    expect(screen.getByText("Salı 22:30")).toBeInTheDocument();

    batchSpy.mockRestore();
  });
});

describe("Dashboard son senkronizasyon tarihi", () => {
  it("anasayfada son senkronizasyon tarihini gösterir", async () => {
    const { default: Dashboard } = await import("../../pages/Dashboard");
    const { ToastProvider } = await import("../ToastProvider");
    const dataService = await import("../../lib/dataService");

    const fetchSpy = vi.spyOn(dataService, "fetchDashboardBundle").mockResolvedValue({
      settings: {
        challenge_title: "Akçay'dan Tokyo'ya Kolektif Koşu",
        target_distance_km: 9500,
        last_sync_at: "2026-11-10T19:30:00Z",
        run_schedule: [
          { id: "wed-eve", day: 3, label: "Çarşamba", start: "18:30", end: "20:00", enabled: true },
          { id: "sun-mor", day: 0, label: "Pazar", start: "08:30", end: "11:00", enabled: true },
        ],
      },
      checkpoints: [
        { id: "cp-1", order_index: 1, name: "Akçay", country: "Türkiye", target_km: 0, lat: 39.58, lng: 26.92 },
      ],
      profiles: [{ id: "u1", full_name: "Test Koşucu", role: "member" }],
      activities: [],
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <ToastProvider>
            <Dashboard />
          </ToastProvider>
        </MemoryRouter>
      );
    });

    const indicator = screen.getByTestId("last-sync-indicator");
    expect(indicator).toBeInTheDocument();
    expect(indicator.textContent).toContain("Son senkronizasyon:");
    expect(indicator.textContent).not.toContain("Henüz yapılmadı");

    const scheduleContainer = screen.getByTestId("group-schedule-container");
    expect(scheduleContainer.className).toContain("flex-col");
    const schedulePills = screen.getByTestId("group-schedule-pills");
    expect(schedulePills.children).toHaveLength(2);

    expect(screen.getAllByTestId("powered-by-strava-badge")).toHaveLength(1);

    fetchSpy.mockRestore();
  });
});

describe("Strava Marka Yönergeleri (Brand Guidelines) uyumluluğu", () => {
  it("Login sayfasında resmi 'Connect with STRAVA' butonu ve 'Powered by Strava' rozeti bulunur", async () => {
    const { default: Login } = await import("../../pages/Login");

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const connectBtn = document.getElementById("strava-login-btn");
    expect(connectBtn).toBeInTheDocument();
    expect(connectBtn.textContent).toContain("Connect with");
    expect(connectBtn.textContent).toContain("STRAVA");
    expect(connectBtn.className).toContain("bg-[#FC5200]");

    const badge = screen.getByTestId("powered-by-strava-badge");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("href", "https://www.strava.com");
  });

  it("Profile sayfasında her aktivite için 'View on Strava' bağlantısı, tek Powered by Strava rozeti ve bağlantı kesme kontrolü bulunur", async () => {
    const { default: Profile } = await import("../../pages/Profile");
    const { ToastProvider } = await import("../ToastProvider");
    const dataService = await import("../../lib/dataService");

    const fetchSpy = vi.spyOn(dataService, "fetchDashboardBundle").mockResolvedValue({
      settings: {},
      checkpoints: [],
      profiles: [{ id: "u1", full_name: "Test Koşucu", role: "member", strava_athlete_id: 100101 }],
      activities: [
        {
          id: "act-1",
          user_id: "u1",
          strava_activity_id: 90001,
          name: "Kazdağları Uzun Pazar Koşusu",
          distance_meters: 24500,
          moving_time_seconds: 7350,
          total_elevation_gain: 540,
          activity_type: "TrailRun",
          start_date: "2026-11-10T08:00:00Z",
          is_valid: true,
        },
      ],
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <ToastProvider>
            <Profile />
          </ToastProvider>
        </MemoryRouter>
      );
    });

    expect(screen.getAllByTestId("powered-by-strava-badge")).toHaveLength(1);

    const viewLink = screen.getByTestId("view-on-strava-90001");
    expect(viewLink).toBeInTheDocument();
    expect(viewLink.textContent).toContain("View on Strava");
    expect(viewLink).toHaveAttribute("href", "https://www.strava.com/activities/90001");

    const disconnectBtn = document.getElementById("strava-disconnect-btn");
    expect(disconnectBtn).toBeInTheDocument();
    fireEvent.click(disconnectBtn);
    expect(document.getElementById("strava-disconnect-confirm-btn")).toBeInTheDocument();

    fetchSpy.mockRestore();
  });
});

