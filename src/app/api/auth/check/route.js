import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { formatWa } from "@/lib/constants";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    // Jawaban rute ini membedakan tiga keadaan — punya sandi / nomor baru /
    // punya iklan tapi tanpa sandi — jadi tanpa rem ia adalah alat penyapu:
    // ketik ribuan nomor, dapatkan daftar siapa yang terdaftar. `nomorBaru:
    // true` bahkan menandai persis nomor mana yang bisa diklaim tanpa OTP lewat
    // /api/auth/daftar-langsung. Satu-satunya rute /auth/* yang belum punya rem.
    const rl = rateLimit(getClientIp(req), { limit: 20, windowMs: 60_000 });
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan. Coba lagi sebentar." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
      );
    }

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
