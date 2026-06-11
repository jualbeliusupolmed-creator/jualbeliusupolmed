import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { createPaymentLink } from "@/lib/ipaymu";
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

    // Check for free bumps
    const { data: profile } = await supa
      .from("seller_profiles")
      .select("wa, free_bumps")
      .eq("wa", listing.seller_wa)
      .maybeSingle();

    if (profile && profile.free_bumps > 0) {
      // Deduct free bump
      await supa.from("seller_profiles").update({ free_bumps: profile.free_bumps - 1 }).eq("wa", listing.seller_wa);
      
      // Bump the listing
      await supa.from("listings").update({ bumped_at: new Date().toISOString() }).eq("id", listing_id);
      
      return NextResponse.json({ success: true, freeBumpUsed: true });
    }

    const orderId = `BUMP-${listing_id.slice(0, 8)}-${Date.now()}`;
    await supa.from("payments").insert({
      listing_id,
      type: "bump",
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
        itemName: `Bump: ${listing.title}`,
      });
      paymentUrl = tx.url;
    } catch (e) {
      console.error("bump charge ipaymu:", e?.message);
    }

    return NextResponse.json({ paymentUrl, orderId });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
