-- Foto opsional untuk Menfess & Info.
-- Jalankan setelah migration_mading.sql. Aman dijalankan berulang.
ALTER TABLE public.mading_posts
  ADD COLUMN IF NOT EXISTS image_url text;

COMMENT ON COLUMN public.mading_posts.image_url IS
  'Public URL foto opsional Menfess/Info; diisi hanya oleh endpoint upload terautentikasi.';
