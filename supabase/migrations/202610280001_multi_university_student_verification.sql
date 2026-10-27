-- Allow student verification to use the admin-managed campus catalog.
-- The API validates active campus identifiers and institution email domains.
alter table public.seller_profiles
  drop constraint if exists seller_profiles_student_campus_check;

comment on column public.seller_profiles.student_campus is
  'Short name of an active campus from the admin-managed settings catalog.';
