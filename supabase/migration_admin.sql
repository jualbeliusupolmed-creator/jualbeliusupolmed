-- =====================================================================
-- Migration: admin dinamis (settings + kategori icon/urutan)
-- Jalankan di Supabase SQL Editor setelah schema.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- settings: konfigurasi situs (harga, kontak, teks) yang bisa diubah admin
-- ---------------------------------------------------------------------
create table if not exists public.settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;
-- Tidak ada policy publik => hanya service-role (server) yang akses.

insert into public.settings (key, value) values
  ('pricing', '{"adBarang":2000,"adPoster":10000,"bump":1000,"featuredPerDay":5000,"featuredMaxPerDay":10000,"soldTiers":[{"upto":50000,"flat":2000},{"upto":100000,"pct":10},{"upto":null,"pct":5}]}'::jsonb),
  ('contact', '{"marketplaceWa":"62895429126232","waGroupLink":"https://chat.whatsapp.com/DQMZK2qSgq2D0WvH7BlBSA"}'::jsonb),
  ('site', '{"heroTitle":"Marketplace Mahasiswa USU & POLMED","heroSubtitle":"Jual-beli laptop, HP, buku, fashion, makanan, kos, hingga jasa. Aman, cepat, dibantu admin.","footerTagline":"Marketplace mahasiswa USU & POLMED. Jual-beli aman, dibantu admin."}'::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- categories: tambah icon + urutan supaya bisa dikelola dari admin
-- ---------------------------------------------------------------------
alter table public.categories add column if not exists icon text default '🏷️';
alter table public.categories add column if not exists sort_order int not null default 0;

update public.categories set icon='💻', sort_order=1 where slug='elektronik';
update public.categories set icon='👕', sort_order=2 where slug='fashion';
update public.categories set icon='📚', sort_order=3 where slug='buku';
update public.categories set icon='🍜', sort_order=4 where slug='makanan';
update public.categories set icon='🏠', sort_order=5 where slug='kos';
update public.categories set icon='🎓', sort_order=6 where slug='buku-kuliah';
update public.categories set icon='🛠️', sort_order=7 where slug='jasa';
