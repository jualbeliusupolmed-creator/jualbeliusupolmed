import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const BAILEYS_URL = (process.env.BAILEYS_API_URL || "").replace(/[\u200B-\u200D\uFEFF]/g, "").trim().replace(/\/$/, "");
const BAILEYS_TOKEN = (process.env.BAILEYS_API_TOKEN || "jualbeliusu_rahasia").replace(/[\u200B-\u200D\uFEFF]/g, "").trim();

export async function POST(req) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!BAILEYS_URL) {
    return NextResponse.json({ error: "BAILEYS_API_URL belum diset" }, { status: 503 });
  }

  try {
    const { jid, message, imageUrl } = await req.json();
    if (!jid || !message) {
      return NextResponse.json({ error: "JID Grup dan pesan wajib diisi" }, { status: 400 });
    }

    // 1. Dapatkan daftar anggota grup dari Baileys
    let participants = [];
    try {
      // Endpoint yang umum di Baileys API untuk mendapatkan info grup
      const res = await fetch(`${BAILEYS_URL}/groups/${encodeURIComponent(jid)}`, {
        headers: { Authorization: BAILEYS_TOKEN },
        cache: "no-store",
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Gagal mengambil data grup");
      
      // Ambil array participants
      participants = data.participants || data.data?.participants || [];
    } catch (err) {
      // Fallback jika endpoint di atas gagal
      const resFallback = await fetch(`${BAILEYS_URL}/groups`, {
        headers: { Authorization: BAILEYS_TOKEN },
        cache: "no-store",
      });
      const dataFallback = await resFallback.json();
      const groupData = (dataFallback.groups || dataFallback.data || []).find((g) => g.id === jid || g.jid === jid);
      
      if (groupData && Array.isArray(groupData.participants)) {
        participants = groupData.participants;
      } else {
        throw new Error("Gagal mengambil daftar anggota grup. Pastikan bot adalah anggota grup.");
      }
    }

    if (!participants || participants.length === 0) {
      return NextResponse.json({ error: "Grup tidak ditemukan atau tidak memiliki anggota" }, { status: 404 });
    }

    // 2. Lakukan perulangan untuk mengirim pesan japri
    let successCount = 0;
    let failCount = 0;

    // Lakukan secara async tapi tidak memblokir response langsung jika pesertanya banyak?
    // Jika berjalan di serverless, proses background bisa terputus. Kita kembalikan response awal, tapi eksekusi berlanjut (dengan resiko terputus oleh Vercel).
    // Cara teraman: Eksekusi berurutan (jika < 200 anggota, masih sempat sebelum Vercel timeout 10-15s).
    // Tapi untuk aman, kita batch dan eksekusi.
    
    // Format pesan
    const payloadMsg = imageUrl ? { text: message, url: imageUrl } : { text: message };

    for (const p of participants) {
      // Ambil id dari objek participant (biasanya p.id)
      const targetJid = p.id || p.jid || p;
      if (!targetJid || typeof targetJid !== "string") continue;
      
      try {
        const sendRes = await fetch(`${BAILEYS_URL}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: BAILEYS_TOKEN },
          body: JSON.stringify({ target: targetJid, ...payloadMsg }),
        });
        if (sendRes.ok) successCount++;
        else failCount++;
        
        // Jeda untuk menghindari blokir WhatsApp
        await new Promise(r => setTimeout(r, 1000));
      } catch (err) {
        failCount++;
      }
    }

    return NextResponse.json({ 
      ok: true, 
      successCount, 
      failCount, 
      total: participants.length 
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
