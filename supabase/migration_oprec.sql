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
  deadline TIMESTAMPTZ NOT NULL,
  wa_group_link TEXT,
  banner_url TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'closed'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

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
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'reviewed' | 'accepted' | 'rejected'
  reviewer_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (oprec_id, applicant_wa)
);

-- Indexes untuk pencarian cepat
CREATE INDEX IF NOT EXISTS idx_oprec_events_ukm_wa ON oprec_events(ukm_wa);
CREATE INDEX IF NOT EXISTS idx_oprec_events_status ON oprec_events(status);
CREATE INDEX IF NOT EXISTS idx_oprec_submissions_oprec_id ON oprec_submissions(oprec_id);
CREATE INDEX IF NOT EXISTS idx_oprec_submissions_applicant_wa ON oprec_submissions(applicant_wa);

-- Enable RLS
ALTER TABLE oprec_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE oprec_submissions ENABLE ROW LEVEL SECURITY;

-- Policies untuk oprec_events
CREATE POLICY "Public can view active oprec events"
  ON oprec_events FOR SELECT
  USING (true);

CREATE POLICY "Service role full access on oprec_events"
  ON oprec_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policies untuk oprec_submissions
CREATE POLICY "Service role full access on oprec_submissions"
  ON oprec_submissions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
