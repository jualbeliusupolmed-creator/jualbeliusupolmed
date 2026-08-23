import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { tolakCron } from "@/lib/cronAuth";
import { sendWa, daftarGrup } from "@/lib/fonnte";
import { buildSlug } from "@/lib/slug";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
// Loop kirim WA berjeda (anti-ban) mudah melewati batas default 10-15 detik —
// fungsi yang dibunuh di tengah loop meninggalkan sebagian penerima tanpa pesan.
export const maxDuration = 300;

export async function GET(req) {
  const tolak = tolakCron(req);
  if (tolak) return tolak;

  const supa = getAdminClient();
  const settings = await getSettings();
  
  // Ambil 5 iklan aktif terbaik (prioritas: featured, lalu bumped terbaru)
  const { data: listings, error } = await supa
    .from("listings")
    .select("id, title, price, category, campus, featured")
    .eq("status", "active")
    .order("featured", { ascending: false })
    .order("bumped_at", { ascending: false })
    .limit(5);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!listings || listings.length === 0) {
    return NextResponse.json({ sent: 0, message: "Tidak ada iklan aktif untuk di-broadcast" });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id";
  
  let digestMsg = `🌟 *Katalog Pilihan Jual Beli USU Polmed Hari Ini!* 🌟\n\n`;
  
  listings.forEach((l, index) => {
    const slug = buildSlug(l.title, l.id);
    const harga = `Rp ${Number(l.price).toLocaleString("id-ID")}`;
    const campusLabel = l.campus && l.campus !== "Semua" ? ` | 🏫 ${l.campus}` : "";
    const badge = l.featured ? "⭐ " : "";
    
    digestMsg += `${index + 1}. ${badge}*${l.title}*\n`;
    digestMsg += `   💰 ${harga}${campusLabel}\n`;
    digestMsg += `   👉 ${baseUrl}/produk/${slug}\n\n`;
  });

  digestMsg += `\n_Ingin barangmu tampil di sini? Ketik *UPGRADE* ke bot WA untuk fitur Featured/AutoBump!_`;

  // Kirim ke grup utama (dan grup tambahan jika ada)
  const tujuanGrup = daftarGrup(settings?.admin);
  
  if (tujuanGrup.length === 0) {
    return NextResponse.json({ sent: 0, message: "Tidak ada grup tujuan yang di-set (FONNTE_WA_GROUP_ID kosong)" });
  }

  let successCount = 0;
  for (const jid of tujuanGrup) {
    const res = await sendWa(jid, digestMsg).catch(() => ({ ok: false }));
    if (res?.ok) successCount++;
    await new Promise(r => setTimeout(r, 1000));
  }

  return NextResponse.json({ 
    processed: listings.length, 
    groups_targeted: tujuanGrup.length, 
    groups_success: successCount 
  });
}
