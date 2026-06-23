import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { formatWa } from "@/lib/constants";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// POST /api/subscriptions/category → subscribe notif iklan baru per kategori
export async function POST(req) {
  const rl = rateLimit(`catsub:${getClientIp(req)}`, { limit: 20, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Terlalu banyak permintaan" }, { status: 429 });

  try {
    const { buyer_wa, buyer_name, category, campus } = await req.json();

    if (!buyer_wa || !category) {
      return NextResponse.json({ error: "WA dan kategori wajib diisi" }, { status: 400 });
    }

    const normalizedWa = formatWa(buyer_wa);
    if (!normalizedWa) return NextResponse.json({ error: "Nomor WA tidak valid" }, { status: 400 });

    const supa = getAdminClient();
    const { error } = await supa
      .from("category_subscriptions")
      .upsert(
        { buyer_wa: normalizedWa, buyer_name: buyer_name || null, category, campus: campus || "Semua" },
        { onConflict: "buyer_wa,category,campus", ignoreDuplicates: true }
      );

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/subscriptions/category → unsubscribe
export async function DELETE(req) {
  try {
    const { buyer_wa, category, campus } = await req.json();
    const normalizedWa = formatWa(buyer_wa || "");
    if (!normalizedWa || !category) return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });

    const supa = getAdminClient();
    await supa
      .from("category_subscriptions")
      .delete()
      .eq("buyer_wa", normalizedWa)
      .eq("category", category)
      .eq("campus", campus || "Semua");

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
