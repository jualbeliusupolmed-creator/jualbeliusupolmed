-- Tabel riwayat percakapan bot WA (untuk panel admin "Kontrol Chat" + audit lanjutan).
-- Setiap pesan masuk (user) & balasan bot dicatat permanen di sini, menggantikan
-- messageLog in-memory bot yang hilang tiap restart & tak menyimpan balasan bot.
--
-- Jalankan di Supabase SQL Editor (project marketplace).

create table if not exists public.wa_conversations (
    id         bigint      generated always as identity primary key,
    wa         text        not null,               -- nomor ternormalisasi (08xxx) / placeholder @lid
    jid        text,                                -- raw JID (628xxx@s.whatsapp.net atau xxx@lid)
    role       text        not null,               -- 'user' | 'bot'
    message    text,
    has_media  boolean     not null default false,
    created_at timestamptz not null default now()
);

create index if not exists wa_conversations_wa_idx  on public.wa_conversations (wa, created_at);
create index if not exists wa_conversations_jid_idx on public.wa_conversations (jid, created_at);
create index if not exists wa_conversations_time_idx on public.wa_conversations (created_at desc);

-- Bersihkan berkala agar tak tumbuh tak terbatas:
-- delete from public.wa_conversations where created_at < now() - interval '90 days';

-- Hanya bisa diakses lewat service role key (webhook bot & panel admin server-side).
alter table public.wa_conversations enable row level security;
