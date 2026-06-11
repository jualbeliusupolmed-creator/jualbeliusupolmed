CREATE TABLE IF NOT EXISTS public.otps (
  wa TEXT PRIMARY KEY,
  otp TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hapus data yang sudah kedaluwarsa secara otomatis agar tidak menumpuk (opsional, via cron atau Supabase pg_cron jika diaktifkan, tapi untuk sekarang kita biarkan atau bersihkan saat upsert).
