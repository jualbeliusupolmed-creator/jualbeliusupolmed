import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const settings = await getSettings();
  return NextResponse.json({ kapabilitas: settings.kapabilitas || {} });
}

export async function POST(req) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { modules } = await req.json().catch(() => ({}));
  if (!modules || typeof modules !== "object") {
    return NextResponse.json({ error: "modules wajib berupa object" }, { status: 400 });
  }
  const supa = getAdminClient();
  await supa.from("settings").upsert({ key: "kapabilitas", value: modules }, { onConflict: "key" });
  return NextResponse.json({ ok: true });
}
