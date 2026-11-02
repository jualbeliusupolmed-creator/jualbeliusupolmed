-- ==============================================================================
-- 20261102220000_seed_national_social_accounts.sql
-- Inisialisasi Akun Resmi Instagram Multi-Wilayah (Provinsi & Kampus Nasional)
-- ==============================================================================

-- 1. Akun Instagram Resmi Tingkat Provinsi
insert into public.organization_social_accounts (
  provider,
  province_id,
  handle,
  status
)
values
  ('instagram', 'dki-jakarta', 'jualbelidikampus.dki', 'not_connected'),
  ('instagram', 'jawa-barat', 'jualbelidikampus.jabar', 'not_connected'),
  ('instagram', 'di-yogyakarta', 'jualbelidikampus.jogja', 'not_connected'),
  ('instagram', 'jawa-timur', 'jualbelidikampus.jatim', 'not_connected')
on conflict (provider, scope_type, scope_id, handle) do update set
  updated_at = now();

-- 2. Akun Instagram Resmi Tingkat Kampus (12 Universitas Anchor Nasional)
insert into public.organization_social_accounts (
  provider,
  university_id,
  handle,
  status
)
values
  -- DKI Jakarta
  ('instagram', 'ui', 'jualbelidikampus.ui', 'not_connected'),
  ('instagram', 'unj', 'jualbelidikampus.unj', 'not_connected'),
  ('instagram', 'trisakti', 'jualbelidikampus.trisakti', 'not_connected'),

  -- Jawa Barat
  ('instagram', 'itb', 'jualbelidikampus.itb', 'not_connected'),
  ('instagram', 'unpad', 'jualbelidikampus.unpad', 'not_connected'),
  ('instagram', 'ipb', 'jualbelidikampus.ipb', 'not_connected'),

  -- DI Yogyakarta
  ('instagram', 'ugm', 'jualbelidikampus.ugm', 'not_connected'),
  ('instagram', 'uny', 'jualbelidikampus.uny', 'not_connected'),
  ('instagram', 'uii', 'jualbelidikampus.uii', 'not_connected'),

  -- Jawa Timur
  ('instagram', 'its', 'jualbelidikampus.its', 'not_connected'),
  ('instagram', 'unair', 'jualbelidikampus.unair', 'not_connected'),
  ('instagram', 'ub', 'jualbelidikampus.ub', 'not_connected')
on conflict (provider, scope_type, scope_id, handle) do update set
  updated_at = now();

