import { NextResponse } from "next/server";
import { setSellerCookie } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const rl = rateLimit(`email_login:${getClientIp(req)}`, { limit: 10, windowMs: 60_000 });
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Terlalu banyak permintaan. Coba lagi dalam ${rl.retryAfter} detik.` },
        { status: 429 }
      );
    }

    const { email, password } = await req.json();
    
    // Akun Testing khusus untuk keperluan review (Midtrans, dll)
    if (email === "ridhorobipasi@gmail.com" && password === "testing123") {
      const backdoorWa = "6281234567890";
      setSellerCookie(backdoorWa);
      return NextResponse.json({ success: true, wa: backdoorWa, message: "Login berhasil (Test Account)!" });
    }

    return NextResponse.json({ error: "Email atau password salah, atau akun belum mendukung login email." }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
