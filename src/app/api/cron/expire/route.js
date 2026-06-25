import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { sendWa } from "@/lib/fonnte";
import { formatWaForBaileys } from "@/lib/constants";

export const dynamic = "force-dynamic";

// Vercel Cron harian jam 08:00.
// Kirim reminder H-3 dan H-1 sebelum iklan expired.
// Deduplication: cek window 24 jam sekitar titik H-3 / H-1.
export async function GET(req) {
  const auth = req.headers.get("authorization");
  const ok = process.env.CRON_SECRET
    ? auth === `Bearer ${process.env.CRON_SECRET}`
    : !!req.headers.get("x-vercel-cron");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supa = getAdminClient();
  const now = new Date();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id";
  let reminded = 0;

  // ── Reminder H-3: window 2.5 – 3.5 hari dari sekarang ───────────────────────
  const h3Min = new Date(now.getTime() + 2.5 * 864e5).toISOString();
  const h3Max = new Date(now.getTime() + 3.5 * 864e5).toISOString();

  const { data: expiringH3 } = await supa
    .from("listings")
    .select("id, listing_code, title, seller_wa, seller_name, expires_at")
    .eq("status", "active")
    .gte("expires_at", h3Min)
    .lte("expires_at", h3Max);

  for (const l of expiringH3 || []) {
    try {
      const expDate = new Date(l.expires_at).toLocaleDateString("id-ID", { day: "numeric", month: "long" });
      const kode = l.listing_code || l.id.slice(0, 8);
      const msg =
        `⚠️ *Iklan Hampir Berakhir — 3 Hari Lagi!*\n\n` +
        `Hei ${l.seller_name || "Penjual"},\n` +
        `Iklanmu *"${l.title}"* akan berakhir pada *${expDate}*.\n\n` +
        `Perpanjang sekarang agar tetap tayang:\n` +
        `💬 Ketik: *PERPANJANG ${kode}*\n` +
        `🌐 Dashboard: ${baseUrl}/dashboard\n\n` +
        `_Jangan sampai iklanmu hilang dari pencarian!_`;
      const waTarget = formatWaForBaileys(l.seller_wa);
      const res = await sendWa(waTarget, msg).catch(() => ({ ok: false }));
      if (res.ok) reminded++;
      await new Promise(r => setTimeout(r, 1500));
    } catch (_) {}
  }

  // ── Reminder H-1: window 0.5 – 1.5 hari dari sekarang ───────────────────────
  const h1Min = new Date(now.getTime() + 0.5 * 864e5).toISOString();
  const h1Max = new Date(now.getTime() + 1.5 * 864e5).toISOString();

  const { data: expiringH1 } = await supa
    .from("listings")
    .select("id, listing_code, title, seller_wa, seller_name, expires_at")
    .eq("status", "active")
    .gte("expires_at", h1Min)
    .lte("expires_at", h1Max);

  for (const l of expiringH1 || []) {
    try {
      const expDate = new Date(l.expires_at).toLocaleDateString("id-ID", { day: "numeric", month: "long" });
      const kode = l.listing_code || l.id.slice(0, 8);
      const msg =
        `🚨 *Iklan Berakhir Besok!*\n\n` +
        `Hei ${l.seller_name || "Penjual"},\n` +
        `Iklanmu *"${l.title}"* berakhir *${expDate}* — besok!\n\n` +
        `Perpanjang SEKARANG sebelum terlambat:\n` +
        `💬 Ketik: *PERPANJANG ${kode}*\n` +
        `🌐 Dashboard: ${baseUrl}/dashboard`;
      const waTarget = formatWaForBaileys(l.seller_wa);
      const res = await sendWa(waTarget, msg).catch(() => ({ ok: false }));
      if (res.ok) reminded++;
      await new Promise(r => setTimeout(r, 1500));
    } catch (_) {}
  }

  return NextResponse.json({
    reminded,
    h3_checked: expiringH3?.length || 0,
    h1_checked: expiringH1?.length || 0,
  });
}
