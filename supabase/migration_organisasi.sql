-- ==============================================================================
-- MIGRATION: Akun Khusus UKM & Organisasi Kampus
-- Jual Beli & Komunitas Mahasiswa USU & POLMED
-- ==============================================================================

-- 1. Tambahkan kolom pendukung akun UKM & Organisasi pada tabel seller_profiles
ALTER TABLE public.seller_profiles
  ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'personal',
  ADD COLUMN IF NOT EXISTS ukm_name TEXT,
  ADD COLUMN IF NOT EXISTS ukm_category TEXT DEFAULT 'bem_hima',
  ADD COLUMN IF NOT EXISTS ukm_instagram TEXT,
  ADD COLUMN IF NOT EXISTS ukm_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS campus TEXT DEFAULT 'USU',
  ADD COLUMN IF NOT EXISTS faculty TEXT DEFAULT 'Universitas';

-- 2. Indexing untuk pencarian direktori organisasi cepat
CREATE INDEX IF NOT EXISTS seller_profiles_account_type_idx
  ON public.seller_profiles (account_type, ukm_category, campus);

-- 3. Pastikan RLS mengizinkan pembacaan publik profil UKM
DROP POLICY IF EXISTS "Public read ukm profiles" ON public.seller_profiles;
CREATE POLICY "Public read ukm profiles"
  ON public.seller_profiles FOR SELECT
  USING (true);
