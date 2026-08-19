import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { formatWa } from "@/lib/constants";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { setSellerCookie } from "@/lib/auth";
import { hashPin } from "@/lib/pin";

export const dynamic = "force-dynamic";

/**
 * Pendaftaran darurat: bikin akun tanpa OTP.
 *
 * Ada karena nomor WhatsApp bot bisa dibatasi oleh WhatsApp — dan saat itu
 * terjadi, pendaftaran mati untuk semua orang, termasuk yang tidak punya kaitan
 * apa pun dengan masalah kita.
 *
 * Dua pagar menjaga jalur ini tetap sempit, dan KEDUANYA ditegakkan di server —
 * peramban tidak pernah jadi pihak yang memutuskan:
 *
 * 1. Hanya nomor tanpa riwayat. Belum punya PIN, belum punya satu iklan pun.
 *    Mengklaim nomor kosong tidak mengambil apa pun dari siapa pun, dan pemilik
 *    aslinya tetap bisa merebutnya lewat "Lupa PIN" yang masih menuntut OTP.
 * 2. Hanya saat OTP memang tidak bisa dikirim. Kalau bot WhatsApp sehat, atau
 *    ada token Fonnte sebagai cadangan, jalur ini menolak dan menyuruh kembali
 *    ke OTP. Pintu darurat yang tetap terbuka saat keadaan normal bukan pintu
 *    darurat — itu pintu belakang.
 */
async function otpMasihBisaDikirim() {
  // Fonnte jalur terpisah yang tidak bergantung sesi WhatsApp kita sama sekali.
  if (process.env.FONNTE_TOKEN) return true;

  const dasar = process.env.BAILEYS_API_URL;
  if (!dasar) return false;
  try {
    const url = dasar.replace(/\/(send|story)\/?$/, "").replace(/\/$/, "") + "/health";
    const res = await fetch(url, { signal: AbortSignal.timeout(5000), cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    return res.ok && data.ok === true;
  } catch {
    // Tidak menjawab sama sekali = jelas tidak bisa mengirim apa pun.
    return false;
  }
}

export async function POST(req) {
  try {
    const rl = rateLimit(`daftar_langsung:${getClientIp(req)}`, { limit: 3, windowMs: 600_000 });
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Terlalu banyak percobaan. Coba lagi dalam ${rl.retryAfter} detik.` },
        { status: 429 }
      );
    }

    const { wa, pin, referral } = await req.json();
    const normalizedWa = formatWa(wa);
    if (!normalizedWa) return NextResponse.json({ error: "Nomor WhatsApp tidak valid." }, { status: 400 });
    if (!pin || String(pin).length < 6) {
      return NextResponse.json({ error: "PIN harus minimal 6 digit." }, { status: 400 });
    }

    if (await otpMasihBisaDikirim()) {
      return NextResponse.json(
        { error: "WhatsApp sedang bisa dihubungi — silakan daftar lewat kode OTP seperti biasa." },
        { status: 409 }
      );
    }

    const supa = getAdminClient();

    const { data: profile } = await supa
      .from("seller_profiles").select("wa, pin").eq("wa", normalizedWa).maybeSingle();
    if (profile?.pin) {
      return NextResponse.json(
        { error: "Nomor ini sudah punya akun. Masuk dengan PIN, atau tunggu WhatsApp aktif untuk reset PIN." },
        { status: 409 }
      );
    }

    const { count } = await supa
      .from("listings").select("id", { count: "exact", head: true }).eq("seller_wa", normalizedWa);
    if ((count || 0) > 0) {
      return NextResponse.json(
        { error: "Nomor ini sudah pernah memasang iklan, jadi pendaftarannya wajib lewat OTP. "
               + "Tunggu WhatsApp aktif kembali." },
        { status: 409 }
      );
    }

    // Bentuk barisnya disamakan dengan otp/verify — kode referral sendiri dan
    // bonus bump untuk pengundang — supaya akun yang lahir lewat pintu darurat
    // tidak jadi warga kelas dua yang kehilangan fitur tanpa alasan.
    let galat;
    if (profile) {
      ({ error: galat } = await supa.from("seller_profiles")
        .update({ pin: hashPin(String(pin)), wa_verified: false }).eq("wa", normalizedWa));
    } else {
      let freeBumps = 0;
      let referrerWa = null;
      if (referral) {
        const { data: pengundang } = await supa.from("seller_profiles")
          .select("wa, free_bumps").eq("referral_code", referral).maybeSingle();
        if (pengundang) {
          referrerWa = pengundang.wa;
          freeBumps = 1;
          await supa.from("seller_profiles")
            .update({ free_bumps: (pengundang.free_bumps || 0) + 1 }).eq("wa", referrerWa);
        }
      }

      ({ error: galat } = await supa.from("seller_profiles").insert({
        wa: normalizedWa,
        name: `User ${normalizedWa.slice(-4)}`,
        referral_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
        free_bumps: freeBumps,
        pin: hashPin(String(pin)),
        wa_verified: false,
      }));

      if (!galat && referrerWa) {
        await supa.from("referrals").insert({
          referrer_wa: referrerWa, referred_wa: normalizedWa, status: "completed",
        });
      }
    }
    if (galat) return NextResponse.json({ error: galat.message }, { status: 500 });

    setSellerCookie(normalizedWa);
    return NextResponse.json({
      success: true,
      wa: normalizedWa,
      belumTerverifikasi: true,
      message: "Akun dibuat tanpa verifikasi WhatsApp. Verifikasi nomormu saat WhatsApp aktif lagi.",
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
