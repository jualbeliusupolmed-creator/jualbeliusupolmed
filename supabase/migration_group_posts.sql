-- Migration: group_posts
-- Menyimpan postingan dari grup WhatsApp marketplace untuk diindex dan dicari

CREATE TABLE IF NOT EXISTS group_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_wa TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  group_jid TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk pencarian teks
CREATE INDEX IF NOT EXISTS idx_group_posts_message ON group_posts(message);
CREATE INDEX IF NOT EXISTS idx_group_posts_sender ON group_posts(sender_wa);
CREATE INDEX IF NOT EXISTS idx_group_posts_created ON group_posts(created_at DESC);

-- Hapus postingan lebih dari 30 hari secara otomatis (opsional, jalankan manual atau via cron)
-- DELETE FROM group_posts WHERE created_at < NOW() - INTERVAL '30 days';

ALTER TABLE group_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON group_posts
  USING (false) WITH CHECK (false);
