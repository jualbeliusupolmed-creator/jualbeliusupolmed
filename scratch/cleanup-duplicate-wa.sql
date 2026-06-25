-- ============================================================
-- CLEANUP: Akun ganda akibat @lid JID yang tidak ter-resolve
-- Jalankan di Supabase SQL Editor (satu per satu, cek dulu!)
-- ============================================================

-- STEP 1: Lihat semua seller_profiles dengan nomor TIDAK VALID
-- (bukan format 08xxx 10-13 digit = bekas @lid atau format aneh)
SELECT wa, name, created_at
FROM seller_profiles
WHERE wa !~ '^0[0-9]{9,12}$'
ORDER BY created_at DESC;

-- STEP 2: Lihat listings yang seller_wa-nya tidak valid
SELECT id, title, seller_wa, seller_name, status, created_at
FROM listings
WHERE seller_wa !~ '^0[0-9]{9,12}$'
ORDER BY created_at DESC;

-- ============================================================
-- STEP 3: Identifikasi pasangan akun ganda
-- (profil valid vs profil tidak valid dari user yang sama)
-- Ini perlu dijalankan setelah STEP 1 & 2 untuk tahu siapa yang perlu di-merge
-- ============================================================
SELECT
  sp_invalid.wa AS wa_invalid,
  sp_invalid.name AS name_invalid,
  sp_valid.wa AS wa_valid,
  sp_valid.name AS name_valid,
  sp_valid.created_at
FROM seller_profiles sp_invalid
JOIN seller_profiles sp_valid
  ON sp_valid.name = sp_invalid.name  -- cocokkan berdasarkan nama
  AND sp_valid.wa ~ '^0[0-9]{9,12}$'  -- profil valid
WHERE sp_invalid.wa !~ '^0[0-9]{9,12}$'; -- profil tidak valid

-- ============================================================
-- STEP 4: MERGE — pindahkan listings dari wa_invalid ke wa_valid
-- GANTI nilai 'WA_INVALID' dan 'WA_VALID' sesuai hasil STEP 3
-- ============================================================
-- Contoh:
-- UPDATE listings SET seller_wa = '081234567890' WHERE seller_wa = '18318xxxxxxxxx';
-- UPDATE payments SET ... (jika ada referensi)
-- UPDATE price_offers SET buyer_wa = '081234567890' WHERE buyer_wa = '18318xxxxxxxxx';

-- ============================================================
-- STEP 5: Hapus profil tidak valid setelah listings dipindah
-- ============================================================
-- DELETE FROM seller_profiles WHERE wa !~ '^0[0-9]{9,12}$';

-- ============================================================
-- STEP 6: Verifikasi — tidak ada lagi nomor tidak valid
-- ============================================================
SELECT COUNT(*) AS sisa_tidak_valid
FROM seller_profiles
WHERE wa !~ '^0[0-9]{9,12}$';
