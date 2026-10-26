-- Migration: 202610260001_seller_slug_privacy.sql
-- Purpose: Protect seller privacy by ensuring unique opaque seller slugs and preventing phone number exposure in URLs.
-- Idempotent: Can be run multiple times safely.
-- Rollback instructions:
--   DROP INDEX IF EXISTS public.idx_seller_profiles_slug_lower;

BEGIN;

-- 1. Ensure slug column exists on seller_profiles
ALTER TABLE public.seller_profiles
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- 2. Create case-insensitive unique index for seller slugs
CREATE UNIQUE INDEX IF NOT EXISTS idx_seller_profiles_slug_lower
  ON public.seller_profiles (LOWER(slug))
  WHERE slug IS NOT NULL;

-- 3. Backfill missing slugs with safe deterministic opaque identifier if null
-- Format: 'p_' + substring of md5(wa || 'jb_usu_seller_salt') (first 10 chars)
UPDATE public.seller_profiles
SET slug = 'p_' || SUBSTRING(MD5(wa || 'jb_usu_seller_salt_2026'), 1, 10)
WHERE slug IS NULL OR TRIM(slug) = '';

COMMIT;
