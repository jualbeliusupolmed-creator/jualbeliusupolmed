import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { formatWa } from "@/lib/constants";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { jawabGalat } from "@/lib/jawabGalat";

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
      custom_answers,
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

    // Dulu cabang ini menjawab "Pendaftaran berhasil diterima!" untuk oprec yang
    // TIDAK ADA — termasuk dua contoh etalase. Pelamar mengunggah foto KTM,
    // mengisi NIM, menekan kirim, membaca "berhasil", lalu menunggu panggilan
    // yang tidak akan pernah datang: tak sebaris pun tersimpan. Lebih baik
    // ditolak sekarang daripada dipercaya sia-sia sampai acaranya lewat.
    if (oprecErr || !oprec) {
      const contoh = String(params.id || "").startsWith("demo-oprec");
      return NextResponse.json(
        {
          error: contoh
            ? "Oprec ini baru contoh tampilan — pendaftarannya belum dibuka. Pantau terus, ya."
            : "Oprec ini sudah tidak tersedia.",
        },
        { status: contoh ? 400 : 404 }
      );
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
      custom_answers: custom_answers || {},
      status: "pending",
      created_at: new Date().toISOString(),
    };

    let { data, error } = await supa
      .from("oprec_submissions")
      .upsert(insertData, { onConflict: "oprec_id,applicant_wa" })
      .select()
      .single();

    if (error) {
      console.warn("Submit oprec warning:", error.message);
      // Fallback if custom_answers column not yet migrated
      if (error.message.includes("custom_answers")) {
        delete insertData.custom_answers;
        const { data: retryData, error: retryErr } = await supa
          .from("oprec_submissions")
          .upsert(insertData, { onConflict: "oprec_id,applicant_wa" })
          .select()
          .single();
        if (!retryErr) {
          return NextResponse.json({
            success: true,
            message: "Pendaftaran berhasil dikirimkan!",
            submission: retryData,
            wa_group_link: oprec.wa_group_link,
          });
        }
      }

      // Sebelumnya di sini ada "fail-safe graceful success": simpan gagal, layar
      // tetap bilang berhasil. Yang diselamatkan cuma perasaan sesaat; datanya
      // hilang dan pelamarnya tidak tahu harus mendaftar ulang.
      return jawabGalat(error, { pesan: "Pendaftaran gagal disimpan. Coba kirim ulang sebentar lagi." });
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
