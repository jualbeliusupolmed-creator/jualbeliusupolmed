-- =====================================================================
-- Migration: galeri multi-foto per listing
-- Jalankan di Supabase SQL Editor setelah schema.sql
-- =====================================================================

-- Array URL foto. image_url tetap dipakai sebagai foto sampul (cover).
alter table public.listings
  add column if not exists images jsonb not null default '[]'::jsonb;

-- Backfill: listing lama yang punya image_url -> jadikan elemen pertama images
update public.listings
  set images = jsonb_build_array(image_url)
  where (images is null or images = '[]'::jsonb)
    and image_url is not null;
