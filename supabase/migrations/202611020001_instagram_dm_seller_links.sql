-- Migrasi: 202611020001_instagram_dm_seller_links.sql
-- Tujuan: Penautan Akun Instagram DM ke Profil Penjual Terverifikasi via OTP WhatsApp
-- Sesuai Rencana: docs/rencana-ig-dm-jual.md (Tahap 2)

-- 1. Tabel Pemetaan Identitas Instagram Sender ID ke Nomor WhatsApp Penjual
CREATE TABLE IF NOT EXISTS public.ig_seller_links (
  ig_sender_id TEXT PRIMARY KEY,
  wa TEXT NOT NULL REFERENCES public.seller_profiles(wa) ON DELETE CASCADE,
  campus TEXT DEFAULT 'Semua',
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ig_seller_links_wa ON public.ig_seller_links(wa);

-- 2. Tabel Tantangan OTP Penautan (Terkunci dengan Hash, TTL 5 Menit, Maks 3 Percobaan)
CREATE TABLE IF NOT EXISTS public.ig_link_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ig_sender_id TEXT NOT NULL,
  wa TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  campus TEXT DEFAULT 'Semua',
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'verified', 'expired', 'failed'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ig_link_challenges_wa_status ON public.ig_link_challenges(wa, status);
CREATE INDEX IF NOT EXISTS idx_ig_link_challenges_sender_status ON public.ig_link_challenges(ig_sender_id, status);

-- 3. Kebijakan Row Level Security (RLS) - Ketat Service Role Sahaja
ALTER TABLE public.ig_seller_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ig_link_challenges ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ig_seller_links' AND policyname = 'service_role_all_ig_seller_links'
  ) THEN
    CREATE POLICY service_role_all_ig_seller_links ON public.ig_seller_links
      FOR ALL USING (auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ig_link_challenges' AND policyname = 'service_role_all_ig_link_challenges'
  ) THEN
    CREATE POLICY service_role_all_ig_link_challenges ON public.ig_link_challenges
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

