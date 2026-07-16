import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * GET /api/ratings?listing_id=xxx     -> rating untuk satu listing
 * GET /api/ratings?seller_wa=xxx      -> semua rating + rata-rata untuk satu penjual
 */
export async function GET(req) {
  try {
    const sp = req.nextUrl.searchParams;
    const listingId = sp.get("listing_id");
    const sellerWa = sp.get("seller_wa");

    const supa = getAdminClient();

    if (listingId) {
      const { data, error } = await supa
        .from("seller_ratings")
        .select("*")
        .eq("listing_id", listingId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return NextResponse.json({ rating: data || null });
    }

    if (sellerWa) {
      const { data, error } = await supa
        .from("seller_ratings")
        .select("*")
        .eq("seller_wa", sellerWa)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      const ratings = data || [];
      const avg =
        ratings.length > 0
          ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length
          : null;
      return NextResponse.json({ ratings, avg, count: ratings.length });
    }

    return NextResponse.json({ error: "Param listing_id atau seller_wa diperlukan" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * POST /api/ratings
 * Body: { listing_id, seller_wa, rating (1-5), comment, buyer_name }
 */
export async function POST(req) {
  try {
    const rl = rateLimit(`rating:${getClientIp(req)}`, { limit: 10, windowMs: 60_000 });
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Terlalu sering. Coba lagi dalam ${rl.retryAfter} detik.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { listing_id, seller_wa, rating, comment, buyer_name } = body;

    if (!listing_id || !seller_wa || !rating) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating harus antara 1–5" }, { status: 400 });
    }

    const supa = getAdminClient();

    // Pastikan listing sudah sold
    const { data: listing } = await supa
      .from("listings")
      .select("status, seller_wa")
      .eq("id", listing_id)
      .single();

    if (!listing) {
      return NextResponse.json({ error: "Listing tidak ditemukan" }, { status: 404 });
    }
    if (listing.status !== "sold") {
      return NextResponse.json(
        { error: "Hanya bisa memberi rating untuk barang yang sudah terjual" },
        { status: 400 }
      );
    }

    // Anti-manipulasi: satu listing hanya boleh dinilai SEKALI. Tanpa ini, upsert
    // onConflict bisa dipakai siapa pun (endpoint publik) untuk MENIMPA rating asli
    // penjual berkali-kali (mis. jatuhkan bintang-5 jadi bintang-1).
    const { data: existingRating } = await supa
      .from("seller_ratings")
      .select("id")
      .eq("listing_id", listing_id)
      .maybeSingle();
    if (existingRating) {
      return NextResponse.json(
        { error: "Barang ini sudah pernah diberi rating." },
        { status: 409 }
      );
    }

    const { data, error } = await supa
      .from("seller_ratings")
      .insert({
        listing_id,
        seller_wa: listing.seller_wa,
        rating: Number(rating),
        comment: comment?.trim() || null,
        buyer_name: buyer_name?.trim() || null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ rating: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
