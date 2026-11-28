import {
  base64UrlToBytes,
  bytesToBase64Url,
  decodeUtf8,
  encodeUtf8,
  hmacSha256,
  verifyHmacSha256,
} from "@/lib/cryptoCompat";
import { customAlphabet } from "nanoid";

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

export async function createSellerGoogleLinkToken(wa) {
  const payload = bytesToBase64Url(encodeUtf8(JSON.stringify({
      wa,
      exp: Date.now() + SELLER_GOOGLE_LINK_TTL * 1000,
      nonce: customAlphabet("0123456789abcdef", 16)(),
    })));
  const signature = bytesToBase64Url(await hmacSha256(signingKey(), payload));
  return `${payload}.${signature}`;
}

export async function verifySellerGoogleLinkToken(token, activeWa) {
  if (typeof token !== "string" || !token || !activeWa) return false;
  const [payload, signature, ...rest] = token.split(".");
  if (!payload || !signature || rest.length) return false;

  let payloadBytes;
  let signatureBytes;
  try {
    payloadBytes = base64UrlToBytes(payload);
    signatureBytes = base64UrlToBytes(signature);
  } catch {
    return false;
  }
  if (signatureBytes.length !== 32) return false;
  if (!await verifyHmacSha256(signingKey(), payload, signatureBytes)) return false;

  try {
    const data = JSON.parse(decodeUtf8(payloadBytes));
    return data.wa === activeWa && typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}
