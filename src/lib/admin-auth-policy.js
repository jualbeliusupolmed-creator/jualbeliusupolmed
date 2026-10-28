export function isGoogleAuthIdentity(user) {
  return Boolean(
    user?.app_metadata?.provider === "google"
      || user?.app_metadata?.providers?.includes("google")
      || user?.identities?.some((identity) => identity.provider === "google")
  );
}

export function resolveAdminLoginRole(userId, superadminId, hasActiveMembership) {
  const normalizedUserId = String(userId || "").toLowerCase();
  const normalizedSuperadminId = String(superadminId || "").toLowerCase();
  if (normalizedSuperadminId && normalizedUserId === normalizedSuperadminId) return "superadmin";
  return hasActiveMembership ? "owner" : null;
}
