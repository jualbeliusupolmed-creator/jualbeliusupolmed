import { NextResponse } from "next/server";
import { getSellerSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const wa = getSellerSession();
  if (!wa) {
    return NextResponse.json({ loggedIn: false, wa: null });
  }
  return NextResponse.json({ loggedIn: true, wa });
}
