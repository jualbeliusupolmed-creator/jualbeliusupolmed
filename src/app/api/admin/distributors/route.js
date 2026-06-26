import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// GET /api/admin/distributors → semua penjual + info distributor
export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supa = getAdminClient();

  const { data: profiles } = await supa
    .from("seller_profiles")
    .select("wa, name, distributor, subscription_tier")
    .order("name");

  if (!profiles?.length) return NextResponse.json({ distributors: [] });

  // Ambil semua kategori distributor sekaligus
  const { data: catRows } = await supa
    .from("distributor_categories")
    .select("seller_wa, category");

  const catMap = {};
  for (const r of catRows || []) {
    if (!catMap[r.seller_wa]) catMap[r.seller_wa] = [];
    catMap[r.seller_wa].push(r.category);
  }

  const distributors = profiles.map((p) => ({
    ...p,
    dist_categories: catMap[p.wa] || [],
  }));

  return NextResponse.json({ distributors });
}
