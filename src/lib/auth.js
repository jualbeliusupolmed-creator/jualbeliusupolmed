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

// Kunci penanda tangan kuki, terpisah dari sandi admin.
//
// Sampai 21 Agustus 2026 kuki penjual ditandatangani dengan ADMIN_PASSWORD.
// Akibatnya tidak kelihatan sampai sandinya benar-benar diganti: mengganti
// sandi admin membatalkan tanda tangan SELURUH kuki penjual sekaligus, dan
// 30 hari sesi yang seharusnya tidak ada hubungannya dengan panel admin ikut
// hangus. Dua rahasia yang berbeda tugasnya tidak boleh berbagi satu nilai.
//
// `SESSION_SECRET` yang memutusnya. Kalau belum diset, ia jatuh kembali ke
// ADMIN_PASSWORD supaya tidak ada yang mendadak keluar sendiri saat rilis ini
// mendarat — jadi mengisinya di Vercel adalah langkah terpisah yang boleh
// diambil kapan saja. Sekali diisi, ganti sandi admin tidak lagi menyentuh
// sesi penjual.
function kunciTandaTangan() {
  return process.env.SESSION_SECRET || secret();
}

// Perbandingan tahan-waktu. `===` pada string keluar di karakter pertama yang
// berbeda, jadi lamanya menjawab membocorkan berapa banyak awalan yang sudah
// benar. Pola ini meniru yang sudah dipakai bot di index.js.
function samaAman(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// Kuki admin: payload bertanda tangan + kedaluwarsa, bukan nilai tetap.
//
// Sebelumnya isinya sha256(ADMIN_PASSWORD) — satu nilai yang sama untuk
// selamanya. Artinya kuki yang pernah bocor tidak pernah basi, dan kuki itu
// bisa dihitung sendiri oleh siapa pun yang tahu sandinya tanpa perlu melewati
// halaman login (dan karenanya tanpa kena rate limit). Sekarang tiap sesi
// membawa nonce acak dan batas waktunya sendiri.
//
// Yang TIDAK diperbaiki oleh ini: siapa pun yang tahu ADMIN_PASSWORD tetap bisa
// masuk. Kalau sandinya pernah bocor, satu-satunya obat adalah menggantinya.
function buatTokenAdmin() {
  const payload = {
    n: crypto.randomBytes(16).toString("base64url"),
    exp: Date.now() + 1000 * 60 * 60 * 8, // 8 jam
  };
  const p = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret()).update(p).digest("base64url");
  return `${p}.${sig}`;
}

function tokenAdminSah(nilai) {
  if (!nilai || typeof nilai !== "string") return false;
  const bagian = nilai.split(".");
  if (bagian.length !== 2) return false;
  const [p, sig] = bagian;
  const diharapkan = crypto.createHmac("sha256", secret()).update(p).digest("base64url");
  if (!samaAman(sig, diharapkan)) return false;
  try {
    const payload = JSON.parse(Buffer.from(p, "base64url").toString("utf-8"));
    return typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export function checkPassword(pw) {
  return typeof pw === "string" && samaAman(pw, secret());
}

export function setAdminCookie() {
  cookies().set(COOKIE, buatTokenAdmin(), {
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
  return tokenAdminSah(cookies().get(COOKIE)?.value);
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
  const expectedSig = crypto.createHmac("sha256", kunciTandaTangan()).update(payloadB64).digest("base64url");
  if (!samaAman(signature, expectedSig)) return null;
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

export function getUserSession() {
  return getSellerSession();
}

