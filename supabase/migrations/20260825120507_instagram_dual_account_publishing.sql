-- Instagram publishing for two independent accounts:
-- Menfess -> @usupolmedmenfess, active listings -> @katalogusupolmed.
-- Access tokens remain server environment variables and are never stored here.

alter table public.mading_instagram_publications
  add column if not exists instagram_container_id text,
  add column if not exists next_attempt_at timestamptz;

drop index if exists public.mading_instagram_publications_queue_idx;
create index if not exists mading_instagram_publications_queue_idx
  on public.mading_instagram_publications (queued_at asc)
  where status = 'queued';

create table if not exists public.listing_instagram_publications (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null unique references public.listings(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'published', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  instagram_container_id text,
  instagram_media_id text,
  queued_at timestamptz not null default timezone('utc'::text, now()),
  next_attempt_at timestamptz,
  published_at timestamptz,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists listing_instagram_publications_queue_idx
  on public.listing_instagram_publications (queued_at asc)
  where status = 'queued';

alter table public.listing_instagram_publications enable row level security;

-- Kedua tabel hanya boleh diakses server dengan service role. Tidak ada policy
-- anon/authenticated karena status dan galat operasional bukan data publik.
revoke all on table public.mading_instagram_publications from anon, authenticated;
revoke all on table public.listing_instagram_publications from anon, authenticated;
grant select, insert, update, delete on table public.mading_instagram_publications to service_role;
grant select, insert, update, delete on table public.listing_instagram_publications to service_role;

-- Database hanya membuat antrean; panggilan HTTP ke Meta tetap dilakukan API.
-- Dengan demikian semua jalur aktivasi (web, pembayaran, maupun bot) tercakup.
create or replace function public.queue_active_listing_for_instagram()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'active' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'active' then
    return new;
  end if;

  insert into public.listing_instagram_publications (listing_id)
  values (new.id)
  on conflict (listing_id) do update
    set status = 'queued',
        attempts = 0,
        last_error = null,
        instagram_container_id = null,
        instagram_media_id = null,
        queued_at = timezone('utc'::text, now()),
        next_attempt_at = null,
        published_at = null,
        updated_at = timezone('utc'::text, now())
    where public.listing_instagram_publications.status <> 'published';
  return new;
end;
$$;

drop trigger if exists listings_queue_instagram_on_active on public.listings;
create trigger listings_queue_instagram_on_active
after insert or update of status on public.listings
for each row execute function public.queue_active_listing_for_instagram();

create or replace function public.queue_active_mading_for_instagram()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'active' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'active' then
    return new;
  end if;

  insert into public.mading_instagram_publications (post_id)
  values (new.id)
  on conflict (post_id) do update
    set status = 'queued',
        attempts = 0,
        last_error = null,
        instagram_container_id = null,
        instagram_media_id = null,
        queued_at = timezone('utc'::text, now()),
        next_attempt_at = null,
        published_at = null,
        updated_at = timezone('utc'::text, now())
    where public.mading_instagram_publications.status <> 'published';

  update public.mading_posts
    set instagram_status = 'queued',
        instagram_media_id = null,
        instagram_published_at = null
    where id = new.id and instagram_status <> 'published';
  return new;
end;
$$;

drop trigger if exists mading_queue_instagram_on_active on public.mading_posts;
create trigger mading_queue_instagram_on_active
after insert or update of status on public.mading_posts
for each row execute function public.queue_active_mading_for_instagram();

revoke all on function public.queue_active_listing_for_instagram() from public, anon, authenticated;
revoke all on function public.queue_active_mading_for_instagram() from public, anon, authenticated;
grant execute on function public.queue_active_listing_for_instagram() to service_role;
grant execute on function public.queue_active_mading_for_instagram() to service_role;
