-- migration_rls_wanted_unlocks.sql — 26 Agustus 2026
--
-- `public.wanted_unlocks` adalah satu-satunya dari 32 tabel proyek ini yang
-- tidak pernah dinyalakan Row Level Security-nya. Isinya bukan data remeh: tiap
-- baris mencatat SIAPA membuka kontak pencari barang yang mana — daftar pembeli
-- beserta minat belinya.
--
-- Tanpa RLS, kunci anon (yang memang dikirim ke setiap peramban pengunjung)
-- bisa membaca seluruh tabel itu langsung lewat PostgREST, tanpa melewati satu
-- pun rute API.
--
-- Pola yang dipakai sama dengan tabel operasional lain di proyek ini
-- (admin_logs, error_logs, search_logs): nyalakan RLS dan JANGAN buat policy
-- apa pun. Tanpa policy, anon dan authenticated tidak mendapat akses sama
-- sekali, sementara service_role — yang dipakai seluruh rute server lewat
-- getAdminClient() — melewati RLS sebagaimana mestinya. Jadi tidak ada alur
-- aplikasi yang berubah; yang tertutup hanya jalan pintas dari peramban.
--
-- Aman dijalankan berulang.

ALTER TABLE public.wanted_unlocks ENABLE ROW LEVEL SECURITY;

-- Verifikasi sesudah menjalankan — keduanya harus mengembalikan false:
--   select has_table_privilege('anon','public.wanted_unlocks','select');
--   select has_table_privilege('anon','public.wanted_unlocks','insert');
