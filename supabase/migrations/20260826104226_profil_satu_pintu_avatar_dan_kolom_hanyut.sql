-- Profil Satu Pintu — 26 Agustus 2026
--
-- Dua hal sekaligus, keduanya aman diulang.
--
-- 1. avatar_url: kolom yang ditulis dan dibaca enam tempat di kode tapi tidak
--    pernah ada di tabelnya. Akibatnya select-nya gagal total (bukan
--    mengembalikan null) sehingga direktori organisasi, prefill Cari Teman,
--    dan dua panel admin diam-diam tidak pernah bekerja.
--
-- 2. Sembilan kolom yang sudah hidup di produksi tapi tidak pernah tertulis di
--    satu pun berkas migrasi — ditambahkan dulu lewat dashboard. Dideklarasikan
--    ulang di sini dengan IF NOT EXISTS supaya tidak mengubah apa pun di
--    produksi, tapi repo ini bisa membangun database dari nol lagi.

ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS store_status text;
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS store_requested_at timestamptz;
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS store_approved_at timestamptz;
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS store_reject_note text;
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS blog_badge boolean DEFAULT false;
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS blog_badge_at timestamptz;
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS anonymous_name text;
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS email_google text;
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS auth_provider text;;
