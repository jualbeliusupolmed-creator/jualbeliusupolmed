import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { formatWa } from "@/lib/constants";
import { setSellerCookie } from "@/lib/auth";
import { hashPin } from "@/lib/pin";
import { verifyOtp } from "@/lib/otp";
import { validasiPin } from "@/lib/pinRules";
import { tulisProfil } from "@/lib/tulisProfil";
import { jawabGalat } from "@/lib/jawabGalat";

export const dynamic = "force-dynamic";

/**
 * Verifikasi OTP + pasang sandi baru — ujung dari jalur "Lupa PIN".
 *
 * Pendaftaran tidak lewat sini lagi; cabang "belum punya profil" di bawah
 * dibiarkan hidup sebagai jaring pengaman untuk akun lama yang barisnya sudah
 * telanjur hilang sementara iklannya masih ada.
 */

export async function POST(req) {
  try {
    const rl = rateLimit(`otp_verify:${getClientIp(req)}`, { limit: 10, windowMs: 60_000 });
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Terlalu banyak permintaan. Coba lagi dalam ${rl.retryAfter} detik.` },
        { status: 429 }
      );
    }

    const { wa, otp, referral, pin } = await req.json();
    const normalizedWa = formatWa(wa);
    if (!normalizedWa || !otp || !pin) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }
    
    const salahPin = validasiPin(pin);
    if (salahPin) {
      return NextResponse.json({ error: salahPin }, { status: 400 });
    }

    // Akun Testing — hanya aktif jika TEST_ACCOUNT_ENABLED=true di env
    if (process.env.TEST_ACCOUNT_ENABLED === "true") {
      const testWa = process.env.TEST_ACCOUNT_WA || "";
      const testOtp = process.env.TEST_ACCOUNT_OTP || "";
      if (testWa && testOtp && normalizedWa === testWa && otp === testOtp) {
        setSellerCookie(normalizedWa);
        return NextResponse.json({ success: true, message: "Login berhasil (Test Account)!" });
      }
    }

    const supa = getAdminClient();
    const { data: record, error } = await supa
      .from("otps")
      .select("*")
      .eq("wa", normalizedWa)
      .single();

    if (error || !record) {
      return NextResponse.json({ error: "Kode OTP tidak valid atau sudah kadaluarsa." }, { status: 400 });
    }

    if (new Date(record.expires_at) < new Date()) {
      return NextResponse.json({ error: "Kode OTP sudah kadaluarsa. Silakan request ulang." }, { status: 400 });
    }

    if (record.attempts >= 5) {
      return NextResponse.json({ error: "Terlalu banyak percobaan salah. Silakan request OTP baru." }, { status: 400 });
    }

    if (!verifyOtp(otp, record.otp)) {
      await supa.from("otps").update({ attempts: record.attempts + 1 }).eq("wa", normalizedWa);
      return NextResponse.json({ error: "Kode OTP salah." }, { status: 400 });
    }

    // OTP Correct! Delete record and set session
    await supa.from("otps").delete().eq("wa", normalizedWa);
    
    // Referral & Profile Logic
    const { data: profile } = await supa.from("seller_profiles").select("wa, referral_code").eq("wa", normalizedWa).maybeSingle();
    let isNewUser = !profile;

    if (isNewUser) {
      const newRefCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      let freeBumps = 0;
      let referrerWa = null;

      if (referral) {
        const { data: referrer } = await supa.from("seller_profiles").select("wa, free_bumps").eq("referral_code", referral).maybeSingle();
        if (referrer) {
          referrerWa = referrer.wa;
          freeBumps = 1; // Bonus new user
          // Bonus referrer
          await supa.from("seller_profiles").update({ free_bumps: (referrer.free_bumps || 0) + 1 }).eq("wa", referrerWa);
        }
      }

      await tulisProfil(supa, {
        wa: normalizedWa,
        name: `User ${normalizedWa.slice(-4)}`,
        referral_code: newRefCode,
        free_bumps: freeBumps,
        pin: hashPin(pin),
        // Lewat jalur ini nomornya terbukti dipegang si pendaftar — kode tadi
        // hanya bisa dibaca dari WhatsApp nomor itu sendiri.
        wa_verified: true
      });

      if (referrerWa) {
        await supa.from("referrals").insert({
          referrer_wa: referrerWa,
          referred_wa: normalizedWa,
          status: "completed"
        });
      }
    } else {
      // Update PIN — WAJIB di-hash. Bug lama: menyimpan `pin` mentah di sini
      // men-downgrade PIN yang tadinya bcrypt jadi plaintext tiap login OTP.
      // wa_verified ikut TRUE di sini, dan itu yang membuat "Lupa PIN" jadi jalan
      // pulang: akun yang lahir tanpa OTP (pendaftaran biasa, tanpa bukti nomor)
      // direbut kembali oleh siapa pun yang benar-benar memegang nomornya.
      const updatePayload = { pin: hashPin(pin), wa_verified: true };
      if (!profile.referral_code) {
        updatePayload.referral_code = Math.random().toString(36).substring(2, 8).toUpperCase();
      }
      await tulisProfil(supa, updatePayload, normalizedWa);
    }

    setSellerCookie(normalizedWa);

    return NextResponse.json({ success: true, message: "Login berhasil dan PIN telah diset!" });
  } catch (e) {
    return jawabGalat(e);
  }
}
