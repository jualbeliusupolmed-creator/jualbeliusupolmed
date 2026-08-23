import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  try {
    const postId = params.id;
    const body = await request.json();
    const { user_identifier } = body;

    if (!postId || !user_identifier) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const laju = rateLimit(`mading-like:${getClientIp(request)}`, { limit: 30, windowMs: 60_000 });
    if (!laju.ok) {
      return NextResponse.json(
        { error: `Terlalu cepat. Coba lagi dalam ${laju.retryAfter} detik.` },
        { status: 429 }
      );
    }

    const supa = getAdminClient();

    // Periksa apakah user sudah like
    const { data: existing } = await supa
      .from("mading_likes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_identifier", user_identifier)
      .maybeSingle();

    let liked = false;

    if (existing) {
      // Unlike
      await supa.from("mading_likes").delete().eq("id", existing.id);
      await supa.rpc("decrement_mading_likes", { target_post_id: postId }).catch(async () => {
        // Fallback jika stored procedure belum dibuat
        const { data: post } = await supa.from("mading_posts").select("likes_count").eq("id", postId).single();
        if (post) {
          await supa.from("mading_posts").update({ likes_count: Math.max(0, (post.likes_count || 1) - 1) }).eq("id", postId);
        }
      });
      liked = false;
    } else {
      // Like
      await supa.from("mading_likes").insert({
        post_id: postId,
        user_identifier: user_identifier,
      });
      await supa.rpc("increment_mading_likes", { target_post_id: postId }).catch(async () => {
        // Fallback jika stored procedure belum dibuat
        const { data: post } = await supa.from("mading_posts").select("likes_count").eq("id", postId).single();
        if (post) {
          await supa.from("mading_posts").update({ likes_count: (post.likes_count || 0) + 1 }).eq("id", postId);
        }
      });
      liked = true;
    }

    // Ambil likes count terbaru
    const { data: updatedPost } = await supa
      .from("mading_posts")
      .select("likes_count")
      .eq("id", postId)
      .single();

    return NextResponse.json({
      success: true,
      liked,
      likes_count: updatedPost?.likes_count || 0,
    });
  } catch (err) {
    console.error("POST /api/mading/[id]/like error:", err);
    return NextResponse.json({ error: "Gagal memproses like" }, { status: 500 });
  }
}
