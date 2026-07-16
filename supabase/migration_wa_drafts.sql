-- Tabel draft "Pemandu Pasang Iklan" untuk bot WA.
-- Menyimpan teks yang penjual ketik (nama/harga/keterangan) SAMPAI foto datang,
-- supaya user bisa kirim info sepotong-sepotong (bukan harus 1 pesan lengkap).
-- Saat foto tiba, teks digabung & iklan dibuat lewat alur normal, lalu baris ini dihapus.
--
-- Jalankan di Supabase SQL Editor (project marketplace).

create table if not exists public.wa_listing_drafts (
    wa          text        primary key,     -- nomor penjual (ternormalisasi) / placeholder @lid
    text_parts  text        not null default '',
    updated_at  timestamptz not null default now()
);

-- Draft dianggap kedaluwarsa setelah 1 jam (difilter di query bot). Baris lama boleh
-- dibersihkan berkala:  delete from public.wa_listing_drafts where updated_at < now() - interval '1 day';

-- Hanya bisa diakses lewat service role key (yang dipakai webhook bot).
alter table public.wa_listing_drafts enable row level security;
