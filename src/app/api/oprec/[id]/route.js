import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getUserSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/oprec/[id] — Detail formulir Oprec + submissions (untuk pengurus)
export async function GET(req, { params }) {
  try {
    const supa = getAdminClient();
    const { searchParams } = new URL(req.url);
    const withSubmissions = searchParams.get("submissions") === "true";

    const { data: oprec, error } = await supa
      .from("oprec_events")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();

    if (error || !oprec) {
      return NextResponse.json({ error: "Formulir Oprec tidak ditemukan." }, { status: 404 });
    }

    if (!withSubmissions) {
      return NextResponse.json({ oprec });
    }

    // Verifikasi pemilik
    const wa = getUserSession();
    if (!wa || wa !== oprec.ukm_wa) {
      return NextResponse.json({ error: "Hanya pengurus organisasi yang dapat melihat data pendaftar." }, { status: 403 });
    }

    // Fetch submissions
    const { data: submissions, error: subErr } = await supa
      .from("oprec_submissions")
      .select("*")
      .eq("oprec_id", params.id)
      .order("created_at", { ascending: false });

    if (subErr) {
      // Jika tabel belum dimigrasikan
      console.warn("oprec_submissions fetch error:", subErr.message);
      return NextResponse.json({ oprec, submissions: [], total: 0 });
    }

    // Hitung statistik
    const stats = {
      total: submissions?.length || 0,
      pending: submissions?.filter((s) => s.status === "pending").length || 0,
      diterima: submissions?.filter((s) => s.status === "accepted").length || 0,
      ditolak: submissions?.filter((s) => s.status === "rejected").length || 0,
    };

    return NextResponse.json({ oprec, submissions: submissions || [], stats });
  } catch (err) {
    console.error("GET /api/oprec/[id] error:", err);
    return NextResponse.json({ error: "Gagal memuat detail Oprec." }, { status: 500 });
  }
}

// PATCH /api/oprec/[id] — Update status submission atau oprec
export async function PATCH(req, { params }) {
  try {
    const wa = getUserSession();
    if (!wa) {
      return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });
    }

    const supa = getAdminClient();
    const body = await req.json();
    const { action, submission_id, reviewer_note, status: newStatus } = body;

    // Verifikasi pemilik oprec
    const { data: oprec } = await supa
      .from("oprec_events")
      .select("id, ukm_wa")
      .eq("id", params.id)
      .maybeSingle();

    if (!oprec || oprec.ukm_wa !== wa) {
      return NextResponse.json({ error: "Akses ditolak. Hanya pengurus UKM yang dapat melakukan aksi ini." }, { status: 403 });
    }

    if (action === "update_submission_status" && submission_id) {
      // Update status satu pendaftar
      const validStatuses = ["pending", "accepted", "rejected", "reviewed"];
      if (!validStatuses.includes(newStatus)) {
        return NextResponse.json({ error: "Status tidak valid." }, { status: 400 });
      }

      const { data, error } = await supa
        .from("oprec_submissions")
        .update({
          status: newStatus,
          reviewer_note: reviewer_note || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", submission_id)
        .eq("oprec_id", params.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: "Gagal memperbarui status pendaftar." }, { status: 500 });
      }

      return NextResponse.json({ success: true, submission: data });
    }

    if (action === "close_oprec") {
      // Tutup oprec (hentikan pendaftaran baru)
      const { error } = await supa
        .from("oprec_events")
        .update({ status: "closed", updated_at: new Date().toISOString() })
        .eq("id", params.id);

      if (error) return NextResponse.json({ error: "Gagal menutup Oprec." }, { status: 500 });
      return NextResponse.json({ success: true, message: "Formulir Oprec berhasil ditutup." });
    }

    if (action === "reopen_oprec") {
      const { error } = await supa
        .from("oprec_events")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("id", params.id);

      if (error) return NextResponse.json({ error: "Gagal membuka kembali Oprec." }, { status: 500 });
      return NextResponse.json({ success: true, message: "Formulir Oprec berhasil dibuka kembali." });
    }

    return NextResponse.json({ error: "Action tidak dikenal." }, { status: 400 });
  } catch (err) {
    console.error("PATCH /api/oprec/[id] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/oprec/[id] — Tutup / Hapus formulir Oprec
export async function DELETE(req, { params }) {
  try {
    const wa = getUserSession();
    if (!wa) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supa = getAdminClient();
    const { error } = await supa
      .from("oprec_events")
      .delete()
      .eq("id", params.id)
      .eq("ukm_wa", wa);

    if (error) {
      return NextResponse.json({ error: "Gagal menghapus formulir." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
