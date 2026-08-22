import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { tokenBotUtama } from "@/lib/botTokens";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!isAdmin()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawBotUrl = process.env.BAILEYS_API_URL || "https://wa-bot-usu-production.up.railway.app";
    const botUrl = rawBotUrl.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
    // Token bot yang ditunjuk BAILEYS_API_URL — nilai pertama daftar, bukan
    // seluruh daftarnya. Lihat catatan di lib/botTokens.js.
    const apiKey = tokenBotUtama();
    if (!apiKey) {
      return NextResponse.json({ error: "BAILEYS_API_TOKEN belum dikonfigurasi di environment" }, { status: 500 });
    }

    const res = await fetch(`${botUrl}/logs`, {
      headers: { Authorization: apiKey },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      throw new Error(`Bot API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    if (error.name === "TimeoutError") {
      return NextResponse.json({ error: "Bot tidak merespons (timeout 8 detik). Cek apakah Railway masih berjalan." }, { status: 504 });
    }
    console.error("Bot Logs fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
