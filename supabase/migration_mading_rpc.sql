-- Penghitung like & komentar mading yang ATOMIK.
--
-- Route like/comments sudah memanggil RPC ini sejak 23 Agu 2026 dengan fallback
-- baca-lalu-tulis — fallback itu bisa balapan (dua like bersamaan = satu hilang).
-- Begitu fungsi ini ada, jalur atomiknya yang terpakai. Sudah diterapkan ke
-- produksi 23 Agu 2026 (migrasi `rpc_penghitung_mading_atomik`).
--
-- Idempotent: aman dijalankan berulang.

create or replace function public.increment_mading_likes(target_post_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.mading_posts set likes_count = coalesce(likes_count,0) + 1 where id = target_post_id;
$$;

create or replace function public.decrement_mading_likes(target_post_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.mading_posts set likes_count = greatest(coalesce(likes_count,0) - 1, 0) where id = target_post_id;
$$;

create or replace function public.increment_mading_comments(target_post_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.mading_posts set comments_count = coalesce(comments_count,0) + 1 where id = target_post_id;
$$;

-- Dipanggil lewat service_role dari API situs; anon tidak perlu bisa.
revoke execute on function public.increment_mading_likes(uuid) from public, anon, authenticated;
revoke execute on function public.decrement_mading_likes(uuid) from public, anon, authenticated;
revoke execute on function public.increment_mading_comments(uuid) from public, anon, authenticated;
