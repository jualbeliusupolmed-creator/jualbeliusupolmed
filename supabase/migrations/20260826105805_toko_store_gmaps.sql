-- store_gmaps — 26 Agustus 2026
--
-- Kolom ini dipakai penuh oleh api/toko: ada helper `normalisasiGmaps()`, ada
-- batas panjangnya di BATAS, ia masuk daftar SELECT dan ikut di payload simpan.
-- Yang tidak pernah ada cuma kolomnya.
--
-- Akibatnya dua-duanya rusak, dengan cara yang berbeda:
--
--   MENYIMPAN pengaturan toko selalu gagal total. Jalur PUT tidak punya
--   cadangan, jadi setiap penjual yang menekan Simpan selalu ditolak.
--
--   MEMBACA selalu jatuh ke KOLOM_LAMA — cadangan yang memang disediakan, tapi
--   yang dibuangnya justru store_status/store_requested_at/store_approved_at/
--   store_reject_note. Jadi lencana status persetujuan toko dan alasan
--   penolakannya tidak pernah sekali pun tampil, dan tidak ada yang tampak
--   salah karena cadangannya berhasil.

ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS store_gmaps text;;
