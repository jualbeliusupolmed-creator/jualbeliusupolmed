-- =====================================================================
-- Jual Beli USU Polmed — Supabase schema
-- Jalankan di Supabase SQL Editor (Project > SQL Editor > New query)
-- =====================================================================

-- Extension untuk gen_random_uuid()
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id    uuid primary key default gen_random_uuid(),
  name  text not null,
  slug  text not null unique
);

insert into public.categories (name, slug) values
  ('Elektronik', 'elektronik'),
  ('Fashion', 'fashion'),
  ('Buku', 'buku'),
  ('Makanan', 'makanan'),
  ('Kos', 'kos'),
  ('Buku Kuliah', 'buku-kuliah'),
  ('Jasa', 'jasa')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- listings
-- ---------------------------------------------------------------------
create table if not exists public.listings (
  id             uuid primary key default gen_random_uuid(),
  seller_name    text not null,
  seller_wa      text not null,
  title          text not null,
  description    text,
  price          bigint not null default 0,
  stock          int not null default 1,
  category       text not null,
  type           text not null default 'barang' check (type in ('barang','poster')),
  image_url      text,
  status         text not null default 'pending'
                   check (status in ('pending','active','expired','sold','suspended')),
  featured       boolean not null default false,
  featured_until timestamptz,
  bumped_at      timestamptz default now(),
  expires_at     timestamptz default (now() + interval '14 days'),
  sold_price     bigint,
  sold_fee       bigint,
  created_at     timestamptz not null default now()
);

create index if not exists listings_status_idx   on public.listings (status);
create index if not exists listings_category_idx on public.listings (category);
create index if not exists listings_bumped_idx   on public.listings (bumped_at desc);
create index if not exists listings_seller_idx   on public.listings (seller_wa);

-- ---------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------
create table if not exists public.payments (
  id               uuid primary key default gen_random_uuid(),
  listing_id       uuid references public.listings (id) on delete set null,
  type             text not null check (type in ('iklan','bump','featured','sold_fee')),
  amount           bigint not null,
  status           text not null default 'pending'
                     check (status in ('pending','paid','failed','expired')),
  midtrans_order_id text unique,
  meta             jsonb,
  created_at       timestamptz not null default now()
);

create index if not exists payments_listing_idx on public.payments (listing_id);
create index if not exists payments_order_idx   on public.payments (midtrans_order_id);

-- ---------------------------------------------------------------------
-- blacklist (nomor WA penjual yang diblokir admin)
-- ---------------------------------------------------------------------
create table if not exists public.blacklist (
  id         uuid primary key default gen_random_uuid(),
  wa         text not null unique,
  reason     text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Row Level Security
-- Akses tulis dilakukan lewat service-role di server (API routes),
-- jadi RLS hanya mengizinkan SELECT publik untuk listing aktif.
-- ---------------------------------------------------------------------
alter table public.listings   enable row level security;
alter table public.categories enable row level security;
alter table public.payments   enable row level security;
alter table public.blacklist  enable row level security;

drop policy if exists "public read active listings" on public.listings;
create policy "public read active listings"
  on public.listings for select
  using (status in ('active','sold'));

drop policy if exists "public read categories" on public.categories;
create policy "public read categories"
  on public.categories for select using (true);

-- payments & blacklist: tidak ada policy publik => hanya service-role yang bisa akses.

-- =====================================================================
-- STORAGE
-- Buat bucket "listings" (public) lewat dashboard, atau jalankan:
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('listings', 'listings', true)
on conflict (id) do nothing;

drop policy if exists "public read listing images" on storage.objects;
create policy "public read listing images"
  on storage.objects for select
  using (bucket_id = 'listings');

drop policy if exists "anon upload listing images" on storage.objects;
create policy "anon upload listing images"
  on storage.objects for insert
  with check (bucket_id = 'listings');
