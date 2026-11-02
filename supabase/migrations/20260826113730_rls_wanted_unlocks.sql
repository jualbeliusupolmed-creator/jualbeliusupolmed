-- wanted_unlocks — satu-satunya dari 32 tabel yang RLS-nya tidak pernah dinyalakan.
--
-- Isinya bukan data remeh: tiap baris mencatat SIAPA membuka kontak pencari
-- barang yang mana — daftar pembeli beserta minat belinya. Tanpa RLS, kunci
-- anon yang dikirim ke setiap peramban pengunjung bisa membaca seluruh tabel
-- lewat PostgREST tanpa melewati satu pun rute API.
--
-- Pola sama dengan tabel operasional lain (admin_logs, error_logs, search_logs):
-- nyalakan RLS, jangan buat policy. Tanpa policy, anon dan authenticated tidak
-- dapat akses sama sekali, sementara service_role — yang dipakai seluruh rute
-- server lewat getAdminClient() — melewati RLS sebagaimana mestinya.

ALTER TABLE public.wanted_unlocks ENABLE ROW LEVEL SECURITY;;
