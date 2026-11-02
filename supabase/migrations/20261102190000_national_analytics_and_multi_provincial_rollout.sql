-- Migration: 20261102190000_national_analytics_and_multi_provincial_rollout.sql
-- Fase 6: National Analytics & Multi-Provincial Rollout

-- 1. Seeding Provinsi dan Universitas Utama untuk Roadmap Rollout Nasional (Tahap 1 - 6)
insert into public.provinces (id, name, status)
values
  ('dki-jakarta', 'DKI Jakarta', 'active'),
  ('jawa-barat', 'Jawa Barat', 'active'),
  ('di-yogyakarta', 'DI Yogyakarta', 'active'),
  ('jawa-timur', 'Jawa Timur', 'active'),
  ('banten', 'Banten', 'active'),
  ('jawa-tengah', 'Jawa Tengah', 'active'),
  ('bali', 'Bali', 'active'),
  ('sulawesi-selatan', 'Sulawesi Selatan', 'active')
on conflict (id) do update set
  name = excluded.name,
  status = excluded.status;

-- Universitas Anchor per Provinsi
insert into public.universities (id, code, province_id, name, email_domains, status)
values
  -- Tahap 2: DKI Jakarta
  ('ui', 'UI', 'dki-jakarta', 'Universitas Indonesia', array['ui.ac.id'], 'active'),
  ('unj', 'UNJ', 'dki-jakarta', 'Universitas Negeri Jakarta', array['unj.ac.id'], 'active'),
  ('trisakti', 'TRISAKTI', 'dki-jakarta', 'Universitas Trisakti', array['trisakti.ac.id'], 'active'),
  -- Tahap 3: Jawa Barat
  ('itb', 'ITB', 'jawa-barat', 'Institut Teknologi Bandung', array['itb.ac.id'], 'active'),
  ('unpad', 'UNPAD', 'jawa-barat', 'Universitas Padjadjaran', array['unpad.ac.id'], 'active'),
  ('ipb', 'IPB', 'jawa-barat', 'IPB University', array['ipb.ac.id'], 'active'),
  -- Tahap 4: DI Yogyakarta
  ('ugm', 'UGM', 'di-yogyakarta', 'Universitas Gadjah Mada', array['ugm.ac.id'], 'active'),
  ('uny', 'UNY', 'di-yogyakarta', 'Universitas Negeri Yogyakarta', array['uny.ac.id'], 'active'),
  ('uii', 'UII', 'di-yogyakarta', 'Universitas Islam Indonesia', array['uii.ac.id'], 'active'),
  -- Tahap 5: Jawa Timur
  ('its', 'ITS', 'jawa-timur', 'Institut Teknologi Sepuluh Nopember', array['its.ac.id'], 'active'),
  ('unair', 'UNAIR', 'jawa-timur', 'Universitas Airlangga', array['unair.ac.id'], 'active'),
  ('ub', 'UB', 'jawa-timur', 'Universitas Brawijaya', array['ub.ac.id'], 'active')
on conflict (id) do update set
  code = excluded.code,
  province_id = excluded.province_id,
  name = excluded.name,
  email_domains = excluded.email_domains,
  status = excluded.status;

-- 2. Tabel Checklist Rollout Multi-Provinsi
create table if not exists public.provincial_rollout_checklists (
  id uuid primary key default gen_random_uuid(),
  province_id text not null references public.provinces(id) on update cascade on delete cascade,
  stage_number integer not null default 1,
  instagram_setup boolean not null default false,
  whatsapp_channel_setup boolean not null default false,
  admin_assigned boolean not null default false,
  first_university_verified boolean not null default false,
  dm_routing_tested boolean not null default false,
  channel_posting_tested boolean not null default false,
  bursa_transaction_tested boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'onboarding', 'pilot_active', 'fully_launched')),
  launched_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_provincial_rollout_province unique (province_id)
);

create index if not exists idx_provincial_rollout_stage
  on public.provincial_rollout_checklists (stage_number, status);

-- Seed checklist data untuk 6 tahapan awal
insert into public.provincial_rollout_checklists (
  province_id, stage_number, instagram_setup, whatsapp_channel_setup, admin_assigned,
  first_university_verified, dm_routing_tested, channel_posting_tested, bursa_transaction_tested,
  status, launched_at
)
values
  -- Tahap 1: Pilot Sumatera Utara (Sudah Aktif Penuh)
  ('sumatera-utara', 1, true, true, true, true, true, true, true, 'fully_launched', now()),
  -- Tahap 2: DKI Jakarta
  ('dki-jakarta', 2, false, false, false, true, false, false, false, 'onboarding', null),
  -- Tahap 3: Jawa Barat
  ('jawa-barat', 3, false, false, false, true, false, false, false, 'onboarding', null),
  -- Tahap 4: DI Yogyakarta
  ('di-yogyakarta', 4, false, false, false, true, false, false, false, 'draft', null),
  -- Tahap 5: Jawa Timur
  ('jawa-timur', 5, false, false, false, true, false, false, false, 'draft', null),
  -- Tahap 6: Banten & Provinsi Lain
  ('banten', 6, false, false, false, false, false, false, false, 'draft', null)
on conflict (province_id) do update set
  stage_number = excluded.stage_number,
  status = excluded.status;

-- Security & RLS
alter table public.provincial_rollout_checklists enable row level security;
revoke all on public.provincial_rollout_checklists from anon, authenticated;
grant all on public.provincial_rollout_checklists to service_role;
