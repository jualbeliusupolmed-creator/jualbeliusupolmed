import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { formatWa } from "@/lib/constants";
import { postWantedToGroup } from "@/lib/fonnte";
import { getSellerSessionAsync } from "@/lib/auth";
import { cariAman } from "@/lib/cariAman";
import { jawabGalat } from "@/lib/jawabGalat";
import { getSettings, isAllowedCampus, getActiveCampuses } from "@/lib/settings";
import {
  isCampusInMarketplaceScope,
  loadMarketplaceRegion,
  loadProvinceMarketplaceScope,
  loadUniversityProvince,
} from "@/lib/marketplaceRegion";

export const dynamic = "force-dynamic";

// GET /api/wanted -> list all wanted listings
// OR GET /api/wanted?buyer_wa=... -> for dashboard
export async function GET(req) {
  try {
    const sp = req.nextUrl.searchParams;
    const buyer_wa = sp.get("buyer_wa");
    const campus = sp.get("campus");
    const university_id = sp.get("university_id");
    const cat = sp.get("cat");
    const q = sp.get("q");

    const supa = getAdminClient();

    if (buyer_wa) {
      const normalizedWa = formatWa(buyer_wa);
      const { data, error } = await supa
        .from("wanted_listings")
        .select("*")
        .eq("buyer_wa", normalizedWa)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return NextResponse.json({ listings: data || [] });
    }

    // List active/resolved wanted from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let query = supa
      .from("wanted_listings")
      .select("*")
      .in("status", ["active", "resolved"])
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: false });

    const sessionWa = await getSellerSessionAsync();
    if (sessionWa) {
      const region = await loadMarketplaceRegion(supa, sessionWa);
      if (!region.province) {
        return NextResponse.json({ error: "Pilih universitas acuan di profil agar daftar barang dicari mengikuti provinsimu." }, { status: 409 });
      }
      const scope = await loadProvinceMarketplaceScope(supa, region.province);

      if (university_id) {
        if (!isCampusInMarketplaceScope(university_id, scope)) return NextResponse.json({ listings: [] });
        query = query.eq("university_id", university_id);
      } else if (campus && campus !== "Semua" && campus !== "all") {
        if (!isCampusInMarketplaceScope(campus, scope)) return NextResponse.json({ listings: [] });
        const campusKey = scope.campusCodes.find((value) => String(value).toLowerCase() === campus.toLowerCase());
        const universityKey = scope.universityIds.find((value) => String(value).toLowerCase() === campus.toLowerCase());
        query = campusKey ? query.eq("campus", campusKey) : query.eq("university_id", universityKey);
      } else {
        const orConditions = ["campus.eq.Semua"];
        if (scope.universityIds?.length) {
          orConditions.push(`university_id.in.(${scope.universityIds.join(",")})`);
        }
        if (scope.campusCodes?.length) {
          orConditions.push(`campus.in.(${scope.campusCodes.join(",")})`);
        }
        query = query.or(orConditions.join(","));
      }
    } else if (university_id) {
      query = query.eq("university_id", university_id);
    } else if (campus && campus !== "Semua" && campus !== "all") {
      query = query.or(`campus.eq.${campus},university_id.eq.${campus.toLowerCase()}`);
    }
    if (cat && cat !== "all") {
      query = query.eq("category", cat);
    }
    if (q) {
      const safeQ = cariAman(q);
      if (safeQ) {
        query = query.or(`title.ilike.%${safeQ}%,description.ilike.%${safeQ}%`);
      }
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    // Guard LID: sembunyikan postingan yang buyer_wa-nya bukan nomor valid
    // (data lama via bot) — kontaknya tak bisa dibuka, jangan tawarkan ke user.
    // Kontak pembeli DIJUAL lewat fitur Buka Kontak — jangan pernah kirim
    // buyer_wa/buyer_name ke daftar publik.
    const listings = (data || [])
      .filter((l) => formatWa(l.buyer_wa) !== "")
      .map(({ buyer_wa: _wa, buyer_name: _nama, ...rest }) => rest);
    return NextResponse.json({ listings });
  } catch (e) {
    return jawabGalat(e);
  }
}


// POST /api/wanted -> create a wanted listing
export async function POST(req) {
  try {
    const rl = rateLimit(`wanted:${getClientIp(req)}`, { limit: 8, windowMs: 60_000 });
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Terlalu banyak permintaan. Coba lagi dalam ${rl.retryAfter} detik.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { buyer_name, buyer_wa, title, description, budget, category, campus, area } = body;

    const normalizedBuyerWa = formatWa(buyer_wa);
    const sessionWa = await getSellerSessionAsync();
    
    if (!sessionWa || sessionWa !== normalizedBuyerWa) {
      return NextResponse.json({ error: "Sesi tidak valid atau telah berakhir. Silakan login kembali." }, { status: 401 });
    }

    if (!buyer_name || !buyer_wa || !title || !category) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    if (!normalizedBuyerWa) {
      return NextResponse.json({ error: "Nomor WA tidak valid" }, { status: 400 });
    }


    const supa = getAdminClient();
    const settings = await getSettings();
    if (!isAllowedCampus(campus || "Semua", settings, { allowAll: true })) {
      return NextResponse.json({ error: "Kampus permintaan tidak valid atau sudah tidak tersedia." }, { status: 400 });
    }

    // Cek blacklist — normalized
    const { data: bl } = await supa
      .from("blacklist")
      .select("id")
      .eq("wa", normalizedBuyerWa)
      .maybeSingle();
    if (bl) {
      return NextResponse.json(
        { error: "Nomor WA ini diblokir admin." },
        { status: 403 }
      );
    }

    // Profil pembeli & resolusi afiliasi kampus kanonikal
    const { data: buyerProfile } = await supa
      .from("seller_profiles")
      .select("user_id, home_university_id, verified_university_id, affiliation_status")
      .eq("wa", normalizedBuyerWa)
      .maybeSingle();

    const region = await loadMarketplaceRegion(supa, sessionWa);
    const activeCampuses = getActiveCampuses(settings);
    let resolvedCampus = String(campus || "").trim();
    const explicitAllCampuses = !resolvedCampus || resolvedCampus.toLowerCase() === "semua";

    // Auto-resolve afiliansi & provinsi jika belum diisi di profil (Pola Resilient Service)
    let buyerUniversityId = (region.profile?.affiliation_status === "verified_student" || region.profile?.student_verified) && region.profile?.verified_university_id
      ? region.profile.verified_university_id
      : buyerProfile?.home_university_id;
    let buyerProvince = region.province;

    if (!buyerUniversityId || !buyerProvince) {
      const fallbackUni = activeCampuses.find((c) =>
        String(c.shortName || "").toLowerCase() === resolvedCampus.toLowerCase() ||
        String(c.id || "").toLowerCase() === resolvedCampus.toLowerCase()
      ) || activeCampuses[0];

      buyerUniversityId = fallbackUni?.id || "usu";
      buyerProvince = fallbackUni?.provinceId || "sumatera-utara";

      // Simpan preferensi acuan di background agar profil terisi otomatis
      supa.from("seller_profiles")
        .update({ home_university_id: buyerUniversityId, marketplace_province_id: buyerProvince })
        .eq("wa", normalizedBuyerWa)
        .then(() => {})
        .catch(() => {});
    }

    const buyerProvinceScope = await loadProvinceMarketplaceScope(supa, buyerProvince);
    let resolvedUniversityId = buyerUniversityId;

    if (explicitAllCampuses) {
      const homeCampus = activeCampuses.find((item) => item.id === buyerUniversityId);
      resolvedCampus = homeCampus?.shortName || "";
    } else {
      const targetUni = activeCampuses.find(
        (c) => String(c.shortName || "").trim().toLowerCase() === String(campus).trim().toLowerCase() ||
               String(c.id || "").trim().toLowerCase() === String(campus).trim().toLowerCase()
      );
      if (!targetUni || !isCampusInMarketplaceScope(targetUni.id, buyerProvinceScope)) {
        return NextResponse.json({ error: "Kamu hanya bisa mencari barang dari kampus di provinsi acuanmu." }, { status: 403 });
      }
      const targetRegion = await loadUniversityProvince(supa, targetUni.id);
      if (targetRegion?.province_id && targetRegion.province_id !== buyerProvince) {
        return NextResponse.json({ error: "Kamu hanya bisa mencari barang dari kampus di provinsi acuanmu." }, { status: 403 });
      }
      resolvedCampus = targetUni.shortName;
      resolvedUniversityId = targetUni.id;
    }

    // Cek jumlah wanted listing sebelumnya dari nomor WA pembeli ini
    const { count: pastWantedCount, error: countError } = await supa
      .from("wanted_listings")
      .select("id", { count: "exact", head: true })
      .eq("buyer_wa", normalizedBuyerWa);

    if (countError) throw new Error(countError.message);

    const isFree = (pastWantedCount || 0) < 3;
    const status = isFree ? "active" : "pending";

    const { data: listing, error } = await supa
      .from("wanted_listings")
      .insert({
        user_id: buyerProfile?.user_id || null,
        university_id: resolvedUniversityId,
        buyer_name,
        buyer_wa: normalizedBuyerWa,
        title,
        description: description || "",
        budget: Math.round(Number(budget)) || 0,
        category,
        campus: resolvedCampus,
        area: area || "Sekitar Kampus",
        status: status,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Jika gratis (di bawah 3 postingan pertama)
    if (isFree) {
      // Kirim notifikasi WhatsApp ke Grup secara background non-blocking (Pola Background Jobs)
      void postWantedToGroup(listing).catch((err) => {
        console.error("Fonnte wanted group notification error:", err?.message);
      });
      return NextResponse.json({ listing, isFree: true });
    }

    // Jika berbayar (postingan ke-4 dst)
    const amount = 1000;
    const orderId = `WNT-${listing.id.slice(0, 8)}-${Date.now()}`;

    await supa.from("payments").insert({
      listing_id: null,
      type: "iklan",
      amount,
      status: "pending",
      midtrans_order_id: orderId,
      meta: { wanted_id: listing.id }
    });

    const paymentUrl = "/qris.png";
    return NextResponse.json({ listing, paymentUrl, isFree: false });
  } catch (e) {
    return jawabGalat(e);
  }
}
