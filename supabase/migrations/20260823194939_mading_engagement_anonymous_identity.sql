-- Traffic Menfess, share, dan pseudonim komunitas — 24 Agustus 2026.
--
-- Semua hitungan ditulis hanya oleh API server (service_role). Identitas
-- pengunjung disimpan sebagai hash bergaram, bukan nomor WA/IP mentah.

alter table public.mading_posts
  add column if not exists views_count integer not null default 0,
  add column if not exists shares_count integer not null default 0;

alter table public.seller_profiles
  add column if not exists anonymous_name text;

update public.seller_profiles
set anonymous_name = 'Anonim'
where anonymous_name is null or btrim(anonymous_name) = '';

alter table public.seller_profiles
  alter column anonymous_name set default 'Anonim';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'seller_profiles_anonymous_name_length'
      and conrelid = 'public.seller_profiles'::regclass
  ) then
    alter table public.seller_profiles
      add constraint seller_profiles_anonymous_name_length
      check (char_length(btrim(anonymous_name)) between 2 and 30) not valid;
  end if;
end $$;

alter table public.seller_profiles
  validate constraint seller_profiles_anonymous_name_length;

create table if not exists public.mading_post_engagements (
  post_id uuid not null references public.mading_posts(id) on delete cascade,
  visitor_hash text not null,
  first_viewed_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  share_count integer not null default 0 check (share_count >= 0),
  primary key (post_id, visitor_hash)
);

create index if not exists mading_post_engagements_last_seen_idx
  on public.mading_post_engagements (last_seen_at desc);

alter table public.mading_post_engagements enable row level security;
-- Tidak ada policy publik: tabel ini adalah audit internal dan hanya API
-- server memakai service_role yang dapat menulis/membacanya.

create or replace function public.record_mading_engagement(
  target_post_id uuid,
  target_visitor_hash text,
  event_type text
)
returns table (views_count integer, shares_count integer)
language plpgsql
security invoker
set search_path = public
as $$
declare
  is_first_view boolean := false;
begin
  if event_type not in ('view', 'share') then
    raise exception 'Unknown engagement event';
  end if;

  if event_type = 'view' then
    insert into public.mading_post_engagements (post_id, visitor_hash)
    values (target_post_id, target_visitor_hash)
    on conflict (post_id, visitor_hash) do update
      set last_seen_at = now()
    returning (xmax = 0) into is_first_view;

    update public.mading_posts
    set views_count = views_count + case when is_first_view then 1 else 0 end
    where id = target_post_id and status = 'active';
  else
    insert into public.mading_post_engagements (post_id, visitor_hash, share_count)
    values (target_post_id, target_visitor_hash, 1)
    on conflict (post_id, visitor_hash) do update
      set last_seen_at = now(),
          share_count = public.mading_post_engagements.share_count + 1;

    update public.mading_posts
    set shares_count = shares_count + 1
    where id = target_post_id and status = 'active';
  end if;

  return query
  select p.views_count, p.shares_count
  from public.mading_posts p
  where p.id = target_post_id and p.status = 'active';
end;
$$;

revoke all on function public.record_mading_engagement(uuid, text, text) from public;
grant execute on function public.record_mading_engagement(uuid, text, text) to service_role;
