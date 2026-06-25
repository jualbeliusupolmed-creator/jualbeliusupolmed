import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabaseAdmin";

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supa = getAdminClient();
  const [catRes, pushRes] = await Promise.all([
    supa.from("category_subscriptions").select("*").order("created_at", { ascending: false }).limit(500),
    supa.from("push_subscriptions").select("id, created_at, user_agent").order("created_at", { ascending: false }).limit(1000),
  ]);
  return NextResponse.json({
    catSubs: catRes.data || [],
    pushSubs: pushRes.data || [],
  });
}
