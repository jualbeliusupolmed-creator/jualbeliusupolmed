import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!isAdmin()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const botUrl = process.env.BAILEYS_API_URL || "https://wa-bot-usu-production.up.railway.app";
    const rawToken = process.env.BAILEYS_API_TOKEN;
    if (!rawToken) {
      return NextResponse.json({ error: "BAILEYS_API_TOKEN belum dikonfigurasi di environment" }, { status: 500 });
    }
    const apiKey = rawToken.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();

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
