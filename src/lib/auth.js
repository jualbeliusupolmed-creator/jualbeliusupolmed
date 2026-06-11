import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE = "admin_session";

function secret() {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) {
    // Fail loudly in production — a missing password is a security hole.
    // In development, fall back to a hard-coded default with a loud warning.
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "ADMIN_PASSWORD environment variable is not set. " +
          "This is a critical security issue. " +
          "Please set ADMIN_PASSWORD in your environment variables."
      );
    }
    console.warn(
      "[SECURITY WARNING] ADMIN_PASSWORD is not set. Using insecure default. " +
        "Set ADMIN_PASSWORD in your .env.local file!"
    );
    return "dev_only_insecure_password";
  }
  return pw;
}

function token() {
  return crypto.createHash("sha256").update(secret()).digest("hex");
}

export function checkPassword(pw) {
  return typeof pw === "string" && pw === secret();
}

export function setAdminCookie() {
  cookies().set(COOKIE, token(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 jam
  });
}

export function clearAdminCookie() {
  cookies().set(COOKIE, "", { path: "/", maxAge: 0 });
}

export function isAdmin() {
  const c = cookies().get(COOKIE)?.value;
  return c && c === token();
}

// --- SELLER AUTH ---

const SELLER_COOKIE = "seller_session";

function signSellerToken(wa) {
  // Simple HMAC signed token: base64url(payload) . base64url(hmac)
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 30; // 30 days
  const payloadStr = JSON.stringify({ wa, exp });
  const payloadB64 = Buffer.from(payloadStr).toString("base64url");
  const signature = crypto.createHmac("sha256", secret()).update(payloadB64).digest("base64url");
  return `${payloadB64}.${signature}`;
}

function verifySellerToken(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, signature] = parts;
  const expectedSig = crypto.createHmac("sha256", secret()).update(payloadB64).digest("base64url");
  if (signature !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
    if (payload.exp < Date.now()) return null; // expired
    return payload.wa;
  } catch {
    return null;
  }
}

export function setSellerCookie(wa) {
  cookies().set(SELLER_COOKIE, signSellerToken(wa), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export function clearSellerCookie() {
  cookies().set(SELLER_COOKIE, "", { path: "/", maxAge: 0 });
}

export function getSellerSession() {
  const c = cookies().get(SELLER_COOKIE)?.value;
  return verifySellerToken(c);
}

