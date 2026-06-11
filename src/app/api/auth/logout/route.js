import { NextResponse } from "next/server";
import { clearSellerCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  clearSellerCookie();
  return NextResponse.json({ success: true });
}
