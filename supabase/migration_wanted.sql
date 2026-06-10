-- =====================================================================
-- Migration: Papan Dicari, Verifikasi Mahasiswa, & Filter Kampus/Area
-- Jalankan ini di Supabase SQL Editor (Project > SQL Editor > New query)
-- =====================================================================

-- 1) Papan Dicari (Wanted listings)
create table if not exists public.wanted_listings (
  id             uuid primary key default gen_random_uuid(),
  buyer_name     text not null,
  buyer_wa       text not null,
  title          text not null,
  description    text,
  budget         bigint not null default 0,
  category       text not null,
  campus         text not null default 'Semua' check (campus in ('USU', 'POLMED', 'Semua')),
  area           text not null default 'Sekitar Kampus',
  status         text not null default 'active' check (status in ('active', 'resolved', 'expired')),
  created_at     timestamptz not null default now()
);

create index if not exists wanted_listings_status_idx on public.wanted_listings (status);
create index if not exists wanted_listings_campus_idx on public.wanted_listings (campus);
create index if not exists wanted_listings_buyer_idx on public.wanted_listings (buyer_wa);

alter table public.wanted_listings enable row level security;

drop policy if exists "public read active wanted" on public.wanted_listings;
create policy "public read active wanted"
  on public.wanted_listings for select
  using (status = 'active');

-- 2) Verifikasi Mahasiswa (Verified sellers)
create table if not exists public.verified_sellers (
  wa           text primary key,
  email        text,
  ktm_url      text,
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at   timestamptz not null default now()
);

alter table public.verified_sellers enable row level security;

drop policy if exists "public read verified status" on public.verified_sellers;
create policy "public read verified status"
  on public.verified_sellers for select
  using (true);

-- 3) Tambah kolom campus, area, dan seller_verified ke listings
alter table public.listings
  add column if not exists campus text default 'Semua' check (campus in ('USU', 'POLMED', 'Semua')),
  add column if not exists area text default 'Sekitar Kampus',
  add column if not exists seller_verified boolean default false;

create index if not exists listings_campus_idx on public.listings (campus);
create index if not exists listings_verified_idx on public.listings (seller_verified);
