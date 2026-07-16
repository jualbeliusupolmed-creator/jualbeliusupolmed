import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { notifySellerNewOffer } from "@/lib/fonnte";
import { formatWa } from "@/lib/constants";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { pushToWa } from "@/lib/webpush";
import { getSellerSession, isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/offers?seller_wa= → semua offer untuk iklan milik seller
export async function GET(req) {
  const seller_wa = formatWa(req.nextUrl.searchParams.get("seller_wa") || "");
  if (!seller_wa) return NextResponse.json({ offers: [] });

  // Otorisasi: daftar tawaran memuat NOMOR & NAMA pembeli (PII). seller_wa itu
  // publik (tampil di tiap iklan), jadi TIDAK boleh dipercaya dari query —
  // wajib cocok dengan sesi penjual, atau admin. Tanpa ini nomor semua pembeli
  // yang menawar bisa dipanen massal.
  const sessionWa = getSellerSession();
  if (!isAdmin() && (!sessionWa || sessionWa !== seller_wa)) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const supa = getAdminClient();

  const { data: listings } = await supa
    .from("listings")
    .select("id, title")
    .eq("seller_wa", seller_wa)
    .in("status", ["active", "sold"]);

  if (!listings?.length) return NextResponse.json({ offers: [] });

  const listingIds = listings.map((l) => l.id);
  const listingMap = Object.fromEntries(listings.map((l) => [l.id, l.title]));

  const { data: offers } = await supa
    .from("price_offers")
    .select("*")
    .in("listing_id", listingIds)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    offers: (offers || []).map((o) => ({
      ...o,
      listing_title: listingMap[o.listing_id] || "",
    })),
  });
}

// POST /api/offers → buat tawaran baru
export async function POST(req) {
  const rl = rateLimit(`offer:${getClientIp(req)}`, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Terlalu banyak permintaan" }, { status: 429 });

  try {
    const { listing_id, buyer_name, buyer_wa, offer_price, message } = await req.json();

    if (!listing_id || !buyer_name || !buyer_wa || !offer_price) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const normalizedWa = formatWa(buyer_wa);
    if (!normalizedWa) return NextResponse.json({ error: "Nomor WA tidak valid" }, { status: 400 });

    const supa = getAdminClient();
    const { data: listing } = await supa
      .from("listings")
      .select("id, title, price, seller_wa, seller_name, status")
      .eq("id", listing_id)
      .single();

    if (!listing) return NextResponse.json({ error: "Iklan tidak ditemukan" }, { status: 404 });
    if (listing.status !== "active") return NextResponse.json({ error: "Iklan tidak aktif" }, { status: 400 });

    const { data: offer, error } = await supa
      .from("price_offers")
      .insert({ listing_id, buyer_name, buyer_wa: normalizedWa, offer_price: Number(offer_price), message: message || null })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Notif WA ke seller (fire-and-forget)
    notifySellerNewOffer(listing.seller_wa, listing.seller_name, {
      ...listing,
      offer: { buyer_name, buyer_wa: normalizedWa, offer_price, message, id: offer.id },
    }).catch(() => {});

    // Push browser ke seller
    pushToWa(supa, listing.seller_wa, {
      title: "Tawaran Harga Baru!",
      body: `${buyer_name} menawar "${listing.title}" — Rp ${Number(offer_price).toLocaleString("id-ID")}`,
      url: "/dashboard",
      tag: `offer-${offer.id}`,
    }).catch(() => {});

    return NextResponse.json({ ok: true, offer });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
