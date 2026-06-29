import { createClient } from "@supabase/supabase-js";

// Service-role client — HANYA dipakai di server (API routes / server actions).
// Jangan pernah import ini di komponen client.
let _adminClient = null;

export function getAdminClient() {
  if (_adminClient) return _adminClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase service-role env belum di-set");
  }
  _adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _adminClient;
}
