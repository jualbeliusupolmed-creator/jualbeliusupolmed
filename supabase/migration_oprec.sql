-- ==============================================================================
-- MIGRATION: Sistem Penerimaan Formulir Oprec (Open Recruitment) UKM / Organisasi
-- Jual Beli & Komunitas Mahasiswa USU & POLMED
-- ==============================================================================

-- 1. Tabel Formulir / Acara Oprec yang dibuka oleh Organisasi / UKM
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
  custom_fields JSONB DEFAULT '[]'::jsonb, -- Inputan kustom tambahan (tulisan, upload gambar/KTM, essay)
  deadline TIMESTAMPTZ NOT NULL,
  wa_group_link TEXT,
  banner_url TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'closed'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Kolom custom_fields jika tabel sudah terlanjur dibuat sebelumnya
ALTER TABLE public.oprec_events 
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]'::jsonb;

-- 2. Tabel Pengajuan / Pendaftar Formulir Oprec oleh Mahasiswa
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
  custom_answers JSONB DEFAULT '{}'::jsonb, -- Jawaban inputan kustom & URL gambar yang diunggah
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'reviewed' | 'accepted' | 'rejected'
  reviewer_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (oprec_id, applicant_wa)
);

-- Kolom custom_answers jika tabel sudah ada sebelumnya
ALTER TABLE public.oprec_submissions 
  ADD COLUMN IF NOT EXISTS custom_answers JSONB DEFAULT '{}'::jsonb;

-- Indexes untuk pencarian cepat
CREATE INDEX IF NOT EXISTS idx_oprec_events_ukm_wa ON oprec_events(ukm_wa);
CREATE INDEX IF NOT EXISTS idx_oprec_events_status ON oprec_events(status);
CREATE INDEX IF NOT EXISTS idx_oprec_submissions_oprec_id ON oprec_submissions(oprec_id);
CREATE INDEX IF NOT EXISTS idx_oprec_submissions_applicant_wa ON oprec_submissions(applicant_wa);

-- Enable RLS
ALTER TABLE oprec_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE oprec_submissions ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS Policies untuk oprec_events
-- Akses INSERT/UPDATE/DELETE tidak perlu policy publik — API server memakai
-- service_role yang bypass RLS sepenuhnya. Policy di bawah hanya untuk SELECT
-- via kunci anon (tampilan publik halaman /oprec).
-- =============================================================================

-- Publik hanya bisa melihat oprec yang sedang aktif (belum ditutup).
DROP POLICY IF EXISTS "Public can view active oprec events" ON oprec_events;
CREATE POLICY "Public can view active oprec events"
  ON oprec_events FOR SELECT
  USING (status = 'active');

-- Blokir semua INSERT/UPDATE/DELETE dari anon/authenticated secara eksplisit.
-- Pengelolaan oprec wajib lewat API server (service_role).
DROP POLICY IF EXISTS "UKM can manage their own oprec events" ON oprec_events;
-- (policy ALL dengan USING(true) dihapus — tidak diganti; service_role bypass RLS)

-- =============================================================================
-- RLS Policies untuk oprec_submissions
-- =============================================================================

-- Pendaftar boleh submit (INSERT) melalui API publik.
-- API server memvalidasi bahwa oprec masih aktif sebelum menerima submission.
DROP POLICY IF EXISTS "Public can submit oprec application" ON oprec_submissions;
CREATE POLICY "Public can submit oprec application"
  ON oprec_submissions FOR INSERT
  WITH CHECK (true);

-- Pembacaan submission: hanya bisa dilakukan via API server (service_role).
-- Anon TIDAK boleh melihat daftar pendaftar orang lain — IDOR/privasi.
DROP POLICY IF EXISTS "UKM and applicant can view submissions" ON oprec_submissions;
-- (policy SELECT dengan USING(true) dihapus — tidak diganti; service_role bypass RLS)
