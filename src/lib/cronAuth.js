import { NextResponse } from "next/server";
import crypto from "crypto";
import { tokenBotSah } from "@/lib/botTokens";

// Gerbang tunggal untuk semua rute /api/cron/*.
// Mendukung CRON_SECRET (Vercel) dan token bot Baileys (VPS crontab).
export function tolakCron(req) {
  const rahasia = process.env.CRON_SECRET;
  const dikirim = req.headers.get("authorization") || "";

  if (tokenBotSah(dikirim)) {
    return null;
  }

  if (!rahasia) {
    return NextResponse.json(
      {
        error:
          "CRON_SECRET belum diset di lingkungan produksi. Rute cron sengaja " +
          "ditutup sampai rahasianya diisi — tanpa itu, siapa pun bisa " +
          "memicunya.",
      },
      { status: 503 }
    );
  }

  const diharapkan = `Bearer ${rahasia}`;
  const a = crypto.createHash("sha256").update(dikirim).digest();
  const b = crypto.createHash("sha256").update(diharapkan).digest();
  if (crypto.timingSafeEqual(a, b)) {
    return null;
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
