-- ============================================================================
-- PENGENCANGAN AKSES DATABASE (RLS) — tutup kebocoran data lewat kunci anon publik
-- ============================================================================
-- Konteks temuan audit (16 Juli 2026):
--   • seller_profiles bisa dibaca anon → nomor HP + PIN penjual bocor (PIN kini
--     sudah di-hash, tapi tetap jangan diekspos).
--   • listings mengekspos kolom seller_wa (nomor HP) ke anon.
--   • price_offers & category_subscriptions terlalu terbuka (anon bisa
--     baca/ubah/hapus milik orang lain).
--
-- AMAN karena: seluruh sisi pelanggan membaca data lewat API server (service-role
-- yang bypass RLS), BUKAN lewat kunci anon. Pemakaian anon hanya untuk:
--     - insert pwa_installs (analytics)   → TIDAK disentuh di sini
--     - upload ke storage                  → TIDAK disentuh di sini
-- Jadi mencabut akses anon ke tabel-tabel di bawah tidak mematahkan website.
--
-- ⚠️ SEBELUM JALANKAN DI PRODUKSI:
--   1. Jalankan dulu di project staging / cek di jam sepi.
--   2. Setelah jalan, BUKA website: beranda, /produk, /penjual, /dicari, dashboard,
--      admin panel. Pastikan iklan & data tetap tampil.
--   3. Kalau ADA yang hilang → berarti ada bagian yang baca via anon; JALANKAN blok
--      ROLLBACK di paling bawah, lalu kabari agar dibenahi lewat API dulu.
-- ============================================================================

-- Pastikan RLS aktif (default-deny untuk anon setelah privilege dicabut).
alter table public.seller_profiles      enable row level security;
alter table public.listings             enable row level security;
alter table public.price_offers         enable row level security;
alter table public.category_subscriptions enable row level security;
alter table public.wanted_listings      enable row level security;

-- Cabut SEMUA akses langsung dari peran publik (anon & authenticated). Website
-- memakai service_role (bypass) sehingga tidak terpengaruh.
revoke all on public.seller_profiles        from anon, authenticated;
revoke all on public.listings               from anon, authenticated;
revoke all on public.price_offers           from anon, authenticated;
revoke all on public.category_subscriptions from anon, authenticated;
revoke all on public.wanted_listings        from anon, authenticated;

-- Catatan: TIDAK mencabut pwa_installs (perlu anon insert) & storage.objects.

-- ============================================================================
-- ROLLBACK (jalankan HANYA kalau ada bagian website yang jadi kosong/rusak):
-- ----------------------------------------------------------------------------
-- grant select on public.listings               to anon, authenticated;
-- grant select on public.seller_profiles         to anon, authenticated;
-- grant select, insert, update on public.price_offers           to anon, authenticated;
-- grant select, insert, delete on public.category_subscriptions to anon, authenticated;
-- grant select, insert on public.wanted_listings to anon, authenticated;
-- ============================================================================
