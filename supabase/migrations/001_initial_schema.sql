-- IdaRun PWA Initial PostgreSQL Schema & Seed Data
-- Run via Supabase SQL Editor or `supabase db push`

create extension if not exists "pgcrypto";

-- 1. Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  strava_athlete_id bigint unique,
  full_name text not null,
  avatar_url text,
  role text not null default 'member' check (role in ('member', 'admin')),
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2. Strava Tokens (Strictly service_role / Edge Functions only)
create table if not exists public.strava_tokens (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at bigint not null,
  updated_at timestamptz not null default now()
);

-- 3. Group Settings (Single-row configuration table)
create table if not exists public.group_settings (
  id integer primary key default 1 check (id = 1),
  challenge_title text not null default 'Akçay''dan Tokyo''ya Kolektif Koşu',
  origin_name text not null default 'Akçay',
  destination_name text not null default 'Tokyo',
  target_distance_km numeric(10, 2) not null default 9500 check (target_distance_km > 0),
  join_code text not null default 'IDARUN2026',
  challenge_start_date timestamptz not null default '2026-01-01T00:00:00+03:00',
  timezone text not null default 'Europe/Istanbul',
  run_schedule jsonb not null default '[
    {"id": "tue-eve", "day": 2, "label": "Salı Akşam", "start": "19:00", "end": "21:30", "enabled": true},
    {"id": "thu-eve", "day": 4, "label": "Perşembe Akşam", "start": "19:00", "end": "21:30", "enabled": true},
    {"id": "sun-morn", "day": 0, "label": "Pazar Sabah", "start": "07:30", "end": "11:00", "enabled": true}
  ]'::jsonb,
  enforce_schedule boolean not null default true,
  updated_at timestamptz not null default now()
);

-- 4. Checkpoints (Akçay -> Tokyo route milestones)
create table if not exists public.checkpoints (
  id uuid primary key default gen_random_uuid(),
  order_index integer not null,
  name text not null,
  country text not null,
  description text,
  target_km numeric(10, 2) not null check (target_km >= 0),
  lat double precision not null,
  lng double precision not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_checkpoints_order on public.checkpoints (order_index asc, target_km asc);

-- 5. Activities
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  strava_activity_id bigint unique not null,
  name text not null,
  distance_meters numeric(10, 2) not null check (distance_meters >= 0),
  moving_time_seconds integer not null check (moving_time_seconds >= 0),
  elapsed_time_seconds integer not null check (elapsed_time_seconds >= 0),
  total_elevation_gain numeric(8, 2) not null default 0,
  average_speed numeric(8, 4) not null default 0,
  activity_type text not null default 'Run',
  start_date timestamptz not null,
  start_date_local timestamptz not null,
  is_valid boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_activities_user on public.activities (user_id);
create index if not exists idx_activities_start_date on public.activities (start_date desc);

-- Security Definer Helper Functions to avoid RLS recursion
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_verified_member()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_verified = true
  );
$$;

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.strava_tokens enable row level security;
alter table public.group_settings enable row level security;
alter table public.checkpoints enable row level security;
alter table public.activities enable row level security;

-- Profiles policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Verified members can view all profiles"
  on public.profiles for select
  using (public.is_verified_member());

create policy "Users can update own profile name or avatar"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Strava Tokens: NO client access (Edge functions use service_role)

-- Group Settings policies (join_code is protected via Edge Function in production; admins can read/update all)
create policy "Verified members can read group settings"
  on public.group_settings for select
  using (public.is_verified_member());

create policy "Admins can update group settings"
  on public.group_settings for update
  using (public.is_admin())
  with check (public.is_admin());

-- Checkpoints policies
create policy "Verified members can read checkpoints"
  on public.checkpoints for select
  using (public.is_verified_member());

create policy "Admins can manage checkpoints"
  on public.checkpoints for all
  using (public.is_admin())
  with check (public.is_admin());

-- Activities policies
create policy "Verified members can read valid activities"
  on public.activities for select
  using (public.is_verified_member());

create policy "Admins can manage all activities"
  on public.activities for all
  using (public.is_admin())
  with check (public.is_admin());

-- Seed default group settings
insert into public.group_settings (id)
values (1)
on conflict (id) do nothing;

-- Seed default Akçay -> Tokyo Checkpoints (if empty)
insert into public.checkpoints (order_index, name, country, description, target_km, lat, lng)
select * from (values
  (1,  'Akçay',     'Türkiye',     'Kazdağları eteklerinden büyük yolculuğun başlangıç noktası.', 0,    39.5858, 26.9242),
  (2,  'İstanbul',  'Türkiye',     'Boğaz geçişi ve Asya kıtasına ilk adım.',                    380,  41.0082, 28.9784),
  (3,  'Tiflis',    'Gürcistan',   'Kafkas dağlarının kapısı ve Kura Nehri vadisi.',              1820, 41.7151, 44.8271),
  (4,  'Bakü',      'Azerbaycan',  'Hazar Denizi kıyısında rüzgarlı sahil etabı.',               2370, 40.4093, 49.8671),
  (5,  'Taşkent',   'Özbekistan',  'İpek Yolu''nun kalbinde Orta Asya geçişi.',                  3950, 41.2995, 69.2401),
  (6,  'Almatı',    'Kazakistan',  'Tanrı Dağları eteklerinde yüksek irtifa durağı.',            4760, 43.2220, 76.8512),
  (7,  'Urumçi',    'Çin',         'Gobi ve Taklamakan eşiğinde Doğu''ya doğru.',                 5780, 43.8256, 87.6168),
  (8,  'Lanzhou',   'Çin',         'Sarı Nehir kıyısında tarihi İpek Yolu kavşağı.',             7150, 36.0611, 103.8343),
  (9,  'Pekin',     'Çin',         'Uzak Doğu''nun metropol kapısı ve son binlik öncesi.',       8320, 39.9042, 116.4074),
  (10, 'Seul',      'Güney Kore',  'Han Nehri boyunca hızlı tempo Kore etabı.',                  8950, 37.5665, 126.9780),
  (11, 'Osaka',     'Japonya',     'Pasifik adalarına varış ve son 220 km geri sayımı.',         9280, 34.6937, 135.5023),
  (12, 'Tokyo',     'Japonya',     'Büyük hedef! IdaRun kolektif koşu grubunun varış noktası.',   9500, 35.6762, 139.6503)
) as seed(order_index, name, country, description, target_km, lat, lng)
where not exists (select 1 from public.checkpoints limit 1);
