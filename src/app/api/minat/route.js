import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// POST /api/minat { listing_id, buyer_wa? } -> notif WA ke penjual
export async function POST(req) {
  try {
    const rl = rateLimit(`minat:${getClientIp(req)}`, { limit: 15, windowMs: 60_000 });
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Terlalu sering. Coba lagi dalam ${rl.retryAfter} detik.` },
        { status: 429 }
      );
    }

    const { listing_id, buyer_wa } = await req.json();
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

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
