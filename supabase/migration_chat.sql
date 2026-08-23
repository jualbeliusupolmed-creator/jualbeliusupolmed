-- Migration: Realtime Chat & Random Matchmaking (Idempotent / Aman Dijalankan Berulang)
-- Tabel untuk menampung percakapan anonim (Cari Teman) dan pesan transaksi

CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'random' CHECK (type IN ('random', 'marketplace')),
  user1_id TEXT NOT NULL,
  user1_alias TEXT NOT NULL DEFAULT 'Anonim',
  user1_faculty TEXT NOT NULL DEFAULT 'Umum',
  user2_id TEXT,
  user2_alias TEXT DEFAULT 'Anonim',
  user2_faculty TEXT DEFAULT 'Umum',
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'closed')),
  listing_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_chat_rooms_status ON public.chat_rooms(status, type);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_users ON public.chat_rooms(user1_id, user2_id);

-- Tabel Pesan Obrolan
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_alias TEXT NOT NULL DEFAULT 'Anonim',
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON public.chat_messages(room_id, created_at ASC);

-- RLS: TIDAK ada kebijakan untuk anon/authenticated — dan itu disengaja.
--
-- Versi awal migrasi ini (23 Agu 2026 pagi) membuka SELECT/INSERT/UPDATE `true`
-- untuk role public. Karena anon key Supabase ada di bundle situs, itu berarti
-- siapa pun bisa membaca SELURUH isi "chat anonim", menyisipkan pesan palsu ke
-- room mana pun, dan menutup room orang lain — langsung lewat REST Supabase,
-- tanpa menyentuh API situs. Padahal kebijakan itu tidak dipakai siapa-siapa:
-- semua route /api/chat/* memakai admin client (service_role melewati RLS).
--
-- Jadi: RLS menyala, tanpa satu pun kebijakan publik. Anon ditolak seluruhnya;
-- satu-satunya pintu adalah API situs, yang memeriksa keanggotaan room.
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active chat rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Public insert chat rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Public update chat rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Public read chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Public insert chat messages" ON public.chat_messages;

-- Enable Realtime (Aman jika tabel sudah terdaftar)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
  EXCEPTION WHEN duplicate_object THEN
    -- abaikan jika sudah ada
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  EXCEPTION WHEN duplicate_object THEN
    -- abaikan jika sudah ada
  END;
END $$;
