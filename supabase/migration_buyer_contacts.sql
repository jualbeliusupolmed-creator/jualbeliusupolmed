-- =====================================================================
-- Migration: Milestone View Notifications + Buyer Contact Log
-- Jalankan di Supabase SQL Editor
-- =====================================================================

-- A. Tambah kolom milestone ke listings
alter table public.listings
  add column if not exists last_milestone_notified integer not null default 0;

-- B. Tabel log kontak pembeli (setiap kali seseorang klik "Hubungi Penjual")
create table if not exists public.buyer_contacts (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.listings(id) on delete cascade,
  listing_code text,
  listing_title text,
  seller_wa    text,
  seller_name  text,
  buyer_wa     text,
  buyer_name   text,
  deal_status  text not null default 'pending' check (deal_status in ('pending','deal','gagal','no_reply')),
  followup_sent_at timestamptz,
  created_at   timestamptz not null default now()
);

-- Index untuk query admin (ambil kontak terbaru, filter per penjual/iklan)
create index if not exists buyer_contacts_listing_id_idx
  on public.buyer_contacts (listing_id);
create index if not exists buyer_contacts_seller_wa_idx
  on public.buyer_contacts (seller_wa);
create index if not exists buyer_contacts_created_at_idx
  on public.buyer_contacts (created_at desc);
create index if not exists buyer_contacts_deal_status_idx
  on public.buyer_contacts (deal_status);
create index if not exists buyer_contacts_followup_idx
  on public.buyer_contacts (followup_sent_at, deal_status);

-- RLS: hanya service_role yang bisa akses (admin dan cron pakai admin client)
alter table public.buyer_contacts enable row level security;

create policy "service_role_full_access_buyer_contacts"
  on public.buyer_contacts
  for all
  using (auth.role() = 'service_role');
