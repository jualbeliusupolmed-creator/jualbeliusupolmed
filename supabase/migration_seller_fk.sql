-- Migration: tambahkan foreign key listings.seller_wa -> seller_profiles.wa
-- Tujuan: integritas data + memungkinkan embedded join PostgREST (gantikan manual join di dbHelpers.js).
-- Aman dijalankan berulang (idempotent). Sudah diverifikasi: 0 baris yatim, 0 seller_wa NULL.
--
-- Cara jalankan: buka Supabase Dashboard -> SQL Editor -> tempel seluruh isi file ini -> Run.

-- 1. Pastikan kolom target (wa) punya UNIQUE constraint (syarat foreign key).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'seller_profiles_wa_key') THEN
    ALTER TABLE seller_profiles ADD CONSTRAINT seller_profiles_wa_key UNIQUE (wa);
  END IF;
END $$;

-- 2. Tambah foreign key. ON DELETE SET NULL: jika profil dihapus, listing tetap ada
--    (seller_wa jadi NULL) alih-alih ikut terhapus. ON UPDATE CASCADE: ganti nomor ikut tersinkron.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'listings_seller_wa_fkey') THEN
    ALTER TABLE listings
      ADD CONSTRAINT listings_seller_wa_fkey
      FOREIGN KEY (seller_wa) REFERENCES seller_profiles(wa)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Index untuk mempercepat lookup/join per penjual.
CREATE INDEX IF NOT EXISTS idx_listings_seller_wa ON listings(seller_wa);
