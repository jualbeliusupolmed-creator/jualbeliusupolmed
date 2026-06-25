-- ============================================================
-- Row Level Security (RLS) — Jual Beli USU/Polmed
-- Jalankan di Supabase SQL Editor (service_role bypass otomatis)
-- Anon key hanya bisa akses data publik; API routes pakai
-- service_role yang melewati RLS tanpa policy tambahan.
-- ============================================================

-- LISTINGS — publik bisa baca active/sold saja
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_active_listings"
  ON listings FOR SELECT TO anon
  USING (status IN ('active', 'sold'));

-- SELLER_PROFILES — publik bisa baca semua profil
ALTER TABLE seller_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_seller_profiles"
  ON seller_profiles FOR SELECT TO anon
  USING (true);

-- CATEGORIES — publik bisa baca semua kategori
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_categories"
  ON categories FOR SELECT TO anon
  USING (true);

-- SELLER_RATINGS — publik baca rating yang tidak di-hidden
ALTER TABLE seller_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_visible_ratings"
  ON seller_ratings FOR SELECT TO anon
  USING (hidden IS NOT TRUE);

-- WANTED_LISTINGS — publik baca yang masih active
ALTER TABLE wanted_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_active_wanted"
  ON wanted_listings FOR SELECT TO anon
  USING (status = 'active');

-- BLOGS — publik baca yang sudah published
ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_published_blogs"
  ON blogs FOR SELECT TO anon
  USING (published = true);

-- PAYMENTS — sensitif, tidak ada akses anon
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- REPORTS — sensitif, tidak ada akses anon
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- PRICE_OFFERS — tidak ada akses anon (semua via API)
ALTER TABLE price_offers ENABLE ROW LEVEL SECURITY;

-- CATEGORY_SUBSCRIPTIONS — tidak ada akses anon
ALTER TABLE category_subscriptions ENABLE ROW LEVEL SECURITY;

-- BLACKLIST — tidak ada akses anon
ALTER TABLE blacklist ENABLE ROW LEVEL SECURITY;

-- PROFILE_CHANGE_REQUESTS — tidak ada akses anon
ALTER TABLE profile_change_requests ENABLE ROW LEVEL SECURITY;

-- SETTINGS — tidak ada akses anon
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- PWA_INSTALLS — tidak ada akses anon
ALTER TABLE pwa_installs ENABLE ROW LEVEL SECURITY;

-- PUSH_SUBSCRIPTIONS — tidak ada akses anon
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- GROUP_POSTS — tidak ada akses anon
ALTER TABLE group_posts ENABLE ROW LEVEL SECURITY;

-- REFERRALS — tidak ada akses anon
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- OTPS — tidak ada akses anon
ALTER TABLE otps ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- CATATAN PENTING:
-- service_role (dipakai API routes) bypass RLS secara otomatis
-- di Supabase. Tidak perlu policy tambahan untuk service_role.
-- Jika ada tabel yang belum ada, skip statement yang error.
-- ============================================================
