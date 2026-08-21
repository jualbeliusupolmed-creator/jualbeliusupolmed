import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { formatWa } from "@/lib/constants";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { setSellerCookie } from "@/lib/auth";
import { hashPin } from "@/lib/pin";
import { validasiPin } from "@/lib/pinRules";
import { tulisProfil } from "@/lib/tulisProfil";

export const dynamic = "force-dynamic";

/**
 * Pendaftaran penjual. Cukup nomor WhatsApp + sandi, tanpa OTP.
 *
 * Dulu rute ini pintu darurat yang hanya terbuka saat OTP tidak bisa dikirim.
 * Sekarang ia pintu depan, dan OTP dipakai untuk satu hal saja: mengembalikan
 * akun kepada yang lupa sandinya. Alasannya sederhana — OTP di sini tidak
 * pernah benar-benar menjaga pendaftaran, ia cuma menunda: nomor yang belum
 * punya akun tidak menyimpan apa-apa yang bisa dicuri. Yang dijaganya cuma
 * satu hal, dan hal itu tetap dijaga di bawah.
 *
 * Yang TIDAK boleh lewat sini: nomor yang sudah punya sesuatu untuk direbut.
 * Sudah punya sandi, atau sudah pernah memasang iklan. Untuk mereka jalannya
 * "Lupa PIN" yang tetap menuntut OTP — dan karena kodenya hanya bisa dibaca
 * dari WhatsApp nomor itu sendiri, pemilik aslinya selalu bisa merebut kembali
 * akun yang lahir di sini tanpa bukti kepemilikan.
 */

export async function POST(req) {
  try {
    // 10 per 10 menit per IP. Dulu 3, karena ini pintu darurat yang seharusnya
    // jarang dipakai. Sekarang ia pintu depan, dan satu IP bisa berarti satu
    // wifi kampus berisi banyak orang yang mendaftar berbarengan.
    const rl = rateLimit(`daftar_langsung:${getClientIp(req)}`, { limit: 10, windowMs: 600_000 });
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Terlalu banyak percobaan. Coba lagi dalam ${rl.retryAfter} detik.` },
        { status: 429 }
      );
    }

    const { wa, pin, referral } = await req.json();
    const normalizedWa = formatWa(wa);
    if (!normalizedWa) return NextResponse.json({ error: "Nomor WhatsApp tidak valid." }, { status: 400 });

    const salahPin = validasiPin(pin);
    if (salahPin) return NextResponse.json({ error: salahPin }, { status: 400 });

    const supa = getAdminClient();

    const { data: profile } = await supa
      .from("seller_profiles").select("wa, pin").eq("wa", normalizedWa).maybeSingle();
    if (profile?.pin) {
      return NextResponse.json(
        { error: "Nomor ini sudah punya akun. Masuk dengan PIN / sandi, atau pakai \"Lupa PIN\" kalau lupa." },
        { status: 409 }
      );
    }

    // Punya iklan tapi tidak punya sandi = akun lama yang sandinya hilang, bukan
    // pendaftar baru. Membiarkannya diklaim tanpa OTP berarti menyerahkan iklan,
    // toko, dan penilaian orang lain kepada siapa pun yang mengetik nomornya.
    const { count } = await supa
      .from("listings").select("id", { count: "exact", head: true }).eq("seller_wa", normalizedWa);
    if ((count || 0) > 0) {
      return NextResponse.json(
        { error: "Nomor ini sudah punya iklan, jadi sandinya harus diatur lewat \"Lupa PIN\" "
               + "supaya kami yakin nomornya memang milikmu." },
        { status: 409 }
      );
    }

    // Bentuk barisnya disamakan dengan otp/verify — kode referral sendiri dan
    // bonus bump untuk pengundang — supaya akun yang lahir tanpa OTP tidak jadi
    // warga kelas dua yang kehilangan fitur tanpa alasan.
    let galat;
    if (profile) {
      galat = await tulisProfil(supa, { pin: hashPin(String(pin)), wa_verified: false }, normalizedWa);
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

      galat = await tulisProfil(supa, {
        wa: normalizedWa,
        name: `User ${normalizedWa.slice(-4)}`,
        referral_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
        free_bumps: freeBumps,
        pin: hashPin(String(pin)),
        wa_verified: false,
      });

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
      message: "Akun dibuat. Simpan PIN / sandimu baik-baik — kalau lupa, kode pemulihannya dikirim ke nomor ini.",
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
