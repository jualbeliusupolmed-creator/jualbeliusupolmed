-- ============================================================
-- SEED: Akun UKM "UP Admin" — Super Admin Platform
-- Jual Beli USU & POLMED
--
-- Identifier: email_up_admin  (bisa login via Email & Password)
-- Email: admin@jualbeliusupolmed.web.id
-- Password default: upadmin2026 (GANTI SETELAH LOGIN PERTAMA)
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
  created_at
)
VALUES (
  'email_up_admin',
  'UP Admin',
  'UP — Jual Beli USU & POLMED',
  'ukm',
  true,
  'Platform',
  'USU',
  'Universitas',
  '@jualbeliusupolmed',
  'Platform resmi komunitas jual beli, mading, dan kegiatan mahasiswa USU & POLMED.',
  '$2a$10$3mK.TcqtudfNQ/PxxGdeIewU.KJq4NQkxvQ/9iaeBToFtslGE7MAa',
  now()
)
ON CONFLICT (wa) DO UPDATE
SET
  ukm_name     = EXCLUDED.ukm_name,
  account_type = EXCLUDED.account_type,
  ukm_verified = EXCLUDED.ukm_verified,
  ukm_category = EXCLUDED.ukm_category,
  ukm_instagram = EXCLUDED.ukm_instagram,
  bio          = EXCLUDED.bio;

-- Catat juga di tabel identitas email (jika ada)
-- Jika tabel seller_email_accounts belum ada, abaikan blok ini
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'seller_email_accounts'
  ) THEN
    INSERT INTO public.seller_email_accounts (email, seller_wa, created_at)
    VALUES ('admin@jualbeliusupolmed.web.id', 'email_up_admin', now())
    ON CONFLICT (email) DO NOTHING;
  END IF;
END
$$;
