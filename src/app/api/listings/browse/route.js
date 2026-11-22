import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { cariAman } from "@/lib/cariAman";
import { jawabGalat } from "@/lib/jawabGalat";
import { normalizeListingCode } from "@/lib/listingCode";
import { getAllListingSpecKeys, parseSpecFilterToken } from "@/lib/listingSpecs";
import { getSellerSessionAsync } from "@/lib/auth";
import {
  applyMarketplaceProvinceScope,
  isCampusInMarketplaceScope,
  loadMarketplaceRegion,
  loadProvinceMarketplaceScope,
} from "@/lib/marketplaceRegion";

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
        "id, listing_code, title, description, price, stock, category, type, campus, university_id, seller_university_id, seller_province_id, area, status, featured, bumped_at, created_at, views, image_url, images, seller_name, seller_wa, condition, sponsored_until, rental_period, distributor_fee, specs",
        { count: "exact" }
      )
      .eq("status", "active");

    if (typeStr && typeStr !== "all" && typeStr !== "default") {
      query = query.in("type", typeStr.split(","));
    } else {
      query = query.in("type", ["barang", "poster", "sewa", "gratis"]);
    }

    if (cat) query = query.eq("category", cat);

    const provinceId = sp.get("province_id") || sp.get("province");
    const universityId = sp.get("university_id");

    const sessionIdentity = await getSellerSessionAsync();
    if (sessionIdentity) {
      const region = await loadMarketplaceRegion(supa, sessionIdentity);
      if (!region.province) {
        return NextResponse.json({ error: "Pilih universitas acuan di profil agar marketplace bisa menampilkan wilayah yang tepat." }, { status: 409 });
      }
      const scope = await loadProvinceMarketplaceScope(supa, region.province);
      const scopedQuery = applyMarketplaceProvinceScope(query, scope);
      if (!scopedQuery) {
        return NextResponse.json({ listings: [], total: 0, page, limit, hasMore: false });
      }
      query = scopedQuery;

      if (universityId && universityId !== "all" && universityId !== "Semua") {
        if (!isCampusInMarketplaceScope(universityId, scope)) {
          return NextResponse.json({ listings: [], total: 0, page, limit, hasMore: false });
        }
        const targetUniversity = scope.universities.find((item) =>
          String(item.id).toLowerCase() === universityId.toLowerCase() ||
          String(item.code).toLowerCase() === universityId.toLowerCase()
        );
        if (!targetUniversity) return NextResponse.json({ listings: [], total: 0, page, limit, hasMore: false });
        query = query.eq("seller_university_id", targetUniversity.id);
      } else if (campus && campus !== "Semua" && campus !== "all") {
        if (!isCampusInMarketplaceScope(campus, scope)) {
          return NextResponse.json({ listings: [], total: 0, page, limit, hasMore: false });
        }
        const targetUniversity = scope.universities.find((item) =>
          String(item.id).toLowerCase() === campus.toLowerCase() ||
          String(item.code).toLowerCase() === campus.toLowerCase()
        );
        if (!targetUniversity) return NextResponse.json({ listings: [], total: 0, page, limit, hasMore: false });
        query = query.eq("seller_university_id", targetUniversity.id);
      }
    } else if (provinceId && provinceId !== "all" && provinceId !== "Semua") {
      query = query.eq("seller_province_id", provinceId);
    } else if (
      (universityId && universityId !== "all" && universityId !== "Semua") ||
      (campus && campus !== "Semua" && campus !== "all")
    ) {
      const requestedUniversity = universityId && universityId !== "all" && universityId !== "Semua"
        ? universityId
        : campus;
      const { data: byId } = await supa.from("universities")
        .select("id")
        .eq("id", requestedUniversity)
        .maybeSingle();
      const { data: byCode } = byId ? { data: null } : await supa.from("universities")
        .select("id")
        .eq("code", requestedUniversity)
        .maybeSingle();
      const targetUniversityId = byId?.id || byCode?.id;
      if (!targetUniversityId) {
        return NextResponse.json({ listings: [], total: 0, page, limit, hasMore: false });
      }
      query = query.eq("seller_university_id", targetUniversityId);
    }
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

    // Deduplikasi: database masih berisi iklan ganda (satu penjual mengiklankan
    // barang yang sama berulang). Hapus duplikat berdasarkan seller_wa + judul
    // sebelum diurutkan/dipaginasi, agar total dan halaman tetap konsisten.
    const seenBySellerTitle = new Set();
    const dedupedSpecs = filteredBySpecs.filter((d) => {
      const seller = String(d.seller_wa || "").toLowerCase();
      const title = String(d.title || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!seller || !title) return true;
      const key = `${seller}:${title}`;
      if (seenBySellerTitle.has(key)) return false;
      seenBySellerTitle.add(key);
      return true;
    });

    // Angkat sponsored aktif ke paling atas (dalam JS supaya pagination tetap benar untuk page 1)
    const now = Date.now();
    const orderedData = page === 1
      ? [
          ...dedupedSpecs.filter((d) => d.sponsored_until && new Date(d.sponsored_until).getTime() > now),
          ...dedupedSpecs.filter((d) => !d.sponsored_until || new Date(d.sponsored_until).getTime() <= now),
        ]
      : dedupedSpecs;
    const data = specFilters.length > 0
      ? orderedData.slice(from, to + 1)
      : orderedData;

    // FIX: Manual join for seller_profiles to avoid Foreign Key schema cache errors
    const sellerWas = [...new Set((data || []).map((d) => d.seller_wa).filter(Boolean))];
    if (sellerWas.length > 0) {
      const { data: profiles } = await supa
        .from("seller_profiles")
        .select("wa, trusted_seller, distributor, subscription_tier, subscription_expires_at, home_university_id, verified_university_id, affiliation_status, student_verified")
        .in("wa", sellerWas);
      
      const profileMap = new Map((profiles || []).map((p) => [p.wa, p]));
      data.forEach((d) => {
        d.seller_profiles = profileMap.get(d.seller_wa) || null;
      });
    }

    // SECURITY: Unconditionally strip seller_wa from every record
    (data || []).forEach((d) => {
      delete d.seller_wa;
    });

    return NextResponse.json(
      {
        listings: data || [],
        total: dedupedSpecs.length,
        page,
        limit,
        hasMore: from + limit < dedupedSpecs.length,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      }
    );
  } catch (e) {
    return jawabGalat(e);
  }
}
