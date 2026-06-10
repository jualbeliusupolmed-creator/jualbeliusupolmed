-- =====================================================================
-- Migration: views (counter "dilihat" per listing)
-- Jalankan di Supabase SQL Editor setelah schema.sql
-- =====================================================================

alter table public.listings
  add column if not exists views bigint not null default 0;

-- Index untuk section "Paling Dilihat" di beranda
create index if not exists listings_views_idx
  on public.listings (views desc);

-- Increment atomik (hindari race condition) — dipanggil via supa.rpc()
create or replace function public.increment_listing_views(lid uuid)
returns void
language sql
as $$
  update public.listings set views = views + 1 where id = lid;
$$;
