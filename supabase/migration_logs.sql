-- ============================================================
-- Tabel logging: search_logs, admin_logs, error_logs
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- SEARCH LOGS — rekam semua pencarian (untuk tren)
CREATE TABLE IF NOT EXISTS search_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query       text NOT NULL,
  results_count integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS search_logs_query_idx ON search_logs(query);
CREATE INDEX IF NOT EXISTS search_logs_created_at_idx ON search_logs(created_at DESC);

-- Agar tabel tidak tumbuh tak terbatas — hapus data > 90 hari lewat cron atau manual
-- DELETE FROM search_logs WHERE created_at < now() - interval '90 days';

-- ADMIN LOGS — audit trail semua aksi admin
CREATE TABLE IF NOT EXISTS admin_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action      text NOT NULL,
  target_id   text,
  details     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_logs_action_idx ON admin_logs(action);
CREATE INDEX IF NOT EXISTS admin_logs_created_at_idx ON admin_logs(created_at DESC);

-- ERROR LOGS — tangkap error kritis di API routes
CREATE TABLE IF NOT EXISTS error_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint      text NOT NULL,
  error_message text,
  context       jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS error_logs_endpoint_idx ON error_logs(endpoint);
CREATE INDEX IF NOT EXISTS error_logs_created_at_idx ON error_logs(created_at DESC);

-- RLS: semua log hanya bisa diakses service_role
ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs  ENABLE ROW LEVEL SECURITY;
