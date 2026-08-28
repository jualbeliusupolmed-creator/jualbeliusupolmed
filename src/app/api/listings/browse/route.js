import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { cariAman } from "@/lib/cariAman";
import { jawabGalat } from "@/lib/jawabGalat";
import { normalizeListingCode } from "@/lib/listingCode";
import { getAllListingSpecKeys, parseSpecFilterToken } from "@/lib/listingSpecs";

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
  // ADDED: Rate limit to prevent bot scraping of seller phone numbers
  const rl = rateLimit(`browse:${getClientIp(req)}`, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Terlalu banyak permintaan. Coba lagi dalam ${rl.retryAfter} detik.` },
      { status: 429 }
    );
  }

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
    const nego = sp.get("nego") === "1";
    const typeStr = sp.get("type") || "";
    const condition = sp.get("condition") || "";
    const exactCode = normalizeListingCode(q);
    const allowedSpecKeys = new Set(getAllListingSpecKeys());
    const specFilters = sp
      .getAll("spec")
      .map(parseSpecFilterToken)
      .filter((item) => item && allowedSpecKeys.has(item.key));

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const supa = getAdminClient();
    let query = supa
      .from("listings")
      // SECURITY: We fetch seller_wa internally to map profiles, then delete it before returning
      .select(
        "id, listing_code, title, description, price, stock, category, type, campus, area, status, featured, bumped_at, created_at, views, image_url, images, seller_name, seller_wa, condition, sponsored_until, rental_period, distributor_fee, specs",
        { count: "exact" }
      )
      .eq("status", "active");

    if (typeStr && typeStr !== "all") {
      query = query.in("type", typeStr.split(","));
    } else if (typeStr !== "all") {
      query = query.in("type", ["barang", "poster", "sewa"]);
    }

    if (cat) query = query.eq("category", cat);
    if (campus && campus !== "Semua") query = query.eq("campus", campus);
    if (exactCode.length >= 6) {
      query = query.eq("listing_code", exactCode);
    } else if (q) {
      const qAman = cariAman(q);
      if (qAman) query = query.or(`title.ilike.%${qAman}%,description.ilike.%${qAman}%`);
    }
    if (minPrice !== null) query = query.gte("price", minPrice);
    if (maxPrice !== null) query = query.lte("price", maxPrice);
    if (nego) query = query.ilike("description", "%nego%");
    if (condition && condition !== "all") query = query.eq("condition", condition);

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

    query = query.range(specFilters.length > 0 ? 0 : from, specFilters.length > 0 ? 499 : to);

    const { data: rawData, error, count } = await query;
    if (error) throw new Error(error.message);

    const filteredBySpecs = specFilters.length > 0
      ? (rawData || []).filter((item) =>
          specFilters.every((spec) =>
            String(item.specs?.[spec.key] || "")
              .toLowerCase()
              .includes(String(spec.value || "").toLowerCase())
          )
        )
      : rawData || [];

    // Angkat sponsored aktif ke paling atas (dalam JS supaya pagination tetap benar untuk page 1)
    const now = Date.now();
    const orderedData = page === 1
      ? [
          ...filteredBySpecs.filter((d) => d.sponsored_until && new Date(d.sponsored_until).getTime() > now),
          ...filteredBySpecs.filter((d) => !d.sponsored_until || new Date(d.sponsored_until).getTime() <= now),
        ]
      : filteredBySpecs;
    const data = specFilters.length > 0
      ? orderedData.slice(from, to + 1)
      : orderedData;

    // FIX: Manual join for seller_profiles to avoid Foreign Key schema cache errors
    const sellerWas = [...new Set((data || []).map((d) => d.seller_wa).filter(Boolean))];
    if (sellerWas.length > 0) {
      const { data: profiles } = await supa
        .from("seller_profiles")
        .select("wa, trusted_seller, distributor, subscription_tier, subscription_expires_at")
        .in("wa", sellerWas);
      
      const profileMap = new Map((profiles || []).map((p) => [p.wa, p]));
      data.forEach((d) => {
        d.seller_profiles = profileMap.get(d.seller_wa) || null;
        delete d.seller_wa; // SECURITY: Don't leak to public
      });
    }

    return NextResponse.json({
      listings: data || [],
      total: specFilters.length > 0 ? filteredBySpecs.length : (count || 0),
      page,
      limit,
      hasMore: from + limit < (specFilters.length > 0 ? filteredBySpecs.length : (count || 0)),
    });
  } catch (e) {
    return jawabGalat(e);
  }
}
