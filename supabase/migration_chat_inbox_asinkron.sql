-- Chat anonim jadi kotak masuk asinkron — 23 Agustus 2026.
-- Idempotent: aman dijalankan berulang.
--
-- Masalah yang ditutup: dua orang yang cari teman anonim di waktu yang TIDAK
-- tumpang tindih (A menunggu lalu pergi, B baru datang setelahnya) tidak akan
-- pernah dipertemukan, seberapa pun toleran timeout heartbeat-nya — itu
-- keterbatasan desain "harus online bersamaan", bukan bug yang bisa ditambal
-- dengan menaikkan angka. Solusinya: room tunggu tidak lagi kedaluwarsa cepat
-- (lihat /api/chat/match), dan begitu ada yang cocok belakangan, orang yang
-- sudah pergi diberi tahu lewat push notification supaya bisa kembali.
--
-- Push butuh nomor WA asli, tapi chat_rooms.user1_id/user2_id sengaja berupa
-- hash satu-arah (lihat lib/identitasHash.js) — supaya lawan bicara tidak
-- pernah tahu nomor asli siapa pun. Tabel ini memetakan hash -> WA HANYA untuk
-- dipakai server saat mengirim push, dan TIDAK PERNAH dikutsertakan dalam
-- respons API mana pun ke klien.

create table if not exists public.chat_identity_wa (
  user_hash text primary key,
  wa text not null,
  updated_at timestamptz not null default now()
);

-- RLS tanpa kebijakan publik: hanya service_role (API situs) yang boleh baca/tulis.
alter table public.chat_identity_wa enable row level security;

-- Kotak masuk mengurutkan berdasarkan aktivitas terbaru (chat_rooms.updated_at,
-- yang sekarang dipakai sebagai "kapan terakhir ada kejadian" alih-alih detak
-- jantung heartbeat lama).
create index if not exists idx_chat_rooms_activity on public.chat_rooms(updated_at desc);
