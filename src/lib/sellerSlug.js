import { formatWa } from "@/lib/constants";

/**
 * Obfuscate seller phone number to prevent phone scraping in URLs.
 * Encodes phone to a safe, URL-friendly format: u-<base64url>
 */
export function encodeSellerSlug(phone) {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  if (!digits) return "";
  const b64 = Buffer.from(digits).toString("base64url");
  return `u-${b64}`;
}

/**
 * Decodes an obfuscated seller slug or handles legacy raw phone numbers.
 */
export function decodeSellerSlug(slug) {
  if (!slug) return "";
  const raw = decodeURIComponent(String(slug)).trim();
  if (raw.startsWith("u-")) {
    try {
      const b64 = raw.slice(2).replace(/-/g, "+").replace(/_/g, "/");
      const decoded = Buffer.from(b64, "base64").toString("utf-8");
      if (decoded && /^\d+$/.test(decoded)) {
        return formatWa(decoded) || decoded;
      }
    } catch {}
  }
  return formatWa(raw) || raw;
}

/**
 * Masks phone number for display (e.g., 0822 **** 6485)
 */
export function maskPhone(phone) {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length < 8) return "****";
  const start = digits.slice(0, 4);
  const end = digits.slice(-4);
  return `${start} **** ${end}`;
}
