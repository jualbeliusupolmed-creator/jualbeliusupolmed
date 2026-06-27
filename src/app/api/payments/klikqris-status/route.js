import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { checkKlikQrisStatus } from "@/lib/klikqris";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// GET /api/payments/klikqris-status?orderId=xxx
// Frontend polling untuk cek apakah pembayaran sudah masuk
export async function GET(req) {
  const rl = rateLimit(getClientIp(req), { limit: 30, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "rate limit" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  if (!orderId) return NextResponse.json({ error: "orderId wajib" }, { status: 400 });

  // Cek DB terlebih dahulu — webhook mungkin sudah fire lebih cepat dari polling
  const supa = getAdminClient();
  const { data: payment } = await supa
    .from("payments")
    .select("status")
    .eq("midtrans_order_id", orderId)
    .maybeSingle();

  if (payment?.status === "paid") {
    return NextResponse.json({ status: "SUCCESS", paid: true });
  }

  // Cek langsung ke KlikQris API
  const data = await checkKlikQrisStatus(orderId);
  if (!data) return NextResponse.json({ status: "PENDING", paid: false });

  const paid = data.status === "SUCCESS" || data.status === "PAID";
  return NextResponse.json({ status: data.status, paid });
}
