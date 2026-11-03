import crypto from "crypto";
import { resolveInstagramToken } from "@/lib/instagramDm";

const SETTINGS_KEY_PREFIX = "meta_ig_account_token:";

function encryptionKey() {
  const encoded = String(process.env.META_ACCOUNT_TOKEN_ENCRYPTION_KEY || "").trim();
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("Kunci enkripsi token Instagram belum dikonfigurasi di server.");
  return key;
}

export function assertInstagramTokenEncryptionReady() {
  encryptionKey();
}

function settingKey(accountId) {
  return `${SETTINGS_KEY_PREFIX}${accountId}`;
}

function associatedData(accountId, externalAccountId) {
  return Buffer.from(JSON.stringify([String(accountId), String(externalAccountId)]));
}

function encryptToken(accountId, externalAccountId, token) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(associatedData(accountId, externalAccountId));
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return {
    version: 1,
    external_account_id: String(externalAccountId),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: encrypted.toString("base64"),
  };
}

function decryptToken(accountId, externalAccountId, value) {
  try {
    const payload = typeof value === "string" ? JSON.parse(value) : value;
    if (payload?.version !== 1 ||
        payload.external_account_id !== String(externalAccountId) ||
        !payload.iv || !payload.tag || !payload.ciphertext) return null;
    const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(payload.iv, "base64"));
    decipher.setAAD(associatedData(accountId, externalAccountId));
    decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(payload.ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

export async function getInstagramAccountToken(supa, account) {
  if (!account?.id || account.provider !== "instagram") return null;

  const { data, error } = await supa.from("system_settings")
    .select("value")
    .eq("key", settingKey(account.id))
    .maybeSingle();
  if (!error && data?.value) {
    const token = decryptToken(account.id, account.external_account_id, data.value);
    if (token) return token;
  }

  const legacyId = String(process.env.META_KATALOG_IG_USER_ID || "").trim();
  if (legacyId && String(account.external_account_id || "") === legacyId) {
    return resolveInstagramToken(legacyId);
  }
  return null;
}

export async function hasInstagramAccountToken(supa, accountId, externalAccountId) {
  if (!accountId) return false;
  const { data, error } = await supa.from("system_settings")
    .select("value")
    .eq("key", settingKey(accountId))
    .maybeSingle();
  return !error && Boolean(data?.value && decryptToken(accountId, externalAccountId, data.value));
}

export async function listInstagramAccountTokenIds(supa) {
  const { data, error } = await supa.from("system_settings")
    .select("key,value")
    .gte("key", SETTINGS_KEY_PREFIX)
    .lt("key", `${SETTINGS_KEY_PREFIX}\uffff`);
  if (error) throw new Error("Status kredensial Instagram gagal dimuat.");
  const accountIds = new Set();
  for (const row of data || []) {
    if (!String(row.key || "").startsWith(SETTINGS_KEY_PREFIX)) continue;
    const accountId = row.key.slice(SETTINGS_KEY_PREFIX.length);
    let externalAccountId = "";
    try {
      externalAccountId = (typeof row.value === "string" ? JSON.parse(row.value) : row.value)?.external_account_id || "";
    } catch {}
    if (externalAccountId && decryptToken(accountId, externalAccountId, row.value)) accountIds.add(accountId);
  }
  return accountIds;
}

export async function saveInstagramAccountToken(supa, accountId, externalAccountId, token) {
  const cleanToken = String(token || "").trim();
  if (!accountId || !/^\d{5,40}$/.test(String(externalAccountId || "")) || !cleanToken || cleanToken.length > 10_000) {
    throw new Error("Token atau ID akun Instagram tidak valid.");
  }
  const { error } = await supa.from("system_settings").upsert({
    key: settingKey(accountId),
    value: encryptToken(accountId, externalAccountId, cleanToken),
    updated_at: new Date().toISOString(),
  }, { onConflict: "key" });
  if (error) throw new Error("Token Instagram gagal disimpan dengan aman.");
}

export async function deleteInstagramAccountToken(supa, accountId) {
  if (!accountId) return;
  const { error } = await supa.from("system_settings").delete().eq("key", settingKey(accountId));
  if (error) throw new Error("Token Instagram gagal dihapus dari sistem.");
}
