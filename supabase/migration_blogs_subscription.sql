-- =====================================================================
-- Migration: Tabel Blogs + Kolom PRO Subscription di seller_profiles
-- Jalankan di Supabase SQL Editor (Project > SQL Editor > New query)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tabel BLOGS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blogs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text NOT NULL,
  slug             text NOT NULL UNIQUE,
  content_markdown text,
  image_url        text,
  status           text NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'published')),
  author           text NOT NULL DEFAULT 'Admin',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blogs_status_idx ON public.blogs (status);
CREATE INDEX IF NOT EXISTS blogs_slug_idx   ON public.blogs (slug);

ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read published blogs" ON public.blogs;
CREATE POLICY "public read published blogs"
  ON public.blogs FOR SELECT
  USING (status = 'published');

-- ---------------------------------------------------------------------
-- 2. Kolom PRO Subscription di seller_profiles
-- ---------------------------------------------------------------------
ALTER TABLE public.seller_profiles
  ADD COLUMN IF NOT EXISTS subscription_tier       text NOT NULL DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'pro')),
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS trusted_seller          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS referral_code           text UNIQUE,
  ADD COLUMN IF NOT EXISTS free_bumps              integer NOT NULL DEFAULT 0;

-- Index untuk query PRO aktif (cek subscription_expires_at)
CREATE INDEX IF NOT EXISTS seller_profiles_tier_idx
  ON public.seller_profiles (subscription_tier, subscription_expires_at);

-- ---------------------------------------------------------------------
-- 3. Payments type: tambah nilai 'subscribe', 'renewal', 'autobump'
--    (DROP + ADD karena PostgreSQL tidak bisa ADD VALUE ke inline CHECK)
-- ---------------------------------------------------------------------
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_type_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_type_check
  CHECK (type IN ('iklan', 'bump', 'featured', 'sold_fee', 'subscribe', 'renewal', 'autobump'));

-- ---------------------------------------------------------------------
-- 4. Wanted unlocks table (untuk unlock contact info peminta barang)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wanted_unlocks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wanted_id     uuid REFERENCES public.wanted_listings (id) ON DELETE CASCADE,
  unlocked_by_wa text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS wanted_unlocks_unique
  ON public.wanted_unlocks (wanted_id, unlocked_by_wa);
