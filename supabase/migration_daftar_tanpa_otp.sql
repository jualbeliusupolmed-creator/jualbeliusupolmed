-- ---------------------------------------------------------------------
-- Pendaftaran darurat tanpa OTP (hanya untuk nomor tanpa riwayat)
--
-- Nomor WhatsApp adalah kunci akun di sistem ini: iklan, toko, dan penilaian
-- semuanya digantung pada seller_wa. OTP-lah yang membuktikan si pengetik
-- benar-benar memegang nomor itu. Saat WhatsApp tidak bisa dikirimi (nomor bot
-- dibatasi), pendaftaran mati total — termasuk untuk orang yang tidak punya
-- kaitan apa pun dengan masalah kita.
--
-- Kolom ini menandai akun yang lahir TANPA bukti kepemilikan nomor, supaya
-- statusnya tidak hilang begitu keadaan normal lagi. Jalur itu hanya terbuka
-- untuk nomor yang belum punya iklan dan belum punya PIN — mengklaim nomor
-- kosong tidak merugikan siapa pun, dan pemilik aslinya selalu bisa merebutnya
-- kembali lewat "Lupa PIN" yang tetap menuntut OTP.
-- ---------------------------------------------------------------------

ALTER TABLE public.seller_profiles
  ADD COLUMN IF NOT EXISTS wa_verified BOOLEAN DEFAULT FALSE;

-- Semua akun yang sudah punya PIN hari ini lahir lewat OTP, jadi nomornya
-- memang sudah terbukti. Tanpa backfill ini mereka akan terlihat seolah belum
-- terverifikasi dan diminta memverifikasi ulang tanpa alasan.
UPDATE public.seller_profiles
   SET wa_verified = TRUE
 WHERE pin IS NOT NULL AND wa_verified IS DISTINCT FROM TRUE;
