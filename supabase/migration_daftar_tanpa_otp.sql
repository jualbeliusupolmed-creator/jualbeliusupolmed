-- ---------------------------------------------------------------------
-- Penanda "nomor ini belum pernah dibuktikan" (wa_verified)
--
-- WAJIB DIJALANKAN. Sejak pendaftaran tidak lagi memakai OTP, setiap akun baru
-- ditulis dengan kolom ini — dan setiap pemulihan lewat "Lupa PIN" menaikkannya
-- jadi TRUE. Rute pendaftaran memang punya jaring pengaman (kalau kolomnya tidak
-- ada, barisnya ditulis tanpa penanda dan log berteriak), tapi selama migrasi ini
-- belum jalan, tidak ada yang bisa membedakan akun yang nomornya terbukti dari
-- akun yang cuma diketik orang.
--
-- Nomor WhatsApp adalah kunci akun di sistem ini: iklan, toko, dan penilaian
-- semuanya digantung pada seller_wa. Mendaftar tanpa OTP berarti sistem percaya
-- dulu pada pengetiknya — dan itu aman selama nomornya belum punya apa pun untuk
-- direbut. Yang punya iklan tidak pernah lewat jalur itu; mereka wajib "Lupa PIN"
-- yang tetap menuntut kode dari WhatsApp nomor itu sendiri. Kode itu juga yang
-- membuat pemilik asli selalu bisa merebut kembali nomornya dari siapa pun yang
-- mendaftar duluan memakai nomor orang.
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
-- ALTER TABLE pada tabel yang tidak ada gagal dengan pesan Postgres yang benar
-- tapi tidak menolong ("relation does not exist"). Yang menolong adalah nama
-- berkas yang harus dijalankan lebih dulu.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.seller_profiles') IS NULL THEN
    RAISE EXCEPTION
      'Tabel public.seller_profiles belum ada. Jalankan supabase/migration_seller_profiles.sql lebih dulu, baru berkas ini.';
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 1. Kolomnya, dan backfill yang hanya boleh terjadi sekali
--
-- Semua akun yang sudah punya PIN sebelum perubahan ini lahir lewat OTP, jadi
-- nomornya memang sudah terbukti. Tanpa backfill itu mereka akan terlihat seolah
-- belum terverifikasi dan diminta memverifikasi ulang tanpa alasan.
--
-- Tapi backfill yang sama, dijalankan ulang bulan depan, akan menandai TERBUKTI
-- setiap orang yang mendaftar tanpa OTP — persis yang penanda ini dipasang untuk
-- membedakan. Karena itu ia hanya jalan saat kolomnya baru saja lahir di jalan
-- ini, atau saat kolomnya ada tapi belum ada satu pun akun bertanda TRUE
-- (kolomnya pernah ditambahkan sendirian tanpa backfill-nya). Begitu ada satu
-- akun terbukti, berkas ini tidak pernah lagi menyentuh isi tabel.
-- ---------------------------------------------------------------------
--
-- Perintah yang menyebut wa_verified ditulis lewat EXECUTE dengan sengaja:
-- kolomnya baru lahir beberapa baris di atas, dan SQL biasa di dalam blok yang
-- sama menyebut nama yang belum ada saat blok ini disiapkan.
DO $$
DECLARE
  kolom_baru BOOLEAN;
  sudah_ada  BOOLEAN;
  jumlah     BIGINT := 0;
BEGIN
  kolom_baru := NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'seller_profiles'
       AND column_name = 'wa_verified'
  );

  IF kolom_baru THEN
    ALTER TABLE public.seller_profiles
      ADD COLUMN wa_verified BOOLEAN DEFAULT FALSE;
    sudah_ada := FALSE;
  ELSE
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.seller_profiles WHERE wa_verified IS TRUE)'
      INTO sudah_ada;
  END IF;

  IF sudah_ada THEN
    RAISE NOTICE 'Backfill dilewati — tabelnya sudah punya akun bertanda terbukti.';
  ELSE
    EXECUTE 'UPDATE public.seller_profiles
                SET wa_verified = TRUE
              WHERE pin IS NOT NULL AND wa_verified IS DISTINCT FROM TRUE';
    GET DIAGNOSTICS jumlah = ROW_COUNT;
    RAISE NOTICE 'Akun lama yang ditandai terbukti: %', jumlah;
  END IF;
END $$;

COMMIT;

-- ---------------------------------------------------------------------
-- 3. Ringkasan — inilah yang harus dibaca setelah Run
-- ---------------------------------------------------------------------
SELECT 'Kolom wa_verified' AS bagian,
       CASE WHEN count(*) = 1 THEN 'terpasang' ELSE 'tidak ada' END AS keadaan,
       CASE WHEN count(*) = 1 THEN 'OK' ELSE 'KURANG' END AS status
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'seller_profiles'
   AND column_name = 'wa_verified'
UNION ALL
SELECT 'Akun nomornya terbukti',
       count(*) || ' akun (lahir lewat OTP, atau pernah lewat "Lupa PIN")',
       'INFO'
  FROM public.seller_profiles
 WHERE wa_verified IS TRUE
UNION ALL
SELECT 'Akun belum terbukti',
       count(*) || ' akun (daftar tanpa OTP, belum pernah membuktikan nomornya)',
       'INFO'
  FROM public.seller_profiles
 WHERE wa_verified IS DISTINCT FROM TRUE;
