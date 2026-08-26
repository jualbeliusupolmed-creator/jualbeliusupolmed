-- Tambahkan kolom email ke seller_profiles untuk fitur login Email & Password
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS email text UNIQUE;

-- Pastikan indeks email dibuat jika belum ada, supaya pencarian cepat
CREATE INDEX IF NOT EXISTS idx_seller_profiles_email ON public.seller_profiles (email);
