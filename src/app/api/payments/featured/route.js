import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { createSnapTransaction } from "@/lib/midtrans";
import { getSettings, featuredRateFrom } from "@/lib/settings";

export const dynamic = "force-dynamic";

// POST /api/payments/featured  { listing_id, days, per_day? } -> snap token
export async function POST(req) {
  try {
    const { listing_id, days, per_day } = await req.json();
    if (!listing_id)
      return NextResponse.json({ error: "listing_id wajib" }, { status: 400 });

    const settings = await getSettings();
    const d = Math.max(1, Number(days) || 1);
    const rate = featuredRateFrom(settings.pricing, per_day);
    const amount = d * rate;

    const supa = getAdminClient();
    const { data: listing } = await supa
      .from("listings")
      .select("*")
      .eq("id", listing_id)
      .single();
    if (!listing)
      return NextResponse.json({ error: "Listing tidak ada" }, { status: 404 });

    const orderId = `FEATURED-${listing_id.slice(0, 8)}-${Date.now()}`;
    await supa.from("payments").insert({
      listing_id,
      type: "featured",
      amount,
      status: "pending",
      midtrans_order_id: orderId,
      meta: { days: d, per_day: rate },
    });

    let paymentUrl = null;
    try {
      const tx = await createSnapTransaction({
        orderId,
        amount,
        customerName: listing.seller_name,
        customerWa: listing.seller_wa,
        itemName: `Featured ${d} hari: ${listing.title}`,
      });
      paymentUrl = tx.redirect_url;
    } catch (e) {
      console.error("featured charge midtrans:", e?.message);
    }

    return NextResponse.json({ paymentUrl, orderId, amount });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
