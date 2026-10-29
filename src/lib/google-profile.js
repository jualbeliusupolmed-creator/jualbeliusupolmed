export function isGoogleSellerProfile(identity, profile) {
  if (!identity || !profile || profile.wa !== identity) return false;
  return Boolean(
    profile.email_google ||
      profile.auth_provider === "google" ||
      profile.auth_provider === "wa_google" ||
      String(identity).startsWith("google_")
  );
}
