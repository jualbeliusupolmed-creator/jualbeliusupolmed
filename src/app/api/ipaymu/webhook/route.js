import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { notifyAdminNewListing, postToGroup } from "@/lib/fonnte";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    // iPaymu mengirim data webhook dalam format x-www-form-urlencoded
    const textBody = await req.text();
    const params = new URLSearchParams(textBody);
    const data = Object.fromEntries(params.entries());

    const orderId = data.reference_id;
    const txStatus = data.status; // "berhasil", "pending", "expired", "batal"
    const statusCode = data.status_code;

    if (!orderId) {
      return NextResponse.json({ error: "Missing reference_id" }, { status: 400 });
    }

    const supa = getAdminClient();

    const settled = txStatus === "berhasil" || statusCode === "1" || txStatus === "sukses";
    const failed = txStatus === "expired" || statusCode === "-1" || txStatus === "batal";

    const newStatus = settled ? "paid" : failed ? "failed" : "pending";

    const { data: payment } = await supa
      .from("payments")
      .update({ status: newStatus })
      .eq("midtrans_order_id", orderId) // tetap menggunakan kolom lama agar tidak perlu migrasi db
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
          // notif admin + auto-post grup
          notifyAdminNewListing(listing).catch(() => {});
          postToGroup(listing).catch(() => {});
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
    console.error("ipaymu webhook error:", e?.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
