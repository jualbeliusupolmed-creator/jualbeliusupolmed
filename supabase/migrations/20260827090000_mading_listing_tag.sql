-- Jembatan belanja di dalam konten: satu postingan mading/menfess boleh
-- menempelkan satu iklan milik penulisnya sendiri. Pembaca melihat kartu
-- produk kecil di dalam feed dan bisa mengintipnya lewat panel bawah tanpa
-- meninggalkan posisi gulirannya.
--
-- ON DELETE SET NULL: iklan yang dihapus tidak boleh ikut menghapus
-- postingan sosialnya — kontennya tetap berdiri sendiri.

alter table public.mading_posts
  add column if not exists listing_id uuid
  references public.listings(id) on delete set null;

create index if not exists idx_mading_posts_listing_id
  on public.mading_posts (listing_id)
  where listing_id is not null;

comment on column public.mading_posts.listing_id is
  'Iklan yang ditandai di postingan ini (opsional). Hanya boleh diisi iklan milik penulis postingan.';
