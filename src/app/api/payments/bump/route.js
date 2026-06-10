import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { createSnapTransaction } from "@/lib/midtrans";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

// POST /api/payments/bump  { listing_id } -> snap token untuk bump Rp1.000
export async function POST(req) {
  try {
    const { listing_id } = await req.json();
    if (!listing_id)
      return NextResponse.json({ error: "listing_id wajib" }, { status: 400 });

    const supa = getAdminClient();
    const { data: listing } = await supa
      .from("listings")
      .select("*")
      .eq("id", listing_id)
      .single();
    if (!listing)
      return NextResponse.json({ error: "Listing tidak ada" }, { status: 404 });

    const settings = await getSettings();
    const amount = settings.pricing.bump;

    const orderId = `BUMP-${listing_id.slice(0, 8)}-${Date.now()}`;
    await supa.from("payments").insert({
      listing_id,
      type: "bump",
      amount,
      status: "pending",
      midtrans_order_id: orderId,
    });

    let snapToken = null;
    try {
      const tx = await createSnapTransaction({
        orderId,
        amount,
        customerName: listing.seller_name,
        customerWa: listing.seller_wa,
        itemName: `Bump: ${listing.title}`,
      });
      snapToken = tx.token;
    } catch (e) {
      console.error("bump charge:", e?.message);
    }

    return NextResponse.json({ snapToken, orderId });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
