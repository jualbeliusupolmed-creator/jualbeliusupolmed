-- Migration: Mading & Menfess Kampus
-- Tabel untuk menampung curhatan (menfess) dan pengumuman/info kampus

CREATE TABLE IF NOT EXISTS public.mading_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('menfess', 'info')),
  sender_name TEXT NOT NULL DEFAULT 'Anonim',
  faculty TEXT NOT NULL DEFAULT 'Umum',
  title TEXT,
  content TEXT NOT NULL,
  likes_count INT NOT NULL DEFAULT 0,
  comments_count INT NOT NULL DEFAULT 0,
  views_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'reported')),
  author_ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_mading_posts_type_status ON public.mading_posts(type, status);
CREATE INDEX IF NOT EXISTS idx_mading_posts_created_at ON public.mading_posts(created_at DESC);

-- Tabel Komentar Mading
CREATE TABLE IF NOT EXISTS public.mading_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.mading_posts(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL DEFAULT 'Anonim',
  faculty TEXT DEFAULT 'Umum',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_mading_comments_post_id ON public.mading_comments(post_id, created_at ASC);

-- Tabel Likes Mading (Mencegah multi-like)
CREATE TABLE IF NOT EXISTS public.mading_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.mading_posts(id) ON DELETE CASCADE,
  user_identifier TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(post_id, user_identifier)
);

CREATE INDEX IF NOT EXISTS idx_mading_likes_post_user ON public.mading_likes(post_id, user_identifier);

-- RLS Policies
ALTER TABLE public.mading_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mading_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mading_likes ENABLE ROW LEVEL SECURITY;

-- Public can read active posts
CREATE POLICY "Public read active mading posts" 
ON public.mading_posts FOR SELECT 
USING (status = 'active');

-- Public can insert mading posts
CREATE POLICY "Public insert mading posts" 
ON public.mading_posts FOR INSERT 
WITH CHECK (true);

-- Public can read comments
CREATE POLICY "Public read mading comments" 
ON public.mading_comments FOR SELECT 
USING (true);

-- Public can insert comments
CREATE POLICY "Public insert mading comments" 
ON public.mading_comments FOR INSERT 
WITH CHECK (true);

-- Public can read & insert likes
CREATE POLICY "Public read mading likes" 
ON public.mading_likes FOR SELECT 
USING (true);

CREATE POLICY "Public insert mading likes" 
ON public.mading_likes FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Public delete own mading likes" 
ON public.mading_likes FOR DELETE 
USING (true);
