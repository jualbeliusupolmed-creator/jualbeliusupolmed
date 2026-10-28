import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";

function key() {
  const secret = String(process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "");
  if (secret.length < 32) throw new Error("ADMIN_SESSION_SECRET is not configured.");
  return createHash("sha256").update("jb-admin-user-token:" + secret).digest();
}

export function hashAdminUserAuditTarget(wa) {
  return createHmac("sha256", key()).update("admin-user-audit:" + String(wa)).digest("hex");
}

export function sealAdminUserToken(wa) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const value = Buffer.from(JSON.stringify({ wa: String(wa), exp: Date.now() + 60 * 60 * 1000 }));
  const encrypted = Buffer.concat([cipher.update(value), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

export function openAdminUserToken(token) {
  if (typeof token !== "string" || token.length > 512) throw new Error("Invalid user token.");
  const packed = Buffer.from(token, "base64url");
  if (packed.length < 29) throw new Error("Invalid user token.");
  const decipher = createDecipheriv("aes-256-gcm", key(), packed.subarray(0, 12));
  decipher.setAuthTag(packed.subarray(12, 28));
  const clear = Buffer.concat([decipher.update(packed.subarray(28)), decipher.final()]);
  const payload = JSON.parse(clear.toString("utf8"));
  if (!/^[0-9]{8,16}$/.test(payload.wa) || Number(payload.exp) < Date.now()) throw new Error("Expired user token.");
  return payload.wa;
}
