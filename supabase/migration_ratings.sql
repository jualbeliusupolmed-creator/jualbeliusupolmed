-- =====================================================================
-- Migration: seller_ratings
-- Jalankan di Supabase SQL Editor setelah schema.sql
-- =====================================================================

-- Tabel rating penjual
create table if not exists public.seller_ratings (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid references public.listings (id) on delete cascade,
  seller_wa   text not null,
  rating      smallint not null check (rating between 1 and 5),
  comment     text,
  buyer_name  text,
  created_at  timestamptz not null default now()
);

-- Satu listing hanya bisa dirating satu kali
create unique index if not exists seller_ratings_listing_idx
  on public.seller_ratings (listing_id);

create index if not exists seller_ratings_seller_idx
  on public.seller_ratings (seller_wa);

-- RLS: siapa pun bisa baca rating, hanya service-role yang bisa tulis
alter table public.seller_ratings enable row level security;

drop policy if exists "public read ratings" on public.seller_ratings;
create policy "public read ratings"
  on public.seller_ratings for select using (true);
