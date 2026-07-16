import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSettings, adFeeFrom } from "@/lib/settings";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const rl = rateLimit(getClientIp(req), { limit: 10, windowMs: 60_000 });
    if (!rl.ok) return NextResponse.json({ error: "Terlalu banyak permintaan. Coba lagi sebentar." }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });

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
      meta: { final_amount: amount },
    });

    return NextResponse.json({ paymentUrl: "/qris.png", orderId, amount, finalAmount: amount });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
