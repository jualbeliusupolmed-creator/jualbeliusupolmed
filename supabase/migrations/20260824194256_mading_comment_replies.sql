-- Balasan satu tingkat untuk komentar Menfess.
alter table public.mading_comments
  add column if not exists parent_id uuid references public.mading_comments(id) on delete cascade;

alter table public.mading_comments
  drop constraint if exists mading_comments_parent_not_self;

alter table public.mading_comments
  add constraint mading_comments_parent_not_self check (parent_id is null or parent_id <> id);

create index if not exists mading_comments_parent_id_idx
  on public.mading_comments (parent_id, created_at asc)
  where parent_id is not null;
