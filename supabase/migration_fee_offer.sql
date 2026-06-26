-- Migration: tambah kolom tawaran biaya iklan ke tabel listings
-- Jalankan di Supabase SQL Editor

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS fee_offer numeric,
  ADD COLUMN IF NOT EXISTS fee_offer_status text CHECK (fee_offer_status IN ('pending', 'approved', 'rejected'));

-- Index untuk query antrian moderasi
CREATE INDEX IF NOT EXISTS idx_listings_fee_offer_status
  ON listings (fee_offer_status)
  WHERE fee_offer_status IS NOT NULL;

