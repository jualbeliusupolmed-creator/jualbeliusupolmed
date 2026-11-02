-- ==============================================================================
-- 20261102223000_seed_national_whatsapp_channels.sql
-- Inisialisasi Kanal Resmi WhatsApp Multi-Wilayah (Provinsi & Kampus Nasional)
-- ==============================================================================

-- 1. WhatsApp Channels Resmi Tingkat Provinsi
insert into public.organization_social_accounts (
  provider,
  province_id,
  handle,
  status
)
values
  ('whatsapp_channel', 'dki-jakarta', 'https://whatsapp.com/channel/0029Vadki', 'not_connected'),
  ('whatsapp_channel', 'jawa-barat', 'https://whatsapp.com/channel/0029Vajabar', 'not_connected'),
  ('whatsapp_channel', 'di-yogyakarta', 'https://whatsapp.com/channel/0029Vajogja', 'not_connected'),
  ('whatsapp_channel', 'jawa-timur', 'https://whatsapp.com/channel/0029Vajatim', 'not_connected')
on conflict (provider, scope_type, scope_id, handle) do update set
  updated_at = now();

-- 2. WhatsApp Channels Resmi Tingkat Kampus (14 Universitas Anchor Nasional)
insert into public.organization_social_accounts (
  provider,
  university_id,
  handle,
  status
)
values
  -- Sumatera Utara
  ('whatsapp_channel', 'usu', 'https://whatsapp.com/channel/0029Vausu', 'not_connected'),

  -- DKI Jakarta
  ('whatsapp_channel', 'ui', 'https://whatsapp.com/channel/0029Vaui', 'not_connected'),
  ('whatsapp_channel', 'unj', 'https://whatsapp.com/channel/0029Vaunj', 'not_connected'),
  ('whatsapp_channel', 'trisakti', 'https://whatsapp.com/channel/0029Vatrisakti', 'not_connected'),

  -- Jawa Barat
  ('whatsapp_channel', 'itb', 'https://whatsapp.com/channel/0029Vaitb', 'not_connected'),
  ('whatsapp_channel', 'unpad', 'https://whatsapp.com/channel/0029Vaunpad', 'not_connected'),
  ('whatsapp_channel', 'ipb', 'https://whatsapp.com/channel/0029Vaipb', 'not_connected'),

  -- DI Yogyakarta
  ('whatsapp_channel', 'ugm', 'https://whatsapp.com/channel/0029Vaugm', 'not_connected'),
  ('whatsapp_channel', 'uny', 'https://whatsapp.com/channel/0029Vauny', 'not_connected'),
  ('whatsapp_channel', 'uii', 'https://whatsapp.com/channel/0029Vauii', 'not_connected'),

  -- Jawa Timur
  ('whatsapp_channel', 'its', 'https://whatsapp.com/channel/0029Vaits', 'not_connected'),
  ('whatsapp_channel', 'unair', 'https://whatsapp.com/channel/0029Vaunair', 'not_connected'),
  ('whatsapp_channel', 'ub', 'https://whatsapp.com/channel/0029Vaub', 'not_connected')
on conflict (provider, scope_type, scope_id, handle) do update set
  updated_at = now();
