import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { createPaymentLink } from "@/lib/ipaymu";
import { getSettings, adFeeFrom } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const body = await req.json();
    const { listing_id, seller_wa } = body;

    if (!listing_id || !seller_wa) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const supa = getAdminClient();

    // Verify ownership and status
    const { data: listing, error } = await supa
      .from("listings")
      .select("*")
      .eq("id", listing_id)
      .single();

    if (error || !listing) {
      return NextResponse.json({ error: "Iklan tidak ditemukan" }, { status: 404 });
    }

    if (listing.seller_wa !== seller_wa) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (listing.status !== "pending") {
      return NextResponse.json({ error: "Iklan ini tidak sedang pending" }, { status: 400 });
    }

    const settings = await getSettings();
    let amount = 0;
    let orderId = "";
    let itemName = "";
    const isSoldFee = body.type === "sold_fee";

    if (isSoldFee) {
      amount = adFeeFrom(settings.pricing, listing.type, listing.price); // Wait, sold_fee is soldFeeFrom, not adFeeFrom! I will fix this in a moment
      // Let's use the DB's existing pending payment amount instead of recalculating if possible, or recalculate.
    }

    // Actually, let's fetch the existing pending payment to get the exact amount!
    const { data: existingPayment } = await supa
      .from("payments")
      .select("amount, type")
      .eq("listing_id", listing.id)
      .eq("status", "pending")
      .eq("type", body.type || "iklan")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!existingPayment) {
      return NextResponse.json({ error: "Tidak ada pembayaran pending" }, { status: 400 });
    }

    amount = existingPayment.amount;
    const paymentType = existingPayment.type;

    if (paymentType === "sold_fee") {
      orderId = `SOLDFEE-${listing.id.slice(0, 8)}-${Date.now()}`;
      itemName = `Fee terjual: ${listing.title}`;
    } else {
      orderId = `IKLAN-${listing.id.slice(0, 8)}-${Date.now()}`;
      itemName = `Iklan: ${listing.title}`;
    }

    // Create new payment record
    await supa.from("payments").insert({
      listing_id: listing.id,
      type: paymentType,
      amount,
      status: "pending",
      midtrans_order_id: orderId,
    });

    let paymentUrl = null;
    let snapToken = null;
    try {
      if (paymentType === "sold_fee") {
        const { createSnapTransaction } = require("@/lib/midtrans");
        const tx = await createSnapTransaction({
          orderId,
          amount,
          customerName: listing.seller_name,
          customerWa: listing.seller_wa,
          itemName,
        });
        snapToken = tx.token;
      } else {
        const tx = await createPaymentLink({
          orderId,
          amount,
          customerName: listing.seller_name,
          customerWa: listing.seller_wa,
          itemName,
        });
        paymentUrl = tx.url;
      }
    } catch (e) {
      console.error("resume charge error:", e?.message);
      return NextResponse.json({ error: "Gagal membuat transaksi" }, { status: 500 });
    }

    return NextResponse.json({ paymentUrl, snapToken, orderId });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
