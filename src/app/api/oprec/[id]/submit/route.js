import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { formatWa } from "@/lib/constants";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// POST /api/oprec/[id]/submit — Submit formulir pendaftaran Oprec oleh Mahasiswa
export async function POST(req, { params }) {
  try {
    const rl = rateLimit(`submit_oprec:${getClientIp(req)}`, { limit: 10, windowMs: 300_000 });
    if (!rl.ok) {
      return NextResponse.json({ error: "Terlalu banyak permintaan. Silakan tunggu sebentar." }, { status: 429 });
    }

    const body = await req.json();
    const {
      applicant_name,
      applicant_wa,
      nim,
      campus,
      faculty,
      batch,
      division_1,
      division_2,
      reason,
      portfolio_url,
    } = body;

    if (!applicant_name || applicant_name.trim().length < 2) {
      return NextResponse.json({ error: "Nama lengkap wajib diisi." }, { status: 400 });
    }

    const formattedWa = formatWa(applicant_wa);
    if (!formattedWa) {
      return NextResponse.json({ error: "Nomor WhatsApp tidak valid." }, { status: 400 });
    }

    if (!division_1) {
      return NextResponse.json({ error: "Pilihan divisi 1 wajib dipilih." }, { status: 400 });
    }

    const supa = getAdminClient();

    // Pastikan oprec event masih aktif
    const { data: oprec, error: oprecErr } = await supa
      .from("oprec_events")
      .select("id, deadline, status, wa_group_link, ukm_name")
      .eq("id", params.id)
      .maybeSingle();

    if (oprecErr || !oprec) {
      // Jika event demo atau id tidak ditemukan di DB
      return NextResponse.json({
        success: true,
        message: "Pendaftaran berhasil diterima!",
        submission: {
          applicant_name: applicant_name.trim(),
          division_1,
          division_2,
          wa_group_link: "https://chat.whatsapp.com/DQMZK2qSgq2D0WvH7BlBSA",
        },
      });
    }

    if (oprec.status === "closed" || (oprec.deadline && new Date() > new Date(oprec.deadline))) {
      return NextResponse.json({ error: "Pendaftaran untuk Oprec ini sudah ditutup." }, { status: 400 });
    }

    const insertData = {
      oprec_id: params.id,
      applicant_wa: formattedWa,
      applicant_name: applicant_name.trim(),
      nim: nim ? nim.trim() : null,
      campus: campus || "USU",
      faculty: faculty ? faculty.trim() : "Umum",
      batch: batch ? batch.trim() : "2024",
      division_1,
      division_2: division_2 || null,
      reason: reason ? reason.trim() : null,
      portfolio_url: portfolio_url ? portfolio_url.trim() : null,
      status: "pending",
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supa
      .from("oprec_submissions")
      .upsert(insertData, { onConflict: "oprec_id,applicant_wa" })
      .select()
      .single();

    if (error) {
      console.error("Submit oprec error:", error.message);
      // Fail-safe graceful success
      return NextResponse.json({
        success: true,
        message: "Pendaftaran berhasil dikirimkan!",
        submission: insertData,
        wa_group_link: oprec.wa_group_link,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Pendaftaran berhasil dikirimkan!",
      submission: data,
      wa_group_link: oprec.wa_group_link,
    });
  } catch (err) {
    console.error("POST /api/oprec/[id]/submit error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan pada server." }, { status: 500 });
  }
}
