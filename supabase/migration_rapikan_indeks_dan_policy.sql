-- Dua peringatan Performance Advisor Supabase, 28 Agustus 2026.
-- DITERAPKAN ke produksi 29 Agustus 2026, tercatat sebagai versi 20260829021232.
-- Verifikasi sesudahnya: constraint UNIQUE listings_listing_code_unique masih
-- berdiri dengan satu indeks pendukung, policy buyer_contacts sudah berbentuk
-- (SELECT auth.role()), dan kedua peringatan WARN Performance Advisor hilang.
-- Membalikkan bagian 1 kalau perlu:
--   CREATE UNIQUE INDEX idx_listings_listing_code_unique
--     ON public.listings (listing_code);

-- 1. Indeks kembar di tabel tersibuk.
--    listings punya DUA indeks unik yang isinya persis sama atas kolom
--    listing_code:
--      listings_listing_code_unique      <- menopang UNIQUE constraint, WAJIB tinggal
--      idx_listings_listing_code_unique  <- indeks lepas, salinan kedua
--    Sudah diperiksa lewat pg_constraint: hanya yang pertama yang dipakai
--    constraint, jadi yang kedua bisa dibuang tanpa melonggarkan jaminan
--    keunikan apa pun. Untungnya bukan ruang disk melainkan tulis: setiap
--    INSERT/UPDATE listings sekarang memelihara dua pohon B-tree yang identik.
DROP INDEX IF EXISTS public.idx_listings_listing_code_unique;

-- 2. Policy yang memanggil auth.role() sekali per BARIS.
--    service_role_full_access_buyer_contacts memakai `auth.role() =
--    'service_role'`. Tanpa dibungkus SELECT, Postgres menghitung ulang
--    pemanggilan itu untuk setiap baris yang diperiksa, bukan sekali per
--    query. Membungkusnya membuat perencana mengangkatnya jadi InitPlan.
--    Perilakunya tidak berubah sama sekali — hanya berapa kali dievaluasi.
DROP POLICY IF EXISTS service_role_full_access_buyer_contacts ON public.buyer_contacts;
CREATE POLICY service_role_full_access_buyer_contacts
  ON public.buyer_contacts
  FOR ALL
  USING ((select auth.role()) = 'service_role');

-- Yang SENGAJA tidak disentuh: 22 lint "Unused Index" tingkat INFO. Hampir
-- semuanya milik tabel fitur baru (oprec, mading, teman, buyer_contacts) yang
-- memang belum ramai. "Belum pernah terpakai" pada tabel berumur seminggu
-- bukan bukti indeksnya salah — membuangnya sekarang berarti membuangnya
-- tepat sebelum ia mulai dibutuhkan.
