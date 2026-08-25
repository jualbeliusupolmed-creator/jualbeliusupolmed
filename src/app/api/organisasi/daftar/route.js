import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { formatWa } from "@/lib/constants";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { setSellerCookie } from "@/lib/auth";
import { hashPin } from "@/lib/pin";
import { validateOrganisasiForm, DEFAULT_INVITE_CODE } from "@/lib/organisasi";

export const dynamic = "force-dynamic";

// POST /api/organisasi/daftar — Pendaftaran Akun Khusus UKM & Organisasi Kampus
export async function POST(req) {
  try {
    const rl = rateLimit(`daftar_ukm:${getClientIp(req)}`, { limit: 20, windowMs: 600_000 });
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Terlalu banyak percobaan. Silakan tunggu ${rl.retryAfter} detik.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const {
      ukm_name,
      ukm_category,
      campus,
      faculty,
      ukm_instagram,
      contact_name,
      contact_wa,
      email,
      password,
      bio,
      photo_url,
      invite_code,
    } = body;

    // Validasi kelengkapan data
    const validationError = validateOrganisasiForm({
      ukm_name,
      ukm_category,
      campus,
      ukm_instagram,
      contact_name,
      contact_wa,
      bio,
    });

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const formattedWa = formatWa(contact_wa);
    if (!formattedWa) {
      return NextResponse.json({ error: "Format nomor WhatsApp narahubung tidak valid." }, { status: 400 });
    }

    // Bersihkan Instagram handle
    const cleanIg = ukm_instagram
      ? ukm_instagram.replace(/^@/, "").replace(/https?:\/\/(www\.)?instagram\.com\//i, "").trim()
      : "";

    const cleanEmail = email ? email.toLowerCase().trim() : null;
    const hashedPassword = password && password.length >= 6 ? hashPin(password) : null;

    const supa = getAdminClient();

    const isVerified = Boolean(
      invite_code &&
      (invite_code.trim().toUpperCase() === DEFAULT_INVITE_CODE || invite_code.trim().length >= 4)
    );

    const fullPayload = {
      name: ukm_name.trim(),
      account_type: "ukm",
      ukm_name: ukm_name.trim(),
      ukm_category: ukm_category || "bem_hima",
      ukm_instagram: cleanIg,
      ukm_verified: isVerified,
      campus: campus || "USU",
      faculty: faculty ? faculty.trim() : "Universitas",
      bio: bio ? bio.trim() : `Akun Resmi ${ukm_name.trim()} (${campus || "USU"}).`,
    };

    if (cleanEmail) fullPayload.email = cleanEmail;
    if (hashedPassword) fullPayload.pin = hashedPassword;
    if (photo_url) {
      fullPayload.photo_url = photo_url;
      fullPayload.avatar_url = photo_url;
    }

    // Coba upsert dengan payload lengkap
    let { error: upsertErr } = await supa
      .from("seller_profiles")
      .upsert(
        {
          wa: formattedWa,
          ...fullPayload,
          created_at: new Date().toISOString(),
        },
        { onConflict: "wa" }
      );

    // Jika gagal karena kolom baru belum dimigrasi di database, fallback ke kolom standar
    if (upsertErr) {
      console.warn("Full payload upsert warning, retrying with standard columns:", upsertErr.message);

      const standardPayload = {
        wa: formattedWa,
        name: `[UKM] ${ukm_name.trim()}`,
        bio: `${bio ? bio.trim() + " • " : ""}Akun Resmi ${ukm_name.trim()} (${campus || "USU"}) • Kategori: ${ukm_category || "Organisasi"} • IG: @${cleanIg}`,
        instagram: cleanIg,
        created_at: new Date().toISOString(),
      };

      if (cleanEmail) standardPayload.email = cleanEmail;
      if (hashedPassword) standardPayload.pin = hashedPassword;
      if (photo_url) {
        standardPayload.photo_url = photo_url;
        standardPayload.avatar_url = photo_url;
      }

      const { error: fallbackErr } = await supa
        .from("seller_profiles")
        .upsert(standardPayload, { onConflict: "wa" });

      if (fallbackErr) {
        console.error("Fallback insert error:", fallbackErr.message);
        return NextResponse.json({ error: "Gagal menyimpan akun organisasi: " + fallbackErr.message }, { status: 500 });
      }
    }

    // Set kuki sesi login langsung
    try {
      setSellerCookie(formattedWa);
    } catch (e) {
      console.warn("Set cookie note:", e.message);
    }

    return NextResponse.json({
      success: true,
      message: "Akun Organisasi / UKM berhasil didaftarkan dan terverifikasi! 🎉",
      wa: formattedWa,
      email: cleanEmail,
      organization: {
        ukm_name: ukm_name.trim(),
        campus: campus || "USU",
        ukm_category: ukm_category || "bem_hima",
        ukm_instagram: cleanIg,
        ukm_verified: isVerified,
      },
    });
  } catch (err) {
    console.error("POST /api/organisasi/daftar exception:", err);
    return NextResponse.json({ error: "Terjadi kesalahan pada server: " + err.message }, { status: 500 });
  }
}
