import { createHash, createHmac } from "@/lib/cryptoCompat";
import { customAlphabet } from "nanoid";

function key() {
  const secret = String(process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "");
  if (secret.length < 32) throw new Error("ADMIN_SESSION_SECRET is not configured.");
  return createHash("sha256").update("jb-admin-user-token:" + secret).digest();
}

export function hashAdminUserAuditTarget(wa) {
  return createHmac("sha256", key()).update("admin-user-audit:" + String(wa)).digest("hex");
}

export function sealAdminUserToken(wa) {
  const iv = customAlphabet("0123456789abcdef", 24)(); // Ganti randomBytes dengan nanoid
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const value = Buffer.from(JSON.stringify({ wa: String(wa), exp: Date.now() + 60 * 60 * 1000 }));
  const encrypted = Buffer.concat([cipher.update(value), cipher.final()]);
  return `${iv}-${cipher.getAuthTag().toString("hex")}-${encrypted.toString("hex")}`;
}

export function openAdminUserToken(token) {
  if (typeof token !== "string" || token.length > 512) throw new Error("Invalid user token.");
  const [ivHex, authTagHex, encryptedHex, ...rest] = token.split("-");
  if (!ivHex || !authTagHex || !encryptedHex || rest.length) throw new Error("Invalid user token.");
  const iv = Buffer.from(ivHex, "utf8");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  if (iv.length !== 24 || authTag.length !== 16) throw new Error("Invalid user token."); // sesuaikan ukuran IV

  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(authTag);
  const clear = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  const payload = JSON.parse(clear.toString("utf8"));
  if (!/^[0-9]{8,16}$/.test(payload.wa) || Number(payload.exp) < Date.now()) throw new Error("Expired user token.");
  return payload.wa;
}
