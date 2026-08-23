-- ========================================================
-- Migration: Bot Upgrade & Anti-Fraud Features
-- 1. receipt_hashes (Anti-Reuse Struk QRIS via Image Hash)
-- 2. keyword_subscriptions (Pantau Keyword via Bot WA)
-- ========================================================

CREATE TABLE IF NOT EXISTS receipt_hashes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hash TEXT NOT NULL UNIQUE,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  wa TEXT,
  amount NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receipt_hashes_hash ON receipt_hashes(hash);

CREATE TABLE IF NOT EXISTS keyword_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_wa TEXT NOT NULL,
  keyword TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_buyer_keyword UNIQUE(buyer_wa, keyword)
);

CREATE INDEX IF NOT EXISTS idx_keyword_subs_keyword ON keyword_subscriptions(keyword);
CREATE INDEX IF NOT EXISTS idx_keyword_subs_wa ON keyword_subscriptions(buyer_wa);

-- RLS
ALTER TABLE receipt_hashes ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_subscriptions ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS, anon can read nothing on receipt_hashes
CREATE POLICY "Admin full access on receipt_hashes"
  ON receipt_hashes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin full access on keyword_subscriptions"
  ON keyword_subscriptions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
