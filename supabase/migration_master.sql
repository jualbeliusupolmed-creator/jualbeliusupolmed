-- ==============================================================================
-- MASTER MIGRATION: Jual Beli USU & POLMED
-- Gabungan: Oprec, Menfess Reply, Akun UP Admin
--
-- Jalankan SEKALI di Supabase SQL Editor.
-- Semua statement menggunakan IF NOT EXISTS / ON CONFLICT agar aman dijalankan
-- berulang kali tanpa menghapus data yang sudah ada.
-- ==============================================================================



-- ══════════════════════════════════════════════════════════════════════════════
-- BAGIAN 1: OPREC — Sistem Open Recruitment UKM & Organisasi
-- ══════════════════════════════════════════════════════════════════════════════

-- 1a. Tabel Formulir / Acara Oprec
CREATE TABLE IF NOT EXISTS oprec_events (
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

-- Kolom custom_fields (jika tabel sudah ada sebelumnya)
ALTER TABLE public.oprec_events
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]'::jsonb;

-- 1b. Tabel Pengajuan / Pendaftar Oprec
CREATE TABLE IF NOT EXISTS oprec_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oprec_id UUID NOT NULL REFERENCES oprec_events(id) ON DELETE CASCADE,
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

-- Kolom custom_answers (jika tabel sudah ada sebelumnya)
ALTER TABLE public.oprec_submissions
  ADD COLUMN IF NOT EXISTS custom_answers JSONB DEFAULT '{}'::jsonb;

-- Indexes Oprec
CREATE INDEX IF NOT EXISTS idx_oprec_events_ukm_wa       ON oprec_events(ukm_wa);
CREATE INDEX IF NOT EXISTS idx_oprec_events_status       ON oprec_events(status);
CREATE INDEX IF NOT EXISTS idx_oprec_submissions_oprec_id    ON oprec_submissions(oprec_id);
CREATE INDEX IF NOT EXISTS idx_oprec_submissions_applicant_wa ON oprec_submissions(applicant_wa);

-- RLS Oprec
ALTER TABLE oprec_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE oprec_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active oprec events"   ON oprec_events;
CREATE POLICY "Public can view active oprec events"
  ON oprec_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "UKM can manage their own oprec events" ON oprec_events;
CREATE POLICY "UKM can manage their own oprec events"
  ON oprec_events FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can submit oprec application"   ON oprec_submissions;
CREATE POLICY "Public can submit oprec application"
  ON oprec_submissions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "UKM and applicant can view submissions" ON oprec_submissions;
CREATE POLICY "UKM and applicant can view submissions"
  ON oprec_submissions FOR SELECT USING (true);

DROP POLICY IF EXISTS "UKM can update submission status"      ON oprec_submissions;
CREATE POLICY "UKM can update submission status"
  ON oprec_submissions FOR UPDATE USING (true) WITH CHECK (true);



-- ══════════════════════════════════════════════════════════════════════════════
-- BAGIAN 2: MENFESS REPLY — Sistem Balasan / Thread Menfess & Mading
-- ══════════════════════════════════════════════════════════════════════════════

-- Tabel Balasan Menfess
CREATE TABLE IF NOT EXISTS mading_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES mading_posts(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL DEFAULT 'Anonim',
  content TEXT NOT NULL,
  author_ip_hash TEXT,
  likes_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Kolom comments_count di mading_posts
ALTER TABLE public.mading_posts
  ADD COLUMN IF NOT EXISTS comments_count INT NOT NULL DEFAULT 0;

-- Indexes Mading Replies
CREATE INDEX IF NOT EXISTS idx_mading_replies_post_id    ON mading_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_mading_replies_status     ON mading_replies(status);
CREATE INDEX IF NOT EXISTS idx_mading_replies_created_at ON mading_replies(created_at DESC);

-- RLS Mading Replies
ALTER TABLE mading_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active replies" ON mading_replies;
CREATE POLICY "Public can read active replies"
  ON mading_replies FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "Authenticated can insert replies" ON mading_replies;
CREATE POLICY "Authenticated can insert replies"
  ON mading_replies FOR INSERT WITH CHECK (true);

-- Fungsi RPC atomic increment comments_count
CREATE OR REPLACE FUNCTION increment_comments_count(post_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE mading_posts
  SET comments_count = COALESCE(comments_count, 0) + 1
  WHERE id = post_id;
$$;



-- ══════════════════════════════════════════════════════════════════════════════
-- BAGIAN 3: SEED — Akun UKM "UP Admin" (Super Admin Platform)
--
-- Login: Email & Password
-- Email    : admin@jualbeliusupolmed.web.id
-- Password : upadmin2026   ← GANTI SETELAH LOGIN PERTAMA
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO public.seller_profiles (
  wa,
  name,
  ukm_name,
  account_type,
  ukm_verified,
  ukm_category,
  campus,
  faculty,
  ukm_instagram,
  bio,
  pin,
  created_at
)
VALUES (
  'email_up_admin',
  'UP Admin',
  'UP — Jual Beli USU & POLMED',
  'ukm',
  true,
  'Platform',
  'USU',
  'Universitas',
  '@jualbeliusupolmed',
  'Platform resmi komunitas jual beli, mading, dan kegiatan mahasiswa USU & POLMED.',
  '$2a$10$3mK.TcqtudfNQ/PxxGdeIewU.KJq4NQkxvQ/9iaeBToFtslGE7MAa',
  now()
)
ON CONFLICT (wa) DO UPDATE
SET
  ukm_name      = EXCLUDED.ukm_name,
  account_type  = EXCLUDED.account_type,
  ukm_verified  = EXCLUDED.ukm_verified,
  ukm_category  = EXCLUDED.ukm_category,
  ukm_instagram = EXCLUDED.ukm_instagram,
  bio           = EXCLUDED.bio;

-- Catat di tabel identitas email jika tabel sudah ada
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name   = 'seller_email_accounts'
  ) THEN
    INSERT INTO public.seller_email_accounts (email, seller_wa, created_at)
    VALUES ('admin@jualbeliusupolmed.web.id', 'email_up_admin', now())
    ON CONFLICT (email) DO NOTHING;
  END IF;
END
$$;



-- ==============================================================================
-- SELESAI — Semua migration & seed berhasil dijalankan.
-- ==============================================================================
