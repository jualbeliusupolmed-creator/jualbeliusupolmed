import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { rateLimitDistributed, getClientIp } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { sendWa, nomorAdmin } from "@/lib/fonnte";
import { getSellerSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request) {
  const ip = getClientIp(request);
  const isLimited = await rateLimitDistributed(`apply_admin_${ip}`, 5, 60);
  if (isLimited) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan pengajuan. Silakan tunggu 1 menit." },
      { status: 429 }
    );
  }

  try {
    const sessionWa = getSellerSession();
    if (!sessionWa) {
      return NextResponse.json({ error: "Masuk ke akun Jual Beli Kampus Kita sebelum mengajukan diri." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "";
    const submittedWa = typeof body.wa === "string" ? body.wa.trim().replace(/\D/g, "").slice(0, 20) : "";
    const wa = String(sessionWa).replace(/\D/g, "").slice(0, 20);
    const instagram = typeof body.instagram === "string" ? body.instagram.trim().replace(/^@/, "").slice(0, 100) : "";
    const provinceId = typeof body.provinceId === "string" ? body.provinceId.trim().toLowerCase() : "";
    const universityId = typeof body.universityId === "string" ? body.universityId.trim().toLowerCase() : "";
    const motivation = typeof body.motivation === "string" ? body.motivation.trim().slice(0, 700) : "";

    if (!name || name.length < 2) {
      return NextResponse.json({ error: "Nama lengkap wajib diisi (minimal 2 karakter)." }, { status: 400 });
    }
    if (!email || !validEmail(email)) {
      return NextResponse.json({ error: "Format alamat email tidak valid." }, { status: 400 });
    }
    if (!wa || wa.length < 9 || (submittedWa && submittedWa !== wa)) {
      return NextResponse.json({ error: "Gunakan nomor WhatsApp yang terhubung ke akun Jual Beli Kampus Kita." }, { status: 400 });
    }
    if (!provinceId || !universityId) {
      return NextResponse.json({ error: "Pilih provinsi dan universitas yang ingin kamu kelola." }, { status: 400 });
    }

    const admin = getAdminClient();

    // Validasi universitas dan provinsi aktif
    const { data: university, error: univError } = await admin
      .from("universities")
      .select("id, name, code, province_id, status")
      .eq("id", universityId)
      .eq("province_id", provinceId)
      .maybeSingle();

    if (univError || !university || university.status !== "active") {
      return NextResponse.json(
        { error: "Universitas tidak ditemukan atau belum aktif di katalog nasional." },
        { status: 400 }
      );
    }

    // Periksa apakah sudah ada permohonan pending untuk email atau universitas ini
    const { data: existingPending } = await admin
      .from("university_admin_requests")
      .select("id, status")
      .eq("university_id", universityId)
      .eq("status", "pending")
      .maybeSingle();

    if (existingPending) {
      return NextResponse.json(
        { error: `Sudah ada pengajuan aktif yang sedang ditinjau untuk ${university.name} (${university.code}). Silakan tunggu proses kurasi tim.` },
        { status: 409 }
      );
    }

    // Kaitkan permohonan dengan identitas pengguna yang sedang login,
    // bukan menempelkan semua pengajuan publik ke akun admin internal.
    const { data: applicantProfiles, error: applicantError } = await admin
      .from("seller_profiles")
      .select("user_id")
      .or(`wa.eq.${wa},phone_wa.eq.${wa}`)
      .not("user_id", "is", null)
      .limit(2);

    if (applicantError || applicantProfiles?.length !== 1 || !applicantProfiles[0]?.user_id) {
      return NextResponse.json(
        { error: "Akun ini belum memiliki identitas pengguna nasional yang tertaut. Lengkapi profil akun terlebih dahulu." },
        { status: 409 }
      );
    }

    const formattedNote = `[Pendaftaran Mandiri] WA: ${wa}${instagram ? ` · IG: @${instagram}` : ""}${motivation ? ` · Visi: ${motivation}` : ""}`.slice(0, 1000);

    const { data: inserted, error: insertError } = await admin
      .from("university_admin_requests")
      .insert({
        requested_by: applicantProfiles[0].user_id,
        province_id: provinceId,
        university_id: universityId,
        requested_email: email,
        requested_name: name,
        note: formattedNote,
        status: "pending",
      })
      .select("id, status, created_at")
      .single();

    if (insertError) {
      logger.error("Gagal menyimpan pengajuan admin kampus mandiri", insertError);
      return NextResponse.json(
        { error: "Pengajuan gagal dikirim. Silakan periksa kembali data Anda." },
        { status: 500 }
      );
    }

    // Kirim notifikasi konfirmasi ke WhatsApp pendaftar (fire-and-forget)
    const applicantMsg = `Halo *${name}*, terima kasih sudah mendaftar sebagai Pengelola Kampus resmi untuk *${university.name} (${university.code})* di Kampus Kita! 🎓\n\nPengajuanmu telah kami terima dan sedang ditinjau oleh tim regional. Tautan undangan aktivasi akun admin akan dikirimkan ke email *${email}* setelah disetujui.\n\nSalam hangat,\n*Tim Kampus Kita*`;
    sendWa(wa, applicantMsg).catch(() => {});

    // Kirim alert notifikasi ke WhatsApp admin nasional
    try {
      const adminNum = await nomorAdmin();
      if (adminNum) {
        const alertMsg = `🔔 *Pendaftaran Admin Kampus Baru!*\n\n• Nama: *${name}*\n• Kampus: *${university.name} (${university.code})*\n• Provinsi: *${provinceId}*\n• Email: *${email}*\n• WhatsApp: *${wa}*\n${instagram ? `• Instagram: @${instagram}\n` : ""}\nSilakan tinjau dan putuskan di:\nhttps://www.kampuskita.my.id/admin/admin-requests`;
        sendWa(adminNum, alertMsg).catch(() => {});
      }
    } catch {}

    return NextResponse.json({
      ok: true,
      message: `Terima kasih! Pengajuanmu untuk mengelola ${university.name} (${university.code}) telah kami terima dan akan ditinjau oleh tim regional.`,
      requestId: inserted.id,
    });
  } catch (err) {
    logger.error("Error internal pengajuan admin kampus mandiri", err);
    return NextResponse.json({ error: "Terjadi kesalahan internal server." }, { status: 500 });
  }
}

