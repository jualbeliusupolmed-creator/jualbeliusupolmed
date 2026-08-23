-- Lapor lawan bicara + blokir otomatis — pola bot chat anonim Telegram.
--
-- Peserta chat bisa melaporkan lawan bicaranya dari dalam room. Yang dilaporkan
-- oleh >= 3 room BERBEDA dalam 30 hari diblokir otomatis dari matchmaking dan
-- chat marketplace selama 7 hari (logikanya di /api/chat/room/[id]/report).
-- Satu-pelapor-satu-suara per room lewat UNIQUE.
--
-- `reporter_id`/`reported_id`/`subject_id` memakai id sebagaimana tercatat di
-- chat_rooms: hash bergaram untuk chat anonim, nomor WA untuk chat marketplace.
-- Publik tidak pernah melihat nilai-nilai ini.
--
-- Sudah diterapkan ke produksi 23 Agu 2026 (migrasi chat_lapor_dan_blokir).
-- Idempotent: aman dijalankan berulang.

create table if not exists public.chat_reports (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  reporter_id text not null,
  reported_id text not null,
  reason text,
  created_at timestamptz not null default now(),
  unique (room_id, reporter_id)
);
create index if not exists idx_chat_reports_reported on public.chat_reports(reported_id, created_at);

create table if not exists public.chat_bans (
  subject_id text primary key,
  until timestamptz not null,
  reason text,
  created_at timestamptz not null default now()
);

-- RLS tanpa kebijakan publik: hanya service_role (API situs).
alter table public.chat_reports enable row level security;
alter table public.chat_bans enable row level security;
