import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSellerSession } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import {
  periksaSlug, aksenAman, potong, normalisasiInstagram, BATAS, statusToko, namaToko,
} from "@/lib/toko";
import { getSettings } from "@/lib/settings";
import { formatWaForBaileys } from "@/lib/constants";

export const dynamic = "force-dynamic";

const KOLOM = "wa, name, bio, slug, store_name, tagline, logo_url, banner_url, "
  + "store_area, store_hours, store_instagram, store_accent, store_open, "
  + "store_announcement, store_updated_at, trusted_seller, "
  + "store_status, store_requested_at, store_approved_at, store_reject_note";

// Kolom persetujuan lahir belakangan (migrasi BAGIAN 26). Kalau belum ada,
// Postgres menolak SELECT-nya seluruhnya — dan penjual kehilangan halaman
// tokonya karena satu kolom yang belum dibuat. Jadi kalau gagal, ulangi tanpa
// kolom itu: yang hilang cuma lencana statusnya, bukan seluruh formulir.
const KOLOM_LAMA = "wa, name, bio, slug, store_name, tagline, logo_url, banner_url, "
  + "store_area, store_hours, store_instagram, store_accent, store_open, "
  + "store_announcement, store_updated_at, trusted_seller";

async function ambilProfil(supa, wa) {
  const { data, error } = await supa.from("seller_profiles").select(KOLOM).eq("wa", wa).maybeSingle();
  if (!error) return { data, error: null };
  const ulang = await supa.from("seller_profiles").select(KOLOM_LAMA).eq("wa", wa).maybeSingle();
  return { data: ulang.data, error: ulang.error };
}

// GET /api/toko — profil toko milik sesi yang sedang masuk.
// Sengaja tanpa parameter: penjual hanya boleh memuat tokonya sendiri, dan
// endpoint yang menerima nomor dari peramban akan selalu menggoda seseorang
// untuk mencoba nomor orang lain.
export async function GET() {
  const wa = getSellerSession();
  if (!wa) return NextResponse.json({ error: "Belum masuk" }, { status: 401 });

  const supa = getAdminClient();
  const { data, error } = await ambilProfil(supa, wa);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Penjual yang belum pernah punya baris profil tetap harus bisa membuka
  // form: kirim kerangka kosong, biar penyimpanan pertama yang membuatnya.
  return NextResponse.json({ toko: data || { wa, name: "", slug: null } });
}

// PUT /api/toko — simpan identitas toko.
export async function PUT(req) {
  const wa = getSellerSession();
  if (!wa) return NextResponse.json({ error: "Belum masuk" }, { status: 401 });

  const rl = rateLimit(getClientIp(req), { limit: 20, windowMs: 300_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: "Terlalu sering menyimpan. Coba lagi sebentar lagi." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  }

  let body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Isian tidak terbaca" }, { status: 400 }); }

  const isian = {
    store_name: potong(body.store_name, BATAS.store_name),
    tagline: potong(body.tagline, BATAS.tagline),
    bio: potong(body.bio, BATAS.bio),
    store_area: potong(body.store_area, BATAS.store_area),
    store_hours: potong(body.store_hours, BATAS.store_hours),
    store_announcement: potong(body.store_announcement, BATAS.store_announcement),
    store_instagram: normalisasiInstagram(body.store_instagram),
    store_accent: aksenAman(body.store_accent),
    store_open: body.store_open !== false,
    logo_url: bersihkanGambar(body.logo_url),
    banner_url: bersihkanGambar(body.banner_url),
    store_updated_at: new Date().toISOString(),
  };

  // Nama toko wajib: halaman toko tanpa nama tidak bisa dibagikan ke mana pun.
  if (!isian.store_name) {
    return NextResponse.json({ error: "Nama toko wajib diisi." }, { status: 400 });
  }

  // Slug hanya ikut disimpan kalau dikirim — supaya menyimpan perubahan kecil
  // (mis. jam buka) tidak pernah berisiko mengubah alamat toko yang sudah
  // terlanjur disebar penjual ke pelanggannya.
  if (body.slug !== undefined && body.slug !== null && String(body.slug).trim() !== "") {
    const hasil = periksaSlug(body.slug);
    if (!hasil.ok) return NextResponse.json({ error: hasil.alasan }, { status: 400 });
    isian.slug = hasil.slug;
  }

  const supa = getAdminClient();

  // Baris profil belum tentu ada: penjual yang iklannya masuk lewat bot
  // WhatsApp bisa saja belum pernah punya baris di seller_profiles.
  const { data: adaBaris } = await supa
    .from("seller_profiles").select("wa, name, slug, store_status").eq("wa", wa).maybeSingle();

  // Mengubah ALAMAT toko yang sudah aktif berarti tokonya perlu ditinjau lagi.
  //
  // Alasannya bukan birokrasi: persetujuan admin diberikan untuk sebuah nama di
  // sebuah alamat. Kalau alamatnya bisa diganti sesudahnya, izin yang sudah
  // diberikan untuk "warung-ridho" bisa berpindah ke "admin-resmi" tanpa
  // seorang pun melihatnya lagi. Yang lain (logo, jam buka, pengumuman) boleh
  // diubah kapan saja tanpa menyentuh status.
  const gantiAlamat =
    isian.slug !== undefined && adaBaris?.slug && isian.slug !== adaBaris.slug;
  if (gantiAlamat) {
    isian.store_status = "menunggu";
    isian.store_requested_at = new Date().toISOString();
  }

  let galat;
  if (adaBaris) {
    ({ error: galat } = await supa.from("seller_profiles").update(isian).eq("wa", wa));
  } else {
    ({ error: galat } = await supa.from("seller_profiles")
      .insert({ wa, name: isian.store_name, ...isian }));
  }

  // Kolom status lahir di migrasi BAGIAN 26. Kalau belum ada, simpan ulang
  // tanpa kolom itu — penjual tidak boleh kehilangan seluruh perubahan tokonya
  // gara-gara satu kolom yang belum dibuat.
  if (galat && /store_status|store_requested_at|column .* does not exist|schema cache/i.test(galat.message || "")) {
    delete isian.store_status;
    delete isian.store_requested_at;
    if (adaBaris) {
      ({ error: galat } = await supa.from("seller_profiles").update(isian).eq("wa", wa));
    } else {
      ({ error: galat } = await supa.from("seller_profiles")
        .insert({ wa, name: isian.store_name, ...isian }));
    }
  }

  if (galat) {
    // 23505 = pelanggaran unique. Satu-satunya kolom unik yang bisa ditabrak
    // penjual di sini adalah slug, dan pesan bawaan Postgres tidak berguna
    // bagi orang yang cuma ingin menamai tokonya.
    if (galat.code === "23505" || /duplicate key/i.test(galat.message || "")) {
      return NextResponse.json(
        { error: "Alamat toko itu sudah dipakai penjual lain. Coba yang lain." },
        { status: 409 });
    }
    return NextResponse.json({ error: galat.message }, { status: 500 });
  }

  const { data: sesudah } = await ambilProfil(supa, wa);
  return NextResponse.json({ ok: true, toko: sesudah });
}

/** Terima hanya URL gambar dari penyimpanan kita sendiri atau kosong.
 *  Tanpa ini, kolom logo bisa diisi URL mana pun — termasuk pelacak yang
 *  dimuat tiap kali halaman toko dibuka pengunjung, di halaman yang justru
 *  dibangun untuk disebar penjual ke banyak orang.
 *
 *  Hostnya dibaca dari NEXT_PUBLIC_SUPABASE_URL, bukan dipatok ".supabase.co":
 *  kalau penyimpanannya suatu saat pindah ke domain sendiri, memaku akhiran
 *  itu di sini akan diam-diam menolak setiap logo yang baru diunggah. */
function bersihkanGambar(nilai) {
  const teks = String(nilai ?? "").trim();
  if (!teks) return null;
  try {
    const u = new URL(teks);
    if (u.protocol !== "https:") return null;
    let hostSah = null;
    try { hostSah = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname; } catch {}
    const sah = hostSah ? u.hostname === hostSah : u.hostname.endsWith(".supabase.co");
    return sah ? u.toString() : null;
  } catch { return null; }
}
