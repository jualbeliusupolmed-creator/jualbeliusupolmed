-- =====================================================================
-- Migration: reports (laporan iklan dari pembeli)
-- Jalankan di Supabase SQL Editor setelah schema.sql
-- =====================================================================

create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid references public.listings (id) on delete cascade,
  reason      text not null,
  detail      text,
  reporter_wa text,
  status      text not null default 'open' check (status in ('open','resolved')),
  created_at  timestamptz not null default now()
);

create index if not exists reports_status_idx
  on public.reports (status, created_at desc);

create index if not exists reports_listing_idx
  on public.reports (listing_id);

-- RLS aktif & tidak ada policy publik => hanya service-role (server) yang akses.
-- Pembuatan laporan dilakukan lewat /api/report (service-role).
alter table public.reports enable row level security;
