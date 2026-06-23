import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { formatWa } from "@/lib/constants";

export const dynamic = "force-dynamic";

// POST /api/push/subscribe — simpan atau hapus subscription
export async function POST(req) {
  try {
    const body = await req.json();
    const { wa, subscription, action } = body;

    const normalizedWa = formatWa(wa || "");
    if (!normalizedWa) return NextResponse.json({ error: "wa required" }, { status: 400 });

    const supa = getAdminClient();

    if (action === "unsubscribe") {
      if (subscription?.endpoint) {
        await supa.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
      } else {
        await supa.from("push_subscriptions").delete().eq("wa", normalizedWa);
      }
      return NextResponse.json({ ok: true, action: "unsubscribed" });
    }

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: "subscription tidak valid" }, { status: 400 });
    }

    // Upsert berdasarkan endpoint (satu device bisa berganti WA)
    await supa.from("push_subscriptions").upsert(
      {
        wa: normalizedWa,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      { onConflict: "endpoint" }
    );

    return NextResponse.json({ ok: true, action: "subscribed" });
  } catch (err) {
    console.error("[push/subscribe]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET /api/push/subscribe — ambil VAPID public key
export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY || "";
  if (!publicKey) return NextResponse.json({ error: "VAPID not configured" }, { status: 503 });
  return NextResponse.json({ publicKey });
}
