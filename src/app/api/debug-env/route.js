// TEMPORARY DEBUG ENDPOINT - DELETE AFTER USE
// Cek env vars yang aktual di server Vercel production
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const secret = req.nextUrl.searchParams.get("s");
  if (secret !== "dbg_usu_2026") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    ADMIN_WA: process.env.ADMIN_WA || "(empty)",
    SUPER_ADMIN_WA: process.env.SUPER_ADMIN_WA || "(empty)",
    MARKETPLACE_WA: process.env.MARKETPLACE_WA || "(empty)",
    BAILEYS_API_URL: process.env.BAILEYS_API_URL || "(empty)",
    BAILEYS_API_TOKEN: process.env.BAILEYS_API_TOKEN ? process.env.BAILEYS_API_TOKEN.slice(0, 10) + "..." : "(empty)",
  });
}
