import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { sendPushNotification } from "@/lib/webpush";

export const dynamic = "force-dynamic";

// POST /api/push/subscribe/test — kirim test push ke semua subscriber
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const title = body.title || "🔔 Test Push";
    const message = body.body || "Notifikasi push berfungsi!";
    const url = body.url || "/";

    const supa = getAdminClient();
    const { data: subs, error } = await supa
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth");

    if (error) throw new Error(error.message);
    if (!subs?.length) return NextResponse.json({ ok: true, sent: 0, message: "Tidak ada subscriber" });

    const payload = { title, body: message, url, tag: "admin-test" };
    let sent = 0;
    const expiredIds = [];

    for (const sub of subs) {
      const result = await sendPushNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      if (result.ok) sent++;
      if (result.expired) expiredIds.push(sub.id);
    }

    // Hapus subscription yang expired
    if (expiredIds.length > 0) {
      await supa.from("push_subscriptions").delete().in("id", expiredIds);
    }

    return NextResponse.json({ ok: true, sent, total: subs.length, expired: expiredIds.length });
  } catch (err) {
    console.error("[push/test]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
