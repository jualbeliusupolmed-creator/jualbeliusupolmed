-- Tambah type 'wanted' ke payments_type_check constraint
-- Dibutuhkan untuk posting iklan "DICARI" yang berbayar (posting ke-4+)

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_type_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_type_check
  CHECK (type IN ('iklan', 'bump', 'featured', 'sold_fee', 'subscribe', 'renewal', 'autobump', 'sponsored', 'wanted'));
