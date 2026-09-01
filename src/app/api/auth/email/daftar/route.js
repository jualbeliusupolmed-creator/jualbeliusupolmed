import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { setSellerCookie } from "@/lib/auth";
import { hashPin } from "@/lib/pin";
import { formatWa } from "@/lib/constants";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { jawabGalat } from "@/lib/jawabGalat";

export const dynamic = "force-dynamic";

// POST /api/auth/email/daftar — Pendaftaran Akun Baru dengan Email & Password (Tanpa OTP)
export async function POST(req) {
  try {
    const rl = rateLimit(`email_daftar:${getClientIp(req)}`, { limit: 10, windowMs: 600_000 });
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Terlalu banyak percobaan pendaftaran. Coba lagi dalam ${rl.retryAfter} detik.` },
        { status: 429 }
      );
    }

    const { name, email, password, wa } = await req.json();

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: "Nama lengkap minimal 2 karakter." }, { status: 400 });
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Format email tidak valid." }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Password minimal 6 karakter." }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const supa = getAdminClient();

    // 1. Cek apakah email sudah terdaftar
    const { data: existingUser } = await supa
      .from("seller_profiles")
      .select("wa, email, email_google")
      .or(`email.ilike.${cleanEmail},email_google.ilike.${cleanEmail}`)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: "Email ini sudah terdaftar. Silakan pilih menu Masuk." },
        { status: 409 }
      );
    }

    // 2. Tentukan identifier pengguna (WA atau ID Berbasis Email)
    let identifierWa = wa ? formatWa(wa) : null;
    if (!identifierWa) {
      const emailPrefix = cleanEmail.split("@")[0].replace(/[^a-z0-9]/g, "").slice(0, 12);
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      identifierWa = `email_${emailPrefix}_${randomSuffix}`;
    }

    // 3. Hash Password
    const hashedPassword = hashPin(password);

    // 4. Simpan ke database
    const newProfile = {
      wa: identifierWa,
      name: name.trim(),
      email: cleanEmail,
      pin: hashedPassword,
      created_at: new Date().toISOString(),
    };

    const { data, error: insertErr } = await supa
      .from("seller_profiles")
      .upsert(newProfile, { onConflict: "wa" })
      .select()
      .single();

    if (insertErr) {
      console.error("Daftar email insert error:", insertErr.message);
      return NextResponse.json(
        { error: "Gagal membuat akun baru. Coba lagi sebentar lagi." },
        { status: 500 }
      );
    }

    // 5. Set Sesi Cookie Login (30 Hari)
    setSellerCookie(identifierWa);

    return NextResponse.json({
      success: true,
      wa: identifierWa,
      name: name.trim(),
      message: "Pendaftaran akun berhasil! Selamat datang di Jual Beli USU & POLMED. ",
    });
  } catch (e) {
    console.error("Email daftar error:", e);
    return jawabGalat(e);
  }
}
