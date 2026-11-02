-- Lanjutan cabut_rpc_anon: mencabut dari anon/authenticated saja tidak cukup.
-- Postgres memberi EXECUTE ke pseudo-role PUBLIC secara bawaan pada setiap
-- fungsi baru, dan anon mewarisi lewat jalur itu — jadi has_function_privilege
-- tetap true walau GRANT langsungnya sudah dicabut. Fungsi mading yang sudah
-- aman memang dicabut dari PUBLIC, bukan dari anon.
REVOKE EXECUTE ON FUNCTION public.process_teman_swipe(uuid, uuid, text)   FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_comments_count(uuid)          FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_listing_views(uuid)           FROM PUBLIC;

-- service_role tetap harus bisa: ia yang dipakai route server situs.
GRANT EXECUTE ON FUNCTION public.process_teman_swipe(uuid, uuid, text)   TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_comments_count(uuid)          TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_listing_views(uuid)           TO service_role;;
