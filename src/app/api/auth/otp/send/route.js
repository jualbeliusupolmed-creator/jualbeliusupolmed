import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { formatWa } from "@/lib/constants";
import { sendWa as send } from "@/lib/fonnte";

export const dynamic = "force-dynamic";

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

    // Backdoor akun testing untuk reviewer (Midtrans, dll)
    if (normalizedWa === "6281234567890") {
      return NextResponse.json({ success: true, message: "OTP terkirim ke WhatsApp." });
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const supa = getAdminClient();
    const { error } = await supa.from("otps").upsert(
      { wa: normalizedWa, otp, expires_at: expiresAt.toISOString(), attempts: 0 },
      { onConflict: "wa" }
    );

    if (error) {
      throw new Error(error.message);
    }

    // Send via Fonnte
    const msg = `*Jual Beli USU Polmed* 🔒\n\nKode OTP Anda adalah: *${otp}*\n\nKode ini berlaku selama 5 menit. Jangan bagikan kode ini kepada siapapun!`;
    const fonnteRes = await send(normalizedWa, msg);

    if (!fonnteRes || !fonnteRes.ok) {
      return NextResponse.json({ error: "Gagal mengirim pesan WA. Pastikan nomor aktif / token dikonfigurasi." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "OTP terkirim ke WhatsApp." });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
