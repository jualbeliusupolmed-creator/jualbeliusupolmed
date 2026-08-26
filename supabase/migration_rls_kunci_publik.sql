-- migration_rls_kunci_publik.sql — 26 Agustus 2026
-- SUDAH DIJALANKAN di produksi (autgrnrqeqdpqwkbolyh).
--
-- Sapuan RLS sebelumnya (6b9ea0d) menyimpulkan mading_* dan beberapa tabel lain
-- "terbuka tapi wajar". Diuji ulang hari ini dengan kunci `anon` ASLI, kesimpulan
-- itu terlalu longgar. Yang benar-benar bisa dilakukan siapa pun yang menyalin
-- kunci dari halaman mana pun:
--
--   INSERT mading_posts   -> 201. Menfess langsung tayang di /mading TANPA lewat
--                            /api/mading: tanpa saringan AI, tanpa rate limit,
--                            tanpa blacklist, tanpa hash penulis. (Dibuktikan:
--                            satu baris uji masuk berstatus 'active', lalu
--                            dihapus lagi lewat service role.)
--   DELETE mading_likes   -> 204 dengan USING (true): bukan "hapus suka sendiri",
--                            melainkan hapus suka SIAPA PUN, sebaris atau semua.
--   SELECT mading_posts   -> author_ip_hash ikut terkirim. Hash bergaram, jadi
--                            tidak membuka nomor; tapi stabil, jadi seluruh
--                            postingan satu orang bisa dikelompokkan. Untuk papan
--                            yang menjanjikan anonim, itu janji yang bocor.
--   SELECT mading_comments-> USING (true), tanpa syarat status: komentar yang
--                            sudah dimoderasi/disembunyikan tetap terbaca.
--   oprec_events   ALL USING (true) -> baris oprec palsu bisa ditanam siapa pun.
--   oprec_submissions SELECT/UPDATE USING (true) -> berkas pelamar terbaca &
--                            statusnya bisa diubah orang luar. (Nol baris hari
--                            ini — jadi ini bom waktu, bukan kebocoran berjalan.)
--
-- Pola yang sama terus berulang di proyek ini, dua arah:
--   (a) policy longgar yang cuma tertahan GRANT dicabut, dan
--   (b) GRANT penuh yang cuma tertahan ketiadaan policy.
-- Keduanya rapuh: satu policy baru atau satu GRANT nyasar membuka pintunya.
--
-- Maka penguncian ini dibuat dua lapis sekaligus, dan seragam:
--   1. semua policy yang melayani anon/public dibuang;
--   2. seluruh hak tabel di schema public dicabut dari anon & authenticated;
--   3. default privileges disetel agar tabel BARU pun lahir tertutup.
--
-- Aman karena satu fakta yang sudah dicek ulang: NOL kode peramban di repo ini
-- menyentuh tabel Supabase. `grep -rln "@supabase/supabase-js\|createClient" src
-- --include=*.jsx` tidak mengembalikan apa pun; setiap halaman & rute memakai
-- getAdminClient() (service_role, melewati RLS). Kunci anon hanya dipakai di
-- src/app/auth/callback/route.js untuk menukar kode OAuth — itu schema `auth`,
-- tidak tersentuh perubahan ini. Bucket gambar juga tidak: policy-nya ada di
-- schema `storage`.
--
-- Kalau suatu hari ada komponen peramban yang memang perlu membaca satu tabel,
-- ia akan gagal dengan 401 yang jelas ("permission denied") — bukan diam-diam
-- membawa kolom yang tak diminta. Bukanya nanti harus disengaja: GRANT SELECT
-- (kolom yang dipilih) + satu policy yang menyebut syaratnya.

-- 1. Policy yang melayani anon/public --------------------------------------
DROP POLICY IF EXISTS "Public read active mading posts"  ON public.mading_posts;
DROP POLICY IF EXISTS "Public insert mading posts"       ON public.mading_posts;
DROP POLICY IF EXISTS "Public read mading comments"      ON public.mading_comments;
DROP POLICY IF EXISTS "Public insert mading comments"    ON public.mading_comments;
DROP POLICY IF EXISTS "Public read mading likes"         ON public.mading_likes;
DROP POLICY IF EXISTS "Public insert mading likes"       ON public.mading_likes;
DROP POLICY IF EXISTS "Public delete own mading likes"   ON public.mading_likes;
DROP POLICY IF EXISTS "Public can read active replies"   ON public.mading_replies;
DROP POLICY IF EXISTS "Authenticated can insert replies" ON public.mading_replies;

DROP POLICY IF EXISTS "Public can view active oprec events"   ON public.oprec_events;
DROP POLICY IF EXISTS "UKM can manage their own oprec events" ON public.oprec_events;
DROP POLICY IF EXISTS "Public can submit oprec application"   ON public.oprec_submissions;
DROP POLICY IF EXISTS "UKM and applicant can view submissions" ON public.oprec_submissions;
DROP POLICY IF EXISTS "UKM can update submission status"      ON public.oprec_submissions;

DROP POLICY IF EXISTS "public read verified status"           ON public.verified_sellers;
DROP POLICY IF EXISTS "Public can view system settings"       ON public.system_settings;
DROP POLICY IF EXISTS "public read published blogs"           ON public.blogs;
DROP POLICY IF EXISTS "anon_read_categories"                  ON public.categories;

-- Sisa policy yang hanya tertahan GRANT (tabelnya sudah tak punya GRANT anon,
-- tapi policy-nya masih ada — dibuang supaya tak ada yang menyala sendiri).
DROP POLICY IF EXISTS "anon_read_active_listings"             ON public.listings;
DROP POLICY IF EXISTS "anon_read_active_wanted"               ON public.wanted_listings;
DROP POLICY IF EXISTS "anyone can insert cat subscriptions"   ON public.category_subscriptions;
DROP POLICY IF EXISTS "anyone can delete own cat subscription" ON public.category_subscriptions;

-- 2. Hak tabel ---------------------------------------------------------------
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- 3. Tabel yang lahir nanti --------------------------------------------------
-- Bawaan Supabase memberi hak penuh ke anon & authenticated untuk setiap tabel
-- baru. Tanpa baris ini, migrasi berikutnya diam-diam mengembalikan lubangnya.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;

-- Verifikasi (keduanya harus nol baris):
--   select tablename, policyname from pg_policies where schemaname='public'
--     and 'anon' = any(roles::text[]) or roles::text = '{public}';
--   select table_name from information_schema.role_table_grants
--    where table_schema='public' and grantee in ('anon','authenticated');
