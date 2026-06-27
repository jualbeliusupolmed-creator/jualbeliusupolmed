import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { createKlikQrisTransaction } from "@/lib/klikqris";

export const dynamic = "force-dynamic";

// POST /api/payments/subscribe { seller_wa } -> snap token
export async function POST(req) {
  try {
    const rl = rateLimit(getClientIp(req), { limit: 5, windowMs: 60_000 });
    if (!rl.ok) return NextResponse.json({ error: "Terlalu banyak permintaan. Coba lagi sebentar." }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });

    const { seller_wa } = await req.json();
    if (!seller_wa) return NextResponse.json({ error: "seller_wa wajib" }, { status: 400 });

    const supa = getAdminClient();
    const { data: profile } = await supa
      .from("seller_profiles")
      .select("*")
      .eq("wa", seller_wa)
      .single();

    if (!profile) return NextResponse.json({ error: "Profil tidak ditemukan" }, { status: 404 });

    const amount = 49000;
    const orderId = `PRO-${seller_wa.slice(0, 8)}-${Date.now()}`;
    
    // We can save to a `payments` table with type `subscribe`
    await supa.from("payments").insert({
      listing_id: null, // No specific listing
      type: "subscribe",
      amount,
      status: "pending",
      midtrans_order_id: orderId,
      meta: { wa: seller_wa }
    });

    const { qrisUrl, signature, totalAmount } = await createKlikQrisTransaction(
      orderId, amount, `Langganan PRO`
    );
    await supa.from("payments").update({ meta: { wa: seller_wa, final_amount: totalAmount, klikqris_signature: signature } }).eq("midtrans_order_id", orderId);

    return NextResponse.json({ paymentUrl: qrisUrl, orderId, amount, finalAmount: totalAmount });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
