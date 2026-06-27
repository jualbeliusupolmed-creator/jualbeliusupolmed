-- Anti-spam: cooldown notifikasi per buyer dan batas iklan aktif per seller

-- Tambah last_notified_at ke category_subscriptions
ALTER TABLE category_subscriptions
  ADD COLUMN IF NOT EXISTS last_notified_at timestamptz;

-- Tambah last_notified_at ke wanted_listings
ALTER TABLE wanted_listings
  ADD COLUMN IF NOT EXISTS last_notified_at timestamptz;

-- Index agar query cooldown cepat
CREATE INDEX IF NOT EXISTS idx_category_sub_notified
  ON category_subscriptions (buyer_wa, category, last_notified_at);

CREATE INDEX IF NOT EXISTS idx_wanted_notified
  ON wanted_listings (buyer_wa, last_notified_at);
