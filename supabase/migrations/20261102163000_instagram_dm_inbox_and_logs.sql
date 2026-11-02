-- Migration: Instagram Multi-Account DM Logs & Inbound Routing Inbox
-- Supports Phase 3: Social & Communication Management

create table if not exists public.instagram_dm_logs (
  id uuid primary key default gen_random_uuid(),
  recipient_account_id text not null,
  sender_id text not null,
  sender_username text,
  province_id text references public.provinces(id) on update cascade on delete set null,
  university_id text references public.universities(id) on update cascade on delete set null,
  direction text not null default 'inbound' check (direction in ('inbound', 'outbound')),
  message_text text,
  quick_reply_payload text,
  action_taken text,
  listing_id uuid references public.listings(id) on update cascade on delete set null,
  status text not null default 'processed' check (status in ('processed', 'failed', 'redirected', 'cancelled')),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists instagram_dm_logs_recipient_idx
  on public.instagram_dm_logs(recipient_account_id, created_at desc);

create index if not exists instagram_dm_logs_scope_idx
  on public.instagram_dm_logs(province_id, university_id, created_at desc);

create index if not exists instagram_dm_logs_sender_idx
  on public.instagram_dm_logs(sender_id, created_at desc);

alter table public.instagram_dm_logs enable row level security;

grant select, insert, update, delete on public.instagram_dm_logs to service_role;
grant select on public.instagram_dm_logs to authenticated;

comment on table public.instagram_dm_logs is 'Multi-tenant Instagram DM conversation logs routed by recipient account to provincial and university inboxes.';
