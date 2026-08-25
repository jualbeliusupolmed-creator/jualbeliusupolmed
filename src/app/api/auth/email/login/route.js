import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { setSellerCookie } from "@/lib/auth";
import { verifyPin } from "@/lib/pin";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// POST /api/auth/email/login — Masuk dengan Email & Password (Tanpa OTP)
export async function POST(req) {
  try {
    const rl = rateLimit(`email_login:${getClientIp(req)}`, { limit: 15, windowMs: 60_000 });
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Terlalu banyak percobaan. Coba lagi dalam ${rl.retryAfter} detik.` },
        { status: 429 }
      );
    }

    const { email, password } = await req.json();
    if (!email || !email.trim()) {
      return NextResponse.json({ error: "Email wajib diisi." }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: "Password wajib diisi." }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Akun Testing khusus (jika TEST_ACCOUNT_ENABLED=true di env)
    if (process.env.TEST_ACCOUNT_ENABLED === "true") {
      const testEmail = (process.env.TEST_ACCOUNT_EMAIL || "ridhorobipasi@gmail.com").toLowerCase().trim();
      const testPassword = process.env.TEST_ACCOUNT_PASSWORD || "testing123";
      const testWa = process.env.TEST_ACCOUNT_WA || "6281234567890";
      if (cleanEmail === testEmail && password === testPassword) {
        setSellerCookie(testWa);
        return NextResponse.json({
          success: true,
          wa: testWa,
          name: "Test Account",
          message: "Login berhasil (Test Account)!",
        });
      }
    }

    const supa = getAdminClient();

    // 2. Cari profil berdasarkan email atau email_google
    const { data: user, error: userErr } = await supa
      .from("seller_profiles")
      .select("wa, name, email, email_google, pin, account_type")
      .or(`email.ilike.${cleanEmail},email_google.ilike.${cleanEmail}`)
      .maybeSingle();

    if (userErr || !user) {
      return NextResponse.json(
        { error: "Akun dengan email ini belum terdaftar. Silakan buat akun baru." },
        { status: 404 }
      );
    }

    // 3. Verifikasi Password / PIN
    if (!user.pin) {
      return NextResponse.json(
        { error: "Akun ini belum memiliki password. Silakan masuk dengan WhatsApp atau Google terlebih dahulu untuk membuat password." },
        { status: 400 }
      );
    }

    const isMatch = verifyPin(password, user.pin);
    if (!isMatch) {
      return NextResponse.json({ error: "Password yang kamu masukkan salah." }, { status: 401 });
    }

    // 4. Set kuki sesi login (HMAC 30 hari)
    setSellerCookie(user.wa);

    return NextResponse.json({
      success: true,
      wa: user.wa,
      name: user.name || user.wa,
      account_type: user.account_type || "personal",
      message: "Login berhasil!",
    });
  } catch (e) {
    console.error("Email login error:", e);
    return NextResponse.json({ error: "Terjadi kesalahan pada server: " + e.message }, { status: 500 });
  }
}
