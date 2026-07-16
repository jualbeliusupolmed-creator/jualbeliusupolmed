import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSettings } from "@/lib/settings";
import { FEES } from "@/lib/fees";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const rl = rateLimit(getClientIp(req), { limit: 10, windowMs: 60_000 });
    if (!rl.ok) return NextResponse.json({ error: "Terlalu banyak permintaan. Coba lagi sebentar." }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });

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

    const amount = FEES.autobump_7_days;

    const orderId = `AUTOBUMP-${listing_id.slice(0, 8)}-${Date.now()}`;
    await supa.from("payments").insert({
      listing_id,
      type: "autobump",
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
