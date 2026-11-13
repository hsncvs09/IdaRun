# IdaRun PWA — Kolektif Koşu Takip ve Leaderboard

Akçay'dan Tokyo'ya (~9.500 km) uzanan kolektif koşu hedefi için **React (Vite) + Tailwind CSS v3 + Leaflet + Supabase + Strava API v3** tabanlı mobil öncelikli PWA uygulaması.

## Özellikler
- **Strava OAuth + Katılım Kodu Doğrulaması:** Özel grup davet kodu (`IDARUN2026` varsayılan) ile doğrulanan üyelik akışı.
- **Sabit Koşu Gün/Saat Filtresi (`Europe/Istanbul`):** Yalnızca belirlenen grup koşu gün ve saat pencerelerinde başlayan koşuların sayılması (Admin Panelinden dinamik düzenlenebilir).
- **Liderlik Tablosu:** Haftalık, aylık ve tüm zamanlar filtreleriyle Mesafe, İrtifa, Ortalama Pace ve Koşu Adedi sıralamaları.
- **İnteraktif Akçay → Tokyo Haritası:** Leaflet üzerinde 12 ara durak, tamamlanan/kalan rota çizgisi ve grup kilometresine göre ilerleyen animasyonlu koşucu ikonu.
- **Admin Paneli:** Hedef km, katılım kodu, koşu takvimi, durak (checkpoint) CRUD ve aktivite denetimi.
- **Opsiyonel Demo Modu:** Canlı Supabase / Strava anahtarları girilmeden tarayıcı içi kalıcı demo verisiyle tüm ekranları test etme imkânı.

## Kurulum

1. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```

2. `.env.example` dosyasını `.env` olarak kopyalayıp Supabase ve Strava bilgilerinizi girin (boş bırakırsanız Demo Modu aktif olur):
   ```bash
   cp .env.example .env
   ```

3. Geliştirme sunucusunu başlatın:
   ```bash
   npm run dev
   ```

4. Testler ve üretim derlemesi:
   ```bash
   npm test
   npm run build
   ```

## Supabase Kurulumu (Canlı Mod)
1. `supabase/migrations/001_initial_schema.sql` dosyasını Supabase SQL Editor veya CLI (`supabase db push`) ile çalıştırın.
2. Edge Functions gizli anahtarlarını tanımlayın:
   ```bash
   supabase secrets set STRAVA_CLIENT_ID=... STRAVA_CLIENT_SECRET=...
   supabase functions deploy strava-oauth
   supabase functions deploy strava-sync
   ```
3. Strava API ayarlarında **Authorization Callback Domain** alanını uygulamanızın alan adına ayarlayın.
