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
  let profile = null;
  try {
    const supa = getAdminClient();
    const { data } = await supa
      .from("seller_profiles")
      .select("*")
      .eq("wa", wa)
      .maybeSingle();

    profile = data;
    name = profile?.name || profile?.store_name || "";
  } catch (_) {}

  return NextResponse.json({ loggedIn: true, wa, name, profile });
}
