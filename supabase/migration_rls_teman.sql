-- migration_rls_teman.sql — 26 Agustus 2026
-- SUDAH DIJALANKAN di produksi (autgrnrqeqdpqwkbolyh).
--
-- RLS pada ketiga tabel Cari Teman memang menyala, tapi policy-nya membuka
-- semuanya kepada kunci `anon` — kunci yang tertanam di setiap halaman situs:
--
--   teman_profiles  SELECT  USING (is_active = true)
--   teman_profiles  UPDATE  USING (true)      <-- profil SIAPA PUN bisa ditimpa
--   teman_profiles  INSERT  tanpa WITH CHECK
--   teman_matches   ALL     USING (true)
--   teman_swipes    ALL     USING (true)
--
-- Diuji dengan kunci publik sebelum perbaikan ini: 15 profil terbaca utuh —
-- nama, foto, fakultas, bio, dan 14 NOMOR WHATSAPP mahasiswa.
--
-- Yang lebih berat dari kebocorannya adalah UPDATE USING (true). Hari ini juga
-- rute /api/teman/* dikunci supaya identitas hanya datang dari sesi; kunci itu
-- tidak menghalangi apa pun terhadap jalur ini. Pintu depan digembok sementara
-- jendelanya dibiarkan terbuka — dan yang lewat jendela tidak perlu tahu ada
-- pintu.
--
-- Policy dibuang seluruhnya, bukan diperketat, karena yang dilayaninya memang
-- tidak ada: /admin/teman adalah server component dan seluruh rute /api/teman/*
-- memakai getAdminClient(). Nol kode peramban menyentuh tabel ini. Tanpa policy,
-- anon dan authenticated tidak dapat akses sama sekali sementara service_role
-- melewati RLS — pola yang sama dengan 30 tabel lain di proyek ini.
--
-- Diverifikasi sesudahnya: baca 0 baris, insert ditolak, dan update mengenai
-- 0 baris (PostgREST tidak melempar galat untuk itu — yang membuktikan bukan
-- ketiadaan galat, melainkan 15 profil yang namanya tetap utuh). Deck Cari
-- Teman tetap terisi 15 kartu lewat rute server, kini tanpa whatsapp & user_id.

DROP POLICY IF EXISTS "Public can view active teman profiles" ON public.teman_profiles;
DROP POLICY IF EXISTS "Public can insert own profile"         ON public.teman_profiles;
DROP POLICY IF EXISTS "Public can update own profile"         ON public.teman_profiles;

DROP POLICY IF EXISTS "Public can view matches"   ON public.teman_matches;
DROP POLICY IF EXISTS "Public can manage matches" ON public.teman_matches;

DROP POLICY IF EXISTS "Public can manage swipes" ON public.teman_swipes;

-- Verifikasi (harus mengembalikan nol baris):
--   select polname from pg_policy p join pg_class c on c.oid=p.polrelid
--    where c.relname in ('teman_profiles','teman_matches','teman_swipes');
