import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { censorProfanity } from "@/lib/profanity";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { hashIdentitas } from "@/lib/identitasHash";

export const dynamic = "force-dynamic";

// GET /api/mading - Fetch daftar postingan mading & menfess
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all"; // 'all' | 'menfess' | 'info'
    const faculty = searchParams.get("faculty");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "15", 10)));
    const offset = (page - 1) * limit;

    const supa = getAdminClient();
    // Kolom disebut satu-satu — `author_ip_hash` TIDAK boleh ikut: hash yang
    // sama di dua postingan menautkan keduanya ke satu penulis, dan itu
    // membatalkan anonimitasnya bagi siapa pun yang membaca API publik ini.
    let query = supa
      .from("mading_posts")
      // `views_count` sengaja tidak ikut: tidak ada yang pernah menaikkannya,
      // jadi mengembalikannya berarti memajang angka nol yang menyamar sebagai
      // data. Kembalikan ke daftar ini kalau penghitungnya benar-benar dibuat.
      .select(
        "id, type, sender_name, faculty, title, content, likes_count, comments_count, status, created_at",
        { count: "exact" }
      )
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (type && type !== "all") {
      query = query.eq("type", type);
    }
    if (faculty && faculty !== "Semua") {
      query = query.eq("faculty", faculty);
    }

    const { data, count, error } = await query;

    if (error) {
      // Jika tabel belum di-create di supabase, kirim respons kosong terstruktur
      console.warn("mading_posts query error (table might need migration):", error.message);
      return NextResponse.json({ posts: [], total: 0, page, totalPages: 0 });
    }

    return NextResponse.json({
      posts: data || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (err) {
    console.error("GET /api/mading error:", err);
    return NextResponse.json({ error: "Gagal memuat postingan." }, { status: 500 });
  }
}

// POST /api/mading - Buat postingan menfess atau info baru
export async function POST(request) {
  try {
    const body = await request.json();
    let { type, sender_name, faculty, title, content } = body;

    if (!content || typeof content !== "string" || content.trim().length < 5) {
      return NextResponse.json(
        { error: "Isi postingan minimal 5 karakter." },
        { status: 400 }
      );
    }

    if (content.length > 1000) {
      return NextResponse.json(
        { error: "Isi postingan maksimal 1000 karakter." },
        { status: 400 }
      );
    }

    // Posting itu anonim dan tanpa login — sensor kata kasar saja tidak menahan
    // banjir. Batasnya longgar untuk manusia, mematikan untuk skrip.
    const laju = rateLimit(`mading-post:${getClientIp(request)}`, { limit: 5, windowMs: 10 * 60_000 });
    if (!laju.ok) {
      return NextResponse.json(
        { error: `Terlalu banyak postingan dalam waktu singkat. Coba lagi dalam ${laju.retryAfter} detik.` },
        { status: 429 }
      );
    }

    type = type === "info" ? "info" : "menfess";
    sender_name = (sender_name || "Anonim").trim().slice(0, 50);
    faculty = (faculty || "Umum").trim().slice(0, 50);
    title = title ? title.trim().slice(0, 150) : null;

    // Bersihkan / sensor kata-kata kasar secara otomatis
    const cleanContent = censorProfanity(content.trim());
    const cleanTitle = title ? censorProfanity(title) : null;

    const supa = getAdminClient();
    const { data, error } = await supa
      .from("mading_posts")
      .insert({
        type,
        sender_name,
        faculty,
        title: cleanTitle,
        content: cleanContent,
        status: "active",
        // Anonim ke sesama mahasiswa, TIDAK anonim ke moderasi: hash IP (bukan
        // IP mentah) disimpan supaya pelaku pencemaran bisa dikaitkan antar-
        // postingan dan diblokir, tanpa menyimpan alamat aslinya di database.
        author_ip_hash: hashIdentitas(getClientIp(request)),
      })
      .select()
      .single();

    if (error) {
      console.error("Insert mading_posts error:", error);
      return NextResponse.json(
        { error: "Gagal menyimpan postingan ke database." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, post: data });
  } catch (err) {
    console.error("POST /api/mading error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal server." },
      { status: 500 }
    );
  }
}
