import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { formatWa } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { wa } = await req.json();
    const normalizedWa = formatWa(wa);
    
    if (!normalizedWa) {
      return NextResponse.json({ hasPin: false });
    }
    
    const supa = getAdminClient();
    const { data: profile } = await supa
      .from("seller_profiles")
      .select("wa, pin")
      .eq("wa", normalizedWa)
      .maybeSingle();
      
    if (profile && profile.pin) {
      return NextResponse.json({ hasPin: true });
    }
    return NextResponse.json({ hasPin: false });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
