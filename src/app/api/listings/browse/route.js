import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/**
 * GET /api/listings/browse
 * Query params:
 *   page     : number (1-indexed, default 1)
 *   limit    : number (default 20, max 40)
 *   cat      : string category name (optional)
 *   q        : string search query (optional)
 *   minPrice : number (optional)
 *   maxPrice : number (optional)
 *   sort     : "bumped" | "newest" | "price_asc" | "price_desc" (default "bumped")
 */
export async function GET(req) {
  try {
    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get("page") || 1));
    const limit = Math.min(40, Math.max(1, Number(sp.get("limit") || 20)));
    const cat = sp.get("cat") || "";
    const q = sp.get("q") || "";
    const minPrice = sp.get("minPrice") ? Number(sp.get("minPrice")) : null;
    const maxPrice = sp.get("maxPrice") ? Number(sp.get("maxPrice")) : null;
    const sort = sp.get("sort") || "bumped";
    const campus = sp.get("campus") || "";

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const supa = getAdminClient();
    let query = supa
      .from("listings")
      .select("*", { count: "exact" })
      .eq("status", "active");

    if (cat) query = query.eq("category", cat);
    if (campus && campus !== "Semua") query = query.eq("campus", campus);
    if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
    if (minPrice !== null) query = query.gte("price", minPrice);
    if (maxPrice !== null) query = query.lte("price", maxPrice);

    // Sort
    switch (sort) {
      case "newest":
        query = query.order("created_at", { ascending: false, nullsFirst: false });
        break;
      case "views":
        query = query.order("views", { ascending: false, nullsFirst: false });
        break;
      case "price_asc":
        query = query.order("price", { ascending: true });
        break;
      case "price_desc":
        query = query.order("price", { ascending: false });
        break;
      default: // "bumped" — featured dulu, lalu bumped_at terbaru
        query = query
          .order("featured", { ascending: false, nullsFirst: false })
          .order("bumped_at", { ascending: false, nullsFirst: false });
    }

    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json({
      listings: data || [],
      total: count || 0,
      page,
      limit,
      hasMore: from + limit < (count || 0),
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
