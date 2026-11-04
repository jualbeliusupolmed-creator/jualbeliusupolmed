import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSettings } from "@/lib/settings";
import { rateLimitDistributed } from "@/lib/rateLimit";
import { detectDoxxingRisk, censorProfanity } from "@/lib/profanity";
import { evaluateModerationRules } from "@/lib/moderationRules";
import { hashIdentitas } from "@/lib/identitasHash";
import { autoPublishMadingInstagram } from "@/lib/madingInstagram";
import { sendInstagramText } from "@/lib/instagramDm";

const DEFAULTS = {
  enabled: false,
  triggers: ["menfess", "curhat"],
  minChars: 5,
  maxChars: 1000,
  quotaPerHour: 5,
  blockedWords: [],
  welcomeMessage: "",
  successMessage: "",
};

let cachedConfig = null;
let cachedConfigUntil = 0;

function boundedInteger(value, fallback, min, max) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

function cleanWords(value, maxItems) {
  const items = Array.isArray(value) ? value : String(value || "").split(/[\n,]+/);
  return [...new Set(items.map((item) => String(item).trim().toLowerCase()).filter(Boolean))]
    .slice(0, maxItems);
}

export function getInstagramMenfessConfig(settings) {
  const source = settings?.mading || {};
  const configuredTriggers = cleanWords(source.instagramDmTriggers, 5)
    .filter((trigger) => /^[a-z0-9_-]{2,24}$/.test(trigger));
  return {
    enabled: source.instagramDmEnabled === true,
    triggers: configuredTriggers.length ? configuredTriggers : DEFAULTS.triggers,
    minChars: boundedInteger(source.instagramDmMinChars, DEFAULTS.minChars, 5, 200),
    maxChars: boundedInteger(source.instagramDmMaxChars, DEFAULTS.maxChars, 5, 1000),
    quotaPerHour: boundedInteger(source.instagramDmQuotaPerHour, DEFAULTS.quotaPerHour, 1, 20),
    blockedWords: cleanWords(source.instagramDmBlockedWords, 50)
      .filter((word) => word.length <= 60),
    welcomeMessage: String(source.instagramDmWelcomeMessage || "").trim().slice(0, 900),
    successMessage: String(source.instagramDmSuccessMessage || "").trim().slice(0, 900),
  };
}

export function parseInstagramMenfessSubmission(text, triggers) {
  const message = String(text || "").trim();
  const lowered = message.toLowerCase();
  const trigger = (triggers || []).find((candidate) =>
    lowered === candidate || lowered.startsWith(`${candidate} `) ||
    lowered.startsWith(`${candidate}:`) || lowered.startsWith(`${candidate},`)
  );
  if (!trigger) return { matched: false, trigger: null, content: "" };

  const content = message.slice(trigger.length).replace(/^[\s:,-]+/, "").trim();
  return { matched: true, trigger, content };
}

export function hasConfiguredBlockedWord(text, blockedWords) {
  const normalized = String(text || "").toLowerCase();
  return (blockedWords || []).some((word) => {
    const escaped = String(word).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, "iu").test(normalized);
  });
}

function renderMessage(template, values) {
  return String(template || "")
    .replaceAll("{{url}}", values.url)
    .replaceAll("{{trigger}}", values.trigger);
}

async function reply(senderId, text, accountId) {
  const result = await sendInstagramText(senderId, text, { accountId });
  if (!result?.ok) {
    console.warn("[instagram-menfess] Balasan DM tidak terkirim.");
  }
}

export async function handleInstagramMenfess({
  senderId,
  recipientId,
  text,
  quickReplyPayload = "",
  attachments = [],
}) {
  if (!cachedConfig || Date.now() >= cachedConfigUntil) {
    cachedConfig = getInstagramMenfessConfig(await getSettings());
    cachedConfigUntil = Date.now() + 30_000;
  }
  const config = cachedConfig;
  const accountId = String(recipientId || "");
  if (!config.enabled) return { handled: false };

  const triggeredByButton = String(quickReplyPayload).toUpperCase() === "ACTION_MENFESS";
  const parsed = parseInstagramMenfessSubmission(text, config.triggers);
  if (!triggeredByButton && !parsed.matched) return { handled: false };

  const trigger = parsed.trigger || config.triggers[0] || DEFAULTS.triggers[0];
  const baseUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://www.kampuskita.my.id"
  ).replace(/\/$/, "");

  if (!parsed.content) {
    const fallback = `Kirim Menfess anonim dengan format: ${trigger} [isi pesan]. Minimal ${config.minChars} dan maksimal ${config.maxChars} karakter.`;
    await reply(senderId, config.welcomeMessage || fallback, accountId);
    return { handled: true, action: "menfess_help" };
  }

  if (parsed.content.length < config.minChars || parsed.content.length > config.maxChars) {
    await reply(senderId, `Panjang Menfess harus ${config.minChars}–${config.maxChars} karakter. Coba kirim ulang dengan format ${trigger} [isi pesan].`, accountId);
    return { handled: true, action: "menfess_invalid_length" };
  }

  if (attachments.length) {
    await reply(senderId, "Untuk saat ini Menfess melalui DM Instagram menerima teks saja. Gambar teks untuk Instagram akan dibuat otomatis.", accountId);
    return { handled: true, action: "menfess_attachments_unsupported" };
  }

  const doxxing = detectDoxxingRisk(parsed.content);
  if (doxxing.risky || hasConfiguredBlockedWord(parsed.content, config.blockedWords)) {
    await reply(senderId, "Menfess tidak dapat dikirim karena terdeteksi melanggar panduan keamanan atau filter kata admin.", accountId);
    return { handled: true, action: "menfess_rejected" };
  }

  const moderation = evaluateModerationRules({
    title: "",
    description: parsed.content,
    category: "Lainnya",
    type: "menfess",
  });
  if (moderation.action === "reject" || (moderation.riskScore || 0) >= 70) {
    await reply(senderId, "Menfess tidak dapat dikirim karena melanggar panduan komunitas.", accountId);
    return { handled: true, action: "menfess_rejected" };
  }

  const identityHash = hashIdentitas(`instagram:${senderId}`);
  const limit = await rateLimitDistributed(`instagram-menfess:${identityHash}`, {
    limit: config.quotaPerHour,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.ok) {
    await reply(senderId, "Batas kirim Menfess per jam tercapai. Silakan coba lagi nanti.", accountId);
    return { handled: true, action: "menfess_rate_limited" };
  }

  const supa = getAdminClient();
  const { data: post, error } = await supa
    .from("mading_posts")
    .insert({
      type: "menfess",
      sender_name: "Anonim",
      faculty: "Umum",
      title: null,
      content: censorProfanity(parsed.content),
      status: "active",
      author_ip_hash: identityHash,
    })
    .select("id, created_at")
    .single();

  if (error || !post?.id) {
    console.error("[instagram-menfess] Gagal menyimpan postingan.", error?.code || "database_error");
    await reply(senderId, "Menfess belum dapat diproses karena ada kendala. Coba lagi sebentar lagi.", accountId);
    return { handled: true, action: "menfess_save_failed" };
  }

  autoPublishMadingInstagram({ origin: baseUrl, postId: post.id, timeoutMs: 0 })
    .catch((publishError) => console.error("[instagram-menfess] Gagal memasukkan publikasi ke antrean.", publishError?.message));

  const url = `${baseUrl}/mading#post-${post.id}`;
  const successMessage = config.successMessage || "Menfess berhasil dikirim dan masuk ke Mading Kampus. Lihat: {{url}}";
  await reply(senderId, renderMessage(successMessage, { url, trigger }), accountId);
  return { handled: true, action: "menfess_created", postId: post.id };
}
