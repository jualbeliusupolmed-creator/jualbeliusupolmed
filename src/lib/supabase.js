import { createClient } from "@supabase/supabase-js";

// Browser/anon client — dipakai untuk read publik & upload via anon (RLS aktif).
// Lazy singleton supaya build tidak gagal saat env belum ada (prerender).
let _client = null;

export function getSupabase() {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Supabase belum dikonfigurasi. Set NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  _client = createClient(url, anonKey, { auth: { persistSession: false } });
  return _client;
}
