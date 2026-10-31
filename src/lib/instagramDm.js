import crypto from "crypto";

const DEFAULT_META_API_VERSION = "v24.0";

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
  if (!signatureHeader || !appSecret) return true; // Lewatkan jika belum dikonfigurasi di dev
  try {
    const [algorithm, signature] = signatureHeader.split("=");
    if (algorithm !== "sha256" || !signature) return false;

    const expected = crypto
      .createHmac("sha256", appSecret)
      .update(typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody))
      .digest("hex");

    const bufSignature = Buffer.from(signature, "hex");
    const bufExpected = Buffer.from(expected, "hex");

    if (bufSignature.length !== bufExpected.length) {
      return false;
    }

    return crypto.timingSafeEqual(bufSignature, bufExpected);
  } catch (err) {
    console.error("Gagal verifikasi signature Meta:", err?.message);
    return false;
  }
}

/**
 * Kirim payload pesan langsung ke Meta Instagram Send API
 */
export async function sendInstagramMessage(recipientId, messagePayload, options = {}) {
  const token = options.token || getInstagramToken(options.account || "katalog");
  if (!token) {
    console.warn("sendInstagramMessage: token Meta belum diset, pesan diabaikan.");
    return { ok: false, skipped: true, error: "token_missing" };
  }

  const cleanRecipient = String(recipientId || "").trim();
  if (!cleanRecipient) {
    throw new Error("sendInstagramMessage: recipientId wajib diisi.");
  }

  const version = getMetaApiVersion();
  const userId = options.userId || getInstagramUserId(options.account || "katalog");
  const endpointPath = userId ? `${userId}/messages` : "me/messages";
  const url = `https://graph.facebook.com/${version}/${endpointPath}`;

  const body = {
    recipient: { id: cleanRecipient },
    message: messagePayload,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    // Coba fallback ke graph.instagram.com jika endpoint facebook Graph gagal
    if (data?.error?.code === 100 && url.includes("/me/messages")) {
      const fallbackUrl = `https://graph.instagram.com/${version}/me/messages`;
      const fallbackRes = await fetch(fallbackUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
        cache: "no-store",
      }).catch(() => null);

      const fallbackData = await fallbackRes?.json()?.catch(() => ({}));
      if (fallbackRes?.ok && !fallbackData?.error) {
        return { ok: true, recipientId: cleanRecipient, messageId: fallbackData.message_id || null };
      }
    }

    const errorMsg = data?.error?.message || `HTTP ${response.status}`;
    console.error("Meta Instagram Send API Error:", errorMsg, data);
    return { ok: false, error: errorMsg, data };
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
