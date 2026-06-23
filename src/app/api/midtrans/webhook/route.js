import { NextResponse } from "next/server";
import crypto from "crypto";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { notifyAdminNewListing, postToGroup, postWantedToGroup, notifyWantedMatch, notifySellerProActivated, notifyCategorySubscribers } from "@/lib/fonnte";

export const dynamic = "force-dynamic";

function verifySignature(body) {
  const secret = process.env.MIDTRANS_SERVER_KEY || "";
  const orderId = body.order_id;
  const statusCode = body.status_code;
  const grossAmount = body.gross_amount;
  const signatureKey = body.signature_key;

  const hash = crypto
    .createHash("sha512")
    .update(orderId + statusCode + grossAmount + secret)
    .digest("hex");

  return hash === signatureKey;
}

// Cari wanted_listings yang cocok dengan listing baru, lalu notif buyer via WA
async function notifyMatchingWanted(supa, listing) {
  try {
    const { data: matches } = await supa
      .from("wanted_listings")
      .select("id, buyer_wa, buyer_name, title")
      .eq("category", listing.category)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(10);

    if (!matches || matches.length === 0) return;

    await Promise.allSettled(
      matches.map((w) => notifyWantedMatch(w.buyer_wa, w.buyer_name, listing))
    );
  } catch (err) {
    console.error("[wanted-match] error:", err?.message);
  }
}

export async function POST(req) {
  try {
    const rawBodyText = await req.text();
    const body = JSON.parse(rawBodyText);
    
    // Verifikasi signature
    if (!verifySignature(body)) {
      console.warn("[webhook midtrans] signature tidak valid");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const orderId = body.order_id;
    const txStatus = body.transaction_status; // e.g. "settlement", "pending", "expire"
    const fraudStatus = body.fraud_status;

    if (!orderId || !txStatus) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const settled = txStatus === "settlement" || txStatus === "capture";
    const failed = txStatus === "expire" || txStatus === "cancel" || txStatus === "deny";

    if (txStatus === "capture" && fraudStatus === "challenge") {
      // Ignore if challenged
      return NextResponse.json({ ok: true });
    }

    const newStatus = settled ? "paid" : failed ? "failed" : "pending";

    const supa = getAdminClient();

    const { data: payment } = await supa
      .from("payments")
      .update({ status: newStatus })
      .eq("midtrans_order_id", orderId)
      .select()
      .single();

    if (payment && settled) {
      if (payment.type === "subscribe") {
        const until = new Date(Date.now() + 30 * 864e5).toISOString(); // 30 Hari
        const { data: updatedProfile } = await supa
          .from("seller_profiles")
          .update({ subscription_tier: "pro", subscription_expires_at: until })
          .eq("wa", payment.meta.wa)
          .select("name")
          .single();
        // Notif WA ke penjual bahwa PRO sudah aktif
        notifySellerProActivated(payment.meta.wa, updatedProfile?.name, until).catch(() => {});
      } else if (payment.meta?.unlock_wanted_id) {
        await supa.from("wanted_unlocks").insert({
            wanted_id: payment.meta.unlock_wanted_id,
            unlocked_by_wa: payment.meta.requester_wa || null
        });
      } else if (payment.meta?.wanted_id) {
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
            // notif admin + auto-post grup (aman-gagal)
            await Promise.allSettled([
              notifyAdminNewListing(listing),
              postToGroup(listing),
              notifyMatchingWanted(supa, listing),
              notifyCategorySubscribers(supa, listing),
            ]);
          }
        } else if (payment.type === "featured") {
          const days = payment.meta?.days || 1;
          const until = new Date(Date.now() + days * 864e5).toISOString();
          await supa
            .from("listings")
            .update({ featured: true, featured_until: until, bumped_at: new Date().toISOString() })
            .eq("id", payment.listing_id);
        } else if (payment.type === "renewal") {
          const until = new Date(Date.now() + 30 * 864e5).toISOString(); // 30 Hari
          await supa
            .from("listings")
            .update({ status: "active", expired_at: until, bumped_at: new Date().toISOString() })
            .eq("id", payment.listing_id);
        } else if (payment.type === "autobump") {
          const until = new Date(Date.now() + 7 * 864e5).toISOString(); // 7 Hari
          await supa
            .from("listings")
            .update({ auto_bump_until: until, bumped_at: new Date().toISOString() })
            .eq("id", payment.listing_id);
        } else if (payment.type === "sold_fee") {
          await supa
            .from("listings")
            .update({ status: "sold", stock: 0 })
            .eq("id", payment.listing_id);
        } else if (payment.type === "sponsored") {
          const days = payment.meta?.days || 1;
          const until = new Date(Date.now() + days * 864e5).toISOString();
          await supa
            .from("listings")
            .update({ sponsored_until: until, bumped_at: new Date().toISOString() })
            .eq("id", payment.listing_id);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("webhook midtrans:", e?.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
