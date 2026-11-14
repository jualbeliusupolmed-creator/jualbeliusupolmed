-- Keep each listing's visibility tied to the seller's home province, never to
-- the old buyer-facing target campus stored in listings.campus/university_id.

alter table public.listings
  add column if not exists seller_university_id text
    references public.universities(id) on update cascade on delete set null,
  add column if not exists seller_province_id text
    references public.provinces(id) on update cascade on delete set null;

-- The legacy campus constraint only allowed USU, POLMED, or "Semua". The
-- campus field now labels the seller's home university, so it must accept
-- canonical university codes from every province.
alter table public.listings
  drop constraint if exists listings_campus_check;

alter table public.listings
  add constraint listings_campus_check
  check (campus is null or length(trim(campus)) between 1 and 80);

create index if not exists listings_seller_province_status_created_idx
  on public.listings(seller_province_id, status, created_at desc);

-- Backfill from the seller's canonical affiliation. Legacy `campus` is used
-- only when the profile has no canonical home university. Listing target
-- metadata is deliberately never used as evidence of seller origin.
with seller_candidates as (
  select
    l.id as listing_id,
    case
      when sp.affiliation_status = 'verified_student' or coalesce(sp.student_verified, false)
        then coalesce(sp.verified_university_id, sp.home_university_id)
      else sp.home_university_id
    end as canonical_university_id,
    coalesce(sp.campus, sp.student_campus) as campus
  from public.listings l
  join public.seller_profiles sp on sp.wa = l.seller_wa
  where l.seller_university_id is null or l.seller_province_id is null
), canonical_origins as (
  select sc.listing_id, u.id as university_id, u.province_id
  from seller_candidates sc
  join public.universities u on u.id = sc.canonical_university_id
), unique_legacy_origins as (
  select sc.listing_id, min(u.id) as university_id, min(u.province_id) as province_id
  from seller_candidates sc
  join public.universities u
    on sc.canonical_university_id is null
   and lower(trim(coalesce(sc.campus, ''))) in (lower(trim(u.id)), lower(trim(u.code)))
  group by sc.listing_id
  having count(distinct u.id) = 1
), resolved_origins as (
  select * from canonical_origins

  union all

  select * from unique_legacy_origins
)
update public.listings l
set seller_university_id = origin.university_id,
    seller_province_id = origin.province_id
from resolved_origins origin
where l.id = origin.listing_id;

comment on column public.listings.seller_university_id is
  'Seller home university snapshot. This determines origin and is separate from legacy target metadata.';
comment on column public.listings.seller_province_id is
  'Seller home province snapshot. Active listings are visible only to users scoped to this province.';
