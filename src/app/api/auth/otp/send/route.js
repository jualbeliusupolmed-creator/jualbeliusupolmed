import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { hashOtp } from "@/lib/otp";
import { formatWa } from "@/lib/constants";
import { sendWa as send } from "@/lib/fonnte";

export const dynamic = "force-dynamic";

/**
 * Kirim OTP — hanya untuk MENGEMBALIKAN akun yang sandinya lupa.
 *
 * Pendaftaran tidak lewat sini lagi (lihat /api/auth/daftar-langsung). Yang
 * tersisa cuma satu pertanyaan yang benar-benar butuh bukti: "nomor ini memang
 * milikmu?" — dan itu baru berarti kalau ada akun yang mau direbut kembali.
 *
 * Karena itu rute ini menolak nomor yang tidak punya apa-apa. Kalau tidak, ia
 * jadi alat kirim pesan WhatsApp gratis ke nomor mana pun di Indonesia: cukup
 * ketik nomor orang, dan bot kami yang mengetuk pintunya. Yang kena getahnya
 * nomor WhatsApp kami sendiri.
 */
export async function POST(req) {
  try {
    const rl = rateLimit(`otp_send:${getClientIp(req)}`, { limit: 3, windowMs: 60_000 });
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Terlalu banyak permintaan. Coba lagi dalam ${rl.retryAfter} detik.` },
        { status: 429 }
      );
    }

    const { wa } = await req.json();
    const normalizedWa = formatWa(wa);
    if (!normalizedWa) {
      return NextResponse.json({ error: "Nomor WA tidak valid" }, { status: 400 });
    }

    // Akun Testing — hanya aktif jika TEST_ACCOUNT_ENABLED=true di env
    if (process.env.TEST_ACCOUNT_ENABLED === "true") {
      const testWa = process.env.TEST_ACCOUNT_WA || "6281234567890";
      if (normalizedWa === testWa) {
        return NextResponse.json({ success: true, message: "OTP terkirim ke WhatsApp." });
      }
    }

    const supa = getAdminClient();

    // Ada yang bisa dikembalikan? Profil apa pun, atau iklan atas nama nomor itu
    // (akun lama yang sandinya dihapus admin tetap punya iklan). Kalau dua-duanya
    // kosong, yang dibutuhkan si pengetik bukan OTP — tapi mendaftar.
    const { data: profil } = await supa
      .from("seller_profiles").select("wa").eq("wa", normalizedWa).maybeSingle();
    if (!profil) {
      const { count } = await supa
        .from("listings").select("id", { count: "exact", head: true }).eq("seller_wa", normalizedWa);
      if (!count) {
        return NextResponse.json(
          { error: "Nomor ini belum punya akun. Daftar dulu — sekarang tidak perlu kode OTP." },
          { status: 404 }
        );
      }
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Yang dikirim ke WhatsApp adalah `otp`; yang disimpan cuma hash-nya.
    const { error } = await supa.from("otps").upsert(
      { wa: normalizedWa, otp: hashOtp(otp), expires_at: expiresAt.toISOString(), attempts: 0 },
      { onConflict: "wa" }
    );

    if (error) {
      throw new Error(error.message);
    }

    // Send via Fonnte
    const msg = `*Jual Beli Medan* 🔒\n\nKode untuk mengatur ulang PIN / sandi kamu: *${otp}*\n\n`
      + `Berlaku 5 menit. Kalau kamu tidak sedang mengatur ulang sandi, abaikan pesan ini `
      + `dan jangan berikan kodenya kepada siapa pun.`;
    // 300 detik: kode ini kedaluwarsa sendiri di sisi kita, jadi tidak ada gunanya
    // bot menyimpannya lebih lama. Umur pendek juga yang membuat bot menolak cepat
    // saat sesinya terkunci — dan penolakan cepat itulah yang membuka jalur Fonnte,
    // alih-alih membiarkan pemilik akun menunggu kode yang tidak akan pernah datang.
    const fonnteRes = await send(normalizedWa, msg, null, 300);

    if (!fonnteRes || !fonnteRes.ok) {
      return NextResponse.json({ error: "Gagal mengirim pesan WA. Pastikan nomor aktif / token dikonfigurasi." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "OTP terkirim ke WhatsApp." });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
