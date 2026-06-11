import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { notifySellerExpiring, notifySellerExpired } from "@/lib/fonnte";

export const dynamic = "force-dynamic";

// Dipanggil Vercel Cron harian. Mengubah listing kadaluarsa -> expired,
// dan mengirim reminder perpanjang untuk yang H-2 sebelum expired.
export async function GET(req) {
  // Proteksi: jika CRON_SECRET di-set, wajib Bearer token (Vercel cron
  // mengirimnya otomatis). Header x-vercel-cron hanya diterima sebagai
  // fallback saat CRON_SECRET belum di-set, karena header itu bisa dipalsukan.
  // ?key=ADMIN_PASSWORD tetap tersedia untuk pemanggilan manual.
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

  // 1) expire yang lewat
  const { data: expired } = await supa
    .from("listings")
    .update({ status: "expired" })
    .lt("expires_at", now.toISOString())
    .eq("status", "active")
    .select();

  for (const l of expired || []) {
    await notifySellerExpired(l).catch(() => {});
  }

  // Note: 2) reminder H-2 is disabled to save Fonnte quota

  return NextResponse.json({
    expired: expired?.length || 0,
    reminded: 0,
  });
}
