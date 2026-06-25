import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// GET /api/listings/search?q=...&category=...&campus=...&limit=10
export async function GET(req) {
  const { searchParams } = req.nextUrl;
  const q = (searchParams.get("q") || "").trim();
  const category = searchParams.get("category") || "";
  const campus = searchParams.get("campus") || "";
  const limit = Math.min(20, Math.max(1, parseInt(searchParams.get("limit") || "10")));

  if (!q && !category) {
    return NextResponse.json({ listings: [] });
  }

  const supa = getAdminClient();
  let query = supa
    .from("listings")
    .select("id, title, price, description, category, condition, campus, area, image_url, images, seller_wa, seller_name, sponsored_until, bumped_at, created_at")
    .eq("status", "active");

  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  }
  if (category) {
    query = query.eq("category", category);
  }
  if (campus && campus !== "Semua") {
    query = query.or(`campus.eq.${campus},campus.eq.Semua`);
  }

  const { data, error } = await query
    .order("sponsored_until", { ascending: false, nullsFirst: false })
    .order("bumped_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Non-blocking: rekam query untuk tren pencarian
  if (q) {
    getAdminClient().from("search_logs").insert({
      query: q.toLowerCase().slice(0, 100),
      results_count: data?.length || 0,
    }).catch(() => {});
  }

  return NextResponse.json({ listings: data || [], total: data?.length || 0 });
}
