-- ==============================================================================
-- Migrasi: 20261102210000_national_transactions_and_product_alignment.sql
-- Fase 3: Penyelarasan Transaksi & Katalog Produk Nasional
-- Menautkan listings, wanted_listings, open_po_products, open_po_orders, dan ig_seller_links
-- ke identitas kanonikal auth.users(id) dan katalog resmi universities(id).
-- ==============================================================================

-- 1. Tabel listings (Iklan Marketplace)
alter table public.listings add column if not exists user_id uuid references auth.users(id);
create index if not exists idx_listings_user_id on public.listings(user_id) where user_id is not null;
create index if not exists idx_listings_university_id on public.listings(university_id) where university_id is not null;

-- Backfill user_id pada listings berdasarkan relasi nomor penjual di seller_profiles
update public.listings l
set user_id = sp.user_id
from public.seller_profiles sp
where l.user_id is null
  and sp.user_id is not null
  and (
    l.seller_wa = sp.wa
    or l.seller_wa = sp.phone_wa
  );

-- Backfill university_id pada listings dari home_university_id penjual jika masih null
update public.listings l
set university_id = sp.home_university_id
from public.seller_profiles sp
where l.university_id is null
  and sp.home_university_id is not null
  and (
    l.seller_wa = sp.wa
    or l.seller_wa = sp.phone_wa
  );

-- Backfill sisa listings berdasarkan teks campus yang cocok dengan code universitas
update public.listings l
set university_id = u.id
from public.universities u
where l.university_id is null
  and lower(trim(l.campus)) = lower(trim(u.code));


-- 2. Tabel wanted_listings (WTB / Barang Dicari)
alter table public.wanted_listings add column if not exists user_id uuid references auth.users(id);
create index if not exists idx_wanted_listings_user_id on public.wanted_listings(user_id) where user_id is not null;

update public.wanted_listings w
set user_id = sp.user_id
from public.seller_profiles sp
where w.user_id is null
  and sp.user_id is not null
  and (
    w.buyer_wa = sp.wa
    or w.buyer_wa = sp.phone_wa
  );

update public.wanted_listings w
set university_id = sp.home_university_id
from public.seller_profiles sp
where w.university_id is null
  and sp.home_university_id is not null
  and (
    w.buyer_wa = sp.wa
    or w.buyer_wa = sp.phone_wa
  );

update public.wanted_listings w
set university_id = u.id
from public.universities u
where w.university_id is null
  and lower(trim(w.campus)) = lower(trim(u.code));


-- 3. Tabel open_po_products & open_po_orders (Open PO Nasional)
alter table public.open_po_products add column if not exists user_id uuid references auth.users(id);
create index if not exists idx_open_po_products_user_id on public.open_po_products(user_id) where user_id is not null;

update public.open_po_products p
set user_id = sp.user_id
from public.seller_profiles sp
where p.user_id is null
  and sp.user_id is not null
  and (
    p.seller_wa = sp.wa
    or p.seller_wa = sp.phone_wa
  );

update public.open_po_products p
set university_id = sp.home_university_id
from public.seller_profiles sp
where p.university_id is null
  and sp.home_university_id is not null
  and (
    p.seller_wa = sp.wa
    or p.seller_wa = sp.phone_wa
  );

alter table public.open_po_orders add column if not exists user_id uuid references auth.users(id);
alter table public.open_po_orders add column if not exists university_id text references public.universities(id);
create index if not exists idx_open_po_orders_user_id on public.open_po_orders(user_id) where user_id is not null;
create index if not exists idx_open_po_orders_university_id on public.open_po_orders(university_id) where university_id is not null;

update public.open_po_orders o
set user_id = sp.user_id
from public.seller_profiles sp
where o.user_id is null
  and sp.user_id is not null
  and (
    o.buyer_wa = sp.wa
    or o.buyer_wa = sp.phone_wa
  );


-- 4. Tabel ig_seller_links (Tautan Penjual Instagram DM ke Identitas Nasional)
alter table public.ig_seller_links add column if not exists user_id uuid references auth.users(id);
alter table public.ig_seller_links add column if not exists university_id text references public.universities(id);
create index if not exists idx_ig_seller_links_user_id on public.ig_seller_links(user_id) where user_id is not null;
create index if not exists idx_ig_seller_links_university_id on public.ig_seller_links(university_id) where university_id is not null;

update public.ig_seller_links ig
set user_id = sp.user_id
from public.seller_profiles sp
where ig.user_id is null
  and sp.user_id is not null
  and (
    ig.wa = sp.wa
    or ig.wa = sp.phone_wa
  );

update public.ig_seller_links ig
set university_id = sp.home_university_id
from public.seller_profiles sp
where ig.university_id is null
  and sp.home_university_id is not null
  and (
    ig.wa = sp.wa
    or ig.wa = sp.phone_wa
  );

