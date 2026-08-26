-- migration_profil_satu_pintu.sql — 26 Agustus 2026
--
-- SUDAH DIJALANKAN di produksi (autgrnrqeqdpqwkbolyh) pada 26 Agu 2026.
-- Disimpan di sini supaya repo bisa membangun database dari nol lagi.
--
-- Dua hal, keduanya aman diulang.
--
-- 1. `avatar_url` — ditulis dan dibaca enam tempat di kode, tapi tidak pernah
--    ada di tabelnya. PostgREST menolak SELURUH query yang menyebut kolom tak
--    dikenal, bukan mengembalikan null, jadi kegagalannya total dan senyap:
--    direktori organisasi hanya menampilkan data demo, prefill Cari Teman mati,
--    dan dua panel admin tidak pernah memuat avatar.
--
-- 2. Sembilan kolom yang sudah hidup di produksi tapi tidak tertulis di satu pun
--    berkas migrasi — dulu ditambahkan lewat dashboard. Dideklarasikan ulang di
--    sini: nol perubahan di produksi, tapi menutup selisih 32-vs-41 kolom antara
--    repo dan kenyataan.

ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS store_status text;
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS store_requested_at timestamptz;
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS store_approved_at timestamptz;
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS store_reject_note text;
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS blog_badge boolean DEFAULT false;
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS blog_badge_at timestamptz;
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS anonymous_name text;
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS email_google text;
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS auth_provider text;

-- Catatan penamaan: kode lama memakai DUA nama untuk satu benda — `avatar_url`
-- dan `photo_url`. Sejak sekarang `seller_profiles` hanya mengenal `avatar_url`.
-- `photo_url` tetap hidup di `teman_profiles`, di mana ia memang ada dan memang
-- berarti foto kartu Cari Teman. `logo_url` dan `banner_url` dibiarkan berarti
-- identitas TOKO, bukan foto orang.

-- Ditambahkan menyusul, 26 Agustus 2026 (sudah dijalankan di produksi).
--
-- `store_gmaps` dipakai penuh oleh api/toko — ada `normalisasiGmaps()`, ada
-- batas panjangnya, ia masuk daftar SELECT dan ikut payload simpan. Yang tidak
-- pernah ada cuma kolomnya. Akibatnya menyimpan pengaturan toko SELALU gagal
-- (jalur PUT tanpa cadangan), sementara membaca selalu jatuh ke `KOLOM_LAMA` —
-- cadangan yang justru membuang store_status & store_reject_note, sehingga
-- lencana status persetujuan toko tidak pernah sekali pun tampil.
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS store_gmaps text;
