import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { findProvinceListings, loadProvinceContext, readProvinceCuration } from "@/lib/fypCuration";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request) {
  const provinceId = new URL(request.url).searchParams.get("provinceId");
  if (!provinceId) return NextResponse.json({ items: [] });
  try {
    const supa = getAdminClient();
    const context = await loadProvinceContext(supa, provinceId.toLowerCase());
    if (!context) return NextResponse.json({ items: [] });
    const { ids } = await readProvinceCuration(supa, context);
    if (!ids.length) return NextResponse.json({ items: [] });
    const rows = await findProvinceListings(supa, context, { ids, limit: ids.length });
    const byId = new Map(rows.map((item) => [String(item.id), item]));
    return NextResponse.json({ items: ids.map((id) => byId.get(id)).filter(Boolean) });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
