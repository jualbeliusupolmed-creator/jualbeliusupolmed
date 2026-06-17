import { NextResponse } from "next/server";
import crypto from "crypto";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { notifyAdminNewListing, postToGroup, postWantedToGroup } from "@/lib/fonnte";

export const dynamic = "force-dynamic";

function verifySignature(req, rawBodyText) {
  const signatureHeader = req.headers.get("signature") || req.headers.get("Signature") || "";
  const clientId = req.headers.get("client-id") || req.headers.get("Client-Id") || "";
  const requestId = req.headers.get("request-id") || req.headers.get("Request-Id") || "";
  const requestTimestamp = req.headers.get("request-timestamp") || req.headers.get("Request-Timestamp") || "";
  
  // Parse signature header. Format: "HMACSHA256=base64_signature"
  const signatureParts = signatureHeader.split("=");
  if (signatureParts.length < 2) return false;
  const providedSignature = signatureParts[1];

  const secret = process.env.DOKU_SECRET_KEY;
  if (!secret) return false;

  const url = new URL(req.url);
  const requestTarget = url.pathname;

  const digest = crypto.createHash("sha256").update(rawBodyText).digest("base64");

  const component =
    `Client-Id:${clientId}\n` +
    `Request-Id:${requestId}\n` +
    `Request-Timestamp:${requestTimestamp}\n` +
    `Request-Target:${requestTarget}\n` +
    `Digest:${digest}`;

  const expectedSignature = crypto.createHmac("sha256", secret).update(component).digest("base64");

  try {
    return crypto.timingSafeEqual(Buffer.from(providedSignature), Buffer.from(expectedSignature));
  } catch (e) {
    return false;
  }
}

export async function POST(req) {
  try {
    const rawBodyText = await req.text();
    
    // Verifikasi signature
    if (!verifySignature(req, rawBodyText)) {
      console.warn("[webhook doku] signature tidak valid");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const body = JSON.parse(rawBodyText);
    const orderId = body?.order?.invoice_number;
    const txStatus = body?.transaction?.status; // e.g. "SUCCESS", "FAILED"

    if (!orderId || !txStatus) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const settled = txStatus.toUpperCase() === "SUCCESS";
    const failed = txStatus.toUpperCase() === "FAILED";

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
        await supa
          .from("seller_profiles")
          .update({ subscription_tier: "pro", subscription_expires_at: until })
          .eq("wa", payment.meta.wa);
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
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("webhook doku:", e?.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
