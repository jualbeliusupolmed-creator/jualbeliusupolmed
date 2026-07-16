import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { notifyBuyerOfferResult } from "@/lib/fonnte";
import { pushToWa } from "@/lib/webpush";
import { getSellerSession, isAdmin } from "@/lib/auth";
import { formatWa } from "@/lib/constants";

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

    // Otorisasi: hanya PENJUAL pemilik iklan (dari sesi) atau admin yang boleh
    // terima/tolak. Tanpa ini, siapa pun yang menebak id tawaran bisa
    // menerima/menolak atas nama penjual + memicu notifikasi ke pembeli.
    const sessionWa = getSellerSession();
    const sellerWa = formatWa(offer.listings?.seller_wa || "");
    if (!isAdmin() && (!sessionWa || sessionWa !== sellerWa)) {
      return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
    }

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

    // Push browser ke buyer
    pushToWa(supa, offer.buyer_wa, {
      title: action === "accept" ? "Tawaran Diterima! 🎉" : "Tawaran Ditolak",
      body: action === "accept"
        ? `Tawaran kamu untuk "${offer.listings?.title}" diterima penjual`
        : `Tawaran kamu untuk "${offer.listings?.title}" tidak diterima`,
      url: "/dashboard",
      tag: `offer-result-${id}`,
    }).catch(() => {});

    return NextResponse.json({ ok: true, status: newStatus });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
