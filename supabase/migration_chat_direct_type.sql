-- ============================================================
-- Migration: Tambah tipe 'direct' pada check constraint chat_rooms
-- Diperlukan untuk fitur Saling Setuju Lanjut DM Pribadi (Mutual Consent DM)
-- Jalankan di Supabase SQL Editor
-- ============================================================

ALTER TABLE public.chat_rooms DROP CONSTRAINT IF EXISTS chat_rooms_type_check;

ALTER TABLE public.chat_rooms
  ADD CONSTRAINT chat_rooms_type_check
  CHECK (type IN ('random', 'marketplace', 'direct'));
