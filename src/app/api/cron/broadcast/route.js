import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { sendWa } from "@/lib/fonnte";

export const dynamic = "force-dynamic";

// Dipanggil Vercel Cron setiap jam.
// Cek jadwal broadcast yang sudah waktunya dan kirimkan.
export async function GET(req) {
  const auth = req.headers.get("authorization");
  const ok = process.env.CRON_SECRET
    ? auth === `Bearer ${process.env.CRON_SECRET}`
    : !!req.headers.get("x-vercel-cron");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supa = getAdminClient();
  const now = new Date().toISOString();

  // Ambil broadcast yang sudah waktunya (scheduled_at <= sekarang, status pending)
  const { data: broadcasts } = await supa
    .from("scheduled_broadcasts")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_at", now)
    .limit(5); // Proses maks 5 per run untuk hindari timeout

  if (!broadcasts || broadcasts.length === 0) {
    return NextResponse.json({ sent: 0, message: "Tidak ada jadwal yang perlu dikirim" });
  }

  let totalSent = 0;
  let totalFail = 0;

  for (const bc of broadcasts) {
    // Mark sebagai "sending" dulu agar tidak dikirim ulang jika run berikutnya overlap
    await supa.from("scheduled_broadcasts").update({ status: "sending" }).eq("id", bc.id);

    try {
      // Ambil penerima
      const { data: sellers } = await supa.from("seller_profiles").select("wa");
      if (!sellers?.length) {
        await supa.from("scheduled_broadcasts").update({ status: "sent", sent_at: now, meta: { successCount: 0, failCount: 0 } }).eq("id", bc.id);
        continue;
      }

      let successCount = 0;
      let failCount = 0;

      for (const seller of sellers) {
        if (!seller.wa) { failCount++; continue; }
        const res = await sendWa(seller.wa, bc.message, bc.image_url || null).catch(() => ({ ok: false }));
        if (res.ok) successCount++; else failCount++;
        await new Promise(r => setTimeout(r, 1500)); // Rate limit
      }

      totalSent += successCount;
      totalFail += failCount;

      await supa.from("scheduled_broadcasts").update({
        status: "sent",
        sent_at: new Date().toISOString(),
        meta: { successCount, failCount },
      }).eq("id", bc.id);

    } catch (err) {
      console.error("[cron/broadcast] error:", err.message);
      await supa.from("scheduled_broadcasts").update({ status: "failed", meta: { error: err.message } }).eq("id", bc.id);
    }
  }

  return NextResponse.json({ sent: totalSent, failed: totalFail, processed: broadcasts.length });
}
