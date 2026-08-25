import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getUserSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/oprec/[id] — Detail formulir Oprec
export async function GET(req, { params }) {
  try {
    const supa = getAdminClient();
    const { data: oprec, error } = await supa
      .from("oprec_events")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();

    if (error || !oprec) {
      return NextResponse.json({ error: "Formulir Oprec tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ oprec });
  } catch (err) {
    console.error("GET /api/oprec/[id] error:", err);
    return NextResponse.json({ error: "Gagal memuat detail Oprec." }, { status: 500 });
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
