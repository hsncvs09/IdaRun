-- IdaRun Auto Batch Sync & Last Sync Tracking Migration
-- Run via Supabase SQL Editor or `supabase db push`

alter table public.group_settings
  add column if not exists auto_sync_enabled boolean not null default true,
  add column if not exists auto_sync_mode text not null default 'after_schedule'
    check (auto_sync_mode in ('after_schedule', 'fixed_daily')),
  add column if not exists auto_sync_delay_minutes integer not null default 60
    check (auto_sync_delay_minutes >= 0 and auto_sync_delay_minutes <= 720),
  add column if not exists auto_sync_time text not null default '22:30',
  add column if not exists last_sync_at timestamptz,
  add column if not exists last_batch_sync_at timestamptz,
  add column if not exists last_batch_sync_summary jsonb;
