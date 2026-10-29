alter table public.seller_profiles
  add column if not exists phone_wa text;

update public.seller_profiles
set phone_wa = wa
where phone_wa is null
  and wa ~ '^08[0-9]{8,11}$';

do $$
begin
  if exists (
    select phone_wa
    from public.seller_profiles
    where phone_wa is not null
    group by phone_wa
    having count(*) > 1
  ) then
    raise exception 'Duplicate seller_profiles.phone_wa values must be resolved before enabling phone linking';
  end if;

  if exists (
    select 1
    from public.seller_profiles
    where phone_wa is not null
      and phone_wa !~ '^08[0-9]{8,11}$'
  ) then
    raise exception 'Invalid seller_profiles.phone_wa values must be resolved before enabling phone linking';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'seller_profiles_phone_wa_format_check'
      and conrelid = 'public.seller_profiles'::regclass
  ) then
    alter table public.seller_profiles
      add constraint seller_profiles_phone_wa_format_check
      check (phone_wa is null or phone_wa ~ '^08[0-9]{8,11}$');
  end if;
end;
$$;

create unique index if not exists seller_profiles_phone_wa_unique
  on public.seller_profiles (phone_wa)
  where phone_wa is not null;

create unique index if not exists seller_profiles_phone_identity_unique
  on public.seller_profiles (
    coalesce(phone_wa, case when wa ~ '^08[0-9]{8,11}$' then wa end)
  )
  where phone_wa is not null or wa ~ '^08[0-9]{8,11}$';

create table if not exists public.seller_phone_link_otps (
  phone_wa text primary key check (phone_wa ~ '^08[0-9]{8,11}$'),
  profile_wa text not null references public.seller_profiles (wa) on delete cascade,
  otp_hash text not null,
  expires_at timestamptz not null,
  attempts smallint not null default 0 check (attempts between 0 and 5),
  created_at timestamptz not null default now()
);

create index if not exists seller_phone_link_otps_expires_at_idx
  on public.seller_phone_link_otps (expires_at);

alter table public.seller_phone_link_otps enable row level security;
revoke all on table public.seller_phone_link_otps from public, anon, authenticated;
grant all on table public.seller_phone_link_otps to service_role;