-- Migration: 202610260002_rate_limit_hits.sql
-- Purpose: Distributed serverless rate limiting table and atomic counter for Jual Beli USU
-- Idempotent: Can be run multiple times safely
-- Rollback instructions:
--   DROP FUNCTION IF EXISTS public.hit_rate_limit(TEXT, INT);
--   DROP TABLE IF EXISTS public.rate_limit_hits;

BEGIN;

CREATE TABLE IF NOT EXISTS public.rate_limit_hits (
  key TEXT PRIMARY KEY,
  count INT NOT NULL DEFAULT 1,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_hits_expires_at 
  ON public.rate_limit_hits (expires_at);

-- RLS: Service role only
ALTER TABLE public.rate_limit_hits ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'rate_limit_hits' AND policyname = 'rate_limit_service_role'
  ) THEN
    CREATE POLICY rate_limit_service_role 
      ON public.rate_limit_hits 
      FOR ALL 
      TO service_role 
      USING (true) 
      WITH CHECK (true);
  END IF;
END $$;

-- Atomic increment counter with auto-cleanup of expired entries
CREATE OR REPLACE FUNCTION public.hit_rate_limit(p_key TEXT, p_window_seconds INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
  v_now TIMESTAMPTZ := clock_timestamp();
BEGIN
  -- Clear out expired entry if present
  DELETE FROM public.rate_limit_hits WHERE key = p_key AND expires_at < v_now;

  INSERT INTO public.rate_limit_hits (key, count, expires_at)
  VALUES (p_key, 1, v_now + (p_window_seconds || ' seconds')::INTERVAL)
  ON CONFLICT (key) DO UPDATE
  SET count = public.rate_limit_hits.count + 1
  RETURNING count INTO v_count;

  RETURN v_count;
END;
$$;

COMMIT;
