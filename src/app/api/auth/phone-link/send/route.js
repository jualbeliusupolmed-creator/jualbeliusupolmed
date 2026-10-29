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
import { isGoogleSellerProfile } from "@/lib/google-profile";

export const dynamic = "force-dynamic";

export async function POST(request) {
  if (!isSameOriginOrLocalEquivalent(request.headers.get("origin"), request.url)) {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 403 });
  }

  const identity = getSellerSession();
  if (!identity || formatWa(identity)) {
    return NextResponse.json({ error: "Masuk dengan akun Google yang belum memiliki WhatsApp." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const phone = formatWa(body?.wa);
    if (!phone) return NextResponse.json({ error: "Nomor WhatsApp tidak valid." }, { status: 400 });

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

    const ipLimit = await rateLimitDistributed(`phone_link:ip:${getClientIp(request)}`, {
      limit: 5,
      windowMs: 900_000,
    });
    if (!ipLimit.ok) {
      return NextResponse.json(
        { error: `Terlalu banyak permintaan. Coba lagi dalam ${ipLimit.retryAfter} detik.` },
        { status: 429 }
      );
    }
    const cooldown = await rateLimitDistributed(`phone_link:cooldown:${phone}`, {
      limit: 1,
      windowMs: 60_000,
    });
    if (!cooldown.ok) {
      return NextResponse.json(
        { error: `Mohon tunggu ${cooldown.retryAfter} detik sebelum meminta kode lagi.` },
        { status: 429 }
      );
    }
    const hourly = await rateLimitDistributed(`phone_link:hourly:${phone}`, {
      limit: 3,
      windowMs: 3_600_000,
    });
    if (!hourly.ok) {
      return NextResponse.json(
        { error: "Batas permintaan kode untuk nomor ini tercapai. Coba lagi nanti." },
        { status: 429 }
      );
    }

    const { data: conflict, error: conflictError } = await supa
      .from("seller_profiles")
      .select("wa,phone_wa")
      .or(`wa.eq.${phone},phone_wa.eq.${phone}`)
      .limit(1)
      .maybeSingle();
    if (conflictError) return jawabGalat(conflictError, { pesan: "Nomor belum dapat diperiksa." });
    if (conflict && conflict.wa !== phone) {
      return NextResponse.json(
        { error: "Nomor WhatsApp sudah tertaut ke profil lain. Gunakan profil yang saat ini memiliki nomor tersebut." },
        { status: 409 }
      );
    }

    const otp = String(randomInt(100_000, 1_000_000));
    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
    const { error: expiredError } = await supa
      .from("seller_phone_link_otps")
      .delete()
      .lt("expires_at", new Date().toISOString());
    if (expiredError) return jawabGalat(expiredError, { pesan: "Kode verifikasi lama belum dapat dibersihkan." });

    const { error: saveError } = await supa.from("seller_phone_link_otps").upsert(
      {
        phone_wa: phone,
        profile_wa: identity,
        otp_hash: hashOtp(otp),
        expires_at: expiresAt,
        attempts: 0,
      },
      { onConflict: "phone_wa" }
    );
    if (saveError) return jawabGalat(saveError, { pesan: "Kode verifikasi belum dapat disiapkan." });

    const delivery = await sendWa(
      phone,
      `Kode verifikasi WhatsApp untuk menautkan nomor ke akun Google Jual Beli: *${otp}*\n\nBerlaku 5 menit. Jangan bagikan kode ini kepada siapa pun.`,
      null,
      300
    );
    if (!delivery?.ok) {
      const deliveryCode = delivery?.code || "gateway_unavailable";
      console.error("[phone-link] WhatsApp OTP delivery failed:", deliveryCode);
      const { error: cleanupError } = await supa
        .from("seller_phone_link_otps")
        .delete()
        .eq("phone_wa", phone)
        .eq("profile_wa", identity);
      if (cleanupError) {
        console.error("[phone-link] Failed to clean up undelivered OTP record.", cleanupError.code || "database_error");
      }
      const error = deliveryCode === "gateway_not_configured"
        ? "Integrasi bot WhatsApp belum dikonfigurasi. Admin perlu mengatur BAILEYS_API_URL dan BAILEYS_API_TOKEN di environment server."
        : "Layanan bot WhatsApp sedang tidak tersedia. Coba lagi nanti.";
      return NextResponse.json({ error, code: deliveryCode }, {
        status: deliveryCode === "gateway_not_configured" ? 503 : 502,
        headers: { "Cache-Control": "no-store" },
      });
    }

    return NextResponse.json({ ok: true, message: "Kode verifikasi dikirim ke WhatsApp." }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return jawabGalat(error);
  }
}
