-- ============================================================
-- MIGRATION: Sistem Balasan (Reply/Thread) untuk Menfess & Mading
-- Jual Beli USU & POLMED
-- ============================================================

-- Tabel Balasan Menfess
CREATE TABLE IF NOT EXISTS mading_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES mading_posts(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL DEFAULT 'Anonim',
  content TEXT NOT NULL,
  author_ip_hash TEXT,
  likes_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'hidden'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Kolom comments_count di mading_posts (jika belum ada)
ALTER TABLE public.mading_posts
  ADD COLUMN IF NOT EXISTS comments_count INT NOT NULL DEFAULT 0;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mading_replies_post_id ON mading_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_mading_replies_status ON mading_replies(status);
CREATE INDEX IF NOT EXISTS idx_mading_replies_created_at ON mading_replies(created_at DESC);

-- RLS
ALTER TABLE mading_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active replies"
  ON mading_replies FOR SELECT
  USING (status = 'active');

CREATE POLICY "Authenticated can insert replies"
  ON mading_replies FOR INSERT
  WITH CHECK (true);

-- RPC untuk increment comments_count secara atomic
CREATE OR REPLACE FUNCTION increment_comments_count(post_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE mading_posts
  SET comments_count = COALESCE(comments_count, 0) + 1
  WHERE id = post_id;
$$;
