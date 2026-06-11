import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { formatWa } from "@/lib/constants";
import { setSellerCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const rl = rateLimit(`otp_verify:${getClientIp(req)}`, { limit: 10, windowMs: 60_000 });
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Terlalu banyak permintaan. Coba lagi dalam ${rl.retryAfter} detik.` },
        { status: 429 }
      );
    }

    const { wa, otp } = await req.json();
    const normalizedWa = formatWa(wa);
    if (!normalizedWa || !otp) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    // Backdoor akun testing untuk reviewer (Midtrans, dll)
    if (normalizedWa === "6281234567890" && otp === "123456") {
      setSellerCookie(normalizedWa);
      return NextResponse.json({ success: true, message: "Login berhasil (Test Account)!" });
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

    if (record.otp !== otp) {
      await supa.from("otps").update({ attempts: record.attempts + 1 }).eq("wa", normalizedWa);
      return NextResponse.json({ error: "Kode OTP salah." }, { status: 400 });
    }

    // OTP Correct! Delete record and set session
    await supa.from("otps").delete().eq("wa", normalizedWa);
    setSellerCookie(normalizedWa);

    return NextResponse.json({ success: true, message: "Login berhasil!" });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
