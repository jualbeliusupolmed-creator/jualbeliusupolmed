-- Migration: Fitur Distributor
-- Jalankan di Supabase SQL Editor

-- 1. Tambah kolom distributor di seller_profiles
ALTER TABLE seller_profiles
  ADD COLUMN IF NOT EXISTS distributor BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Tambah kolom distributor_fee di listings (fee bagi hasil per iklan)
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS distributor_fee INTEGER;

-- 3. Tabel kategori per distributor (bisa lebih dari 1)
CREATE TABLE IF NOT EXISTS distributor_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_wa   TEXT NOT NULL REFERENCES seller_profiles(wa) ON DELETE CASCADE,
  category    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (seller_wa, category)
);

CREATE INDEX IF NOT EXISTS idx_dist_cat_wa ON distributor_categories(seller_wa);

-- 4. Tabel undangan / link bergabung distributor (dibuat admin)
CREATE TABLE IF NOT EXISTS distributor_invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token       TEXT NOT NULL UNIQUE,
  wa          TEXT NOT NULL,
  created_by  TEXT,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','used','revoked')),
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dist_invite_token ON distributor_invites(token);
CREATE INDEX IF NOT EXISTS idx_dist_invite_wa    ON distributor_invites(wa);
