import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSettings, hasUnpaidSoldFees } from "@/lib/settings";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { createKlikQrisTransaction } from "@/lib/klikqris";

export const dynamic = "force-dynamic";

// POST /api/payments/bump  { listing_id } -> snap token untuk bump Rp1.000
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

    // Check if seller has unpaid sold fees (Account locked - Cara 2)
    const locked = await hasUnpaidSoldFees(supa, listing.seller_wa);
    if (locked) {
      return NextResponse.json(
        { error: "Akun Anda terkunci karena memiliki tagihan komisi (Sold Fee) yang belum dibayar. Silakan lunasi tagihan tersebut di Dashboard sebelum menyundul iklan." },
        { status: 403 }
      );
    }

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
    const { qrisUrl, signature, totalAmount } = await createKlikQrisTransaction(
      orderId, amount, `Bump iklan`
    );
    await supa.from("payments").insert({
      listing_id,
      type: "bump",
      amount,
      status: "pending",
      midtrans_order_id: orderId,
      meta: { final_amount: totalAmount, klikqris_signature: signature },
    });

    return NextResponse.json({ paymentUrl: qrisUrl, orderId, amount, finalAmount: totalAmount });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
