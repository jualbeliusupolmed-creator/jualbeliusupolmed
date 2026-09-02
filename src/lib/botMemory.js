const DEFAULT_MAX_ENTRIES = 10;
const DEFAULT_MAX_TEXT = 600;
const DEFAULT_RETENTION_DAYS = 30;

function roleOf(value) {
  const role = String(value || "").toLowerCase();
  if (role === "user") return "user";
  if (role === "admin") return "admin";
  return "bot";
}

export function sanitizeMemoryText(value, maxText = DEFAULT_MAX_TEXT) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";

  // Jangan kirim rahasia autentikasi lama ke provider AI. Harga tetap dibiarkan
  // karena angka harga adalah konteks penting untuk alur marketplace.
  if (/\b(otp|one[ -]?time password|pin|password|sandi|kode verifikasi)\b/i.test(text)) {
    return "[pesan sensitif disensor]";
  }

  return text
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email disensor]")
    .replace(/https?:\/\/\S+/gi, "[tautan disensor]")
    .replace(/(?<!\d)(?:\+?62|0)8\d{7,12}(?!\d)/g, "[nomor disensor]")
    .slice(0, Math.max(1, maxText));
}

export function normalizeConversationHistory(rows, options = {}) {
  const maxEntries = Number(options.maxEntries) || DEFAULT_MAX_ENTRIES;
  const maxText = Number(options.maxText) || DEFAULT_MAX_TEXT;

  return (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      role: roleOf(row?.role),
      text: sanitizeMemoryText(row?.text ?? row?.message, maxText),
    }))
    .filter((row) => row.text)
    .slice(-maxEntries);
}

function sameEntry(a, b) {
  return a?.role === b?.role && a?.text === b?.text;
}

export function mergeConversationHistory(persistentRows, liveRows, options = {}) {
  const maxEntries = Number(options.maxEntries) || DEFAULT_MAX_ENTRIES;
  const persistent = normalizeConversationHistory(persistentRows, { ...options, maxEntries });
  const live = normalizeConversationHistory(liveRows, { ...options, maxEntries });

  // Bot mengirim konteks hidup yang biasanya merupakan ekor dari riwayat DB.
  // Cari overlap terbesar supaya satu pesan tidak muncul dua kali di prompt AI.
  let overlap = 0;
  const possible = Math.min(persistent.length, live.length);
  for (let size = possible; size > 0; size--) {
    let matches = true;
    for (let i = 0; i < size; i++) {
      if (!sameEntry(persistent[persistent.length - size + i], live[i])) {
        matches = false;
        break;
      }
    }
    if (matches) {
      overlap = size;
      break;
    }
  }

  return persistent.concat(live.slice(overlap)).slice(-maxEntries);
}

export async function loadConversationMemory(supa, wa, options = {}) {
  if (!supa || !wa) return [];
  const maxEntries = Number(options.maxEntries) || DEFAULT_MAX_ENTRIES;
  const retentionDays = Number(options.retentionDays) || DEFAULT_RETENTION_DAYS;
  const now = Number(options.now) || Date.now();
  const cutoff = new Date(now - retentionDays * 24 * 60 * 60 * 1000).toISOString();

  let query = supa
    .from("wa_conversations")
    .select("role,message,created_at")
    .eq("wa", wa)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(maxEntries);

  if (options.before) query = query.lt("created_at", options.before);
  const { data, error } = await query;
  if (error) throw error;

  return normalizeConversationHistory([...(data || [])].reverse(), {
    maxEntries,
    maxText: options.maxText,
  });
}

