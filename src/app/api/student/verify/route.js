import { NextResponse } from "next/server";
import { getSellerSession, isAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { detectCampusFromEmail, validateNim } from "@/lib/studentVerification";
import { logger } from "@/lib/logger";
import { rateLimitDistributed, getClientIp } from "@/lib/rateLimit";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * GET: Ambil status verifikasi mahasiswa untuk pengguna aktif
 */
export async function GET() {
  const wa = getSellerSession();
  if (!wa) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: profile, error } = await supabaseAdmin
      .from("seller_profiles")
      .select(
        "student_verified, student_nim, student_campus, student_faculty, student_email, student_ktm_url, student_verification_status, student_verified_at"
      )
      .eq("wa", wa)
      .maybeSingle();

    if (error) {
      logger.error("Gagal mengambil status verifikasi mahasiswa", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      data: profile || {
        student_verified: false,
        student_verification_status: "none",
      },
    });
  } catch (err) {
    logger.error("Error internal GET verifikasi mahasiswa", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * POST: Ajukan atau perbarui verifikasi mahasiswa
 */
export async function POST(req) {
  const ip = getClientIp(req);
  const rl = await rateLimitDistributed(`student-verify:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Terlalu banyak permintaan. Coba lagi dalam ${rl.retryAfter} detik.` },
      { status: 429 }
    );
  }

  const wa = getSellerSession();
  if (!wa) {
    return NextResponse.json({ error: "Harap masuk terlebih dahulu." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { campus, nim, faculty, email, ktm_url, admin_action, target_wa } = body;

    // Aksi admin (Setujui / Tolak KTM)
    if (admin_action) {
      if (!isAdmin()) {
        return NextResponse.json({ error: "Akses admin diperlukan" }, { status: 403 });
      }
      if (!target_wa) {
        return NextResponse.json({ error: "target_wa wajib diisi" }, { status: 400 });
      }

      if (admin_action === "approve") {
        const { error } = await supabaseAdmin
          .from("seller_profiles")
          .update({
            student_verified: true,
            student_verification_status: "verified",
            student_verified_at: new Date().toISOString(),
          })
          .eq("wa", target_wa);

        if (error) throw error;
        logger.info(`Admin menyetujui verifikasi mahasiswa target: ${target_wa}`);
        return NextResponse.json({ ok: true, status: "verified" });
      }

      if (admin_action === "reject") {
        const { error } = await supabaseAdmin
          .from("seller_profiles")
          .update({
            student_verified: false,
            student_verification_status: "rejected",
          })
          .eq("wa", target_wa);

        if (error) throw error;
        logger.info(`Admin menolak verifikasi mahasiswa target: ${target_wa}`);
        return NextResponse.json({ ok: true, status: "rejected" });
      }

      return NextResponse.json({ error: "Aksi admin tidak valid" }, { status: 400 });
    }

    // Alur Pengajuan oleh Mahasiswa:
    const nimValidation = validateNim(nim);
    if (!nimValidation.valid) {
      return NextResponse.json({ error: nimValidation.error }, { status: 400 });
    }

    const campuses = (await getSettings()).campuses || [];
    const selectedCampus = campus ? String(campus).trim() : null;
    const selected = campuses.find((item) => item?.active !== false && String(item.shortName).toLowerCase() === selectedCampus?.toLowerCase());
    if (!selected) {
      return NextResponse.json({ error: "Pilihan kampus tidak valid atau sudah tidak tersedia." }, { status: 400 });
    }

    let isAutoVerified = false;
    let newStatus = "pending";

    // Cek auto-verifikasi via email institusi
    const detectedCampus = detectCampusFromEmail(email, campuses);
    if (detectedCampus) {
      // Jika email adalah email resmi kampus, verifikasi otomatis
      isAutoVerified = true;
      newStatus = "verified";
    } else if (!ktm_url) {
      return NextResponse.json(
        { error: "Gunakan email resmi kampus yang terdaftar atau lampirkan foto KTM." },
        { status: 400 }
      );
    }

    const updatePayload = {
      student_nim: nimValidation.sanitized,
      student_campus: detectedCampus || selectedCampus,
      student_faculty: faculty ? String(faculty).trim().slice(0, 100) : null,
      student_email: email ? String(email).trim().toLowerCase() : null,
      student_ktm_url: ktm_url || null,
      student_verification_status: newStatus,
      student_verified: isAutoVerified,
      student_verified_at: isAutoVerified ? new Date().toISOString() : null,
    };

    const { error: updateError } = await supabaseAdmin
      .from("seller_profiles")
      .update(updatePayload)
      .eq("wa", wa);

    if (updateError) {
      logger.error("Gagal menyimpan data verifikasi mahasiswa", updateError);
      return NextResponse.json({ error: "Gagal menyimpan pengajuan verifikasi." }, { status: 500 });
    }

    logger.info(`Pengajuan verifikasi mahasiswa diproses: status=${newStatus}`);
    return NextResponse.json({
      ok: true,
      status: newStatus,
      is_verified: isAutoVerified,
      message: isAutoVerified
        ? "Selamat! Akun kamu berhasil diverifikasi sebagai Mahasiswa Resmi."
        : "Pengajuan verifikasi berhasil dikirim. Tim admin akan meninjau foto KTM kamu dalam 1x24 jam.",
    });
  } catch (err) {
    logger.error("Error internal pengajuan verifikasi mahasiswa", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
