import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { tokenBotUtama } from "@/lib/botTokens";
import { jawabGalat } from "@/lib/jawabGalat";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!isAdmin()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Alamat bot HANYA dari environment \u2014 tidak ada cadangan yang ditulis di sini.
    //
    // Sampai 26 Agustus 2026 baris ini jatuh ke
    // `https://wa-bot-usu-production.up.railway.app`, rumah lama bot sebelum
    // pindah ke VPS. Nama itu bukan milik kita lagi, dan subdomain Railway bisa
    // diklaim ulang setelah proyeknya dihapus. Sementara beberapa baris di bawah
    // token bot yang masih hidup dikirim sebagai header `Authorization` \u2014 jadi
    // satu env yang kosong atau salah ketik cukup untuk menyerahkan token itu ke
    // siapa pun yang kebetulan memegang nama tersebut.
    //
    // Dua saudaranya sudah lama benar (`admin/baileys/route.js`,
    // `admin/broadcast/group-japri/route.js`): keduanya jatuh ke string kosong
    // dan berhenti. Berkas ini menyusul.
    const rawBotUrl = process.env.BAILEYS_API_URL || "";
    const botUrl = rawBotUrl.replace(/[\u200B-\u200D\uFEFF]/g, "").trim().replace(/\/$/, "");
    if (!botUrl) {
      return NextResponse.json(
        { error: "BAILEYS_API_URL belum dikonfigurasi di environment" },
        { status: 500 }
      );
    }
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
      return NextResponse.json({ error: "Bot tidak merespons (timeout 8 detik). Cek https://bot.jualbeliusupolmed.web.id/health." }, { status: 504 });
    }
    console.error("Bot Logs fetch error:", error);
    return jawabGalat(error);
  }
}
