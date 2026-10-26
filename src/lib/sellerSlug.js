import crypto from "crypto";
import { formatWa } from "@/lib/constants";

/**
 * Buat slug penjual yang aman dan buram (opaque).
 * Menghindari pemaparan nomor telepon di URL publik, sitemap, atau meta tag.
 * Format: p_<10 karakter hex> berdasarkan HMAC-SHA256 nomor WA.
 * Hash ini satu arah, stabil untuk nomor yang sama, dan TIDAK bisa dibalik oleh pihak ketiga.
 */
export function encodeSellerSlug(phone) {
  if (!phone) return "";
  const normalized = formatWa(phone) || String(phone).replace(/\D/g, "");
  if (!normalized) return "";
  const secret = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "jb_usu_seller_salt_2026";
  const hash = crypto.createHmac("sha256", secret).update(normalized).digest("hex").slice(0, 10);
  return `p_${hash}`;
}

/**
 * Mengurai parameter URL /penjual/[slugOrWa]
 * Mengembalikan:
 * - { type: "slug", value: string } jika berupa username atau opaque slug (mis. p_xxxx atau toko-budi)
 * - { type: "legacy_phone", value: string } jika berupa nomor telepon legacy atau u-base64 (untuk 301 redirect)
 */
export function parseSellerParam(rawParam) {
  if (!rawParam) return { type: "empty", value: "" };
  const raw = decodeURIComponent(String(rawParam)).trim();

  // 1. Cek legacy u-<base64>
  if (raw.startsWith("u-")) {
    try {
      const b64 = raw.slice(2).replace(/-/g, "+").replace(/_/g, "/");
      const decoded = Buffer.from(b64, "base64").toString("utf-8");
      if (decoded && /^\d+$/.test(decoded)) {
        return { type: "legacy_phone", value: formatWa(decoded) || decoded };
      }
    } catch {}
  }

  // 2. Cek apakah berupa nomor telepon langsung (mis. 08..., 62..., +62...)
  const cleanDigits = raw.replace(/\D/g, "");
  if (
    /^(08|62|\+62)\d{8,13}$/.test(raw) ||
    (cleanDigits.length >= 10 && cleanDigits.length <= 14 && /^(08|62)/.test(cleanDigits))
  ) {
    return { type: "legacy_phone", value: formatWa(cleanDigits) || cleanDigits };
  }

  // 3. Opaque slug (p_xxx) atau custom username
  return { type: "slug", value: raw };
}

/**
 * Legacy support function
 */
export function decodeSellerSlug(slug) {
  const parsed = parseSellerParam(slug);
  return parsed.value;
}

/**
 * Samarkan nomor HP untuk tampilan aman (misal: 0822 **** 6485)
 */
export function maskPhone(phone) {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length < 8) return "****";
  const start = digits.slice(0, 4);
  const end = digits.slice(-4);
  return `${start} **** ${end}`;
}
