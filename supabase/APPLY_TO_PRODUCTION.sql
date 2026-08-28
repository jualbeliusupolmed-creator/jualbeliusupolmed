-- =============================================================================
-- MIGRATION BATCH — Jual Beli USU Polmed
-- Terapkan di Supabase SQL Editor: https://supabase.com/dashboard/project/autgrnrqeqdpqwkbolyh/editor
-- Jalankan setiap blok secara terpisah (copy-paste satu per satu) dan verifikasi.
-- =============================================================================

-- =====================================================
-- BLOK 1: Balasan Komentar Menfess (mading_comment_replies)
-- Sumber: supabase/migrations/20260824194256_mading_comment_replies.sql
-- Risiko: NIHIL — additive only, tidak mengubah data lama
-- =====================================================
alter table public.mading_comments
  add column if not exists parent_id uuid references public.mading_comments(id) on delete cascade;

alter table public.mading_comments
  drop constraint if exists mading_comments_parent_not_self;

alter table public.mading_comments
  add constraint mading_comments_parent_not_self check (parent_id is null or parent_id <> id);

create index if not exists mading_comments_parent_id_idx
  on public.mading_comments (parent_id, created_at asc)
  where parent_id is not null;

-- Verifikasi Blok 1:
-- select column_name, data_type from information_schema.columns
-- where table_name = 'mading_comments' and column_name = 'parent_id';

-- =====================================================
-- BLOK 2: Draft Pasang Iklan via WA Bot (wa_listing_drafts)
-- Sumber: supabase/migration_wa_drafts.sql
-- Risiko: NIHIL — tabel baru, tidak mengubah yang ada
-- =====================================================
create table if not exists public.wa_listing_drafts (
    wa          text        primary key,
    text_parts  text        not null default '',
    updated_at  timestamptz not null default now()
);

alter table public.wa_listing_drafts enable row level security;
-- Tidak ada policy publik — hanya bisa diakses via service_role key (bot WA).

-- Verifikasi Blok 2:
-- select * from information_schema.tables where table_name = 'wa_listing_drafts';

-- =====================================================
-- BLOK 3: Open Recruitment UKM (oprec_events + oprec_submissions)
-- Sumber: supabase/migration_oprec.sql (sudah diperketat RLS-nya)
-- Risiko: RENDAH — tabel baru, RLS sudah diperkuat
-- =====================================================
CREATE TABLE IF NOT EXISTS public.oprec_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ukm_wa TEXT NOT NULL,
  ukm_name TEXT NOT NULL,
  campus TEXT NOT NULL DEFAULT 'USU',
  faculty TEXT DEFAULT 'Universitas',
  title TEXT NOT NULL,
  description TEXT,
  divisions JSONB NOT NULL DEFAULT '["Acara", "Humas & Publikasi", "Kreatif & Desain", "Perlengkapan", "Konsumsi", "Dokumentasi"]'::jsonb,
  requirements TEXT,
  custom_fields JSONB DEFAULT '[]'::jsonb,
  deadline TIMESTAMPTZ NOT NULL,
  wa_group_link TEXT,
  banner_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.oprec_events
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.oprec_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oprec_id UUID NOT NULL REFERENCES public.oprec_events(id) ON DELETE CASCADE,
  applicant_wa TEXT NOT NULL,
  applicant_name TEXT NOT NULL,
  nim TEXT,
  campus TEXT NOT NULL DEFAULT 'USU',
  faculty TEXT,
  batch TEXT,
  division_1 TEXT NOT NULL,
  division_2 TEXT,
  reason TEXT,
  portfolio_url TEXT,
  custom_answers JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewer_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (oprec_id, applicant_wa)
);

ALTER TABLE public.oprec_submissions
  ADD COLUMN IF NOT EXISTS custom_answers JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_oprec_events_ukm_wa ON public.oprec_events(ukm_wa);
CREATE INDEX IF NOT EXISTS idx_oprec_events_status ON public.oprec_events(status);
CREATE INDEX IF NOT EXISTS idx_oprec_submissions_oprec_id ON public.oprec_submissions(oprec_id);
CREATE INDEX IF NOT EXISTS idx_oprec_submissions_applicant_wa ON public.oprec_submissions(applicant_wa);

ALTER TABLE public.oprec_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oprec_submissions ENABLE ROW LEVEL SECURITY;

-- Policy: Publik hanya lihat oprec AKTIF (bukan semua)
DROP POLICY IF EXISTS "Public can view active oprec events" ON public.oprec_events;
CREATE POLICY "Public can view active oprec events"
  ON public.oprec_events FOR SELECT
  USING (status = 'active');

-- Policy management oprec DIHAPUS — hanya boleh via service_role (bypass RLS)
DROP POLICY IF EXISTS "UKM can manage their own oprec events" ON public.oprec_events;

-- Policy: Submit boleh (INSERT), tapi baca submission TIDAK lewat anon
DROP POLICY IF EXISTS "Public can submit oprec application" ON public.oprec_submissions;
CREATE POLICY "Public can submit oprec application"
  ON public.oprec_submissions FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "UKM and applicant can view submissions" ON public.oprec_submissions;
-- (Tidak ada policy SELECT untuk anon — hanya service_role yang bisa baca)

-- Verifikasi Blok 3:
-- select tablename, rowsecurity from pg_tables where tablename in ('oprec_events','oprec_submissions');
-- select policyname, cmd, qual from pg_policies where tablename in ('oprec_events','oprec_submissions');

-- =====================================================
-- BLOK 4: Pengencangan RLS (migration_security_rls)
-- Sumber: supabase/migration_security_rls.sql
-- Risiko: MENENGAH — cabut akses anon ke 5 tabel utama
-- BACA DULU komentar di file sebelum jalankan.
-- WAJIB TEST website setelah jalankan (beranda, /produk, /penjual, dashboard, admin).
-- Kalau ada yang hilang, jalankan blok ROLLBACK di bawah!
-- =====================================================
alter table public.seller_profiles      enable row level security;
alter table public.listings             enable row level security;
alter table public.price_offers         enable row level security;
alter table public.category_subscriptions enable row level security;
alter table public.wanted_listings      enable row level security;

revoke all on public.seller_profiles        from anon, authenticated;
revoke all on public.listings               from anon, authenticated;
revoke all on public.price_offers           from anon, authenticated;
revoke all on public.category_subscriptions from anon, authenticated;
revoke all on public.wanted_listings        from anon, authenticated;

-- =====================================================
-- ROLLBACK BLOK 4 (jalankan HANYA jika ada yang rusak setelah Blok 4):
-- grant select on public.listings               to anon, authenticated;
-- grant select on public.seller_profiles         to anon, authenticated;
-- grant select, insert, update on public.price_offers           to anon, authenticated;
-- grant select, insert, delete on public.category_subscriptions to anon, authenticated;
-- grant select, insert on public.wanted_listings to anon, authenticated;
-- =====================================================
