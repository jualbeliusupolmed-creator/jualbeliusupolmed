create table public.driver_access_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  notes text,
  requested_bus_id text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  constraint driver_access_requests_user_id_key unique (user_id),
  constraint driver_access_requests_full_name_length check (
    char_length(btrim(full_name)) between 2 and 100
  ),
  constraint driver_access_requests_phone_length check (
    phone is null or char_length(phone) <= 30
  ),
  constraint driver_access_requests_notes_length check (
    notes is null or char_length(notes) <= 500
  ),
  constraint driver_access_requests_requested_bus_id_format check (
    requested_bus_id is null
    or requested_bus_id ~ '^LINUS-[A-Z0-9]+(-[A-Z0-9]+)*$'
  ),
  constraint driver_access_requests_status_check check (
    status in ('pending', 'approved', 'rejected')
  )
);

create index driver_access_requests_created_at_idx
  on public.driver_access_requests (created_at desc);

alter table public.driver_access_requests enable row level security;

revoke all on table public.driver_access_requests
  from public, anon, authenticated;

grant select, insert, update, delete
  on table public.driver_access_requests to service_role;