import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSellerSession } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { periksaSlug } from "@/lib/toko";

export const dynamic = "force-dynamic";

// GET /api/toko/cek-slug?slug=warung-ridho
// Dipanggil sambil penjual mengetik. Butuh sesi: tanpa itu endpoint ini jadi
// alat murah untuk memetakan semua nama toko yang sudah ada.
export async function GET(req) {
  const wa = getSellerSession();
  if (!wa) return NextResponse.json({ error: "Belum masuk" }, { status: 401 });

  const rl = rateLimit(getClientIp(req), { limit: 60, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: "Terlalu cepat." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  }

  const hasil = periksaSlug(new URL(req.url).searchParams.get("slug"));
  if (!hasil.ok) return NextResponse.json({ tersedia: false, alasan: hasil.alasan });

  const supa = getAdminClient();
  const { data } = await supa
    .from("seller_profiles").select("wa").ilike("slug", hasil.slug).maybeSingle();

  // Slug milik sendiri bukan bentrokan — kalau tidak, penjual yang membuka
  // form tokonya sendiri langsung disambut "alamat sudah dipakai".
  const dipakaiOrangLain = !!data && data.wa !== wa;
  return NextResponse.json({
    slug: hasil.slug,
    tersedia: !dipakaiOrangLain,
    alasan: dipakaiOrangLain ? "Sudah dipakai penjual lain." : null,
  });
}
