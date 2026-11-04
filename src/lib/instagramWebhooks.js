import { getMetaApiVersion } from "@/lib/instagramDm";

const INSTAGRAM_GRAPH_API = "https://graph.instagram.com";
const SUBSCRIBED_FIELDS = ["messages", "messaging_postbacks"];

export async function subscribeInstagramWebhooks({ accessToken, instagramUserId }) {
  const token = String(accessToken || "").trim();
  const userId = String(instagramUserId || "").trim();
  if (!token || !/^\d{5,40}$/.test(userId)) {
    return { ok: false, error: "invalid_credentials" };
  }

  const url = new URL(`${INSTAGRAM_GRAPH_API}/${getMetaApiVersion()}/${userId}/subscribed_apps`);
  const responseOptions = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ subscribed_fields: SUBSCRIBED_FIELDS.join(",") }).toString(),
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  };

  try {
    const response = await fetch(url, responseOptions);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.error || payload.success !== true) {
      const code = payload.error?.code;
      return {
        ok: false,
        status: response.status,
        code: code !== undefined && code !== null && Number.isFinite(Number(code))
          ? Number(code)
          : null,
      };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error?.name === "TimeoutError" || error?.name === "AbortError"
        ? "timeout"
        : "network_error",
    };
  }
}
