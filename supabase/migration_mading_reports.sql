-- Laporan postingan mading/menfess + auto-sembunyi.
--
-- Konten anonim butuh jalan turun yang tidak menunggu admin bangun: siapa pun
-- boleh melaporkan, dan begitu 5 pelapor BERBEDA sepakat, postingan
-- disembunyikan otomatis (status 'hidden' — tetap ada di database untuk
-- ditinjau, cuma hilang dari mading). Logika ambangnya di
-- /api/mading/[id]/report; tabel ini yang menjaga satu-pelapor-satu-suara.
--
-- Idempotent: aman dijalankan berulang.

CREATE TABLE IF NOT EXISTS public.mading_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.mading_posts(id) ON DELETE CASCADE,
  -- Hash (user_identifier + IP), bukan identitas mentah — cukup untuk dedup,
  -- tidak cukup untuk membongkar siapa pelapornya dari isi database.
  reporter_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, reporter_hash)
);

CREATE INDEX IF NOT EXISTS idx_mading_reports_post ON public.mading_reports(post_id);

-- RLS menyala tanpa kebijakan publik: hanya service_role (API situs) yang
-- membaca/menulis. Pola yang sama dengan receipt_hashes dan buyer_contacts.
ALTER TABLE public.mading_reports ENABLE ROW LEVEL SECURITY;
