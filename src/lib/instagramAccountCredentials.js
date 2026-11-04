import crypto from "crypto";
import { resolveInstagramToken } from "@/lib/instagramDm";

const SETTINGS_KEY_PREFIX = "meta_ig_account_token:";
const DEFAULT_INSTAGRAM_API_BASE = "https://graph.facebook.com";
const INSTAGRAM_API_BASES = new Set([
  DEFAULT_INSTAGRAM_API_BASE,
  "https://graph.instagram.com",
]);

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

function encryptToken(accountId, externalAccountId, token, apiBase) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(associatedData(accountId, externalAccountId));
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return {
    version: 1,
    external_account_id: String(externalAccountId),
    api_base: apiBase,
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
    const token = Buffer.concat([
      decipher.update(Buffer.from(payload.ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
    const apiBase = INSTAGRAM_API_BASES.has(payload.api_base)
      ? payload.api_base
      : DEFAULT_INSTAGRAM_API_BASE;
    return { token, apiBase, expiresAt: payload.expires_at || null };
  } catch {
    return null;
  }
}

async function refreshInstagramCredentials(supa, account, credentials) {
  if (credentials.apiBase !== "https://graph.instagram.com" || !credentials.expiresAt) {
    return credentials;
  }
  const expiresAt = Date.parse(credentials.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;
  if (expiresAt - Date.now() > 7 * 24 * 60 * 60 * 1000) return credentials;

  const refreshUrl = new URL("https://graph.instagram.com/refresh_access_token");
  refreshUrl.searchParams.set("grant_type", "ig_refresh_token");
  refreshUrl.searchParams.set("access_token", credentials.token);
  let response;
  try {
    response = await fetch(refreshUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
  } catch (error) {
    console.warn("[instagram-credentials] Token refresh request failed.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return credentials;
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    console.warn("[instagram-credentials] Token refresh was rejected.", { status: response.status });
    return credentials;
  }

  const refreshed = {
    token: data.access_token,
    apiBase: credentials.apiBase,
    expiresAt: new Date(Date.now() + (Number(data.expires_in) || 60 * 24 * 60 * 60) * 1000).toISOString(),
  };
  await saveInstagramAccountToken(
    supa,
    account.id,
    account.external_account_id,
    refreshed.token,
    { apiBase: refreshed.apiBase, expiresAt: refreshed.expiresAt }
  );
  return refreshed;
}

export async function getInstagramAccountCredentials(supa, account) {
  if (!account?.id || account.provider !== "instagram") return null;

  const { data, error } = await supa.from("system_settings")
    .select("value")
    .eq("key", settingKey(account.id))
    .maybeSingle();
  if (!error && data?.value) {
    const credentials = decryptToken(account.id, account.external_account_id, data.value);
    if (credentials) return refreshInstagramCredentials(supa, account, credentials);
  }

  const legacyId = String(process.env.META_KATALOG_IG_USER_ID || "").trim();
  if (legacyId && String(account.external_account_id || "") === legacyId) {
    const token = await resolveInstagramToken(legacyId);
    return token ? { token, apiBase: DEFAULT_INSTAGRAM_API_BASE } : null;
  }
  return null;
}

export async function getInstagramAccountToken(supa, account) {
  const credentials = await getInstagramAccountCredentials(supa, account);
  return credentials?.token || null;
}

export async function getInstagramAccountCredentialsByExternalId(supa, externalAccountId) {
  const cleanExternalAccountId = String(externalAccountId || "").trim();
  if (!/^\d{5,40}$/.test(cleanExternalAccountId)) return null;
  const { data, error } = await supa.from("organization_social_accounts")
    .select("id,provider,external_account_id")
    .eq("provider", "instagram")
    .eq("external_account_id", cleanExternalAccountId)
    .maybeSingle();
  if (error || !data) return null;
  return getInstagramAccountCredentials(supa, data);
}

export async function hasInstagramAccountToken(supa, accountId, externalAccountId) {
  if (!accountId) return false;
  const { data, error } = await supa.from("system_settings")
    .select("value")
    .eq("key", settingKey(accountId))
    .maybeSingle();
  if (error || !data?.value) return false;
  const credentials = decryptToken(accountId, externalAccountId, data.value);
  return Boolean(credentials && (
    !credentials.expiresAt || Date.parse(credentials.expiresAt) > Date.now()
  ));
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
    if (!externalAccountId) continue;
    const credentials = decryptToken(accountId, externalAccountId, row.value);
    if (credentials && (
      !credentials.expiresAt || Date.parse(credentials.expiresAt) > Date.now()
    )) accountIds.add(accountId);
  }
  return accountIds;
}

export async function saveInstagramAccountToken(supa, accountId, externalAccountId, token, { apiBase, expiresAt } = {}) {
  const cleanToken = String(token || "").trim();
  if (!accountId || !/^\d{5,40}$/.test(String(externalAccountId || "")) || !cleanToken || cleanToken.length > 10_000) {
    throw new Error("Token atau ID akun Instagram tidak valid.");
  }
  const cleanApiBase = apiBase || DEFAULT_INSTAGRAM_API_BASE;
  if (!INSTAGRAM_API_BASES.has(cleanApiBase)) {
    throw new Error("Host API Instagram tidak valid.");
  }
  const { error } = await supa.from("system_settings").upsert({
    key: settingKey(accountId),
    value: {
      ...encryptToken(accountId, externalAccountId, cleanToken, cleanApiBase),
      expires_at: expiresAt || null,
    },
    updated_at: new Date().toISOString(),
  }, { onConflict: "key" });
  if (error) throw new Error("Token Instagram gagal disimpan dengan aman.");
}

export async function deleteInstagramAccountToken(supa, accountId) {
  if (!accountId) return;
  const { error } = await supa.from("system_settings").delete().eq("key", settingKey(accountId));
  if (error) throw new Error("Token Instagram gagal dihapus dari sistem.");
}
