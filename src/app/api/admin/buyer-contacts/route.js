import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { tolakAdmin } from "@/lib/cronAuth";

export const dynamic = "force-dynamic";

// GET /api/admin/buyer-contacts
// Query params: page, limit, deal_status, seller_wa, listing_id, q (search)
export async function GET(req) {
  const tolak = await tolakAdmin(req);
  if (tolak) return tolak;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "50"));
  const dealStatus = searchParams.get("deal_status") || null;
  const sellerWa = searchParams.get("seller_wa") || null;
  const listingId = searchParams.get("listing_id") || null;
  const q = (searchParams.get("q") || "").trim();

  const supa = getAdminClient();
  let query = supa
    .from("buyer_contacts")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (dealStatus) query = query.eq("deal_status", dealStatus);
  if (sellerWa) query = query.eq("seller_wa", sellerWa);
  if (listingId) query = query.eq("listing_id", listingId);
  if (q) {
    // Cari di judul iklan, nama/WA pembeli, atau nama penjual
    query = query.or(
      `listing_title.ilike.%${q}%,buyer_name.ilike.%${q}%,buyer_wa.ilike.%${q}%,seller_name.ilike.%${q}%`
    );
  }

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    contacts: data || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  });
}
