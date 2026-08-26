-- ============================================================
-- SEED: Akun UKM "UP Admin" — Super Admin Platform
-- Jual Beli USU & POLMED
--
-- Identifier: email (bisa login via Email & Password)
-- Email: admin@jualbeliusupolmed.web.id
-- Password default: upadmin2026 (GANTI SETELAH LOGIN PERTAMA)
--
-- PENTING: Jalankan migration_email.sql TERLEBIH DAHULU
--          sebelum menjalankan file ini!
-- ============================================================

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
  email,
  auth_provider,
  created_at
)
VALUES (
  '08000000001',
  'UP Admin',
  'UP — Jual Beli USU & POLMED',
  'ukm',
  true,
  'Platform',
  'USU & POLMED',
  'Universitas',
  '@jualbeliusupolmed',
  'Platform resmi komunitas jual beli, mading, dan kegiatan mahasiswa USU & POLMED.',
  '$2a$10$ECGSauzTPYw3gVCL3nJ5NuLcZg27/k18x7V2pvBaunrRsVsIfV7Ki',
  'admin@jualbeliusupolmed.web.id',
  'email',
  now()
)
ON CONFLICT (wa) DO UPDATE
SET
  name         = EXCLUDED.name,
  ukm_name     = EXCLUDED.ukm_name,
  account_type = EXCLUDED.account_type,
  ukm_verified = EXCLUDED.ukm_verified,
  ukm_category = EXCLUDED.ukm_category,
  ukm_instagram = EXCLUDED.ukm_instagram,
  email        = EXCLUDED.email,
  pin          = EXCLUDED.pin,
  auth_provider = EXCLUDED.auth_provider,
  bio          = EXCLUDED.bio;

-- Konfirmasi
SELECT wa, name, email, account_type, ukm_verified FROM public.seller_profiles
WHERE wa = '08000000001';
