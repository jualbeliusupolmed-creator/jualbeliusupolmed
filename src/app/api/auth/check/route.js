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
    // sandi, dan belum pernah memasang iklan satu pun. Hanya nomor seperti ini
    // yang boleh mendaftar tanpa OTP.
    //
    // Nomor yang punya iklan tapi tidak punya sandi bukan pendaftar baru — itu
    // akun lama yang sandinya hilang (mis. dihapus admin), dan menyerahkannya
    // kepada siapa pun yang mengetik nomornya berarti menyerahkan iklan, toko,
    // dan penilaian milik orang lain. Layar mengirim mereka ke jalur "Lupa PIN"
    // yang tetap menuntut kode dari WhatsApp nomor itu sendiri.
    const { count } = await supa
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("seller_wa", normalizedWa);

    return NextResponse.json({ hasPin: false, nomorBaru: (count || 0) === 0 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
