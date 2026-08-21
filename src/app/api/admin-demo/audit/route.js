import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Jejak audit karangan untuk /admin-demo/audit. Tidak menyentuh database —
// lihat catatan di ../keuangan/route.js.
const MENIT = 60_000;
const lalu = (m) => new Date(Date.now() - m * MENIT).toISOString();

const JEJAK = [
  ["activate", "demo-listing-05", { title: "Sepeda Motor Beat 2019" }, 4],
  ["blog_setujui", "demo-blog-1", { title: "Cara Menawar yang Sopan (dan Berhasil)" }, 26],
  ["set_blog_badge", "0800000001", { value: true }, 31],
  ["update_payment", "demo-payment-03", { status: "paid", amount: 2000 }, 58],
  ["toko_setujui", "0800000001", { store: "Toko Aisyah" }, 96],
  ["feature", "demo-listing-04", { days: 7 }, 140],
  ["blog_tolak", "demo-blog-5", { catatan: "Isinya iklan jasa pribadi." }, 188],
  ["suspend", "demo-listing-20", { reason: "Foto bukan milik penjual" }, 240],
  ["resolve_report", "demo-report-3", {}, 300],
  ["save_settings", null, { section: "pricing" }, 420],
  ["award_bumps", "0800000003", { jumlah: 2 }, 610],
  ["category_upsert", "k6", { name: "Jasa" }, 900],
  ["bump_now", "demo-listing-09", {}, 1180],
  ["approve_profile_change", "demo-req-3", { field: "name" }, 1440],
  ["delete_wanted", "demo-wanted-4", {}, 1800],
];

const GALAT = [
  ["/api/wa/baileys", "Bot tidak menjawab dalam 8 detik", { retry: 2 }, 52],
  ["/api/payments/verify-receipt", "Nominal struk tidak terbaca", { order: "DEMO-IKLAN-1007" }, 265],
  ["/api/cron/broadcast", "Antrean kosong, dilewati", {}, 720],
];

export async function GET() {
  return NextResponse.json({
    logs: JEJAK.map(([action, target_id, details, menit], i) => ({
      id: `demo-log-${i + 1}`,
      action,
      target_id,
      details,
      created_at: lalu(menit),
    })),
    errors: GALAT.map(([endpoint, error_message, context, menit], i) => ({
      id: `demo-err-${i + 1}`,
      endpoint,
      error_message,
      context,
      created_at: lalu(menit),
    })),
  });
}
