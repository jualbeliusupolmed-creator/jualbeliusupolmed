import { NextResponse } from "next/server";
import { getSellerSession, setSellerCookie } from "@/lib/auth";
import { formatWa } from "@/lib/constants";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { rateLimitDistributed, getClientIp } from "@/lib/rateLimit";
import { verifyOtp } from "@/lib/otp";
import { isSameOriginOrLocalEquivalent } from "@/lib/admin-google-oauth";
import { jawabGalat } from "@/lib/jawabGalat";
import { isGoogleSellerProfile } from "@/lib/google-profile";
import { mergeSellerProfiles } from "@/lib/seller-profile-identity";

export const dynamic = "force-dynamic";

export async function POST(request) {
  if (!isSameOriginOrLocalEquivalent(request.headers.get("origin"), request.url)) {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 403 });
  }

  const identity = getSellerSession();
  if (!identity || formatWa(identity)) {
    return NextResponse.json({ error: "Masuk dengan akun Google yang belum memiliki WhatsApp." }, { status: 403 });
  }

  const limit = await rateLimitDistributed(`phone_link:verify:${getClientIp(request)}`, {
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
    const body = await request.json();
    const phone = formatWa(body?.wa);
    const code = String(body?.otp || "").trim();
    if (!phone || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Nomor WhatsApp atau kode verifikasi tidak valid." }, { status: 400 });
    }

    const supa = getAdminClient();
    const { data: profile, error: profileError } = await supa
      .from("seller_profiles")
      .select("wa,phone_wa,email_google,auth_provider")
      .eq("wa", identity)
      .maybeSingle();
    if (profileError) return jawabGalat(profileError, { pesan: "Profil akun belum dapat diverifikasi." });
    if (!isGoogleSellerProfile(identity, profile)) {
      return NextResponse.json({ error: "Profil Google tidak ditemukan." }, { status: 404 });
    }
    if (profile.phone_wa) {
      return NextResponse.json({ error: "Profil ini sudah memiliki nomor WhatsApp." }, { status: 409 });
    }

    const { data: record, error: otpError } = await supa
      .from("seller_phone_link_otps")
      .select("profile_wa,otp_hash,expires_at,attempts")
      .eq("phone_wa", phone)
      .maybeSingle();
    if (otpError) return jawabGalat(otpError, { pesan: "Kode verifikasi belum dapat diperiksa." });
    if (!record || record.profile_wa !== identity || new Date(record.expires_at) <= new Date()) {
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
        .eq("profile_wa", identity);
      if (attemptError) return jawabGalat(attemptError, { pesan: "Percobaan kode belum dapat dicatat." });
      return NextResponse.json({ error: "Kode verifikasi salah." }, { status: 400 });
    }

    const { data: conflict, error: conflictError } = await supa
      .from("seller_profiles")
      .select("wa")
      .or(`wa.eq.${phone},phone_wa.eq.${phone}`)
      .neq("wa", identity)
      .limit(1)
      .maybeSingle();
    if (conflictError) return jawabGalat(conflictError, { pesan: "Nomor belum dapat diperiksa." });
    if (conflict) {
      const merged = await mergeSellerProfiles(supa, identity, phone);
      if (merged.error) {
        const status = ["23505", "23514"].includes(merged.error.code) ? 409 : 503;
        return NextResponse.json(
          { error: merged.message || "Kedua profil belum dapat digabungkan." },
          { status }
        );
      }
    } else {
      const { data: updated, error: updateError } = await supa
        .from("seller_profiles")
        .update({ phone_wa: phone, wa_verified: true })
        .eq("wa", identity)
        .is("phone_wa", null)
        .select("wa")
        .maybeSingle();
      if (updateError) {
        if (updateError.code === "23505") {
          return NextResponse.json(
            { error: "Nomor WhatsApp sudah ditautkan ke profil lain." },
            { status: 409 }
          );
        }
        return jawabGalat(updateError, { pesan: "Nomor WhatsApp belum dapat ditautkan." });
      }
      if (!updated) {
        return NextResponse.json(
          { error: "Profil berubah saat proses berlangsung. Muat ulang halaman lalu coba lagi." },
          { status: 409 }
        );
      }
    }

    const { error: deleteError } = await supa
      .from("seller_phone_link_otps")
      .delete()
      .eq("phone_wa", phone)
      .eq("profile_wa", identity);
    if (deleteError) {
      console.error("[phone-link] Failed to clean up verified OTP record.", deleteError.code || "database_error");
    }

    setSellerCookie(phone);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jawabGalat(error);
  }
}
