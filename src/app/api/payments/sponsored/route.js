import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { hasUnpaidSoldFees } from "@/lib/settings";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const SPONSORED_PER_DAY = 7000; // Rp 7.000 / hari

// POST /api/payments/sponsored  { listing_id, days }
export async function POST(req) {
  try {
    const rl = rateLimit(getClientIp(req), { limit: 10, windowMs: 60_000 });
    if (!rl.ok) return NextResponse.json({ error: "Terlalu banyak permintaan. Coba lagi sebentar." }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });

    const { listing_id, days: daysRaw } = await req.json();
    const days = Math.min(30, Math.max(1, Number(daysRaw) || 1));

    if (!listing_id) return NextResponse.json({ error: "listing_id wajib" }, { status: 400 });

    const supa = getAdminClient();
    const { data: listing } = await supa
      .from("listings")
      .select("*")
      .eq("id", listing_id)
      .single();

    if (!listing) return NextResponse.json({ error: "Listing tidak ada" }, { status: 404 });
    if (listing.status !== "active") return NextResponse.json({ error: "Hanya iklan aktif yang bisa disponsori" }, { status: 400 });

    const locked = await hasUnpaidSoldFees(supa, listing.seller_wa);
    if (locked) {
      return NextResponse.json({ error: "Akun terkunci karena tagihan sold fee belum lunas" }, { status: 403 });
    }

    const amount = SPONSORED_PER_DAY * days;
    const orderId = `SPON-${listing_id.slice(0, 8)}-${Date.now()}`;

    await supa.from("payments").insert({
      listing_id,
      type: "sponsored",
      amount,
      status: "pending",
      midtrans_order_id: orderId,
      meta: { days },
    });

    const paymentUrl = "/qris.png";
    return NextResponse.json({ paymentUrl, orderId, amount });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
