-- Migration: push_subscriptions + scheduled_broadcasts
-- Jalankan di Supabase SQL Editor

-- Tabel untuk menyimpan Web Push subscription per user
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wa TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_wa ON push_subscriptions(wa);

-- Row Level Security: hanya service role yang bisa akses
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON push_subscriptions
  USING (false)
  WITH CHECK (false);

-- -----------------------------------------------

-- Tabel untuk broadcast terjadwal
CREATE TABLE IF NOT EXISTS scheduled_broadcasts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  image_url TEXT,
  target_type TEXT DEFAULT 'all',        -- 'all' = semua penjual
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending'          -- pending | sending | sent | failed
    CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  meta JSONB,                            -- { successCount, failCount, error }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_broadcasts_status_scheduled
  ON scheduled_broadcasts(status, scheduled_at);

ALTER TABLE scheduled_broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON scheduled_broadcasts
  USING (false)
  WITH CHECK (false);

-- -----------------------------------------------

-- Tambah kolom meta ke payments jika belum ada (untuk renewal/upgrade via WA)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS meta JSONB;

-- Tambah kolom renewal_fee ke settings pricing jika belum ada
-- (nilai default Rp 2.000, sama dengan biaya iklan barang murah)
-- Ini hanya catatan; nilai disimpan di tabel settings sebagai JSON
