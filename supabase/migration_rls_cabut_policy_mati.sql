-- migration_rls_cabut_policy_mati.sql — 26 Agustus 2026
-- SUDAH DIJALANKAN di produksi.
--
-- Tabel-tabel ini menolak kunci publik, tapi bukan karena policy-nya ketat:
-- policy-nya justru `USING (true)`. Yang menahan adalah GRANT SELECT yang
-- dicabut di lapisan bawahnya.
--
--   seller_profiles  anon_read_seller_profiles   SELECT USING (true)
--   seller_ratings   anon_read_ratings           SELECT USING (true)
--   price_offers     anyone can read/insert/update offers
--
-- Susunan itu aman selama tidak ada yang menyentuh GRANT-nya. Tapi satu
-- `GRANT SELECT ON ... TO anon` — dijalankan tanpa sengaja, atau ikut terbawa
-- migrasi lama yang diulang — langsung membuka seluruh isi tabel tanpa ada yang
-- berubah pada policy-nya. Pertahanan yang bergantung pada urutan dua lapisan
-- akan runtuh pada hari seseorang mengubah lapisan yang salah.
--
-- Dan itu bukan kekhawatiran teoretis. `teman_profiles` punya susunan serupa
-- dengan GRANT yang MASIH menyala, dan akibatnya 14 nomor WhatsApp mahasiswa
-- terbaca oleh siapa pun sampai ditutup hari ini juga
-- (lihat migration_rls_teman.sql).
--
-- Policy dibuang. Nol kode peramban mengakses tabel-tabel ini langsung —
-- semuanya lewat rute server dengan service_role, yang melewati RLS.
--
-- Diverifikasi sesudahnya dengan kunci anon asli: ketiganya menolak, dan
-- /api/organisasi, /api/listings/browse, /api/mading tetap mengembalikan data.

DROP POLICY IF EXISTS "anon_read_seller_profiles"   ON public.seller_profiles;
DROP POLICY IF EXISTS "Public read seller_profiles" ON public.seller_profiles;
DROP POLICY IF EXISTS "anon_read_ratings"           ON public.seller_ratings;

DROP POLICY IF EXISTS "anyone can read offers"   ON public.price_offers;
DROP POLICY IF EXISTS "anyone can insert offers" ON public.price_offers;
DROP POLICY IF EXISTS "anyone can update offers" ON public.price_offers;
