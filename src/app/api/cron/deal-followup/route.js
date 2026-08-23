import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { tolakCron } from "@/lib/cronAuth";
import { sendWa } from "@/lib/fonnte";

export const dynamic = "force-dynamic";
// Loop kirim WA berjeda (anti-ban) mudah melewati batas default 10-15 detik —
// fungsi yang dibunuh di tengah loop meninggalkan sebagian penerima tanpa pesan.
export const maxDuration = 300;

// GET /api/cron/deal-followup
// Berjalan setiap jam (misal 0 * * * *)
// Mencari kontak pembeli yang sudah 24 jam tapi masih pending
export async function GET(req) {
  const tolak = tolakCron(req);
  if (tolak) return tolak;

  const supa = getAdminClient();
  
  // 24 jam yang lalu
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  // Ambil max 20 kontak yang belum di-followup dan usianya > 24 jam
  const { data: contacts, error } = await supa
    .from("buyer_contacts")
    .select("id, listing_code, listing_title, seller_wa, seller_name, buyer_name")
    .eq("deal_status", "pending")
    .is("followup_sent_at", null)
    .lte("created_at", yesterday)
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!contacts || contacts.length === 0) {
    return NextResponse.json({ sent: 0, message: "Tidak ada kontak yang perlu di-follow up" });
  }

  let successCount = 0;
  for (const c of contacts) {
    if (!c.seller_wa) continue;

    const shortId = c.id.split('-')[0]; // UUID dipotong buat command bot
    const msg =
      `🤖 *Halo ${c.seller_name || "Penjual"}!*\n\n` +
      `Kemarin ada yang tertarik sama barangmu:\n` +
      `📦 *${c.listing_title}*\n` +
      `(Pembeli: ${c.buyer_name || "Seseorang"})\n\n` +
      `Gimana kelanjutannya kak? Udah deal belum?\n\n` +
      `Balas pesan ini dengan:\n` +
      `✅ *DEAL ${shortId}*\n` +
      `❌ *GAGAL ${shortId}*`;

    const res = await sendWa(c.seller_wa, msg).catch(() => ({ ok: false }));
    
    if (res?.ok) {
      successCount++;
      // Tandai sudah difollow-up agar tidak dispam besoknya
      await supa
        .from("buyer_contacts")
        .update({ followup_sent_at: new Date().toISOString() })
        .eq("id", c.id);
    }
    
    await new Promise(r => setTimeout(r, 1500)); // rate limit
  }

  return NextResponse.json({ processed: contacts.length, success: successCount });
}
