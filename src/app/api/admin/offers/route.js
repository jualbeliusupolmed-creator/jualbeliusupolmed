import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabaseAdmin";

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supa = getAdminClient();
  const { data, error } = await supa
    .from("price_offers")
    .select("*, listings(title, seller_wa, seller_name)")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ offers: data || [] });
}
