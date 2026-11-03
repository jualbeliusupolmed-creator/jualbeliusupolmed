-- ==============================================================================
-- Migrasi: 20261103141500_user_fyp_preferences.sql
-- Tujuan: Menambahkan preferensi wilayah dan jangkauan FYP untuk setiap akun pengguna
-- ==============================================================================

-- 1. Tambah kolom preferensi FYP ke seller_profiles
alter table public.seller_profiles
  add column if not exists fyp_province_id text references public.provinces(id) on update cascade on delete set null,
  add column if not exists fyp_scope text not null default 'campus',
  add column if not exists fyp_universities jsonb not null default '[]'::jsonb;

-- 2. Constraint fyp_scope
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'seller_profiles_fyp_scope_check'
      and conrelid = 'public.seller_profiles'::regclass
  ) then
    alter table public.seller_profiles
      add constraint seller_profiles_fyp_scope_check
      check (fyp_scope in ('campus', 'province', 'all', 'custom'));
  end if;
end $$;

-- 3. Backfill fyp_province_id awal berdasarkan home_university_id masing-masing profil
update public.seller_profiles sp
set fyp_province_id = u.province_id
from public.universities u
where sp.home_university_id = u.id
  and sp.fyp_province_id is null;

-- Default fallback untuk fyp_province_id jika belum terisi
update public.seller_profiles
set fyp_province_id = 'sumatera-utara'
where fyp_province_id is null;

