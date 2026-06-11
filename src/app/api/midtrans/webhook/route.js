import { NextResponse } from "next/server";
import crypto from "crypto";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { notifyAdminNewListing, postToGroup } from "@/lib/fonnte";

export const dynamic = "force-dynamic";

// Verifikasi signature Midtrans:
// sha512(order_id + status_code + gross_amount + serverKey)
function verify(body) {
  const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
  const expected = crypto
    .createHash("sha512")
    .update(
      `${body.order_id}${body.status_code}${body.gross_amount}${serverKey}`
    )
    .digest("hex");
  return expected === body.signature_key;
}

export async function POST(req) {
  try {
    const body = await req.json();

    if (!verify(body)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const supa = getAdminClient();
    const orderId = body.order_id;
    const txStatus = body.transaction_status;
    const fraud = body.fraud_status;

    const settled =
      (txStatus === "capture" && fraud === "accept") || txStatus === "settlement";
    const failed = ["cancel", "deny", "expire", "failure"].includes(txStatus);

    const newStatus = settled ? "paid" : failed ? "failed" : "pending";

    const { data: payment } = await supa
      .from("payments")
      .update({ status: newStatus })
      .eq("midtrans_order_id", orderId)
      .select()
      .single();

    if (payment && settled && payment.listing_id) {
      // iklan / bump -> aktifkan & angkat ke atas
      if (payment.type === "iklan" || payment.type === "bump") {
        const { data: listing } = await supa
          .from("listings")
          .update({ status: "active", bumped_at: new Date().toISOString() })
          .eq("id", payment.listing_id)
          .select()
          .single();

        if (listing && payment.type === "iklan") {
          // notif admin + auto-post grup (aman-gagal)
          await Promise.allSettled([
            notifyAdminNewListing(listing),
            postToGroup(listing)
          ]);
        }
      } else if (payment.type === "featured") {
        const days = payment.meta?.days || 1;
        const until = new Date(Date.now() + days * 864e5).toISOString();
        await supa
          .from("listings")
          .update({ featured: true, featured_until: until, bumped_at: new Date().toISOString() })
          .eq("id", payment.listing_id);
      } else if (payment.type === "autobump") {
        const until = new Date(Date.now() + 7 * 864e5).toISOString(); // 7 Hari
        await supa
          .from("listings")
          .update({ auto_bump_until: until, bumped_at: new Date().toISOString() })
          .eq("id", payment.listing_id);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("webhook:", e?.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
