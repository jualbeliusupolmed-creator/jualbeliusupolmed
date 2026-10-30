import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSellerSession } from "@/lib/auth";
import { formatWa } from "@/lib/constants";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { isSameOriginOrLocalEquivalent } from "@/lib/admin-google-oauth";
import { findSellerProfileBySession } from "@/lib/seller-profile-identity";
import {
  createSellerGoogleLinkToken,
  SELLER_GOOGLE_OTP_PROOF_COOKIE,
  SELLER_GOOGLE_LINK_COOKIE,
  SELLER_GOOGLE_LINK_TTL,
  verifySellerGoogleLinkToken,
} from "@/lib/seller-google-link";

export const dynamic = "force-dynamic";

export async function POST(request) {
  if (!isSameOriginOrLocalEquivalent(request.headers.get("origin"), request.url)) {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 403 });
  }

  const wa = formatWa(getSellerSession() || "");
  if (!wa) {
    return NextResponse.json(
      { error: "Masuk dengan akun WhatsApp terlebih dahulu untuk menautkan Google." },
      { status: 403 }
    );
  }
  const proof = cookies().get(SELLER_GOOGLE_OTP_PROOF_COOKIE)?.value;
  if (!verifySellerGoogleLinkToken(proof, wa)) {
    return NextResponse.json({ error: "Verifikasi WhatsApp dulu dengan kode OTP." }, { status: 403 });
  }

  const { data: profile, error } = await findSellerProfileBySession(
    getAdminClient(),
    wa,
    "wa,phone_wa,email_google"
  );
  if (error) {
    return NextResponse.json({ error: "Profil akun belum dapat diverifikasi." }, { status: 503 });
  }
  if (!profile || formatWa(profile.phone_wa || profile.wa) !== wa) {
    return NextResponse.json({ error: "Profil akun tidak ditemukan." }, { status: 404 });
  }
  if (profile.email_google) {
    return NextResponse.json({ error: "Akun Google sudah terhubung." }, { status: 409 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SELLER_GOOGLE_OTP_PROOF_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/google-link",
    maxAge: 0,
  });
  response.cookies.set(SELLER_GOOGLE_LINK_COOKIE, createSellerGoogleLinkToken(wa), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/auth/callback",
    maxAge: SELLER_GOOGLE_LINK_TTL,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
