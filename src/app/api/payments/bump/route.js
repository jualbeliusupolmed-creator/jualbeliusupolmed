import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSettings, hasUnpaidSoldFees } from "@/lib/settings";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { tolakBukanPemilik } from "@/lib/kepemilikan";
import { jawabGalat } from "@/lib/jawabGalat";

export const dynamic = "force-dynamic";

// POST /api/payments/bump  { listing_id } -> snap token untuk bump Rp1.000
//
// Kepemilikan diperiksa, bukan sekadar keberadaan iklan. Sampai 26 Agustus 2026
// rute ini tidak menoleh ke sesi sama sekali: `listing_id` dari body dipakai
// untuk mencari `seller_wa`, lalu kuota `free_bumps` MILIK PENJUAL ITU dipotong.
// Artinya siapa pun yang tahu satu id iklan bisa menghabiskan jatah bump gratis
// pemiliknya sampai nol — tanpa login, tanpa bayar, tanpa si pemilik tahu.
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

    const tolak = tolakBukanPemilik(listing.seller_wa, { aksi: "menyundul iklan" });
    if (tolak) return tolak;

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
    await supa.from("payments").insert({
      listing_id,
      type: "bump",
      amount,
      status: "pending",
      midtrans_order_id: orderId,
      meta: { final_amount: amount },
    });

    return NextResponse.json({ paymentUrl: "/qris.png", orderId, amount, finalAmount: amount });
  } catch (e) {
    return jawabGalat(e);
  }
}
