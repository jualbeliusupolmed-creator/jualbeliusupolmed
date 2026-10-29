import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { getSellerSession } from "@/lib/auth";
import { formatWa } from "@/lib/constants";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { rateLimitDistributed, getClientIp } from "@/lib/rateLimit";
import { hashOtp } from "@/lib/otp";
import { sendWa } from "@/lib/fonnte";
import { isSameOriginOrLocalEquivalent } from "@/lib/admin-google-oauth";
import { jawabGalat } from "@/lib/jawabGalat";

export const dynamic = "force-dynamic";

export async function POST(request) {
  if (!isSameOriginOrLocalEquivalent(request.headers.get("origin"), request.url)) {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 403 });
  }

  const phone = formatWa(getSellerSession() || "");
  if (!phone) {
    return NextResponse.json({ error: "Masuk dengan akun WhatsApp terlebih dahulu." }, { status: 403 });
  }

  try {
    const ipLimit = await rateLimitDistributed(`google_link_otp:ip:${getClientIp(request)}`, {
      limit: 5,
      windowMs: 900_000,
    });
    if (!ipLimit.ok) {
      return NextResponse.json(
        { error: `Terlalu banyak permintaan. Coba lagi dalam ${ipLimit.retryAfter} detik.` },
        { status: 429 }
      );
    }
    const cooldown = await rateLimitDistributed(`google_link_otp:cooldown:${phone}`, {
      limit: 1,
      windowMs: 60_000,
    });
    if (!cooldown.ok) {
      return NextResponse.json(
        { error: `Mohon tunggu ${cooldown.retryAfter} detik sebelum meminta kode lagi.` },
        { status: 429 }
      );
    }
    const hourly = await rateLimitDistributed(`google_link_otp:hourly:${phone}`, {
      limit: 3,
      windowMs: 3_600_000,
    });
    if (!hourly.ok) {
      return NextResponse.json(
        { error: "Batas permintaan kode untuk nomor ini tercapai. Coba lagi nanti." },
        { status: 429 }
      );
    }

    const supa = getAdminClient();
    const { data: profile, error: profileError } = await supa
      .from("seller_profiles")
      .select("wa,phone_wa,email_google")
      .eq("wa", phone)
      .maybeSingle();
    if (profileError) return jawabGalat(profileError, { pesan: "Profil akun belum dapat diverifikasi." });
    if (!profile || profile.phone_wa !== phone) {
      return NextResponse.json({ error: "Profil WhatsApp utama tidak ditemukan." }, { status: 404 });
    }
    if (profile.email_google) {
      return NextResponse.json({ error: "Akun Google sudah terhubung ke profil ini." }, { status: 409 });
    }

    const otp = String(randomInt(100_000, 1_000_000));
    const { error: saveError } = await supa.from("seller_phone_link_otps").upsert(
      {
        phone_wa: phone,
        profile_wa: phone,
        otp_hash: hashOtp(otp),
        expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
        attempts: 0,
      },
      { onConflict: "phone_wa" }
    );
    if (saveError) return jawabGalat(saveError, { pesan: "Kode verifikasi belum dapat disiapkan." });

    const delivery = await sendWa(
      phone,
      `Kode verifikasi untuk menautkan Google ke akun Jual Beli kamu: *${otp}*\n\nBerlaku 5 menit. Jangan bagikan kode ini kepada siapa pun.`,
      null,
      300
    );
    if (!delivery?.ok) {
      const deliveryCode = delivery?.code || "gateway_unavailable";
      console.error("[google-link] WhatsApp OTP delivery failed:", deliveryCode);
      const { error: cleanupError } = await supa
        .from("seller_phone_link_otps")
        .delete()
        .eq("phone_wa", phone)
        .eq("profile_wa", phone);
      if (cleanupError) {
        console.error("[google-link] Failed to clean up undelivered OTP.", cleanupError.code || "database_error");
      }
      const error = deliveryCode === "gateway_not_configured"
        ? "Integrasi bot WhatsApp belum dikonfigurasi. Admin perlu mengatur BAILEYS_API_URL dan BAILEYS_API_TOKEN di environment server."
        : "Layanan bot WhatsApp sedang tidak tersedia. Coba lagi nanti.";
      return NextResponse.json({ error, code: deliveryCode }, {
        status: deliveryCode === "gateway_not_configured" ? 503 : 502,
        headers: { "Cache-Control": "no-store" },
      });
    }

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jawabGalat(error);
  }
}
