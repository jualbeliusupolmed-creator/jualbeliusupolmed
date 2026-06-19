import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { createQrisTransaction } from "@/lib/midtrans";

export const dynamic = "force-dynamic";

// POST /api/payments/subscribe { seller_wa } -> snap token
export async function POST(req) {
  try {
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

    let paymentUrl = null;
    try {
      const tx = await createQrisTransaction({
        orderId,
        amount,
        customerName: profile.name || "Pengguna Pro",
        customerWa: seller_wa,
        itemName: `Berlangganan PRO (30 Hari)`,
      });
      paymentUrl = tx.redirect_url;
    } catch (e) {
      console.error("doku subscribe charge:", e?.message);
    }

    return NextResponse.json({ paymentUrl, orderId });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
