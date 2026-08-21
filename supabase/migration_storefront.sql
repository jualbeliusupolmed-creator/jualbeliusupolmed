-- ---------------------------------------------------------------------
-- Storefront penjual (/toko/[slug])
--
-- Semua kolom menempel di seller_profiles, bukan tabel baru: satu penjual
-- selalu satu toko, jadi tabel terpisah cuma menambah JOIN tanpa menambah
-- apa pun yang bisa dinyatakan.
--
-- Yang gratis di sini adalah TOKONYA — halaman, nama, branding, alamat URL
-- sendiri, tombol bagikan. Isinya tetap iklan berstatus 'active' milik
-- penjual, jadi model bayar-untuk-tampil-di-katalog-kampus tidak tersentuh.
--
-- CARA MENJALANKAN: Supabase → SQL Editor → tempel seluruh berkas ini → Run.
-- Aman dijalankan berulang kali; kalau ragu sudah pernah jalan atau belum,
-- jalankan lagi. Baris terakhir mencetak tabel ringkasan — itu jawabannya,
-- bukan tulisan "Success. No rows returned".
-- ---------------------------------------------------------------------

BEGIN;

-- ---------------------------------------------------------------------
-- 0. Prasyarat
--
-- ALTER TABLE pada tabel yang tidak ada gagal dengan pesan Postgres yang
-- benar tapi tidak menolong ("relation does not exist"). Yang menolong
-- adalah nama berkas yang harus dijalankan lebih dulu.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.seller_profiles') IS NULL THEN
    RAISE EXCEPTION
      'Tabel public.seller_profiles belum ada. Jalankan supabase/migration_seller_profiles.sql lebih dulu, baru berkas ini.';
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 1. Kolom toko
-- ---------------------------------------------------------------------
ALTER TABLE public.seller_profiles
  ADD COLUMN IF NOT EXISTS slug               TEXT,
  ADD COLUMN IF NOT EXISTS store_name         TEXT,
  ADD COLUMN IF NOT EXISTS tagline            TEXT,
  ADD COLUMN IF NOT EXISTS logo_url           TEXT,
  ADD COLUMN IF NOT EXISTS banner_url         TEXT,
  ADD COLUMN IF NOT EXISTS store_area         TEXT,
  ADD COLUMN IF NOT EXISTS store_hours        TEXT,
  ADD COLUMN IF NOT EXISTS store_instagram    TEXT,
  ADD COLUMN IF NOT EXISTS store_accent       TEXT    DEFAULT 'emerald',
  ADD COLUMN IF NOT EXISTS store_open         BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS store_announcement TEXT,
  ADD COLUMN IF NOT EXISTS store_updated_at   TIMESTAMPTZ;

-- trusted_seller sebenarnya milik migration_blogs_subscription.sql, bukan
-- berkas ini. Ikut disebut di sini karena GET /api/toko memilih kolom itu
-- dalam satu SELECT bersama kolom toko: kalau ia belum ada, form toko di
-- dasbor menjawab 500 dan penjual melihat "gagal memuat" tanpa satu pun
-- petunjuk bahwa yang kurang adalah kolom dari migrasi yang sama sekali
-- lain. IF NOT EXISTS membuat baris ini tidak berbuat apa-apa kalau
-- migrasi itu memang sudah dijalankan.
ALTER TABLE public.seller_profiles
  ADD COLUMN IF NOT EXISTS trusted_seller BOOLEAN NOT NULL DEFAULT FALSE;

-- ---------------------------------------------------------------------
-- 2. Kolom yang dibaca sebagai keadaan, bukan sebagai teks, tidak boleh NULL
--
-- Halaman toko memutuskan "Buka"/"Tutup" dari store_open dan memilih warna
-- dari store_accent. NULL di keduanya terbaca sebagai tutup dan sebagai
-- warna bawaan — dua kebohongan kecil untuk baris profil lama yang dibuat
-- sebelum kolomnya ada. Isi dulu, baru dikunci.
-- ---------------------------------------------------------------------
UPDATE public.seller_profiles SET store_open   = TRUE      WHERE store_open   IS NULL;
UPDATE public.seller_profiles SET store_accent = 'emerald' WHERE store_accent IS NULL;

ALTER TABLE public.seller_profiles
  ALTER COLUMN store_open   SET DEFAULT TRUE,
  ALTER COLUMN store_open   SET NOT NULL,
  ALTER COLUMN store_accent SET DEFAULT 'emerald',
  ALTER COLUMN store_accent SET NOT NULL;

-- ---------------------------------------------------------------------
-- 3. Rapikan slug yang mungkin sudah terlanjur masuk
--
-- Alamat toko disimpan huruf kecil apa adanya. Kalau ada baris yang masuk
-- lewat jalan lain (SQL Editor, impor, versi API yang lebih tua), rapikan
-- sekarang — sebelum indeks unik di bawah menilai dua bentuk dari alamat
-- yang sama sebagai dua alamat berbeda.
-- ---------------------------------------------------------------------
UPDATE public.seller_profiles
   SET slug = NULLIF(btrim(lower(slug)), '')
 WHERE slug IS NOT NULL
   AND slug IS DISTINCT FROM NULLIF(btrim(lower(slug)), '');

-- Dua penjual dengan slug yang cuma beda huruf besar-kecil baru ketahuan di
-- sini, dan pesan bawaan Postgres saat indeks unik gagal ("could not create
-- unique index") tidak menyebut siapa yang bentrok. Sebut.
DO $$
DECLARE bentrok TEXT;
BEGIN
  SELECT string_agg(slug || ' (' || jumlah || ' penjual)', ', ')
    INTO bentrok
    FROM (
      SELECT slug, count(*) AS jumlah
        FROM public.seller_profiles
       WHERE slug IS NOT NULL
       GROUP BY slug HAVING count(*) > 1
    ) d;
  IF bentrok IS NOT NULL THEN
    RAISE EXCEPTION
      'Alamat toko kembar, indeks unik tidak bisa dibuat: %. Ubah salah satu lewat tab Toko di panel admin, lalu jalankan berkas ini lagi.', bentrok;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 4. Bentuk slug ditegakkan basis data
--
-- normalisasiSlug() di src/lib/toko.js sudah menghasilkan bentuk ini, tapi
-- ia cuma mengikat penjual yang lewat form. Halaman /toko/[slug] mencari
-- dengan ilike, jadi slug yang mengandung % atau _ akan cocok dengan toko
-- orang lain — dan yang bisa menutup jalan itu untuk SEMUA penulis, termasuk
-- SQL Editor dan skrip impor, cuma basis datanya sendiri.
--
-- Yang TIDAK ikut ke sini: daftar kata terlarang ("admin", "official", …)
-- dan larangan slug serba-angka. Keduanya aturan produk yang akan berubah,
-- dan salinan kedua yang perlahan berbeda dari src/lib/toko.js lebih
-- berbahaya daripada tidak punya salinan sama sekali. Di sini hanya bentuk
-- yang tidak akan berubah: huruf kecil, angka, tanda hubung sebagai pemisah,
-- 3–32 huruf.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.seller_profiles'::regclass
       AND conname  = 'seller_profiles_slug_bentuk'
  ) THEN
    -- NOT VALID: baris lama yang menyalahi aturan tidak menggagalkan migrasi
    -- ini — mereka diperiksa terpisah di bawah. Setiap penulisan BARU tetap
    -- terikat sejak detik ini.
    ALTER TABLE public.seller_profiles
      ADD CONSTRAINT seller_profiles_slug_bentuk
      CHECK (
        slug IS NULL
        OR (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) BETWEEN 3 AND 32)
      ) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  ALTER TABLE public.seller_profiles VALIDATE CONSTRAINT seller_profiles_slug_bentuk;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE
    'Ada alamat toko lama yang bentuknya tidak sah — dibiarkan apa adanya supaya tautan yang sudah disebar penjual tidak mati. Cari lewat: SELECT wa, slug FROM seller_profiles WHERE slug IS NOT NULL AND NOT (slug ~ ''^[a-z0-9]+(-[a-z0-9]+)*$'' AND char_length(slug) BETWEEN 3 AND 32);';
END $$;

-- ---------------------------------------------------------------------
-- 5. Keunikan alamat toko
--
-- Slug itu alamat publik: keunikan ditegakkan basis data, bukan dipercayakan
-- pada pemeriksaan di aplikasi yang bisa kalah balapan antara dua permintaan
-- yang datang bersamaan. Partial index supaya penjual yang belum punya toko
-- (slug NULL) tidak saling bentrok, dan lower() supaya tetap benar meski
-- aturan huruf kecil di atas suatu saat dilepas.
-- ---------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS seller_profiles_slug_key
  ON public.seller_profiles (lower(slug))
  WHERE slug IS NOT NULL;

-- ---------------------------------------------------------------------
-- 6. Hak baca
--
-- Halaman toko dibaca publik tanpa login. RLS di tabel ini sudah mengizinkan
-- SELECT untuk semua (migration_seller_profiles.sql dan migration_rls.sql),
-- jadi tidak ada policy baru yang perlu ditambahkan — kolom baru ikut policy
-- tabelnya, bukan punya izin sendiri.
-- ---------------------------------------------------------------------

COMMIT;

-- ---------------------------------------------------------------------
-- 7. Bukti
--
-- Dijalankan setelah COMMIT, jadi yang dilaporkan adalah keadaan yang benar-
-- benar tersimpan. Semua baris harus berbunyi OK; kalau ada yang KURANG,
-- migrasinya belum selesai apa pun yang tertulis di kotak pesan editor.
-- ---------------------------------------------------------------------
SELECT 'Kolom toko' AS bagian,
       count(*) || ' / 13 terpasang' AS keadaan,
       CASE WHEN count(*) = 13 THEN 'OK' ELSE 'KURANG' END AS status
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'seller_profiles'
   AND column_name IN ('slug','store_name','tagline','logo_url','banner_url',
                       'store_area','store_hours','store_instagram','store_accent',
                       'store_open','store_announcement','store_updated_at','trusted_seller')
UNION ALL
SELECT 'Indeks unik slug',
       COALESCE(max(indexname), 'tidak ada'),
       CASE WHEN count(*) = 1 THEN 'OK' ELSE 'KURANG' END
  FROM pg_indexes
 WHERE schemaname = 'public' AND tablename = 'seller_profiles'
   AND indexname = 'seller_profiles_slug_key'
UNION ALL
SELECT 'Aturan bentuk slug',
       COALESCE(max(CASE WHEN convalidated THEN 'terpasang & tervalidasi'
                         ELSE 'terpasang (ada slug lama yang menyalahi)' END), 'tidak ada'),
       CASE WHEN count(*) = 1 THEN 'OK' ELSE 'KURANG' END
  FROM pg_constraint
 WHERE conrelid = 'public.seller_profiles'::regclass
   AND conname  = 'seller_profiles_slug_bentuk'
UNION ALL
SELECT 'Toko yang sudah dibuat',
       count(*) || ' penjual sudah punya alamat toko',
       'INFO'
  FROM public.seller_profiles
 WHERE slug IS NOT NULL;
