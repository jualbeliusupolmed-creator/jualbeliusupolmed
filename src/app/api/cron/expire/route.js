import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { notifySellerExpiring } from "@/lib/fonnte";

export const dynamic = "force-dynamic";

// Dipanggil Vercel Cron harian.
// - Iklan TIDAK di-expire otomatis (by design — tetap tayang sampai penjual hapus/sold).
// - Kirim WA reminder H-3 sebelum expires_at agar penjual tahu dan bisa perpanjang.
export async function GET(req) {
  const auth = req.headers.get("authorization");
  const key = req.nextUrl.searchParams.get("key");
  const ok =
    (process.env.CRON_SECRET
      ? auth === `Bearer ${process.env.CRON_SECRET}`
      : !!req.headers.get("x-vercel-cron")) ||
    (process.env.ADMIN_PASSWORD && key === process.env.ADMIN_PASSWORD);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supa = getAdminClient();
  const now = new Date();

  // Reminder H-3: iklan yang expires_at antara sekarang dan 3 hari ke depan
  const in3days = new Date(now.getTime() + 3 * 864e5).toISOString();
  const in4days = new Date(now.getTime() + 4 * 864e5).toISOString();

  const { data: expiring } = await supa
    .from("listings")
    .select("id, title, seller_wa, seller_name, expires_at")
    .eq("status", "active")
    .gte("expires_at", now.toISOString())
    .lte("expires_at", in3days);

  let reminded = 0;
  for (const l of expiring || []) {
    const res = await notifySellerExpiring(l).catch(() => ({ ok: false }));
    if (res.ok) reminded++;
  }

  return NextResponse.json({ reminded, checked: expiring?.length || 0 });
}
