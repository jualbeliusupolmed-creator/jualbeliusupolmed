import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE = "kk_admin_session";
const LEGACY_COOKIE = "admin_session";

function secret() {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) {
    // ADMIN_PASSWORD is retained only as a migration fallback for existing JB user sessions.
    // Admin login itself is handled by individual Supabase Auth accounts.
    if (process.env.NODE_ENV === "production" && process.env.VERCEL === "1") {
      throw new Error(
        "ADMIN_PASSWORD environment variable is not set. " +
          "This is a critical security issue. " +
          "Please set ADMIN_PASSWORD in your environment variables."
      );
    }
    if (process.env.NODE_ENV !== "test") {
      console.warn(
        "[SECURITY WARNING] ADMIN_PASSWORD is not set. Using local development fallback secret."
      );
    }
    return "dev_only_insecure_password_minimal_16_karakter";
  }
  // Validasi panjang minimum — password pendek mudah di-brute-force.
  if (pw.length < 16) {
    if (process.env.NODE_ENV === "production" && process.env.VERCEL === "1") {
      throw new Error(
        "ADMIN_PASSWORD harus minimal 16 karakter. " +
          "Gunakan: openssl rand -base64 24"
      );
    }
    if (process.env.NODE_ENV !== "test") {
      console.warn(
        "[SECURITY WARNING] ADMIN_PASSWORD terlalu pendek (< 16 karakter). " +
          "Gunakan: openssl rand -base64 24"
      );
    }
  }
  return pw;
}

// Kunci penanda tangan kuki akun JB.
//
// Sampai 21 Agustus 2026 kuki penjual ditandatangani dengan ADMIN_PASSWORD.
// Akibatnya tidak kelihatan sampai sandinya benar-benar diganti: mengganti
// sandi admin membatalkan tanda tangan SELURUH kuki penjual sekaligus, dan
// 30 hari sesi yang seharusnya tidak ada hubungannya dengan panel admin ikut
// hangus. Dua rahasia yang berbeda tugasnya tidak boleh berbagi satu nilai.
//
// `SESSION_SECRET` memisahkan kedua fungsi itu. Verifier tetap menerima kunci
// lama (`ADMIN_PASSWORD`) agar pengisian kunci baru tidak memutus sesi aktif;
// `SESSION_SECRET_PREVIOUS` tersedia untuk rotasi kunci yang direncanakan.
function kunciTandaTangan() {
  return process.env.SESSION_SECRET || secret();
}

function kunciVerifikasiPenjual() {
  const keys = [
    process.env.SESSION_SECRET,
    process.env.SESSION_SECRET_PREVIOUS,
    process.env.ADMIN_PASSWORD,
  ];

  if (!process.env.ADMIN_PASSWORD && process.env.NODE_ENV !== "production") {
    keys.push(kunciTandaTangan());
  }
  if (!keys.some(Boolean)) {
    keys.push(kunciTandaTangan());
  }

  return [...new Set(keys.filter(Boolean))];
}

// Perbandingan tahan-waktu. `===` pada string keluar di karakter pertama yang
// berbeda, jadi lamanya menjawab membocorkan berapa banyak awalan yang sudah
// benar. Pola ini meniru yang sudah dipakai bot di index.js.
function samaAman(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// Sesi admin berumur pendek, berisi ID akun Auth, dan ditandatangani server.
// Setiap permintaan workspace memeriksa lagi status akun serta izin dari database.
function adminSessionSecret() {
  const value = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value || value.length < 32) {
    throw new Error("Set ADMIN_SESSION_SECRET (minimal 32 karakter) untuk mengaktifkan sesi admin.");
  }
  return crypto.createHmac("sha256", value).update("kampus-kita-admin-session-v1").digest();
}

function buatTokenAdmin(userId) {
  const payload = {
    n: crypto.randomBytes(16).toString("base64url"),
    sub: userId,
    exp: Date.now() + 1000 * 60 * 60, // satu jam; perubahan izin segera berlaku pada permintaan baru
  };
  const p = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", adminSessionSecret()).update(p).digest("base64url");
  return `${p}.${sig}`;
}

function bacaSesiAdmin(nilai) {
  if (!nilai || typeof nilai !== "string") return false;
  const bagian = nilai.split(".");
  if (bagian.length !== 2) return false;
  const [p, sig] = bagian;
  let diharapkan;
  try {
    diharapkan = crypto.createHmac("sha256", adminSessionSecret()).update(p).digest("base64url");
  } catch {
    return null;
  }
  if (!samaAman(sig, diharapkan)) return false;
  try {
    const payload = JSON.parse(Buffer.from(p, "base64url").toString("utf-8"));
    return typeof payload.sub === "string" && typeof payload.exp === "number" && payload.exp > Date.now()
      ? payload
      : null;
  } catch {
    return null;
  }
}

export function setAdminCookie(userId) {
  cookies().set(COOKIE, buatTokenAdmin(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60,
  });
}

export function setAdminCookieOnResponse(response, userId) {
  response.cookies.set(COOKIE, buatTokenAdmin(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60,
  });
  return response;
}

export function clearAdminCookie() {
  cookies().set(COOKIE, "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax" });
  cookies().set(LEGACY_COOKIE, "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax" });
}

export function isAdmin() {
  const session = bacaSesiAdmin(cookies().get(COOKIE)?.value);
  return !!session && !!process.env.SUPERADMIN_AUTH_USER_ID && session.sub === process.env.SUPERADMIN_AUTH_USER_ID.toLowerCase();
}

export function getAdminSession() {
  return bacaSesiAdmin(cookies().get(COOKIE)?.value);
}

// --- USER AUTH (Unified) ---

const SELLER_COOKIE = "seller_session";

function signSellerToken(wa) {
  // Simple HMAC signed token: base64url(payload) . base64url(hmac)
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 30; // 30 days
  const payloadStr = JSON.stringify({ wa, exp });
  const payloadB64 = Buffer.from(payloadStr).toString("base64url");
  const signature = crypto.createHmac("sha256", kunciTandaTangan()).update(payloadB64).digest("base64url");
  return `${payloadB64}.${signature}`;
}

function verifySellerToken(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, signature] = parts;
  const validSignature = kunciVerifikasiPenjual().some((key) => {
    const expectedSig = crypto.createHmac("sha256", key).update(payloadB64).digest("base64url");
    return samaAman(signature, expectedSig);
  });
  if (!validSignature) return null;
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
    if (
      typeof payload.wa !== "string" ||
      !payload.wa ||
      typeof payload.exp !== "number" ||
      !Number.isFinite(payload.exp) ||
      payload.exp <= Date.now()
    ) {
      return null;
    }
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

export function getUserSession() {
  return getSellerSession();
}
