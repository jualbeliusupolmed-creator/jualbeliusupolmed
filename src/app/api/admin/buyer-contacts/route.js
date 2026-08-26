import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { isAdmin } from "@/lib/auth";
import { cariAman } from "@/lib/cariAman";
import { jawabGalat } from "@/lib/jawabGalat";

export const dynamic = "force-dynamic";

// GET /api/admin/buyer-contacts
// Query params: page, limit, deal_status, seller_wa, listing_id, q (search)
export async function GET(req) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  if (dealStatus) {
    query = query.eq("deal_status", dealStatus);
  }
  if (sellerWa) {
    query = query.eq("seller_wa", sellerWa);
  }
  if (listingId) {
    query = query.eq("listing_id", listingId);
  }
  if (q) {
    const qAman = cariAman(q);
    if (qAman) query = query.or(`buyer_name.ilike.%${qAman}%,buyer_wa.ilike.%${qAman}%,listing_title.ilike.%${qAman}%`);
  }

  const { data, count, error } = await query;
  if (error) {
    return jawabGalat(error);
  }

  return NextResponse.json({
    contacts: data || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  });
}
