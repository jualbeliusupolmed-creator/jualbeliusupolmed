import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// GET /api/listings/batch?ids=id1,id2,id3
// Kembalikan status terkini (id, status, price, title, stock) untuk list ID
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("ids") || "";
  const ids = raw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 50);

  if (ids.length === 0) return NextResponse.json([]);

  const supa = getAdminClient();
  const { data, error } = await supa
    .from("listings")
    .select("id, status, price, title, stock, image_url, category, seller_name")
    .in("id", ids);

  if (error) return NextResponse.json([], { status: 500 });
  return NextResponse.json(data || []);
}
