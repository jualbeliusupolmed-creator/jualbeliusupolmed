import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { censorProfanity } from "@/lib/profanity";

export const dynamic = "force-dynamic";

// GET /api/mading/[id]/comments - Ambil komentar dari suatu postingan
export async function GET(request, { params }) {
  try {
    const postId = params.id;
    if (!postId) {
      return NextResponse.json({ error: "ID postingan tidak valid" }, { status: 400 });
    }

    const supa = getAdminClient();
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

    sender_name = (sender_name || "Anonim").trim().slice(0, 50);
    faculty = (faculty || "Umum").trim().slice(0, 50);
    const cleanContent = censorProfanity(content.trim().slice(0, 500));

    const supa = getAdminClient();
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

    // Update comments_count pada mading_posts
    const { data: post } = await supa.from("mading_posts").select("comments_count").eq("id", postId).single();
    if (post) {
      await supa.from("mading_posts").update({ comments_count: (post.comments_count || 0) + 1 }).eq("id", postId);
    }

    return NextResponse.json({ success: true, comment: data });
  } catch (err) {
    console.error("POST /api/mading/[id]/comments error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan internal server" }, { status: 500 });
  }
}
