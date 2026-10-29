import { NextResponse } from "next/server";
import { getSellerSession, setSellerCookie } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { findSellerProfileBySession } from "@/lib/seller-profile-identity";
import { formatWa } from "@/lib/constants";

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
    const { data } = await findSellerProfileBySession(supa, wa, "*");

    profile = data;
    name = profile?.name || profile?.store_name || "";
    if (profile) setSellerCookie(formatWa(profile.phone_wa || profile.wa) || profile.wa);
  } catch (_) {}
  if (!profile) setSellerCookie(wa);

  return NextResponse.json({ loggedIn: true, wa: profile?.phone_wa || profile?.wa || wa, name, profile });
}
