-- Menfess -> Instagram: antrean publikasi server-side.
-- Token Meta TIDAK disimpan di database; hanya dibaca dari environment server.

alter table public.mading_posts
  add column if not exists instagram_status text not null default 'not_queued',
  add column if not exists instagram_media_id text,
  add column if not exists instagram_published_at timestamptz;

alter table public.mading_posts
  drop constraint if exists mading_posts_instagram_status_check;

alter table public.mading_posts
  add constraint mading_posts_instagram_status_check
  check (instagram_status in ('not_queued', 'queued', 'processing', 'published', 'failed'));

create table if not exists public.mading_instagram_publications (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null unique references public.mading_posts(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'published', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  instagram_media_id text,
  queued_at timestamptz not null default timezone('utc'::text, now()),
  published_at timestamptz,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists mading_instagram_publications_queue_idx
  on public.mading_instagram_publications (status, queued_at asc);

alter table public.mading_instagram_publications enable row level security;

-- Tabel ini hanya dipakai API server dengan service role. Tidak ada policy publik.
revoke all on table public.mading_instagram_publications from anon, authenticated;
