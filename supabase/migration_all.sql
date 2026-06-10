-- =====================================================================
-- Jual Beli USU Polmed — SEMUA MIGRATION (gabungan)
-- ---------------------------------------------------------------------
-- Jalankan SETELAH schema.sql, sekali paste di Supabase SQL Editor.
-- Aman dijalankan berulang (idempotent): pakai IF NOT EXISTS / ON CONFLICT.
-- Menggabungkan: ratings, reports, views, admin (settings+kategori), gallery.
-- =====================================================================


-- =====================================================================
-- 1) seller_ratings  (rating penjual)
-- =====================================================================
create table if not exists public.seller_ratings (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid references public.listings (id) on delete cascade,
  seller_wa   text not null,
  rating      smallint not null check (rating between 1 and 5),
  comment     text,
  buyer_name  text,
  created_at  timestamptz not null default now()
);

create unique index if not exists seller_ratings_listing_idx
  on public.seller_ratings (listing_id);

create index if not exists seller_ratings_seller_idx
  on public.seller_ratings (seller_wa);

alter table public.seller_ratings enable row level security;

drop policy if exists "public read ratings" on public.seller_ratings;
create policy "public read ratings"
  on public.seller_ratings for select using (true);


-- =====================================================================
-- 2) reports  (laporan iklan dari pembeli)
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

-- RLS aktif & tanpa policy publik => hanya service-role (server) yang akses.
alter table public.reports enable row level security;


-- =====================================================================
-- 3) views  (counter "dilihat" per listing)
-- =====================================================================
alter table public.listings
  add column if not exists views bigint not null default 0;

create index if not exists listings_views_idx
  on public.listings (views desc);

-- Increment atomik (hindari race condition) — dipanggil via supa.rpc()
create or replace function public.increment_listing_views(lid uuid)
returns void
language sql
as $$
  update public.listings set views = views + 1 where id = lid;
$$;


-- =====================================================================
-- 4) admin dinamis  (settings + kategori icon/urutan)
-- =====================================================================
create table if not exists public.settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;
-- Tanpa policy publik => hanya service-role (server) yang akses.

insert into public.settings (key, value) values
  ('pricing', '{"adBarang":2000,"adPoster":10000,"bump":1000,"featuredPerDay":5000,"featuredMaxPerDay":10000,"soldTiers":[{"upto":50000,"flat":2000},{"upto":100000,"pct":10},{"upto":null,"pct":5}]}'::jsonb),
  ('contact', '{"marketplaceWa":"62895429126232","waGroupLink":"https://chat.whatsapp.com/DQMZK2qSgq2D0WvH7BlBSA"}'::jsonb),
  ('site', '{"heroTitle":"Marketplace Mahasiswa USU & POLMED","heroSubtitle":"Jual-beli laptop, HP, buku, fashion, makanan, kos, hingga jasa. Aman, cepat, dibantu admin.","footerTagline":"Marketplace mahasiswa USU & POLMED. Jual-beli aman, dibantu admin."}'::jsonb)
on conflict (key) do nothing;

alter table public.categories add column if not exists icon text default '🏷️';
alter table public.categories add column if not exists sort_order int not null default 0;

update public.categories set icon='💻', sort_order=1 where slug='elektronik';
update public.categories set icon='👕', sort_order=2 where slug='fashion';
update public.categories set icon='📚', sort_order=3 where slug='buku';
update public.categories set icon='🍜', sort_order=4 where slug='makanan';
update public.categories set icon='🏠', sort_order=5 where slug='kos';
update public.categories set icon='🎓', sort_order=6 where slug='buku-kuliah';
update public.categories set icon='🛠️', sort_order=7 where slug='jasa';


-- =====================================================================
-- 5) gallery  (galeri multi-foto per listing)
-- =====================================================================
alter table public.listings
  add column if not exists images jsonb not null default '[]'::jsonb;

-- Backfill: listing lama yang punya image_url -> jadikan elemen pertama images
update public.listings
  set images = jsonb_build_array(image_url)
  where (images is null or images = '[]'::jsonb)
    and image_url is not null;


-- =====================================================================
-- Selesai. Cek: select key from public.settings;  (harus ada 3 baris)
-- =====================================================================
