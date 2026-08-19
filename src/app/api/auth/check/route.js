import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { formatWa } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { wa } = await req.json();
    const normalizedWa = formatWa(wa);

    if (!normalizedWa) {
      return NextResponse.json({ hasPin: false, nomorBaru: false });
    }

    const supa = getAdminClient();
    const { data: profile } = await supa
      .from("seller_profiles")
      .select("wa, pin")
      .eq("wa", normalizedWa)
      .maybeSingle();

    if (profile && profile.pin) {
      return NextResponse.json({ hasPin: true, nomorBaru: false });
    }

    // "Nomor baru" = tidak ada yang bisa dicuri dengan mengklaimnya: belum punya
    // PIN, dan belum pernah memasang iklan satu pun. Ini yang menentukan boleh
    // tidaknya pendaftaran darurat tanpa OTP saat WhatsApp tidak bisa dikirimi.
    // Nomor yang PUNYA riwayat tidak pernah masuk ke jalur itu — di situlah
    // pengambilalihan akun benar-benar merugikan orang.
    const { count } = await supa
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("seller_wa", normalizedWa);

    return NextResponse.json({ hasPin: false, nomorBaru: (count || 0) === 0 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
