import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { censorProfanity } from "@/lib/profanity";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { hashIdentitas } from "@/lib/identitasHash";
import { catatIdentitasWa } from "@/lib/chatIdentity";
import { getUserSession } from "@/lib/auth";
import { autoPublishMadingInstagram, siteOriginFromRequest } from "@/lib/madingInstagram";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const POST_COLUMNS = "id, type, sender_name, faculty, title, content, likes_count, comments_count, status, created_at";
const POST_COLUMNS_WITH_IMAGE = "id, type, sender_name, faculty, title, content, image_url, likes_count, comments_count, status, created_at";
const POST_COLUMNS_WITH_TRAFFIC = "id, type, sender_name, faculty, title, content, image_url, likes_count, comments_count, views_count, shares_count, status, created_at";

// GET /api/mading - Fetch daftar postingan mading & menfess
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all"; // 'all' | 'menfess' | 'info' | 'organisasi'
    const faculty = searchParams.get("faculty");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "15", 10)));
    const offset = (page - 1) * limit;

    const supa = getAdminClient();
    // Kolom disebut satu-satu — `author_ip_hash` TIDAK boleh ikut: hash yang
    // sama di dua postingan menautkan keduanya ke satu penulis, dan itu
    // membatalkan anonimitasnya bagi siapa pun yang membaca API publik ini.
    const makeQuery = (columns) => {
      let query = supa
        .from("mading_posts")
        .select(columns, { count: "exact" })
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);
      if (type && type !== "all") query = query.eq("type", type);
      if (faculty && faculty !== "Semua") query = query.eq("faculty", faculty);
      return query;
    };

    // Database lama tetap dapat melayani Menfess teks sebelum migration foto
    // diterapkan. Setelah kolom tersedia, foto ikut dikembalikan otomatis.
    let { data, count, error } = await makeQuery(POST_COLUMNS_WITH_TRAFFIC);
    if (error && /views_count|shares_count/i.test(error.message || "")) {
      ({ data, count, error } = await makeQuery(POST_COLUMNS_WITH_IMAGE));
    }
    if (error && /image_url/i.test(error.message || "")) {
      ({ data, count, error } = await makeQuery(POST_COLUMNS));
    }

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
    let { type, sender_name, faculty, title, content, image_url } = body;

    const wa = getUserSession();
    if (!wa) {
      return NextResponse.json({ error: "Silakan login terlebih dahulu untuk memposting." }, { status: 401 });
    }

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

    // Posting kini di-rate-limit berdasarkan sesi WA pengirim, 
    // agar adil dan tidak memblokir IP publik kampus.
    const laju = rateLimit(`mading-post:${wa}`, { limit: 5, windowMs: 10 * 60_000 });
    if (!laju.ok) {
      return NextResponse.json(
        { error: `Terlalu banyak postingan dalam waktu singkat. Coba lagi dalam ${laju.retryAfter} detik.` },
        { status: 429 }
      );
    }

    // Whitelist semua type yang valid; selain ini jatuh ke 'menfess'
    const VALID_TYPES = ["menfess", "info", "organisasi"];
    type = VALID_TYPES.includes(type) ? type : "menfess";
    // Alias komunitas terpusat di profil. Klien tidak boleh menyisipkan nama
    // lain setiap kali post, dan nama profil marketplace tidak pernah dipakai
    // secara otomatis agar ruang Menfess tetap anonim.
    const { data: profile } = await getAdminClient()
      .from("seller_profiles")
      .select("anonymous_name")
      .eq("wa", wa)
      .maybeSingle();
    sender_name = (profile?.anonymous_name || "Anonim").trim().slice(0, 30);
    faculty = (faculty || "Umum").trim().slice(0, 50);
    title = title ? title.trim().slice(0, 150) : null;

    // Foto harus berasal dari Storage Supabase proyek ini; jangan jadikan feed
    // sebagai proxy untuk URL pihak ketiga yang tak dapat dikendalikan.
    if (image_url) {
      try {
        const image = new URL(String(image_url));
        const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").hostname;
        if (image.protocol !== "https:" || !supabaseHost || image.hostname !== supabaseHost) {
          throw new Error("invalid image host");
        }
        image_url = image.toString();
      } catch {
        return NextResponse.json({ error: "URL foto tidak valid." }, { status: 400 });
      }
    } else {
      image_url = null;
    }

    // Bersihkan / sensor kata-kata kasar secara otomatis
    const cleanContent = censorProfanity(content.trim());
    const cleanTitle = title ? censorProfanity(title) : null;

    const supa = getAdminClient();
    const insertData = {
      type,
      sender_name,
      faculty,
      title: cleanTitle,
      content: cleanContent,
      status: "active",
      // Menggunakan hash dari WA agar anonim bagi sistem publik tapi tetap unik
      // dan berbasis login satu pintu, bukan IP yang bisa berubah.
      author_ip_hash: hashIdentitas(wa),
    };
    if (image_url) insertData.image_url = image_url;

    const { data, error } = await supa
      .from("mading_posts")
      .insert(insertData)
      // Kolom disebut satu-satu, sama seperti GET: hash IP tidak perlu mampir
      // ke respons siapa pun, termasuk pengirimnya sendiri.
      .select(image_url ? POST_COLUMNS_WITH_IMAGE : POST_COLUMNS)
      .single();

    if (error) {
      if (image_url && /image_url/i.test(error.message || "")) {
        return NextResponse.json(
          { error: "Fitur foto belum diaktifkan di database. Jalankan migration_mading_images.sql terlebih dahulu." },
          { status: 409 }
        );
      }
      console.error("Insert mading_posts error:", error);
      return NextResponse.json(
        { error: "Gagal menyimpan postingan ke database." },
        { status: 500 }
      );
    }

    // Catat pemetaan hash -> WA untuk panel admin & push notification
    await catatIdentitasWa(supa, hashIdentitas(wa), wa);

    // Auto-post tanpa persetujuan admin. Jika Meta belum siap, postingan web
    // tetap berhasil dan antreannya akan dicoba ulang oleh cron/panel admin.
    await autoPublishMadingInstagram({
      origin: siteOriginFromRequest(request),
      postId: data.id,
    });

    return NextResponse.json({ success: true, post: data });
  } catch (err) {
    console.error("POST /api/mading error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal server." },
      { status: 500 }
    );
  }
}
