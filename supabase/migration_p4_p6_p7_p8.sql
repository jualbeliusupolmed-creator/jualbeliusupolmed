-- =====================================================================
-- Migration: P4 Kondisi Barang + P6 Tawaran Harga + P7 Langganan
--            Kategori + P8 Sponsored Listing
-- Jalankan di Supabase SQL Editor SETELAH migration_blogs_subscription.sql
-- =====================================================================

-- P4: Kolom kondisi barang di listings
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS condition text DEFAULT 'used'
    CHECK (condition IN ('new', 'used'));

-- P8: Kolom sponsored di listings
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS sponsored_until timestamptz;

-- P6: Tabel tawaran harga
CREATE TABLE IF NOT EXISTS public.price_offers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_name  text NOT NULL,
  buyer_wa    text NOT NULL,
  offer_price bigint NOT NULL,
  message     text,
  status      text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS price_offers_listing_idx ON public.price_offers (listing_id, status);
CREATE INDEX IF NOT EXISTS price_offers_seller_wa_idx ON public.price_offers (listing_id);

ALTER TABLE public.price_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone can insert offers" ON public.price_offers;
CREATE POLICY "anyone can insert offers"
  ON public.price_offers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "anyone can read offers" ON public.price_offers;
CREATE POLICY "anyone can read offers"
  ON public.price_offers FOR SELECT USING (true);

DROP POLICY IF EXISTS "anyone can update offers" ON public.price_offers;
CREATE POLICY "anyone can update offers"
  ON public.price_offers FOR UPDATE USING (true);

-- P7: Tabel langganan kategori
CREATE TABLE IF NOT EXISTS public.category_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_wa    text NOT NULL,
  buyer_name  text,
  category    text NOT NULL,
  campus      text NOT NULL DEFAULT 'Semua',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (buyer_wa, category, campus)
);

ALTER TABLE public.category_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone can insert cat subscriptions" ON public.category_subscriptions;
CREATE POLICY "anyone can insert cat subscriptions"
  ON public.category_subscriptions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "anyone can delete own cat subscription" ON public.category_subscriptions;
CREATE POLICY "anyone can delete own cat subscription"
  ON public.category_subscriptions FOR DELETE USING (true);

-- P8: Update payments type check untuk include 'sponsored'
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_type_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_type_check
  CHECK (type IN ('iklan', 'bump', 'featured', 'sold_fee', 'subscribe', 'renewal', 'autobump', 'sponsored'));
