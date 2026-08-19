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
-- ---------------------------------------------------------------------

ALTER TABLE public.seller_profiles
  ADD COLUMN IF NOT EXISTS slug              TEXT,
  ADD COLUMN IF NOT EXISTS store_name        TEXT,
  ADD COLUMN IF NOT EXISTS tagline           TEXT,
  ADD COLUMN IF NOT EXISTS logo_url          TEXT,
  ADD COLUMN IF NOT EXISTS banner_url        TEXT,
  ADD COLUMN IF NOT EXISTS store_area        TEXT,
  ADD COLUMN IF NOT EXISTS store_hours       TEXT,
  ADD COLUMN IF NOT EXISTS store_instagram   TEXT,
  ADD COLUMN IF NOT EXISTS store_accent      TEXT DEFAULT 'emerald',
  ADD COLUMN IF NOT EXISTS store_open        BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS store_announcement TEXT,
  ADD COLUMN IF NOT EXISTS store_updated_at  TIMESTAMPTZ;

-- Slug itu alamat publik: keunikan ditegakkan basis data, bukan dipercayakan
-- pada pemeriksaan di aplikasi yang bisa kalah balapan antara dua permintaan
-- yang datang bersamaan. Partial index supaya penjual yang belum punya toko
-- (slug NULL) tidak saling bentrok.
CREATE UNIQUE INDEX IF NOT EXISTS seller_profiles_slug_key
  ON public.seller_profiles (lower(slug))
  WHERE slug IS NOT NULL;

-- Halaman toko dibaca publik tanpa login. RLS di tabel ini sudah mengizinkan
-- SELECT untuk semua, jadi tidak ada policy baru yang perlu ditambahkan.
