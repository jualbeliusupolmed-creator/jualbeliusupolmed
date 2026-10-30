import { NextResponse } from "next/server";
import { getSellerSession } from "@/lib/auth";
import { formatWa } from "@/lib/constants";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { rateLimitDistributed, getClientIp } from "@/lib/rateLimit";
import { verifyOtp } from "@/lib/otp";
import { isSameOriginOrLocalEquivalent } from "@/lib/admin-google-oauth";
import {
  createSellerGoogleLinkToken,
  SELLER_GOOGLE_OTP_PROOF_COOKIE,
  SELLER_GOOGLE_LINK_TTL,
} from "@/lib/seller-google-link";
import { jawabGalat } from "@/lib/jawabGalat";
import { findSellerProfileBySession } from "@/lib/seller-profile-identity";

export const dynamic = "force-dynamic";

export async function POST(request) {
  if (!isSameOriginOrLocalEquivalent(request.headers.get("origin"), request.url)) {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 403 });
  }

  const phone = formatWa(getSellerSession() || "");
  if (!phone) {
    return NextResponse.json({ error: "Masuk dengan akun WhatsApp terlebih dahulu." }, { status: 403 });
  }
  const limit = await rateLimitDistributed(`google_link_otp:verify:${getClientIp(request)}`, {
    limit: 10,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Terlalu banyak percobaan. Coba lagi dalam ${limit.retryAfter} detik.` },
      { status: 429 }
    );
  }

  try {
    const { otp } = await request.json();
    const code = String(otp || "").trim();
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Kode verifikasi tidak valid." }, { status: 400 });
    }

    const supa = getAdminClient();
    const { data: profile, error: profileError } = await findSellerProfileBySession(
      supa,
      phone,
      "wa,phone_wa,email_google"
    );
    if (profileError) return jawabGalat(profileError, { pesan: "Profil akun belum dapat diverifikasi." });
    if (!profile || formatWa(profile.phone_wa || profile.wa) !== phone) {
      return NextResponse.json({ error: "Profil WhatsApp utama tidak ditemukan." }, { status: 404 });
    }
    if (profile.email_google) {
      return NextResponse.json({ error: "Akun Google sudah terhubung ke profil ini." }, { status: 409 });
    }

    const { data: record, error: otpError } = await supa
      .from("seller_phone_link_otps")
      .select("profile_wa,otp_hash,expires_at,attempts")
      .eq("phone_wa", phone)
      .maybeSingle();
    if (otpError) return jawabGalat(otpError, { pesan: "Kode verifikasi belum dapat diperiksa." });
    if (!record || record.profile_wa !== phone || new Date(record.expires_at) <= new Date()) {
      return NextResponse.json({ error: "Kode verifikasi tidak valid atau sudah kedaluwarsa." }, { status: 400 });
    }
    if (record.attempts >= 5) {
      return NextResponse.json({ error: "Batas percobaan tercapai. Minta kode baru." }, { status: 429 });
    }
    if (!verifyOtp(code, record.otp_hash)) {
      const { error: attemptError } = await supa
        .from("seller_phone_link_otps")
        .update({ attempts: record.attempts + 1 })
        .eq("phone_wa", phone)
        .eq("profile_wa", phone);
      if (attemptError) return jawabGalat(attemptError, { pesan: "Percobaan kode belum dapat dicatat." });
      return NextResponse.json({ error: "Kode verifikasi salah." }, { status: 400 });
    }

    const { error: deleteError } = await supa
      .from("seller_phone_link_otps")
      .delete()
      .eq("phone_wa", phone)
      .eq("profile_wa", phone);
    if (deleteError) return jawabGalat(deleteError, { pesan: "Kode verifikasi belum dapat digunakan." });

    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(SELLER_GOOGLE_OTP_PROOF_COOKIE, createSellerGoogleLinkToken(phone), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/api/auth/google-link",
      maxAge: SELLER_GOOGLE_LINK_TTL,
    });
    return response;
  } catch (error) {
    return jawabGalat(error);
  }
}
