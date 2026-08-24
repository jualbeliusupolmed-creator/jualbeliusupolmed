import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { censorProfanity } from "@/lib/profanity";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { hashIdentitas } from "@/lib/identitasHash";
import { getUserSession } from "@/lib/auth";

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
      .select("id, status, author_ip_hash")
      .eq("id", postId)
      .maybeSingle();
    if (!post || post.status !== "active") {
      return NextResponse.json({ comments: [] });
    }

    let hasParentId = true;
    let hasAuthorHash = true;
    let { data, error } = await supa
      .from("mading_comments")
      .select("id, post_id, parent_id, sender_name, faculty, content, author_ip_hash, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error && /parent_id/i.test(error.message || "")) {
      hasParentId = false;
      ({ data, error } = await supa
        .from("mading_comments")
        .select("id, post_id, sender_name, faculty, content, author_ip_hash, created_at")
        .eq("post_id", postId)
        .order("created_at", { ascending: true }));
    }

    if (error && /author_ip_hash/i.test(error.message || "")) {
      hasAuthorHash = false;
      ({ data, error } = await supa
        .from("mading_comments")
        .select(hasParentId ? "id, post_id, parent_id, sender_name, faculty, content, created_at" : "id, post_id, sender_name, faculty, content, created_at")
        .eq("post_id", postId)
        .order("created_at", { ascending: true }));
    }

    if (error) {
      console.warn("mading_comments query error:", error.message);
      return NextResponse.json({ comments: [] });
    }

    const commentsWithOp = (data || []).map((c) => ({
      id: c.id,
      post_id: c.post_id,
      parent_id: hasParentId ? c.parent_id : null,
      sender_name: c.sender_name,
      faculty: c.faculty,
      content: c.content,
      created_at: c.created_at,
      is_op: Boolean(hasAuthorHash && post.author_ip_hash && c.author_ip_hash && post.author_ip_hash === c.author_ip_hash),
    }));

    return NextResponse.json({ comments: commentsWithOp });
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
    let { faculty, content, parent_id: parentId } = body;
    const wa = getUserSession();
    if (!wa) return NextResponse.json({ error: "Silakan masuk untuk berkomentar." }, { status: 401 });

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

    faculty = (faculty || "Umum").trim().slice(0, 50);
    const cleanContent = censorProfanity(content.trim().slice(0, 500));

    const supa = getAdminClient();
    const { data: profile } = await supa
      .from("seller_profiles")
      .select("anonymous_name")
      .eq("wa", wa)
      .maybeSingle();
    const sender_name = (profile?.anonymous_name || "Anonim").trim().slice(0, 30);

    // Postingan yang sudah `hidden` (termasuk oleh 5 laporan) tidak boleh
    // terus menerima komentar — moderasinya percuma kalau percakapannya lanjut.
    const { data: post } = await supa
      .from("mading_posts")
      .select("id, status, author_ip_hash")
      .eq("id", postId)
      .maybeSingle();
    if (!post || post.status !== "active") {
      return NextResponse.json({ error: "Postingan tidak ditemukan atau sudah disembunyikan." }, { status: 404 });
    }

    if (parentId) {
      const { data: parent, error: parentError } = await supa
        .from("mading_comments")
        .select("id, parent_id")
        .eq("id", parentId)
        .eq("post_id", postId)
        .maybeSingle();
      if (parentError && /parent_id/i.test(parentError.message || "")) {
        return NextResponse.json(
          { error: "Fitur balas komentar sedang diaktifkan. Coba lagi sesaat lagi." },
          { status: 409 }
        );
      }
      if (parentError || !parent || parent.parent_id) {
        return NextResponse.json({ error: "Komentar yang ingin dibalas tidak valid." }, { status: 400 });
      }
    } else {
      parentId = null;
    }

    const authorHash = hashIdentitas(wa);
    let { data, error } = await supa
      .from("mading_comments")
      .insert({
        post_id: postId,
        sender_name,
        faculty,
        content: cleanContent,
        author_ip_hash: authorHash,
        parent_id: parentId,
      })
      .select()
      .single();

    if (error && parentId && /parent_id/i.test(error.message || "")) {
      return NextResponse.json({ error: "Fitur balas komentar belum diaktifkan di database." }, { status: 409 });
    }

    if (error && /author_ip_hash/i.test(error.message || "")) {
      ({ data, error } = await supa
        .from("mading_comments")
        .insert({
          post_id: postId,
          sender_name,
          faculty,
          content: cleanContent,
          parent_id: parentId,
        })
        .select()
        .single());
    }

    if (error) {
      console.error("Insert mading_comments error:", error);
      return NextResponse.json({ error: "Gagal menyimpan komentar." }, { status: 500 });
    }

    // Penghitung atomik; fallback baca-lalu-tulis kalau RPC-nya belum ada.
    const { error: rpcErr } = await supa.rpc("increment_mading_comments", { target_post_id: postId });
    if (rpcErr) {
      const { data: p } = await supa.from("mading_posts").select("comments_count").eq("id", postId).single();
      if (p) {
        await supa.from("mading_posts").update({ comments_count: (p.comments_count || 0) + 1 }).eq("id", postId);
      }
    }

    const is_op = Boolean(post.author_ip_hash && post.author_ip_hash === authorHash);
    return NextResponse.json({ success: true, comment: { ...data, is_op } });
  } catch (err) {
    console.error("POST /api/mading/[id]/comments error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan internal server" }, { status: 500 });
  }
}
