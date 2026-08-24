-- ============================================================
-- Tabel Konfigurasi Sistem: system_settings
-- Menyimpan preferensi global (e.g. mode transaksi: whatsapp vs in_app_chat)
-- Jalankan di Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS system_settings (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Index untuk pencarian cepat berdasarkan key
CREATE INDEX IF NOT EXISTS system_settings_key_idx ON system_settings(key);

-- Isi nilai awal untuk mode transaksi jika belum ada
INSERT INTO system_settings (key, value, updated_at)
VALUES (
  'transaction_mode',
  '{"mode": "in_app_chat", "description": "Mode transaksi marketplace (in_app_chat atau whatsapp)"}'::jsonb,
  now()
)
ON CONFLICT (key) DO NOTHING;

-- RLS: Pengaturan publik bisa dibaca oleh anon/authenticated, modifikasi hanya oleh service_role
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view system settings" ON system_settings;
CREATE POLICY "Public can view system settings"
  ON system_settings
  FOR SELECT
  TO public
  USING (true);
