-- Migrasi: 20261102200000_national_user_identity_and_affiliations.sql
-- Tujuan: Nasionalisasi Identitas Pengguna Universal & Pemisahan Afiliasi Kampus
-- Dokumen Kebijakan: docs/kebijakan-nasionalisasi-identitas-pengguna.md (7 Pilar)

-- 1. Tambahkan kolom identitas kanonikal auth.users dan relasi universitas nasional ke seller_profiles
alter table public.seller_profiles
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists home_university_id text references public.universities(id) on update cascade on delete set null,
  add column if not exists home_unit_id text references public.university_units(id) on update cascade on delete set null,
  add column if not exists affiliation_status text not null default 'self_selected',
  add column if not exists verified_university_id text references public.universities(id) on update cascade on delete set null;

-- 2. Constraint status afiliasi institusional
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'seller_profiles_affiliation_status_check'
      and conrelid = 'public.seller_profiles'::regclass
  ) then
    alter table public.seller_profiles
      add constraint seller_profiles_affiliation_status_check
      check (affiliation_status in ('self_selected', 'pending_verification', 'verified_student', 'alumni', 'faculty_staff'));
  end if;
end $$;

-- 3. Indeks Performa & Keunikan 1-ke-1 user_id
-- Memastikan 1 akun Supabase Auth hanya terikat pada 1 profil penjual kanonikal
create unique index if not exists idx_seller_profiles_unique_user_id
  on public.seller_profiles(user_id) where user_id is not null;

create index if not exists idx_seller_profiles_home_univ
  on public.seller_profiles(home_university_id) where home_university_id is not null;

create index if not exists idx_seller_profiles_affiliation
  on public.seller_profiles(affiliation_status);

create index if not exists idx_seller_profiles_verified_univ
  on public.seller_profiles(verified_university_id) where verified_university_id is not null;

-- 4. Dokumentasi Kolom (Data Dictionary)
comment on column public.seller_profiles.user_id is
  'ID kanonikal auth.users(id) untuk menyatukan login Google, WhatsApp, dan sesi web dalam 1 identitas nasional.';

comment on column public.seller_profiles.home_university_id is
  'ID universitas komunitas utama dari katalog resmi public.universities (dipilih sendiri atau diturunkan).';

comment on column public.seller_profiles.home_unit_id is
  'ID unit/cabang/fakultas di bawah universitas dari public.university_units (opsional).';

comment on column public.seller_profiles.affiliation_status is
  'Status hubungan institusional: self_selected (pilihan pasar), pending_verification, verified_student (centang biru), alumni, faculty_staff.';

comment on column public.seller_profiles.verified_university_id is
  'ID universitas yang terbukti sah melalui verifikasi resmi email kampus .ac.id atau KTM.';

-- 5. Backfill Deterministik (Hanya pada data pasti)
-- 5a. Sinkronkan mahasiswa terverifikasi lama ke universitas kanonikal (USU / POLMED)
update public.seller_profiles
set
  verified_university_id = case
    when upper(trim(coalesce(student_campus, campus, ''))) = 'USU' then 'usu'
    when upper(trim(coalesce(student_campus, campus, ''))) = 'POLMED' then 'polmed'
    else null
  end,
  home_university_id = case
    when upper(trim(coalesce(student_campus, campus, ''))) = 'USU' then 'usu'
    when upper(trim(coalesce(student_campus, campus, ''))) = 'POLMED' then 'polmed'
    else home_university_id
  end,
  affiliation_status = 'verified_student'
where student_verified is true;

-- 5b. Sinkronkan preferensi kampus lama USU & POLMED yang belum memiliki home_university_id
update public.seller_profiles
set home_university_id = 'usu'
where home_university_id is null and upper(trim(coalesce(campus, ''))) = 'USU';

update public.seller_profiles
set home_university_id = 'polmed'
where home_university_id is null and upper(trim(coalesce(campus, ''))) = 'POLMED';

-- 5c. Tautkan akun Google yang cocok pasti (1-to-1 match dengan auth.users)
with unique_email_matches as (
  select
    p.wa,
    u.id as matched_user_id,
    count(*) over (partition by p.wa) as user_match_count,
    count(*) over (partition by u.id) as profile_match_count
  from public.seller_profiles p
  join auth.users u
    on lower(trim(u.email)) = lower(trim(coalesce(p.email_google, p.email, '')))
  where p.user_id is null
    and coalesce(p.email_google, p.email, '') <> ''
)
update public.seller_profiles p
set user_id = m.matched_user_id
from unique_email_matches m
where p.wa = m.wa
  and m.user_match_count = 1
  and m.profile_match_count = 1;

