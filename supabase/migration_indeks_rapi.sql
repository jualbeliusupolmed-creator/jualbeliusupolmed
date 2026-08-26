-- migration_indeks_rapi.sql — 26 Agustus 2026
-- SUDAH DIJALANKAN di produksi (autgrnrqeqdpqwkbolyh).
--
-- Dua hal kecil yang saling berlawanan, dirapikan sekali jalan.
--
-- 1) Tiga foreign key tanpa indeks. Postgres membuat indeks otomatis untuk
--    PRIMARY KEY dan UNIQUE, tapi TIDAK untuk sisi anak sebuah foreign key.
--    Akibatnya setiap "ambil chat room milik iklan ini" memindai seluruh tabel,
--    dan — yang lebih mahal — setiap DELETE/UPDATE pada baris induk memaksa
--    pemindaian penuh tabel anak untuk memeriksa acuan. Iklan dihapus tiap hari.
--
-- 2) Empat indeks kembar: dibuat tangan padahal constraint UNIQUE/PRIMARY KEY
--    sudah menyediakan indeks yang sama persis. seller_profiles.email bahkan
--    punya tiga (dua constraint UNIQUE + satu indeks biasa). Yang kembar bukan
--    cuma boros ruang; setiap INSERT membayar penulisan indeks yang sama dua kali.
--    Dicek dulu: tak ada satu pun upsert di src yang memakai onConflict "email",
--    jadi membuang salah satu constraint UNIQUE tidak memutus jalur mana pun.

-- 1. Indeks untuk sisi anak foreign key
CREATE INDEX IF NOT EXISTS idx_chat_rooms_listing_id    ON public.chat_rooms(listing_id);
CREATE INDEX IF NOT EXISTS idx_offers_listing_id        ON public.offers(listing_id);
CREATE INDEX IF NOT EXISTS idx_receipt_hashes_payment_id ON public.receipt_hashes(payment_id);

-- 2. Kembar dibuang (yang disisakan selalu indeks milik constraint)
DROP INDEX IF EXISTS public.idx_seller_profiles_email;   -- sisa: seller_profiles_email_key
ALTER TABLE public.seller_profiles DROP CONSTRAINT IF EXISTS seller_profiles_email_unique;
DROP INDEX IF EXISTS public.idx_mading_likes_post_user;  -- sisa: mading_likes_post_id_user_identifier_key
DROP INDEX IF EXISTS public.idx_receipt_hashes_hash;     -- sisa: receipt_hashes_hash_key
DROP INDEX IF EXISTS public.system_settings_key_idx;     -- sisa: system_settings_pkey
