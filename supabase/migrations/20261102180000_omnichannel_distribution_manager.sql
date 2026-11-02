-- Migration: 20261102180000_omnichannel_distribution_manager.sql
-- Fase 5: Central Distribution Manager (Omnichannel Product Publishing)

create table if not exists public.omnichannel_distributions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  channel_type text not null check (
    channel_type in (
      'website',
      'instagram_province',
      'instagram_university',
      'whatsapp_channel_province',
      'whatsapp_channel_university',
      'whatsapp_group_community'
    )
  ),
  social_account_id uuid references public.organization_social_accounts(id) on delete set null,
  target_destination text,
  province_id text references public.provinces(id) on update cascade on delete set null,
  university_id text references public.universities(id) on update cascade on delete set null,
  status text not null default 'draft' check (
    status in ('draft', 'pending_review', 'approved', 'scheduled', 'publishing', 'published', 'failed', 'cancelled')
  ),
  scheduled_at timestamptz,
  published_at timestamptz,
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  last_error text,
  external_reference_id text,
  caption_snapshot text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unique index per listing and target channel destination to prevent duplicate publishing
create unique index if not exists uq_omnichannel_listing_target
  on public.omnichannel_distributions (listing_id, channel_type, coalesce(target_destination, ''));

-- Performance indexes for scheduler and scope queries
create index if not exists idx_omnichannel_listing_id
  on public.omnichannel_distributions (listing_id);

create index if not exists idx_omnichannel_status_scheduled
  on public.omnichannel_distributions (status, scheduled_at);

create index if not exists idx_omnichannel_scope
  on public.omnichannel_distributions (province_id, university_id);

-- RLS Security
alter table public.omnichannel_distributions enable row level security;

-- Revoke direct permissions from anon and authenticated
revoke all on public.omnichannel_distributions from anon, authenticated;

-- Grant server/service_role access
grant all on public.omnichannel_distributions to service_role;
