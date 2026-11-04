import crypto from "crypto";
import { getAdminClient } from "@/lib/supabaseAdmin";

const DEFAULT_META_API_VERSION = "v26.0";

let cachedCredentials = null;
let lastCacheTime = 0;

export async function fetchMetaCredentials() {
  if (cachedCredentials && Date.now() - lastCacheTime < 60_000) {
    return cachedCredentials;
  }
  try {
    const supa = getAdminClient();
    const { data } = await supa
      .from("system_settings")
      .select("value")
      .eq("key", "meta_instagram_credentials")
      .maybeSingle();

    if (data?.value) {
      cachedCredentials = data.value;
      lastCacheTime = Date.now();
      return cachedCredentials;
    }
  } catch {
    // fallback jika gagal baca database
  }
  return null;
}

export async function resolveInstagramToken(accountId = "katalog") {
  const creds = await fetchMetaCredentials();
  const cleanAccount = String(accountId || "").trim().toLowerCase();
  const menfessId = getInstagramUserId("menfess");
  const isMenfess =
    cleanAccount === "menfess" ||
    cleanAccount === "usu.menfes" ||
    (menfessId && cleanAccount === menfessId);

  if (isMenfess && creds?.menfess_access_token) {
    return creds.menfess_access_token;
  }
  if (!isMenfess && creds?.katalog_access_token) {
    return creds.katalog_access_token;
  }
  return getInstagramToken(isMenfess ? "menfess" : "katalog");
}

export async function resolveInstagramUserId(accountId = "katalog") {
  const creds = await fetchMetaCredentials();
  const cleanAccount = String(accountId || "").trim().toLowerCase();
  const menfessId = getInstagramUserId("menfess");
  const isMenfess =
    cleanAccount === "menfess" ||
    cleanAccount === "usu.menfes" ||
    (menfessId && cleanAccount === menfessId);

  if (isMenfess && creds?.menfess_user_id) {
    return creds.menfess_user_id;
  }
  if (!isMenfess && creds?.katalog_user_id) {
    return creds.katalog_user_id;
  }
  return getInstagramUserId(isMenfess ? "menfess" : "katalog");
}

export function getMetaApiVersion() {
  const configured = String(process.env.META_GRAPH_API_VERSION || "").trim();
  return /^v\d+\.\d+$/.test(configured) ? configured : DEFAULT_META_API_VERSION;
}

export function getInstagramToken(accountId = "katalog") {
  if (accountId === "menfess") {
    return String(
      process.env.META_MENFESS_IG_ACCESS_TOKEN ||
      process.env.META_IG_ACCESS_TOKEN ||
      ""
    ).trim();
  }
  return String(
    process.env.META_KATALOG_IG_ACCESS_TOKEN ||
    process.env.META_IG_ACCESS_TOKEN ||
    ""
  ).trim();
}

export function getInstagramUserId(accountId = "katalog") {
  if (accountId === "menfess") {
    return String(
      process.env.META_MENFESS_IG_USER_ID ||
      process.env.META_IG_USER_ID ||
      ""
    ).trim();
  }
  return String(
    process.env.META_KATALOG_IG_USER_ID ||
    process.env.META_IG_USER_ID ||
    ""
  ).trim();
}

/**
 * Validasi cryptographic signature dari Meta webhook payload (HMAC-SHA256)
 */
export function verifyMetaSignature(rawBody, signatureHeader, appSecret) {
  if (!signatureHeader || !appSecret) return false;
  try {
    const match = /^sha256=([a-f0-9]{64})$/i.exec(String(signatureHeader));
    if (!match) return false;

    const expected = crypto
      .createHmac("sha256", appSecret)
      .update(typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody))
      .digest();

    const supplied = Buffer.from(match[1], "hex");
    return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
  } catch {
    return false;
  }
}

/**
 * Kirim payload pesan langsung ke Meta Instagram Send API
 */
export async function sendInstagramMessage(recipientId, messagePayload, options = {}) {
  let token = options.token;
  let apiBase = options.apiBase || "https://graph.facebook.com";
  if (!token && options.accountId) {
    const accountId = String(options.accountId);
    const { getInstagramAccountCredentialsByExternalId } = await import("@/lib/instagramAccountCredentials");
    const credentials = await getInstagramAccountCredentialsByExternalId(getAdminClient(), accountId);
    if (credentials) {
      token = credentials.token;
      apiBase = credentials.apiBase;
    } else {
      const menfessId = await resolveInstagramUserId("menfess");
      const catalogId = await resolveInstagramUserId("katalog");
      const matchingLegacyAccount = accountId === String(menfessId || "")
        ? "menfess"
        : accountId === String(catalogId || "") ? "katalog" : null;
      if (matchingLegacyAccount) token = await resolveInstagramToken(matchingLegacyAccount);
    }
  }
  if (!token && !options.accountId) token = await resolveInstagramToken(options.account || "katalog");
  if (!token) {
    console.warn("sendInstagramMessage: token Meta belum diset, pesan diabaikan.");
    return { ok: false, skipped: true, error: "token_missing" };
  }

  const cleanRecipient = String(recipientId || "").trim();
  if (!cleanRecipient) {
    throw new Error("sendInstagramMessage: recipientId wajib diisi.");
  }

  const version = getMetaApiVersion();
  // Gunakan 'me/messages' secara default untuk Page Access Token, atau custom endpoint jika dispesifikasikan
  const endpointPath = options.endpoint || "me/messages";
  const allowedApiBases = new Set(["https://graph.facebook.com", "https://graph.instagram.com"]);
  const safeApiBase = allowedApiBases.has(apiBase) ? apiBase : "https://graph.facebook.com";
  const url = `${safeApiBase}/${version}/${endpointPath}`;

  const body = {
    recipient: { id: cleanRecipient },
    message: messagePayload,
  };

  const requestOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  };
  let response;
  try {
    response = await fetch(url, requestOptions);
  } catch (error) {
    const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
    return { ok: false, error: timedOut ? "meta_request_timeout" : "meta_network_error" };
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    // Coba fallback ke graph.instagram.com jika endpoint facebook Graph gagal
    if (safeApiBase === "https://graph.facebook.com" && data?.error?.code === 100 && url.includes("/me/messages")) {
      const fallbackUrl = `https://graph.instagram.com/${version}/me/messages`;
      const fallbackRes = await fetch(fallbackUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      }).catch(() => null);

      const fallbackData = await fallbackRes?.json()?.catch(() => ({}));
      if (fallbackRes?.ok && !fallbackData?.error) {
        return { ok: true, recipientId: cleanRecipient, messageId: fallbackData.message_id || null };
      }
    }

    const errorCode = data?.error?.code;
    console.warn("[instagram-dm] Meta Send API rejected request.", {
      status: response.status,
      code: Number.isFinite(Number(errorCode)) ? Number(errorCode) : null,
    });
    return {
      ok: false,
      error: "meta_request_rejected",
      status: response.status,
      code: Number.isFinite(Number(errorCode)) ? Number(errorCode) : null,
    };
  }

  return { ok: true, recipientId: cleanRecipient, messageId: data.message_id || null };
}

/**
 * Kirim pesan teks dengan tombol opsi cepat (Quick Replies)
 */
export async function sendInstagramQuickReplies(recipientId, text, quickReplies = [], options = {}) {
  const formattedReplies = (quickReplies || []).map((reply) => {
    if (typeof reply === "string") {
      return {
        content_type: "text",
        title: reply.slice(0, 20),
        payload: reply.toUpperCase().replace(/\s+/g, "_"),
      };
    }
    return {
      content_type: "text",
      title: String(reply.title || "").slice(0, 20),
      payload: String(reply.payload || reply.title || "").slice(0, 1000),
    };
  });

  const payload = {
    text: String(text || "").slice(0, 2000),
  };

  if (formattedReplies.length > 0) {
    payload.quick_replies = formattedReplies.slice(0, 13); // Maks 13 quick replies menurut spek Meta
  }

  return sendInstagramMessage(recipientId, payload, options);
}

/**
 * Kirim pesan teks standar
 */
export async function sendInstagramText(recipientId, text, options = {}) {
  return sendInstagramQuickReplies(recipientId, text, [], options);
}

/**
 * Kirim kartu produk generik di DM (Generic Template)
 */
export async function sendInstagramProductCard(recipientId, element, options = {}) {
  const payload = {
    attachment: {
      type: "template",
      payload: {
        template_type: "generic",
        elements: [
          {
            title: String(element.title || "Barang Kampus").slice(0, 80),
            subtitle: String(element.subtitle || "").slice(0, 80),
            image_url: element.imageUrl || undefined,
            buttons: (element.buttons || []).slice(0, 3).map((btn) => ({
              type: btn.type || "web_url",
              url: btn.url,
              title: String(btn.title || "Lihat").slice(0, 20),
            })),
          },
        ],
      },
    },
  };

  return sendInstagramMessage(recipientId, payload, options);
}
