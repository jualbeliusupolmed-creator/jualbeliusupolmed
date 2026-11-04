import crypto from "crypto";

const STATE_COOKIE = "kk_instagram_oauth_state";
const STATE_TTL_SECONDS = 10 * 60;

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function stateSecret() {
  const secret = String(process.env.META_INSTAGRAM_APP_SECRET || "").trim();
  if (secret.length < 16) throw new Error("Instagram OAuth is not configured.");
  return secret;
}

export function getInstagramOAuthConfig() {
  const appId = String(process.env.META_INSTAGRAM_APP_ID || "").trim();
  const appSecret = String(process.env.META_INSTAGRAM_APP_SECRET || "").trim();
  const redirectUri = String(process.env.META_INSTAGRAM_REDIRECT_URI || "").trim();
  let parsedRedirect;
  try {
    parsedRedirect = new URL(redirectUri);
  } catch {
    throw new Error("Instagram OAuth is not configured.");
  }

  const localHttp = parsedRedirect.protocol === "http:" &&
    ["localhost", "127.0.0.1"].includes(parsedRedirect.hostname);
  if (!/^\d{5,40}$/.test(appId) ||
      appSecret.length < 16 ||
      (parsedRedirect.protocol !== "https:" && !localHttp) ||
      parsedRedirect.pathname !== "/api/admin/social/instagram/oauth/callback" ||
      parsedRedirect.search || parsedRedirect.hash) {
    throw new Error("Instagram OAuth is not configured.");
  }

  return { appId, appSecret, redirectUri };
}

export function createInstagramOAuthState({ accountId, actorId, now = Date.now() }) {
  const payload = {
    accountId: String(accountId),
    actorId: String(actorId),
    nonce: crypto.randomBytes(16).toString("base64url"),
    exp: now + STATE_TTL_SECONDS * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", stateSecret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyInstagramOAuthState(state, cookieState, { now = Date.now() } = {}) {
  if (!state || !cookieState || !safeEqual(state, cookieState)) return null;
  const [encoded, suppliedSignature, extra] = String(state).split(".");
  if (!encoded || !suppliedSignature || extra) return null;
  const expectedSignature = crypto.createHmac("sha256", stateSecret())
    .update(encoded)
    .digest("base64url");
  if (!safeEqual(suppliedSignature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!payload.accountId || !payload.actorId || !payload.nonce ||
        !Number.isFinite(payload.exp) || payload.exp <= now) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getInstagramOAuthStateCookieName() {
  return STATE_COOKIE;
}

export function getInstagramOAuthStateTtlSeconds() {
  return STATE_TTL_SECONDS;
}

export function instagramOAuthResultUrl(origin, result) {
  const url = new URL("/admin/social", origin);
  url.searchParams.set("instagram_oauth", result);
  return url;
}
