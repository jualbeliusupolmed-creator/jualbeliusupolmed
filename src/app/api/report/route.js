import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const REASONS = ["penipuan", "barang_terlarang", "spam", "salah_kategori", "lainnya"];

// POST /api/report { listing_id, reason, detail?, reporter_wa? }
export async function POST(req) {
  try {
    const rl = rateLimit(`report:${getClientIp(req)}`, { limit: 5, windowMs: 60_000 });
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Terlalu sering. Coba lagi dalam ${rl.retryAfter} detik.` },
        { status: 429 }
      );
    }

    const { listing_id, reason, detail, reporter_wa } = await req.json();
    if (!listing_id || !reason) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const supa = getAdminClient();
    const { data: listing } = await supa
      .from("listings")
      .select("id, title, seller_wa")
      .eq("id", listing_id)
      .maybeSingle();
    if (!listing) {
      return NextResponse.json({ error: "Listing tidak ditemukan" }, { status: 404 });
    }

    const cleanReason = REASONS.includes(reason) ? reason : "lainnya";
    const cleanDetail = (detail || "").trim().slice(0, 500) || null;

    const { error } = await supa.from("reports").insert({
      listing_id,
      reason: cleanReason,
      detail: cleanDetail,
      reporter_wa: (reporter_wa || "").trim() || null,
    });
    if (error) throw new Error(error.message);

    // Notif WA ke admin (aman-gagal)

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
