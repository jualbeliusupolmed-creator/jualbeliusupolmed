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
-- ---------------------------------------------------------------------

ALTER TABLE public.seller_profiles
  ADD COLUMN IF NOT EXISTS wa_verified BOOLEAN DEFAULT FALSE;

-- Semua akun yang sudah punya PIN sebelum perubahan ini lahir lewat OTP, jadi
-- nomornya memang sudah terbukti. Tanpa backfill ini mereka akan terlihat seolah
-- belum terverifikasi dan diminta memverifikasi ulang tanpa alasan.
UPDATE public.seller_profiles
   SET wa_verified = TRUE
 WHERE pin IS NOT NULL AND wa_verified IS DISTINCT FROM TRUE;
