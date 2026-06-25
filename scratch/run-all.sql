-- ============================================================
-- PART 1: Push Notification Migration
-- ============================================================

DROP POLICY IF EXISTS "Service role only" ON push_subscriptions;
DROP POLICY IF EXISTS "Service role only" ON scheduled_broadcasts;

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wa TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_wa ON push_subscriptions(wa);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON push_subscriptions
  USING (false) WITH CHECK (false);

CREATE TABLE IF NOT EXISTS scheduled_broadcasts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  image_url TEXT,
  target_type TEXT DEFAULT 'all',
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_broadcasts_status_scheduled
  ON scheduled_broadcasts(status, scheduled_at);

ALTER TABLE scheduled_broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON scheduled_broadcasts
  USING (false) WITH CHECK (false);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS meta JSONB;

-- ============================================================
-- PART 2: Cleanup Akun Ganda @lid
-- ============================================================

-- [INFO] Profil tidak valid sebelum cleanup:
SELECT wa, name, created_at FROM seller_profiles
WHERE wa !~ '^0[0-9]{9,12}$' ORDER BY created_at DESC;

-- [INFO] Pasangan akun ganda yang bisa di-merge:
SELECT
  sp_invalid.wa AS wa_invalid,
  sp_invalid.name AS nama,
  sp_valid.wa   AS wa_valid
FROM seller_profiles sp_invalid
JOIN seller_profiles sp_valid
  ON sp_valid.name = sp_invalid.name
  AND sp_valid.wa ~ '^0[0-9]{9,12}$'
WHERE sp_invalid.wa !~ '^0[0-9]{9,12}$';

-- Pindahkan listings ke wa valid (hanya jika ada pasangan valid)
UPDATE listings
SET seller_wa = sp_valid.wa,
    seller_name = sp_valid.name
FROM seller_profiles sp_invalid
JOIN seller_profiles sp_valid
  ON sp_valid.name = sp_invalid.name
  AND sp_valid.wa ~ '^0[0-9]{9,12}$'
WHERE listings.seller_wa = sp_invalid.wa
  AND sp_invalid.wa !~ '^0[0-9]{9,12}$';

-- Pindahkan price_offers (buyer) ke wa valid
UPDATE price_offers
SET buyer_wa = sp_valid.wa
FROM seller_profiles sp_invalid
JOIN seller_profiles sp_valid
  ON sp_valid.name = sp_invalid.name
  AND sp_valid.wa ~ '^0[0-9]{9,12}$'
WHERE price_offers.buyer_wa = sp_invalid.wa
  AND sp_invalid.wa !~ '^0[0-9]{9,12}$';

-- Hapus profil tidak valid yang sudah tidak punya listings (sudah di-merge atau orphan)
DELETE FROM seller_profiles
WHERE wa !~ '^0[0-9]{9,12}$'
  AND wa NOT IN (
    SELECT DISTINCT seller_wa FROM listings WHERE seller_wa !~ '^0[0-9]{9,12}$'
  );

-- ============================================================
-- VERIFIKASI AKHIR
-- ============================================================

SELECT 'push_subscriptions' AS tabel, COUNT(*) AS rows FROM push_subscriptions
UNION ALL
SELECT 'scheduled_broadcasts', COUNT(*) FROM scheduled_broadcasts
UNION ALL
SELECT 'profil_tidak_valid_sisa', COUNT(*) FROM seller_profiles WHERE wa !~ '^0[0-9]{9,12}$'
UNION ALL
SELECT 'listings_tidak_valid_sisa', COUNT(*) FROM listings WHERE seller_wa !~ '^0[0-9]{9,12}$';
