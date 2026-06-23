import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { notifyBuyerOfferResult } from "@/lib/fonnte";

export const dynamic = "force-dynamic";

// PATCH /api/offers/[id]  { action: "accept" | "reject" }
export async function PATCH(req, { params }) {
  try {
    const { id } = params;
    const { action } = await req.json();

    if (!["accept", "reject"].includes(action)) {
      return NextResponse.json({ error: "Action tidak valid" }, { status: 400 });
    }

    const supa = getAdminClient();
    const { data: offer } = await supa
      .from("price_offers")
      .select("*, listings(title, seller_wa, seller_name)")
      .eq("id", id)
      .single();

    if (!offer) return NextResponse.json({ error: "Tawaran tidak ditemukan" }, { status: 404 });
    if (offer.status !== "pending") return NextResponse.json({ error: "Tawaran sudah diproses" }, { status: 400 });

    const newStatus = action === "accept" ? "accepted" : "rejected";
    await supa.from("price_offers").update({ status: newStatus }).eq("id", id);

    // Notif ke buyer (fire-and-forget)
    notifyBuyerOfferResult(offer.buyer_wa, offer.buyer_name, {
      listing_title: offer.listings?.title,
      offer_price: offer.offer_price,
      seller_wa: offer.listings?.seller_wa,
      accepted: action === "accept",
    }).catch(() => {});

    return NextResponse.json({ ok: true, status: newStatus });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
