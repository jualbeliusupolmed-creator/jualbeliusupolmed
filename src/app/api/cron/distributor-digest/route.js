import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { sendWa } from "@/lib/fonnte";
import { getSettings } from "@/lib/settings";
import { buildSlug } from "@/lib/slug";
import { getDistributorSettings } from "@/lib/distributor";

export const dynamic = "force-dynamic";

function rupiah(n) {
  return "Rp " + (Number(n) || 0).toLocaleString("id-ID");
}

// GET /api/cron/distributor-digest
// Dipanggil oleh Vercel Cron setiap hari jam 13:00 WIB (UTC+7 = 06:00 UTC)
export async function GET(req) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supa = getAdminClient();
  const settings = await getSettings().catch(() => ({}));
  const distSettings = await getDistributorSettings(supa);

  if (!distSettings.digestEnabled) {
    return NextResponse.json({ ok: true, skipped: "digest disabled" });
  }

  const adminWa = (process.env.ADMIN_WA || "").replace(/[​-‍﻿]/g, "").trim();
  const groupJid = settings?.admin?.groupJid;

  // Ambil semua distributor aktif
  const { data: distributors } = await supa
    .from("seller_profiles")
    .select("wa, name")
    .eq("distributor", true);

  if (!distributors?.length) {
    return NextResponse.json({ ok: true, count: 0 });
  }

  const distWas = distributors.map((d) => d.wa);

  // Ambil iklan yang diposting hari ini oleh distributor mana pun
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: listings } = await supa
    .from("listings")
    .select("id, title, price, category, seller_wa, seller_name, image_url, status")
    .in("seller_wa", distWas)
    .gte("created_at", todayStart.toISOString())
    .in("status", ["active", "pending"])
    .order("created_at", { ascending: false });

  if (!listings?.length) {
    return NextResponse.json({ ok: true, count: 0, msg: "Tidak ada postingan distributor hari ini" });
  }

  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id").trim();

  // Kelompokkan per distributor
  const byDist = {};
  for (const l of listings) {
    if (!byDist[l.seller_wa]) {
      const dist = distributors.find((d) => d.wa === l.seller_wa);
      byDist[l.seller_wa] = { name: dist?.name || l.seller_name, items: [] };
    }
    byDist[l.seller_wa].items.push(l);
  }

  // Susun pesan digest
  const today = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  let msg = `📦 *RANGKUMAN IKLAN DISTRIBUTOR*\n${today}\n\n`;

  let totalItems = 0;
  for (const [wa, { name, items }] of Object.entries(byDist)) {
    msg += `👤 *${name}* (${items.length} iklan)\n`;
    for (const item of items) {
      const url = `${baseUrl}/produk/${buildSlug(item.title, item.id)}`;
      msg += `  • ${item.title} — ${rupiah(item.price)}\n    🏷️ ${item.category} | ${url}\n`;
      totalItems++;
    }
    msg += "\n";
  }

  msg += `_Total: ${totalItems} iklan dari ${Object.keys(byDist).length} distributor_`;

  const targets = [];
  if (adminWa) targets.push(sendWa(adminWa, msg).catch(() => {}));
  if (groupJid) targets.push(sendWa(groupJid, msg).catch(() => {}));

  await Promise.all(targets);

  return NextResponse.json({ ok: true, count: totalItems, distributors: Object.keys(byDist).length });
}
