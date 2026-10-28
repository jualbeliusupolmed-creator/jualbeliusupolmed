-- Keep moderation outcomes used by the new admin workspace within the database constraint.
alter table public.listings
  drop constraint if exists listings_status_check;

alter table public.listings
  add constraint listings_status_check
  check (status = any (array[
    'pending',
    'active',
    'sold',
    'expired',
    'suspended',
    'deletion_pending',
    'deleted',
    'rejected',
    'hidden'
  ]::text[]));
