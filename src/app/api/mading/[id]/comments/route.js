import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { censorProfanity } from "@/lib/profanity";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// GET /api/mading/[id]/comments - Ambil komentar dari suatu postingan
export async function GET(request, { params }) {
  try {
    const postId = params.id;
    if (!postId) {
      return NextResponse.json({ error: "ID postingan tidak valid" }, { status: 400 });
    }

    const supa = getAdminClient();

    // Komentar mengikuti nasib induknya: postingan yang disembunyikan tidak
    // boleh isinya tetap terbaca lewat pintu samping ini.
    const { data: post } = await supa
      .from("mading_posts")
      .select("id, status")
      .eq("id", postId)
      .maybeSingle();
    if (!post || post.status !== "active") {
      return NextResponse.json({ comments: [] });
    }

    const { data, error } = await supa
      .from("mading_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("mading_comments query error:", error.message);
      return NextResponse.json({ comments: [] });
    }

    return NextResponse.json({ comments: data || [] });
  } catch (err) {
    console.error("GET /api/mading/[id]/comments error:", err);
    return NextResponse.json({ error: "Gagal memuat komentar" }, { status: 500 });
  }
}

// POST /api/mading/[id]/comments - Tambah komentar baru
export async function POST(request, { params }) {
  try {
    const postId = params.id;
    const body = await request.json();
    let { sender_name, faculty, content } = body;

    if (!postId || !content || typeof content !== "string" || content.trim().length < 2) {
      return NextResponse.json({ error: "Isi komentar minimal 2 karakter." }, { status: 400 });
    }

    const laju = rateLimit(`mading-komentar:${getClientIp(request)}`, { limit: 10, windowMs: 5 * 60_000 });
    if (!laju.ok) {
      return NextResponse.json(
        { error: `Terlalu banyak komentar dalam waktu singkat. Coba lagi dalam ${laju.retryAfter} detik.` },
        { status: 429 }
      );
    }

    sender_name = (sender_name || "Anonim").trim().slice(0, 50);
    faculty = (faculty || "Umum").trim().slice(0, 50);
    const cleanContent = censorProfanity(content.trim().slice(0, 500));

    const supa = getAdminClient();

    // Postingan yang sudah `hidden` (termasuk oleh 5 laporan) tidak boleh
    // terus menerima komentar — moderasinya percuma kalau percakapannya lanjut.
    const { data: post } = await supa
      .from("mading_posts")
      .select("id, status")
      .eq("id", postId)
      .maybeSingle();
    if (!post || post.status !== "active") {
      return NextResponse.json({ error: "Postingan tidak ditemukan atau sudah disembunyikan." }, { status: 404 });
    }

    const { data, error } = await supa
      .from("mading_comments")
      .insert({
        post_id: postId,
        sender_name,
        faculty,
        content: cleanContent,
      })
      .select()
      .single();

    if (error) {
      console.error("Insert mading_comments error:", error);
      return NextResponse.json({ error: "Gagal menyimpan komentar." }, { status: 500 });
    }

    // Penghitung atomik; fallback baca-lalu-tulis kalau RPC-nya belum ada.
    await supa.rpc("increment_mading_comments", { target_post_id: postId }).catch(async () => {
      const { data: p } = await supa.from("mading_posts").select("comments_count").eq("id", postId).single();
      if (p) {
        await supa.from("mading_posts").update({ comments_count: (p.comments_count || 0) + 1 }).eq("id", postId);
      }
    });

    return NextResponse.json({ success: true, comment: data });
  } catch (err) {
    console.error("POST /api/mading/[id]/comments error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan internal server" }, { status: 500 });
  }
}
