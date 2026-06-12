import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { notifyAdminNewListing, postToGroup, notifyWantedBuyers, postWantedToGroup } from "@/lib/fonnte";
import { verifyIpaymuTransaction } from "@/lib/ipaymu";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    // iPaymu mengirim data webhook dalam format x-www-form-urlencoded
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);
    const data = Object.fromEntries(params.entries());

    // Validasi signature
    const signature = req.headers.get("signature") || "";
    const isValid = verifyIpaymuTransaction(data, signature);
    if (!isValid) {
      console.warn("[ipaymu webhook] signature tidak valid");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const orderId = data.sid;
    const status = data.status; // "berhasil", "pending", "expired", "batal"
    const settled = status === "berhasil";
    const failed = ["expired", "batal"].includes(status);

    const newStatus = settled ? "paid" : failed ? "failed" : "pending";

    const supa = getAdminClient();

    // Dapatkan data payment lama
    const { data: oldPayment } = await supa
      .from("payments")
      .select("*")
      .eq("midtrans_order_id", orderId) // tetap menggunakan kolom lama agar tidak perlu migrasi db
      .maybeSingle();

    if (!oldPayment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (oldPayment.status === "paid" && settled) {
      return NextResponse.json({ ok: true, message: "Already processed" });
    }

    const { data: payment } = await supa
      .from("payments")
      .update({ status: newStatus })
      .eq("midtrans_order_id", orderId) // tetap menggunakan kolom lama agar tidak perlu migrasi db
      .select()
      .single();

    if (payment && settled) {
      if (payment.meta?.wanted_id) {
        // Aktifkan postingan Cari Barang
        const { data: wanted } = await supa
          .from("wanted_listings")
          .update({ status: "active" })
          .eq("id", payment.meta.wanted_id)
          .select()
          .single();

        if (wanted) {
          // Kirim notifikasi WA grup untuk Cari Barang
          await postWantedToGroup(wanted).catch(() => {});
        }
      } else if (payment.listing_id) {
        // iklan / bump -> aktifkan & angkat ke atas
        if (payment.type === "iklan" || payment.type === "bump") {
          const { data: listing } = await supa
            .from("listings")
            .update({ status: "active", bumped_at: new Date().toISOString() })
            .eq("id", payment.listing_id)
            .select()
            .single();

          if (listing && payment.type === "iklan") {
            // notif admin + auto-post grup + matching engine
            await Promise.allSettled([
              notifyAdminNewListing(listing),
              postToGroup(listing),
              notifyWantedBuyers(listing)
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
        } else if (payment.type === "subscribe") {
          const wa = payment.meta?.wa;
          if (wa) {
            const until = new Date(Date.now() + 30 * 864e5).toISOString(); // 30 Hari
            await supa
              .from("seller_profiles")
              .update({ 
                subscription_tier: "pro", 
                subscription_expires_at: until 
              })
              .eq("wa", wa);
          }
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("ipaymu webhook error:", e?.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
