import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { notifySellerExpiring, notifySellerExpired } from "@/lib/fonnte";

export const dynamic = "force-dynamic";

// Dipanggil Vercel Cron harian. Mengubah listing kadaluarsa -> expired,
// dan mengirim reminder perpanjang untuk yang H-2 sebelum expired.
export async function GET(req) {
  // proteksi sederhana via header (Vercel cron mengirim ini),
  // atau ?key=ADMIN_PASSWORD untuk manual.
  const auth = req.headers.get("authorization");
  const key = req.nextUrl.searchParams.get("key");
  const ok =
    auth === `Bearer ${process.env.CRON_SECRET}` ||
    key === process.env.ADMIN_PASSWORD ||
    !!req.headers.get("x-vercel-cron");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supa = getAdminClient();
  const now = new Date();

  // 1) expire yang lewat
  const { data: expired } = await supa
    .from("listings")
    .update({ status: "expired" })
    .lt("expires_at", now.toISOString())
    .eq("status", "active")
    .select();

  for (const l of expired || []) {
    notifySellerExpired(l).catch(() => {});
  }

  // 2) reminder H-2
  const soon = new Date(now.getTime() + 2 * 864e5);
  const { data: expiring } = await supa
    .from("listings")
    .select("*")
    .eq("status", "active")
    .gte("expires_at", now.toISOString())
    .lte("expires_at", soon.toISOString());

  for (const l of expiring || []) {
    notifySellerExpiring(l).catch(() => {});
  }

  return NextResponse.json({
    expired: expired?.length || 0,
    reminded: expiring?.length || 0,
  });
}
