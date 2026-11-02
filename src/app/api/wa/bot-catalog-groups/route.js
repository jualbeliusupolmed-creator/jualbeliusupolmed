import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { tokenBotSah } from "@/lib/botTokens";

export const dynamic = "force-dynamic";

/** Read-only bridge for the authenticated WhatsApp bot to import legacy targets. */
export async function GET(request) {
  if (!tokenBotSah(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const settings = await getSettings().catch(() => null);
  if (!settings) {
    return NextResponse.json({ error: "Pengaturan tujuan lama belum dapat dibaca." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const admin = settings.admin || {};
  const extra = Array.isArray(admin.extraGroups)
    ? admin.extraGroups
    : String(admin.extraGroups || "").split(/[\n,;]+/);
  const groups = [admin.groupJid, ...extra]
    .map((value) => String(value || "").trim())
    .filter((jid) => /^[0-9-]{1,128}@g\.us$/.test(jid));

  return NextResponse.json({ groups: [...new Set(groups)] }, { headers: { "Cache-Control": "no-store" } });
}
