import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { getSettings, angkaSetelan } from "@/lib/settings";
import { tolakBukanPemilik } from "@/lib/kepemilikan";
import { jawabGalat } from "@/lib/jawabGalat";

export const dynamic = "force-dynamic";

// POST /api/payments/subscribe { seller_wa } -> snap token
//
// `seller_wa` datang dari body, jadi ia harus dicocokkan dengan sesi — kalau
// tidak, siapa pun bisa membuat tagihan langganan atas nama penjual mana pun.
export async function POST(req) {
  try {
    const rl = rateLimit(getClientIp(req), { limit: 5, windowMs: 60_000 });
    if (!rl.ok) return NextResponse.json({ error: "Terlalu banyak permintaan. Coba lagi sebentar." }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });

    const { seller_wa } = await req.json();
    if (!seller_wa) return NextResponse.json({ error: "seller_wa wajib" }, { status: 400 });

    const tolak = tolakBukanPemilik(seller_wa, { aksi: "berlangganan" });
    if (tolak) return tolak;

    const supa = getAdminClient();
    const { data: profile } = await supa
      .from("seller_profiles")
      .select("*")
      .eq("wa", seller_wa)
      .single();

    if (!profile) return NextResponse.json({ error: "Profil tidak ditemukan" }, { status: 404 });

    const { pricing } = await getSettings();
    const amount = angkaSetelan(pricing?.proMonthly, 49000);
    const orderId = `PRO-${seller_wa.slice(0, 8)}-${Date.now()}`;
    
    // We can save to a `payments` table with type `subscribe`
    await supa.from("payments").insert({
      listing_id: null, // No specific listing
      type: "subscribe",
      amount,
      status: "pending",
      midtrans_order_id: orderId,
      meta: { wa: seller_wa, final_amount: amount }
    });

    return NextResponse.json({ paymentUrl: "/qris.png", orderId, amount, finalAmount: amount });
  } catch (e) {
    return jawabGalat(e);
  }
}
