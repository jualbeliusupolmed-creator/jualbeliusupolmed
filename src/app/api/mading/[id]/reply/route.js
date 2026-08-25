import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getUserSession } from "@/lib/auth";
import { censorProfanity } from "@/lib/profanity";
import { hashIdentitas } from "@/lib/identitasHash";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// GET /api/mading/[id]/reply — Fetch replies untuk 1 menfess
export async function GET(req, { params }) {
  try {
    const supa = getAdminClient();
    const { data: replies, error } = await supa
      .from("mading_replies")
      .select("id, sender_name, content, likes_count, created_at")
      .eq("post_id", params.id)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) {
      // Tabel belum dimigrasikan
      if (error.message.includes("mading_replies")) {
        return NextResponse.json({ replies: [], total: 0 });
      }
      console.warn("mading_replies GET error:", error.message);
      return NextResponse.json({ replies: [], total: 0 });
    }

    return NextResponse.json({ replies: replies || [], total: replies?.length || 0 });
  } catch (err) {
    console.error("GET /api/mading/[id]/reply error:", err);
    return NextResponse.json({ error: "Gagal memuat balasan." }, { status: 500 });
  }
}

// POST /api/mading/[id]/reply — Tambah reply anonim ke menfess
export async function POST(req, { params }) {
  try {
    const wa = getUserSession();
    if (!wa) {
      return NextResponse.json({ error: "Silakan login untuk membalas menfess." }, { status: 401 });
    }

    const rl = rateLimit(`mading-reply:${wa}`, { limit: 10, windowMs: 5 * 60_000 });
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Terlalu banyak balasan. Coba lagi dalam ${rl.retryAfter} detik.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { content } = body;

    if (!content || typeof content !== "string" || content.trim().length < 2) {
      return NextResponse.json({ error: "Balasan minimal 2 karakter." }, { status: 400 });
    }

    if (content.length > 500) {
      return NextResponse.json({ error: "Balasan maksimal 500 karakter." }, { status: 400 });
    }

    const supa = getAdminClient();

    // Pastikan post_id valid dan aktif
    const { data: post } = await supa
      .from("mading_posts")
      .select("id, status")
      .eq("id", params.id)
      .maybeSingle();

    if (!post || post.status !== "active") {
      return NextResponse.json({ error: "Postingan tidak ditemukan atau sudah tidak aktif." }, { status: 404 });
    }

    // Ambil nama anonim dari profil
    const { data: profile } = await supa
      .from("seller_profiles")
      .select("anonymous_name")
      .eq("wa", wa)
      .maybeSingle();

    const senderName = (profile?.anonymous_name || "Anonim").trim().slice(0, 30);
    const cleanContent = censorProfanity(content.trim());

    const { data: reply, error: insertErr } = await supa
      .from("mading_replies")
      .insert({
        post_id: params.id,
        sender_name: senderName,
        content: cleanContent,
        author_ip_hash: hashIdentitas(wa),
        status: "active",
        created_at: new Date().toISOString(),
      })
      .select("id, sender_name, content, likes_count, created_at")
      .single();

    if (insertErr) {
      if (insertErr.message.includes("mading_replies")) {
        return NextResponse.json(
          { error: "Fitur balasan belum diaktifkan. Jalankan migration_mading_reply.sql terlebih dahulu." },
          { status: 409 }
        );
      }
      console.error("Insert mading_reply error:", insertErr);
      return NextResponse.json({ error: "Gagal menyimpan balasan." }, { status: 500 });
    }

    // Increment comments_count di post
    await supa.rpc("increment_comments_count", { post_id: params.id }).catch(() => {
      // Fallback manual update jika RPC belum ada
      supa
        .from("mading_posts")
        .update({ comments_count: (post.comments_count || 0) + 1 })
        .eq("id", params.id)
        .then(() => {});
    });

    return NextResponse.json({ success: true, reply });
  } catch (err) {
    console.error("POST /api/mading/[id]/reply error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan internal." }, { status: 500 });
  }
}
