-- Cabut EXECUTE anon/authenticated dari tiga fungsi yang masih terbuka,
-- dan kunci search_path-nya. 28 Agustus 2026.
--
-- TEMUAN
-- Security Advisor Supabase menandai tiga fungsi di schema public yang masih
-- bisa dipanggil siapa saja lewat /rest/v1/rpc/<nama> hanya dengan kunci anon
-- (kunci anon memang publik — ia ter-bake di bundel peramban):
--
--   process_teman_swipe(uuid, uuid, text)  SECURITY DEFINER, search_path bebas
--   increment_comments_count(uuid)         SECURITY DEFINER, search_path bebas
--   increment_listing_views(uuid)          search_path sudah dikunci
--
-- Yang paling berat yang pertama. Ia menerima p_swiper_id DAN p_target_id
-- sebagai argumen — jadi pemanggilnya menentukan sendiri "siapa yang menggeser
-- siapa". Dengan kunci anon, seseorang bisa mengarang swipe atas nama orang
-- lain dan memaksa terjadinya match antara dua orang yang tidak pernah saling
-- memilih. Dua sisanya "cuma" pemalsuan angka: jumlah komentar dan jumlah
-- tayangan iklan bisa digelembungkan tanpa batas.
--
-- KENAPA MENCABUTNYA AMAN
-- Ketiganya tidak pernah dipanggil dari peramban. Satu-satunya pemanggil ada
-- di route server, dan ketiganya memakai getAdminClient() alias service_role:
--   src/app/api/teman/swipe/route.js
--   src/app/api/mading/[id]/reply/route.js
--   src/app/api/listings/[id]/view/route.js
-- service_role melewati GRANT, jadi pencabutan ini tidak menyentuh alur yang
-- dipakai situs. Gerbang siapa-boleh-menggeser-siapa tetap di route-nya, di
-- mana identitas pemanggil diperiksa — bukan diterima dari argumen.
--
-- Pola yang sama sudah diterapkan lebih dulu ke enam fungsi mading
-- (increment_mading_likes, decrement_mading_likes, dst); tiga ini yang
-- terlewat.

REVOKE EXECUTE ON FUNCTION public.process_teman_swipe(uuid, uuid, text)   FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_comments_count(uuid)          FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_listing_views(uuid)           FROM anon, authenticated;

-- search_path yang bebas pada fungsi SECURITY DEFINER = pemanggil bisa
-- menyelipkan schema-nya sendiri di depan `public` dan membajak nama tabel
-- yang dirujuk di dalam badan fungsi. Dikunci, sama seperti fungsi mading.
ALTER FUNCTION public.process_teman_swipe(uuid, uuid, text)  SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_comments_count(uuid)         SET search_path = public, pg_temp;

-- Bukti sesudahnya: kolom anon_bisa dan auth_bisa harus false bertiga.
--   SELECT p.proname, has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_bisa
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public' ORDER BY 2 DESC;
