-- Cari Teman: tutup akses langsung dari kunci publik — 26 Agustus 2026
--
-- RLS pada ketiga tabel ini memang menyala, tapi policy-nya membuka semuanya:
--
--   teman_profiles  SELECT  USING (is_active = true)   -- semua profil aktif
--   teman_profiles  UPDATE  USING (true)               -- SIAPA PUN, profil SIAPA PUN
--   teman_profiles  INSERT  tanpa WITH CHECK
--   teman_matches   ALL     USING (true)
--   teman_swipes    ALL     USING (true)
--
-- Kunci `anon` tertanam di setiap halaman situs, jadi "publik" di sini berarti
-- benar-benar siapa saja. Diuji hari ini dengan kunci itu: 15 profil terbaca
-- utuh — nama, foto, fakultas, bio, dan 14 NOMOR WHATSAPP mahasiswa.
--
-- Yang lebih parah dari kebocorannya adalah UPDATE USING (true): profil orang
-- lain bisa ditimpa langsung lewat PostgREST. Penguncian identitas yang baru
-- dipasang di /api/teman/* hari ini tidak menghalangi apa pun terhadap jalur
-- itu — pintu depannya digembok sementara jendelanya terbuka.
--
-- Policy-nya dibuang seluruhnya, bukan diperketat. Tidak ada satu pun kode
-- peramban yang menyentuh tabel ini: /admin/teman adalah server component dan
-- seluruh rute /api/teman/* memakai getAdminClient(). Jadi yang dilayani policy
-- ini memang tidak ada. Tanpa policy, anon dan authenticated tidak mendapat
-- akses sama sekali, sementara service_role melewati RLS sebagaimana mestinya —
-- pola yang sama dengan 30 tabel lain di proyek ini.

DROP POLICY IF EXISTS "Public can view active teman profiles" ON public.teman_profiles;
DROP POLICY IF EXISTS "Public can insert own profile"         ON public.teman_profiles;
DROP POLICY IF EXISTS "Public can update own profile"         ON public.teman_profiles;

DROP POLICY IF EXISTS "Public can view matches"   ON public.teman_matches;
DROP POLICY IF EXISTS "Public can manage matches" ON public.teman_matches;

DROP POLICY IF EXISTS "Public can manage swipes" ON public.teman_swipes;;
