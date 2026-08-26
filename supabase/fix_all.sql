-- ============================================================
-- FIX ALL: Migration + Seed UP Admin
-- Jalankan SATU KALI di Supabase SQL Editor
-- ============================================================

-- LANGKAH 1: Tambahkan kolom email ke seller_profiles
ALTER TABLE public.seller_profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

-- LANGKAH 2: Buat index untuk email agar query cepat
CREATE INDEX IF NOT EXISTS idx_seller_profiles_email
  ON public.seller_profiles (email)
  WHERE email IS NOT NULL;

-- LANGKAH 3: Tambahkan constraint UNIQUE untuk email (jika belum ada)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'seller_profiles_email_unique'
  ) THEN
    ALTER TABLE public.seller_profiles
      ADD CONSTRAINT seller_profiles_email_unique UNIQUE (email);
  END IF;
END
$$;

-- LANGKAH 4: Insert/Update akun UP Admin
-- Password "upadmin2026" di-hash menggunakan format yang sama dengan sistem
-- CATATAN: Ganti <HASH_DI_SINI> dengan hash yang dihasilkan oleh script di bawah
-- Atau jalankan dulu: node -e "const {hashPin}=require('./src/lib/pin');console.log(hashPin('upadmin2026'))"
-- lalu tempel hasilnya

-- Cek apakah helper akun sudah ada, jika belum insert
INSERT INTO public.seller_profiles (
  wa,
  name,
  email,
  pin,
  account_type,
  ukm_name,
  ukm_category,
  ukm_verified,
  campus,
  auth_provider,
  created_at
)
SELECT
  '08000000001',           -- wa placeholder untuk UP Admin (format valid, tidak dipakai login)
  'UP Admin',
  'admin@jualbeliusupolmed.web.id',
  '$2a$10$ECGSauzTPYw3gVCL3nJ5NuLcZg27/k18x7V2pvBaunrRsVsIfV7Ki',  -- bcrypt hash of 'upadmin2026'
  'ukm',
  'USU POLMED UPDATE',
  'Platform Admin',
  true,
  'USU & POLMED',
  'email',
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.seller_profiles
  WHERE wa = '08000000001' OR email = 'admin@jualbeliusupolmed.web.id'
);

-- Hapus entry lama jika ada (wa = 'email_up_admin' dari seed sebelumnya)
DELETE FROM public.seller_profiles WHERE wa = 'email_up_admin';

-- Update jika sudah ada dengan wa 08000000001 (rerun-safe)
UPDATE public.seller_profiles
SET
  name          = 'UP Admin',
  ukm_name      = 'UP — Jual Beli USU & POLMED',
  email         = 'admin@jualbeliusupolmed.web.id',
  pin           = '$2a$10$ECGSauzTPYw3gVCL3nJ5NuLcZg27/k18x7V2pvBaunrRsVsIfV7Ki',
  account_type  = 'ukm',
  ukm_verified  = true,
  auth_provider = 'email'
WHERE wa = '08000000001';

-- Verifikasi hasil
SELECT wa, name, email, account_type, ukm_verified
FROM public.seller_profiles
WHERE email = 'admin@jualbeliusupolmed.web.id';
