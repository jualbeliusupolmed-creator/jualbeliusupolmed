import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { formatWa } from "@/lib/constants";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { setSellerCookie } from "@/lib/auth";
import { validateOrganisasiForm, DEFAULT_INVITE_CODE } from "@/lib/organisasi";

export const dynamic = "force-dynamic";

// POST /api/organisasi/daftar — Pendaftaran Akun Khusus UKM & Organisasi Kampus
export async function POST(req) {
  try {
    const rl = rateLimit(`daftar_ukm:${getClientIp(req)}`, { limit: 10, windowMs: 600_000 });
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

    const supa = getAdminClient();

    // Cek apakah nomor WA ini sudah terdaftar
    const { data: existingProfile } = await supa
      .from("seller_profiles")
      .select("wa, name, account_type")
      .eq("wa", formattedWa)
      .maybeSingle();

    const isVerified = Boolean(
      invite_code &&
      (invite_code.trim().toUpperCase() === DEFAULT_INVITE_CODE || invite_code.trim().length >= 4)
    );

    const updatePayload = {
      name: ukm_name.trim(),
      account_type: "ukm",
      ukm_name: ukm_name.trim(),
      ukm_category: ukm_category || "bem_hima",
      ukm_instagram: cleanIg,
      ukm_verified: isVerified,
      campus: campus || "USU",
      faculty: faculty ? faculty.trim() : "Universitas",
      bio: bio ? bio.trim() : `Akun Resmi ${ukm_name.trim()} (${campus}).`,
    };

    if (photo_url) {
      updatePayload.photo_url = photo_url;
      updatePayload.avatar_url = photo_url;
    }

    if (existingProfile) {
      // Update profil yang ada menjadi Akun UKM
      const { error: updateErr } = await supa
        .from("seller_profiles")
        .update(updatePayload)
        .eq("wa", formattedWa);

      if (updateErr) {
        console.error("Update ukm error:", updateErr.message);
        return NextResponse.json({ error: "Gagal memperbarui data organisasi." }, { status: 500 });
      }
    } else {
      // Buat akun baru
      const { error: insertErr } = await supa
        .from("seller_profiles")
        .insert({
          wa: formattedWa,
          ...updatePayload,
          created_at: new Date().toISOString(),
        });

      if (insertErr) {
        console.error("Insert ukm error:", insertErr.message);
        return NextResponse.json({ error: "Gagal mendaftarkan akun organisasi." }, { status: 500 });
      }
    }

    // Set kuki sesi login langsung
    setSellerCookie(formattedWa);

    return NextResponse.json({
      success: true,
      message: "Akun Organisasi / UKM berhasil didaftarkan dan terverifikasi!",
      wa: formattedWa,
      organization: {
        ukm_name: ukm_name.trim(),
        campus,
        ukm_category,
        ukm_instagram: cleanIg,
        ukm_verified: isVerified,
      },
    });
  } catch (err) {
    console.error("POST /api/organisasi/daftar error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan pada server." }, { status: 500 });
  }
}
