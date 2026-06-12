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
    const amount = adFeeFrom(settings.pricing, listing.type, listing.price);
    const orderId = `IKLAN-${listing.id.slice(0, 8)}-${Date.now()}`;

    // Create new payment record
    await supa.from("payments").insert({
      listing_id: listing.id,
      type: "iklan",
      amount,
      status: "pending",
      midtrans_order_id: orderId,
    });

    let paymentUrl = null;
    try {
      const tx = await createPaymentLink({
        orderId,
        amount,
        customerName: listing.seller_name,
        customerWa: listing.seller_wa,
        itemName: `Iklan: ${listing.title}`,
      });
      paymentUrl = tx.url;
    } catch (e) {
      console.error("ipaymu resume charge:", e?.message);
      return NextResponse.json({ error: "Gagal membuat transaksi" }, { status: 500 });
    }

    return NextResponse.json({ paymentUrl, orderId });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
