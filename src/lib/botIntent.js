const FAST_PATH_COMMANDS = [
  "menu", "saya", "iklanku", "admin", "min", "mimin", "deal", "gagal",
  "batal", "dicari", "wtb", "cari", "lapor", "tawar", "hapus", "nama",
  "edit", "setmode", "approve", "reject", "setuju", "tolak", "broadcast",
  "stats", "pause", "resume", "pantau", "daftar pantau", "foto", "jual",
  "wts", "dijual", "ready",
];

const FAST_PATH_RE = new RegExp(
  `^(?:${FAST_PATH_COMMANDS.map((word) => word.replace(/\s+/g, "\\s+")).join("|")})\\b`,
  "i",
);

export const AI_ACTION_INTENTS = new Set([
  "create_listing", "deal_confirmation", "delete_listing", "search",
  "create_wanted", "menu", "profile", "extend_listing", "upgrade_listing",
  "monitor_search",
]);

export function isFastPathCommand(text) {
  return FAST_PATH_RE.test(String(text || "").trim());
}

export function aiActionNeedsClarification(intent, confidence, threshold = 0.68) {
  return AI_ACTION_INTENTS.has(intent) && (Number(confidence) || 0) < threshold;
}

