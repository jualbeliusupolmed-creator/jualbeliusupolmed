import { createClient } from "@supabase/supabase-js";

// Service-role client — HANYA dipakai di server (API routes / server actions).
// Jangan pernah import ini di komponen client.
export function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase service-role env belum di-set");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
