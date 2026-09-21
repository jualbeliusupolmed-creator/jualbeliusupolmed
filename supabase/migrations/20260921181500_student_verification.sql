-- Migration: Fitur Verifikasi Mahasiswa Kampus (USU & POLMED)
-- Menambahkan kolom identitas kemahasiswaan dan status verifikasi KTM / Email Kampus ke seller_profiles

alter table public.seller_profiles
  add column if not exists student_verified boolean not null default false,
  add column if not exists student_nim text,
  add column if not exists student_campus text,
  add column if not exists student_faculty text,
  add column if not exists student_email text,
  add column if not exists student_ktm_url text,
  add column if not exists student_verification_status text not null default 'none',
  add column if not exists student_verified_at timestamptz;

-- Validasi domain kampus dan status
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'seller_profiles_student_campus_check'
      and conrelid = 'public.seller_profiles'::regclass
  ) then
    alter table public.seller_profiles
      add constraint seller_profiles_student_campus_check
      check (student_campus is null or student_campus in ('USU', 'POLMED', 'LAINNYA'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'seller_profiles_student_verification_status_check'
      and conrelid = 'public.seller_profiles'::regclass
  ) then
    alter table public.seller_profiles
      add constraint seller_profiles_student_verification_status_check
      check (student_verification_status in ('none', 'pending', 'verified', 'rejected'));
  end if;
end $$;

-- Indeks untuk pencarian dan filter cepat di admin & katalog
create index if not exists idx_seller_profiles_student_verified
  on public.seller_profiles (student_verified)
  where student_verified is true;

create index if not exists idx_seller_profiles_student_status
  on public.seller_profiles (student_verification_status);

comment on column public.seller_profiles.student_verified is
  'Status centang biru: benar jika mahasiswa USU/POLMED telah diverifikasi via email resmi atau KTM.';

comment on column public.seller_profiles.student_verification_status is
  'Status pengajuan verifikasi: none, pending (menunggu review admin), verified, atau rejected.';
