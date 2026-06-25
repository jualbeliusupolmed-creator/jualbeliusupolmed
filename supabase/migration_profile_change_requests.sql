-- Tabel untuk menyimpan permintaan perubahan profil penjual
-- Setiap perubahan nama/bio perlu persetujuan admin sebelum berlaku

CREATE TABLE IF NOT EXISTS profile_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_wa TEXT NOT NULL,
  field TEXT NOT NULL CHECK (field IN ('name', 'bio')),
  current_value TEXT,
  requested_value TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_via TEXT NOT NULL DEFAULT 'web' CHECK (requested_via IN ('web', 'wa')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  review_note TEXT
);

CREATE INDEX IF NOT EXISTS idx_profile_change_requests_seller_wa ON profile_change_requests(seller_wa);
CREATE INDEX IF NOT EXISTS idx_profile_change_requests_status ON profile_change_requests(status);
