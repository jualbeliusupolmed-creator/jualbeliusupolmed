CREATE INDEX IF NOT EXISTS idx_chat_rooms_listing_id    ON public.chat_rooms(listing_id);
CREATE INDEX IF NOT EXISTS idx_offers_listing_id        ON public.offers(listing_id);
CREATE INDEX IF NOT EXISTS idx_receipt_hashes_payment_id ON public.receipt_hashes(payment_id);

DROP INDEX IF EXISTS public.idx_seller_profiles_email;
ALTER TABLE public.seller_profiles DROP CONSTRAINT IF EXISTS seller_profiles_email_unique;
DROP INDEX IF EXISTS public.idx_mading_likes_post_user;
DROP INDEX IF EXISTS public.idx_receipt_hashes_hash;
DROP INDEX IF EXISTS public.system_settings_key_idx;;
