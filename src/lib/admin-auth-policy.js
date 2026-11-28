export function isGoogleAuthIdentity(user) {
  return Boolean(
    user?.app_metadata?.provider === "google"
      || user?.app_metadata?.providers?.includes("google")
      || user?.identities?.some((identity) => identity.provider === "google")
  );
}

// Semua superadmin nasional platform. Periksa juga SUPERADMIN_AUTH_USER_IDS (koma-separated)
// dan SUPERADMIN_AUTH_USER_ID (singular, legacy) di env Cloudflare.
export function getSuperadminIds() {
  const multi = String(process.env.SUPERADMIN_AUTH_USER_IDS || "");
  const single = String(process.env.SUPERADMIN_AUTH_USER_ID || "");
  const ids = [...multi.split(","), single]
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return new Set(ids);
}

export function resolveAdminLoginRole(userId, superadminId, hasActiveMembership) {
  const normalizedUserId = String(userId || "").toLowerCase();
  // Cek multi-superadmin list dulu
  if (getSuperadminIds().has(normalizedUserId)) return "superadmin";
  // Fallback ke param tunggal (backward-compat)
  const normalizedSuperadminId = String(superadminId || "").toLowerCase();
  if (normalizedSuperadminId && normalizedUserId === normalizedSuperadminId) return "superadmin";
  return hasActiveMembership ? "owner" : null;
}
