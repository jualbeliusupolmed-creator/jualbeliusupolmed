-- Migration: sewa barang
-- Tambah kolom rental_period untuk listing tipe sewa

ALTER TABLE listings ADD COLUMN IF NOT EXISTS rental_period TEXT; -- 'harian' | 'mingguan' | 'bulanan'

-- Index untuk filter tipe
CREATE INDEX IF NOT EXISTS idx_listings_type ON listings(type);
