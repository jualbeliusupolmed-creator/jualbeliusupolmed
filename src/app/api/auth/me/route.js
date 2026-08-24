import { NextResponse } from "next/server";
import { getSellerSession } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  const wa = getSellerSession();
  if (!wa) {
    return NextResponse.json({ loggedIn: false, wa: null, name: "" });
  }

  let name = "";
  try {
    const supa = getAdminClient();
    const { data: profile } = await supa
      .from("seller_profiles")
      .select("name, store_name")
      .eq("wa", wa)
      .maybeSingle();

    name = profile?.name || profile?.store_name || "";
  } catch (_) {}

  return NextResponse.json({ loggedIn: true, wa, name });
}
