import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!isAdmin()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const botUrl = process.env.WA_BOT_URL || "https://wa-bot-usu.up.railway.app";
    const apiKey = (process.env.BAILEYS_API_TOKEN || "jualbeliusu_rahasia").replace(/[\u200B-\u200D\uFEFF]/g, '').trim();

    const res = await fetch(`${botUrl}/logs`, {
      method: "GET",
      headers: {
        "Authorization": apiKey
      },
      // Jangan pakai cache karena log berubah terus
      cache: "no-store"
    });

    if (!res.ok) {
      throw new Error(`Bot API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Bot Logs fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
