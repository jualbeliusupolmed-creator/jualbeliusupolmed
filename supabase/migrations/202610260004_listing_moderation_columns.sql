-- Migration: 202610260004_listing_moderation_columns.sql
-- Purpose: Add moderation workflow columns, audit fields, and report tables for Jual Beli USU
-- Idempotent: Can be run multiple times safely
-- Rollback instructions:
--   DROP TABLE IF EXISTS public.listing_reports;
--   DROP TABLE IF EXISTS public.prohibited_keywords;
--   ALTER TABLE public.listings DROP COLUMN IF EXISTS moderation_reason;
--   ALTER TABLE public.listings DROP COLUMN IF EXISTS moderated_by;
--   ALTER TABLE public.listings DROP COLUMN IF EXISTS moderated_at;
--   ALTER TABLE public.listings DROP COLUMN IF EXISTS risk_score;

BEGIN;

-- 1. Ensure moderation columns exist on listings
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS moderation_reason TEXT,
  ADD COLUMN IF NOT EXISTS moderated_by TEXT,
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS risk_score NUMERIC(3,2) DEFAULT 0.0;

-- 2. Index for fast querying of moderation queue and approved active listings
CREATE INDEX IF NOT EXISTS idx_listings_status_bumped 
  ON public.listings (status, bumped_at DESC);

-- 3. Table for dynamic prohibited keywords managed by admin
CREATE TABLE IF NOT EXISTS public.prohibited_keywords (
  id SERIAL PRIMARY KEY,
  keyword TEXT UNIQUE NOT NULL,
  category TEXT DEFAULT 'all',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default critical prohibited keywords if not present
INSERT INTO public.prohibited_keywords (keyword, category) VALUES
  ('vape', 'vape'),
  ('pod', 'vape'),
  ('liquid', 'vape'),
  ('oxva', 'vape'),
  ('voopoo', 'vape'),
  ('relx', 'vape'),
  ('caliburn', 'vape'),
  ('rokok', 'tobacco'),
  ('miras', 'alcohol'),
  ('alkohol', 'alcohol'),
  ('tramadol', 'drugs'),
  ('joki skripsi', 'academic_fraud'),
  ('jual akun', 'digital_fraud')
ON CONFLICT (keyword) DO NOTHING;

-- 4. Table for community reports on listings
CREATE TABLE IF NOT EXISTS public.reports (
  id BIGSERIAL PRIMARY KEY,
  listing_id TEXT NOT NULL,
  reporter_wa TEXT,
  reason TEXT NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reports_listing_id ON public.reports (listing_id);

CREATE TABLE IF NOT EXISTS public.listing_reports (
  id BIGSERIAL PRIMARY KEY,
  listing_id TEXT NOT NULL,
  reporter_wa TEXT,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_reports_listing_id ON public.listing_reports (listing_id);

-- RLS: Only admins/moderators can view reports; anyone can insert
ALTER TABLE public.listing_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'listing_reports' AND policyname = 'anyone_can_report_listing'
  ) THEN
    CREATE POLICY anyone_can_report_listing 
      ON public.listing_reports 
      FOR INSERT 
      TO public 
      WITH CHECK (true);
  END IF;
END $$;

COMMIT;
