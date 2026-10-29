import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSellerSession } from "@/lib/auth";
import { jawabGalat } from "@/lib/jawabGalat";
import { simpanProfil, muatProfil } from "@/lib/simpanProfil";
import { findSellerProfileBySession } from "@/lib/seller-profile-identity";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/*
 * /api/profil — satu pintu.
 *
 * Sebelum ini, menyunting profil berarti memilih pintu yang benar dari empat
 * yang tersedia: /api/teman/profiles (biodata), /api/toko (toko),
 * /api/organisasi/daftar (organisasi), /api/profile/anonymous-name (nama
 * anonim). Keempatnya menulis ke `seller_profiles`, tidak ada yang tahu
 * keberadaan yang lain, dan tiga di antaranya menulis kolom yang tidak ada.
 *
 * Rute ini menggantikan pilihan itu dengan satu alamat. Yang membedakan
 * pemakainya bukan pintunya, melainkan LAPISAN peran yang menyala untuknya —
 * dan lapisan itu ditentukan server dari isi profilnya, bukan dari apa yang
 * dikirim peramban. Seluruh aturannya tinggal di lib/simpanProfil.js supaya
 * rute mana pun yang menulis profil menulis dengan aturan yang sama.
 */

// GET /api/profil — profil lengkap milik sesi yang sedang masuk.
//
// Tanpa parameter, dan itu disengaja: setiap endpoint profil yang menerima
// nomor dari peramban cepat atau lambat dipakai untuk membaca profil orang
// lain. Itu persis yang terjadi pada /api/teman/profiles sebelum hari ini.
export async function GET() {
  try {
    const identity = getSellerSession();
    if (!identity) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });
    const supa = getAdminClient();
    const { data: seller, error } = await findSellerProfileBySession(supa, identity, "wa");
    if (error) return jawabGalat(error, { pesan: "Gagal memuat profil." });
    const profileWa = seller?.wa || identity;
    return NextResponse.json({ ok: true, profil: await muatProfil(supa, profileWa) });
  } catch (e) {
    return jawabGalat(e);
  }
}

// PUT /api/profil — simpan semuanya sekaligus: identitas, toko, organisasi,
// alamat toko, dan kartu Cari Teman. Isian yang tidak boleh diubah peran ini
// dibuang diam-diam, bukan ditolak: formulir versi lama yang masih mengirim
// field lebih tetap bekerja, tanpa pernah bisa menembus batas perannya.
export async function PUT(req) {
  try {
    const identity = getSellerSession();
    if (!identity) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });

    let body;
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: "Isian tidak terbaca." }, { status: 400 }); }

    const supa = getAdminClient();
    const { data: seller, error } = await findSellerProfileBySession(supa, identity, "wa");
    if (error) return jawabGalat(error, { pesan: "Gagal memuat profil." });
    const hasil = await simpanProfil(seller?.wa || identity, body, { supa });
    if (hasil.pesanPengguna) {
      return NextResponse.json({ error: hasil.pesanPengguna }, { status: hasil.status || 400 });
    }
    if (hasil.error) return jawabGalat(hasil.error, { pesan: hasil.pesan });

    return NextResponse.json({ ok: true, profil: hasil.profil, gantiAlamat: hasil.gantiAlamat });
  } catch (e) {
    return jawabGalat(e);
  }
}
