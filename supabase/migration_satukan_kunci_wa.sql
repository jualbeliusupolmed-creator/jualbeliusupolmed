-- Enam baris berformat 62 di tengah basis data yang seluruhnya memakai 08.
-- Empat lahir 28 Agustus 2026 dari regresi formatWa (JID ditolak → pemanggil
-- memakai cadangan `jid.split("@")[0]`, yang memulangkan digit mentah 62);
-- dua sisanya penjual seed "Nisa Desain" sejak 13 Juni 2026.
--
-- Kodenya sudah diperbaiki (src/lib/constants.js) sehingga tidak ada baris 62
-- baru yang lahir. Berkas ini membereskan yang telanjur ada.
--
-- BELUM dijalankan: penyaring izin menolak UPDATE massal dari sesi Claude,
-- jadi ini harus dijalankan pemilik (SSH / panel /jalankan).
--
-- Sebelum: 4 baris wa_conversations + 1 seller_profiles (+1 listings via FK).
-- Sesudah: nol baris cocok `^62[0-9]{7,14}$` di ketiga tabel.

-- 1. Penjual seed. listings.seller_wa ikut otomatis lewat FK
--    listings_seller_wa_fkey (ON UPDATE CASCADE). Sudah diperiksa: tidak ada
--    baris 08 yang bentrok, baik di seller_profiles maupun listings.
--    Setelah ini /penjual/083456789003 — yang sudah terdaftar di peta situs —
--    berhenti menjawab 404.
update public.seller_profiles set wa = '083456789003' where wa = '6283456789003';

-- 2. Riwayat chat. Empat baris ini milik orang yang tiga barisnya sudah
--    tersimpan di bawah kunci 08. Disatukan supaya panel admin tidak
--    menampilkan satu orang sebagai dua utas, dan supaya penjaga "sapa sekali
--    seumur hidup" menemukan catatannya sendiri.
update public.wa_conversations
   set wa = '0' || substring(wa from 3)
 where wa ~ '^62[0-9]{7,14}$';

-- Memeriksa hasilnya:
--   select count(*) from public.wa_conversations where wa ~ '^62';   -- harus 0
--   select count(*) from public.seller_profiles  where wa ~ '^62';   -- harus 0
--   select count(*) from public.listings where seller_wa ~ '^62';    -- harus 0
--
-- Membalikkan kalau perlu:
--   update public.seller_profiles set wa='6283456789003' where wa='083456789003';
--   update public.wa_conversations set wa='62'||substring(wa from 2)
--    where id in (999, 1000, 1002, 1003);
