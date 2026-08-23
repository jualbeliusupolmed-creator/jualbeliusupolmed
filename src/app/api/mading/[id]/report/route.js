import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { hashIdentitas } from "@/lib/identitasHash";

export const dynamic = "force-dynamic";

// Ambang moderasi otomatis: postingan yang dilaporkan orang berbeda sebanyak
// ini disembunyikan tanpa menunggu admin. Sengaja lebih dari satu-dua: satu
// orang yang tersinggung tidak boleh bisa menurunkan postingan sendirian.
const AMBANG_SEMBUNYI = 5;

// POST /api/mading/[id]/report - Laporkan postingan mading/menfess
export async function POST(request, { params }) {
  try {
    const postId = params.id;
    const body = await request.json().catch(() => ({}));
    const userIdentifier = String(body.user_identifier || "").slice(0, 100);

    if (!postId || !userIdentifier) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const laju = rateLimit(`mading-lapor:${getClientIp(request)}`, { limit: 10, windowMs: 5 * 60_000 });
    if (!laju.ok) {
      return NextResponse.json(
        { error: `Terlalu banyak laporan. Coba lagi dalam ${laju.retryAfter} detik.` },
        { status: 429 }
      );
    }

    const supa = getAdminClient();

    const { data: post } = await supa
      .from("mading_posts")
      .select("id, status")
      .eq("id", postId)
      .maybeSingle();
    if (!post) {
      return NextResponse.json({ error: "Postingan tidak ditemukan" }, { status: 404 });
    }

    // Satu pelapor satu suara per postingan. Identitas pelapornya di-hash
    // gabungan user_identifier + IP: localStorage gampang dihapus, IP gampang
    // dipindah — dua-duanya sekaligus lebih mahal untuk dipalsukan berulang.
    const reporterHash = hashIdentitas(`${userIdentifier}|${getClientIp(request)}`);
    const { error: insErr } = await supa
      .from("mading_reports")
      .insert({ post_id: postId, reporter_hash: reporterHash });

    if (insErr) {
      // 23505 = unique violation: orang yang sama melapor dua kali. Bukan galat
      // bagi pemanggil — laporannya tetap terhitung satu.
      if (insErr.code !== "23505") {
        console.error("Insert mading_reports error:", insErr);
        return NextResponse.json({ error: "Gagal menyimpan laporan" }, { status: 500 });
      }
    }

    const { count } = await supa
      .from("mading_reports")
      .select("id", { count: "exact", head: true })
      .eq("post_id", postId);

    let disembunyikan = false;
    if ((count || 0) >= AMBANG_SEMBUNYI && post.status === "active") {
      await supa
        .from("mading_posts")
        .update({ status: "hidden" })
        .eq("id", postId)
        .eq("status", "active");
      disembunyikan = true;
    }

    return NextResponse.json({
      success: true,
      jumlahLaporan: count || 0,
      disembunyikan,
      pesan: disembunyikan
        ? "Postingan disembunyikan otomatis karena banyak laporan."
        : "Laporan diterima. Terima kasih sudah menjaga mading tetap sehat.",
    });
  } catch (err) {
    console.error("POST /api/mading/[id]/report error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan internal server" }, { status: 500 });
  }
}
