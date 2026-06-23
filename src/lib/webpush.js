import webpush from "web-push";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
const vapidSubject = `mailto:${process.env.VAPID_EMAIL || "admin@jualbeliusupolmed.web.id"}`;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

/**
 * Kirim push notification ke satu subscription
 * @param {{endpoint, keys: {p256dh, auth}}} subscription
 * @param {{title, body, url, tag}} payload
 */
export async function sendPushNotification(subscription, payload) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn("[webpush] VAPID keys not configured — skip push");
    return { ok: false };
  }
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true };
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      return { ok: false, expired: true };
    }
    console.error("[webpush] error:", err.message);
    return { ok: false };
  }
}

/**
 * Kirim push ke semua subscription milik satu WA nomor
 * Hapus subscription yang sudah expired (410/404)
 */
export async function pushToWa(supa, wa, payload) {
  if (!wa) return;
  const { data: subs } = await supa
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("wa", wa);
  if (!subs?.length) return;

  for (const sub of subs) {
    const result = await sendPushNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload
    );
    if (result.expired) {
      await supa.from("push_subscriptions").delete().eq("id", sub.id);
    }
  }
}
