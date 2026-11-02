-- Cabut EXECUTE anon/authenticated dari tiga fungsi yang masih terbuka lewat
-- /rest/v1/rpc/<nama>, dan kunci search_path pada yang SECURITY DEFINER.
-- Ketiganya hanya dipanggil dari route server ber-service_role, yang melewati
-- GRANT — jadi pencabutan ini tidak menyentuh alur yang dipakai situs.
REVOKE EXECUTE ON FUNCTION public.process_teman_swipe(uuid, uuid, text)   FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_comments_count(uuid)          FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_listing_views(uuid)           FROM anon, authenticated;

ALTER FUNCTION public.process_teman_swipe(uuid, uuid, text)  SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_comments_count(uuid)         SET search_path = public, pg_temp;;
