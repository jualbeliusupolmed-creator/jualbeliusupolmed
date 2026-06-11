-- Buat tabel seller_profiles
CREATE TABLE IF NOT EXISTS public.seller_profiles (
  wa TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrasikan data penjual dari listings ke seller_profiles
-- Mengambil nama dari listing tertua (created_at paling awal) untuk setiap WA
INSERT INTO public.seller_profiles (wa, name, created_at)
SELECT seller_wa, seller_name, created_at
FROM (
  SELECT seller_wa, seller_name, created_at,
         ROW_NUMBER() OVER (PARTITION BY seller_wa ORDER BY created_at ASC) as rn
  FROM public.listings
) ranked
WHERE rn = 1
ON CONFLICT (wa) DO NOTHING;

-- Beri policy RLS (opsional)
ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read seller_profiles"
ON public.seller_profiles FOR SELECT
TO public
USING (true);

-- API/Admin menggunakan admin key sehingga bypass RLS untuk insert/update
