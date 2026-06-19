import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { createQrisTransaction } from "@/lib/midtrans";
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

    if (listing.status !== "expired") {
      return NextResponse.json({ error: "Iklan ini belum expired" }, { status: 400 });
    }

    const settings = await getSettings();
    const amount = adFeeFrom(settings.pricing, listing.type, listing.price);
    const orderId = `RENEW-${listing.id.slice(0, 8)}-${Date.now()}`;

    // Create new payment record
    await supa.from("payments").insert({
      listing_id: listing.id,
      type: "renewal",
      amount,
      status: "pending",
      midtrans_order_id: orderId,
    });

    let paymentUrl = null;
    try {
      const tx = await createQrisTransaction({
        orderId,
        amount,
        customerName: listing.seller_name,
        customerWa: listing.seller_wa,
        itemName: `Perpanjang Iklan: ${listing.title}`,
      });
      paymentUrl = tx.redirect_url;
    } catch (e) {
      console.error("doku renewal charge:", e?.message);
      return NextResponse.json({ error: "Gagal membuat transaksi" }, { status: 500 });
    }

    return NextResponse.json({ paymentUrl, orderId, amount });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
