-- ============================================================================
-- Tabel yang TERNYATA belum ada di DB produksi (ketahuan 2026-07-16 saat audit LID).
-- Akibatnya dua fitur mati diam-diam (insert-nya gagal tanpa error ke user):
--   1) wa_conversations   → riwayat chat di panel admin "Kontrol Chat" + audit.
--   2) wa_listing_drafts  → "Pemandu Pasang Iklan" (teks disimpan sampai foto datang).
--
-- Aman dijalankan berulang (idempotent). Cara: Supabase Dashboard → SQL Editor →
-- tempel SELURUH isi file ini → Run.
-- ============================================================================

-- 1) Riwayat percakapan bot WA -----------------------------------------------
create table if not exists public.wa_conversations (
    id         bigint      generated always as identity primary key,
    wa         text        not null,               -- nomor ternormalisasi (08xxx)
    jid        text,                                -- raw JID (628xxx@s.whatsapp.net / xxx@lid)
    role       text        not null,               -- 'user' | 'bot'
    message    text,
    has_media  boolean     not null default false,
    created_at timestamptz not null default now()
);
create index if not exists wa_conversations_wa_idx   on public.wa_conversations (wa, created_at);
create index if not exists wa_conversations_jid_idx  on public.wa_conversations (jid, created_at);
create index if not exists wa_conversations_time_idx on public.wa_conversations (created_at desc);
alter table public.wa_conversations enable row level security;  -- hanya service role (webhook/admin server)

-- 2) Draft "Pemandu Pasang Iklan" --------------------------------------------
create table if not exists public.wa_listing_drafts (
    wa          text        primary key,     -- nomor penjual (ternormalisasi)
    text_parts  text        not null default '',
    updated_at  timestamptz not null default now()
);
alter table public.wa_listing_drafts enable row level security;  -- hanya service role

-- Pembersihan berkala (opsional, jalankan manual kapan perlu):
--   delete from public.wa_conversations   where created_at < now() - interval '90 days';
--   delete from public.wa_listing_drafts  where updated_at < now() - interval '1 day';
