import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { censorProfanity } from "@/lib/profanity";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { hashIdentitas } from "@/lib/identitasHash";
import { catatIdentitasWa } from "@/lib/chatIdentity";
import { getUserSession } from "@/lib/auth";
import { autoPublishMadingInstagram, siteOriginFromRequest } from "@/lib/madingInstagram";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const POST_COLUMNS = "id, type, sender_name, faculty, title, content, likes_count, comments_count, status, created_at";
const POST_COLUMNS_WITH_IMAGE = "id, type, sender_name, faculty, title, content, image_url, likes_count, comments_count, status, created_at";
const POST_COLUMNS_WITH_TRAFFIC = "id, type, sender_name, faculty, title, content, image_url, likes_count, comments_count, views_count, shares_count, status, created_at";
// Produk yang ditandai ikut dibawa dalam satu permintaan — kartu produk di
// feed harus tampil bersamaan dengan postingannya, bukan berkedip belakangan.
// seller_wa sengaja TIDAK ikut: feed ini publik.
const PRODUK_TERTAUT = ", listing_id, listings:listing_id (id, title, price, image_url, images, category, condition, campus, status)";
const POST_COLUMNS_WITH_PRODUK = POST_COLUMNS_WITH_TRAFFIC + PRODUK_TERTAUT;

// GET /api/mading - Fetch daftar postingan mading & menfess
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all"; // 'all' | 'menfess' | 'info' | 'organisasi'
    const faculty = searchParams.get("faculty");
    const q = (searchParams.get("q") || "").trim(); // keyword search
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "15", 10)));
    const offset = (page - 1) * limit;

    const supa = getAdminClient();
    const makeQuery = (columns) => {
      let query = supa
        .from("mading_posts")
        .select(columns, { count: "exact" })
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);
      if (type && type !== "all") query = query.eq("type", type);
      if (faculty && faculty !== "Semua") query = query.eq("faculty", faculty);
      // Server-side full-text keyword search across title, content, sender_name
      if (q) {
        query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%,sender_name.ilike.%${q}%`);
      }
      return query;
    };

    // Database lama tetap dapat melayani Menfess teks sebelum migration foto
    // diterapkan. Setelah kolom tersedia, foto ikut dikembalikan otomatis.
    let { data, count, error } = await makeQuery(POST_COLUMNS_WITH_PRODUK);
    if (error && /listing_id|listings/i.test(error.message || "")) {
      ({ data, count, error } = await makeQuery(POST_COLUMNS_WITH_TRAFFIC));
    }
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
    let { type, sender_name, faculty, title, content, image_url, listing_id } = body;

    const wa = getUserSession();
    const ip = getClientIp(request);
    const settings = await getSettings().catch(() => null);
    const requireLogin = settings?.mading?.requireLogin !== false;

    if (requireLogin && !wa) {
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

    // Rate-limit: berdasarkan sesi WA pengirim jika login, atau IP jika tanpa login
    const rateKey = wa ? `mading-post:${wa}` : `mading-post:ip:${ip}`;
    const laju = rateLimit(rateKey, { limit: 5, windowMs: 10 * 60_000 });
    if (!laju.ok) {
      return NextResponse.json(
        { error: `Terlalu banyak postingan dalam waktu singkat. Coba lagi dalam ${laju.retryAfter} detik.` },
        { status: 429 }
      );
    }

    // Whitelist semua type yang valid; selain ini jatuh ke 'menfess'
    const VALID_TYPES = ["menfess", "info", "organisasi"];
    type = VALID_TYPES.includes(type) ? type : "menfess";

    if (wa) {
      const { data: profile } = await getAdminClient()
        .from("seller_profiles")
        .select("anonymous_name")
        .eq("wa", wa)
        .maybeSingle();
      sender_name = (profile?.anonymous_name || sender_name || "Anonim").trim().slice(0, 30);
    } else {
      sender_name = (sender_name || "Anonim").trim().slice(0, 30);
    }
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

    // Produk yang ditandai harus benar-benar milik penulisnya dan masih
    // aktif. Tanpa pagar ini, siapa pun bisa menempelkan dagangan orang lain
    // (atau iklan yang sudah dihapus) ke postingannya sendiri.
    // Catatan: fitur tag produk hanya tersedia jika user sudah login (wa ada).
    if (listing_id) {
      if (!wa) {
        // User tidak login — tag produk tidak bisa diverifikasi, abaikan saja
        listing_id = null;
      } else {
        const { data: iklan } = await getAdminClient()
          .from("listings")
          .select("id, seller_wa, status")
          .eq("id", listing_id)
          .maybeSingle();
        if (!iklan || iklan.seller_wa !== wa || iklan.status !== "active") {
          return NextResponse.json(
            { error: "Iklan yang ditandai tidak ditemukan atau bukan milikmu." },
            { status: 400 }
          );
        }
      }
    } else {
      listing_id = null;
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
      // Menggunakan hash dari WA (atau IP jika posting tanpa login) agar anonim tapi tetap unik
      author_ip_hash: hashIdentitas(wa || ip || "anon"),
    };
    if (image_url) insertData.image_url = image_url;
    if (listing_id) insertData.listing_id = listing_id;

    const { data, error } = await supa
      .from("mading_posts")
      .insert(insertData)
      // Kolom disebut satu-satu, sama seperti GET: hash IP tidak perlu mampir
      // ke respons siapa pun, termasuk pengirimnya sendiri.
      .select(
        listing_id
          ? POST_COLUMNS_WITH_IMAGE + PRODUK_TERTAUT
          : image_url
          ? POST_COLUMNS_WITH_IMAGE
          : POST_COLUMNS
      )
      .single();

    if (error) {
      if (listing_id && /listing_id|listings/i.test(error.message || "")) {
        return NextResponse.json(
          { error: "Fitur tag produk belum aktif di database. Jalankan migrations/20260827090000_mading_listing_tag.sql dulu." },
          { status: 409 }
        );
      }
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
    // Hanya jika user login (wa tersedia); posting anonim tanpa sesi tidak perlu dicatat
    if (wa) {
      await catatIdentitasWa(supa, hashIdentitas(wa), wa);
    }

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
