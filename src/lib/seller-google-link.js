import crypto from "node:crypto";

export const SELLER_GOOGLE_LINK_COOKIE = "seller_google_link";
export const SELLER_GOOGLE_OTP_PROOF_COOKIE = "seller_google_otp_proof";
export const SELLER_GOOGLE_LINK_TTL = 10 * 60;

export function isSellerGoogleLinkFlow(searchParams, linkToken) {
  return searchParams?.get("link_google") === "1" || Boolean(linkToken);
}

function signingKey() {
  const key = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (key) return key;
  if (process.env.NODE_ENV !== "production") {
    return "dev_only_insecure_password_minimal_16_karakter";
  }
  throw new Error("SESSION_SECRET belum dikonfigurasi untuk menautkan akun Google.");
}

export function createSellerGoogleLinkToken(wa) {
  const payload = Buffer.from(
    JSON.stringify({
      wa,
      exp: Date.now() + SELLER_GOOGLE_LINK_TTL * 1000,
      nonce: crypto.randomBytes(16).toString("base64url"),
    })
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", signingKey())
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySellerGoogleLinkToken(token, activeWa) {
  if (!token || !activeWa) return false;
  const [payload, signature, ...rest] = token.split(".");
  if (!payload || !signature || rest.length) return false;

  const expected = crypto.createHmac("sha256", signingKey()).update(payload).digest();
  let actual;
  try {
    actual = Buffer.from(signature, "base64url");
  } catch {
    return false;
  }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return false;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data.wa === activeWa && typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}
