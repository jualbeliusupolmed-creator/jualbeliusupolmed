import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSellerSession } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { simpanProfil } from "@/lib/simpanProfil";
import { statusToko, namaToko } from "@/lib/toko";
import { getSettings } from "@/lib/settings";
import { formatWaForBaileys } from "@/lib/constants";
import { jawabGalat } from "@/lib/jawabGalat";

export const dynamic = "force-dynamic";

const KOLOM = "wa, name, bio, slug, store_name, tagline, logo_url, banner_url, "
  + "store_area, store_hours, store_instagram, store_gmaps, store_accent, store_open, "
  + "store_announcement, store_updated_at, trusted_seller, "
  + "store_status, store_requested_at, store_approved_at, store_reject_note";

// Catatan (26 Agu 2026): dulu ada `KOLOM_LAMA` di sini — daftar cadangan tanpa
// kolom persetujuan, dipakai kalau SELECT utama gagal. Niatnya melindungi
// penjual dari kehilangan seluruh formulir gara-gara satu kolom yang belum ada.
//
// Yang terjadi justru sebaliknya: kolom yang belum ada bukan yang diduga,
// melainkan `store_gmaps` — dan ia ada di KEDUA daftar. Jadi SELECT utama selalu
// gagal, cadangannya selalu dipakai, dan yang hilang setiap saat adalah
// store_status/store_reject_note. Lencana status toko tak pernah tampil, tanpa
// satu pun galat terlihat. Cadangan yang selalu aktif bukan cadangan; ia jadi
// jalur utama yang menyembunyikan kerusakannya sendiri.
//
// Kolomnya sekarang ada (migration_profil_satu_pintu.sql), jadi cadangannya
// dibuang: kalau SELECT gagal, itu harus terlihat.
async function ambilProfil(supa, wa) {
  return supa.from("seller_profiles").select(KOLOM).eq("wa", wa).maybeSingle();
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
  if (error) return jawabGalat(error);

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

  // Menulis lewat penulis yang sama dengan /api/profil.
  //
  // Dulu blok ini merakit payload-nya sendiri, memvalidasi slug-nya sendiri,
  // dan menegakkan aturan peninjauan-ulang-nya sendiri. Aturan yang dijaga di
  // dua tempat adalah aturan yang cepat atau lambat berbeda di antara keduanya
  // — dan bedanya baru ketahuan setelah seseorang lolos.
  //
  // Di sini bahkan lebih buruk: aturannya dibatalkan oleh kodenya sendiri.
  // Beberapa baris di bawah dulu ada cadangan yang, kalau penyimpanan gagal,
  // mengulang tanpa `store_status` dan `store_requested_at`. Karena
  // `store_gmaps` tidak pernah ada di tabel, penyimpanan SELALU gagal dan
  // cadangannya SELALU dipakai — menghapus persis dua kolom yang menegakkan
  // "ganti alamat berarti ditinjau ulang". Aturannya terbaca meyakinkan di
  // kode dan tidak pernah sekali pun berlaku.
  const hasil = await simpanProfil(wa, body, { supa });
  if (hasil.pesanPengguna) {
    return NextResponse.json({ error: hasil.pesanPengguna }, { status: hasil.status || 400 });
  }
  if (hasil.error) return jawabGalat(hasil.error, { pesan: hasil.pesan });

  const { data: sesudah } = await ambilProfil(supa, wa);
  return NextResponse.json({ ok: true, toko: sesudah, gantiAlamat: hasil.gantiAlamat });
}


