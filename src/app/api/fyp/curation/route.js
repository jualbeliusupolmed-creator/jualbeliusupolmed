import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import {
  findProvinceListings,
  findRecentSoldProvinceListings,
  loadProvinceContext,
  readProvinceCuration,
} from "@/lib/fypCuration";
import { getSellerSessionAsync } from "@/lib/auth";
import { loadMarketplaceRegion } from "@/lib/marketplaceRegion";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request) {
  const supa = getAdminClient();
  let provinceId = new URL(request.url).searchParams.get("provinceId");
  const sessionIdentity = await getSellerSessionAsync();
  if (sessionIdentity) {
    try {
      const region = await loadMarketplaceRegion(supa, sessionIdentity);
      if (!region.province) return NextResponse.json({ error: "Pilih universitas acuan di profil untuk melihat FYP provinsimu." }, { status: 409 });
      provinceId = region.province;
    } catch {
      return NextResponse.json({ error: "Wilayah akun belum dapat diperiksa." }, { status: 503 });
    }
  }
  if (!provinceId) return NextResponse.json({ items: [] });
  try {
    const context = await loadProvinceContext(supa, provinceId.toLowerCase());
    if (!context) return NextResponse.json({ items: [] });
    const [{ ids }, sold] = await Promise.all([
      readProvinceCuration(supa, context),
      findRecentSoldProvinceListings(supa, context),
    ]);
    const rows = ids.length ? await findProvinceListings(supa, context, { ids, limit: ids.length }) : [];
    const byId = new Map(rows.map((item) => [String(item.id), item]));
    const curated = ids.map((id) => byId.get(id)).filter(Boolean);
    const curatedIds = new Set(curated.map((item) => String(item.id)));
    return NextResponse.json({
      provinceId: context.province.id,
      items: [...curated, ...sold.filter((item) => !curatedIds.has(String(item.id)))],
    });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
