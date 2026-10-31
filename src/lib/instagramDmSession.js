import { getAdminClient } from "@/lib/supabaseAdmin";

// In-memory session store untuk respons instan
const localMemorySessions = new Map();
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 jam

export async function getDmSession(userId) {
  const cleanId = String(userId || "").trim();
  if (!cleanId) return null;

  // 1. Cek memory dulu
  const local = localMemorySessions.get(cleanId);
  if (local && Date.now() - local.timestamp < SESSION_TTL_MS) {
    return local.session;
  }

  // 2. Fallback baca dari database jika ada
  try {
    const supa = getAdminClient();
    const { data } = await supa
      .from("system_settings")
      .select("value")
      .eq("key", `ig_session:${cleanId}`)
      .maybeSingle();

    if (data?.value) {
      localMemorySessions.set(cleanId, {
        session: data.value,
        timestamp: Date.now(),
      });
      return data.value;
    }
  } catch (err) {
    // Non-fatal jika tabel setting belum tersedia
  }

  return null;
}

export async function setDmSession(userId, session) {
  const cleanId = String(userId || "").trim();
  if (!cleanId) return;

  const sessionData = {
    ...session,
    updated_at: new Date().toISOString(),
  };

  localMemorySessions.set(cleanId, {
    session: sessionData,
    timestamp: Date.now(),
  });

  try {
    const supa = getAdminClient();
    await supa.from("system_settings").upsert({
      key: `ig_session:${cleanId}`,
      value: sessionData,
    });
  } catch (err) {
    // Non-fatal
  }
}

export async function clearDmSession(userId) {
  const cleanId = String(userId || "").trim();
  if (!cleanId) return;

  localMemorySessions.delete(cleanId);

  try {
    const supa = getAdminClient();
    await supa.from("system_settings").delete().eq("key", `ig_session:${cleanId}`);
  } catch (err) {}
}

