import {
  aes256GcmDecrypt,
  aes256GcmEncrypt,
  bytesToHex,
  encodeUtf8,
  hmacSha256,
  hexToBytes,
  randomHex,
  sha256,
} from "@/lib/cryptoCompat";

async function key() {
  const secret = String(process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "");
  if (secret.length < 32) throw new Error("ADMIN_SESSION_SECRET is not configured.");
  return sha256(`jb-admin-user-token:${secret}`);
}

export async function hashAdminUserAuditTarget(wa) {
  return bytesToHex(await hmacSha256(await key(), `admin-user-audit:${String(wa)}`));
}

export async function sealAdminUserToken(wa) {
  const iv = randomHex(24);
  const { ciphertext, authTag } = await aes256GcmEncrypt(
    await key(),
    encodeUtf8(iv),
    encodeUtf8(JSON.stringify({ wa: String(wa), exp: Date.now() + 60 * 60 * 1000 }))
  );
  return `${iv}-${bytesToHex(authTag)}-${bytesToHex(ciphertext)}`;
}

export async function openAdminUserToken(token) {
  if (typeof token !== "string" || token.length > 512) throw new Error("Invalid user token.");
  const [ivHex, authTagHex, encryptedHex, ...rest] = token.split("-");
  if (
    !/^[\da-f]{24}$/i.test(ivHex || "")
    || !/^[\da-f]{32}$/i.test(authTagHex || "")
    || !/^(?:[\da-f]{2})+$/i.test(encryptedHex || "")
    || rest.length
  ) {
    throw new Error("Invalid user token.");
  }

  const clear = await aes256GcmDecrypt(
    await key(),
    encodeUtf8(ivHex),
    hexToBytes(encryptedHex),
    hexToBytes(authTagHex)
  );
  const payload = JSON.parse(new TextDecoder().decode(clear));
  if (!/^[0-9]{8,16}$/.test(payload.wa) || !Number.isFinite(payload.exp) || payload.exp <= Date.now()) {
    throw new Error("Expired user token.");
  }
  return payload.wa;
}
