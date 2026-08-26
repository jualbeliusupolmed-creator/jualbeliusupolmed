import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { formatWa } from "@/lib/constants";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { setSellerCookie } from "@/lib/auth";
import { verifyPin } from "@/lib/pin";
import { jawabGalat } from "@/lib/jawabGalat";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const rl = rateLimit(`pin_verify:${getClientIp(req)}`, { limit: 10, windowMs: 60_000 });
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Terlalu banyak permintaan. Coba lagi dalam ${rl.retryAfter} detik.` },
        { status: 429 }
      );
    }

    const { wa, pin } = await req.json();
    const normalizedWa = formatWa(wa);
    
    if (!normalizedWa || !pin) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    // Akun Testing — hanya aktif jika TEST_ACCOUNT_ENABLED=true di env
    if (process.env.TEST_ACCOUNT_ENABLED === "true") {
      const testWa = process.env.TEST_ACCOUNT_WA || "6281234567890";
      const testPin = process.env.TEST_ACCOUNT_PIN || "123456";
      if (normalizedWa === testWa && pin === testPin) {
        setSellerCookie(normalizedWa);
        return NextResponse.json({ success: true, message: "Login berhasil (Test Account)!" });
      }
    }

    const supa = getAdminClient();
    const { data: profile } = await supa
      .from("seller_profiles")
      .select("wa, pin")
      .eq("wa", normalizedWa)
      .single();

    if (!profile || !verifyPin(pin, profile.pin)) {
      return NextResponse.json({ error: "PIN salah." }, { status: 400 });
    }

    // Upgrade-saat-login sudah dicabut bersama jalur mundur plaintext di
    // src/lib/pin.js: verifyPin() menolak apa pun yang bukan hash, jadi PIN
    // plaintext tidak akan pernah sampai ke baris ini. Seluruh 41 PIN yang ada
    // di-bcrypt sekali jalan lewat BAGIAN 28 migrasi.

    setSellerCookie(normalizedWa);

    return NextResponse.json({ success: true, message: "Login berhasil!" });
  } catch (err) {
    return jawabGalat(err);
  }
}
