import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { jawabGalat } from "@/lib/jawabGalat";

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

    // Auto-hide threshold: jika listing mendapat >= 3 laporan, sembunyikan otomatis
    const { count: reportCount } = await supa
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("listing_id", listing_id);

    let autoHidden = false;
    if ((reportCount || 0) >= 3 && listing.status !== "hidden") {
      await supa
        .from("listings")
        .update({
          status: "hidden",
          moderation_reason: `Disembunyikan otomatis: menerima ${reportCount} laporan komunitas (${cleanReason})`,
          moderated_by: "system:auto_report_threshold",
          moderated_at: new Date().toISOString(),
        })
        .eq("id", listing_id);
      autoHidden = true;
    }

    return NextResponse.json({ ok: true, auto_hidden: autoHidden, report_count: reportCount || 1 });
  } catch (e) {
    return jawabGalat(e);
  }
}
