import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { formatWa } from "@/lib/constants";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { setSellerCookie } from "@/lib/auth";
import { hashPin } from "@/lib/pin";
import { validateOrganisasiForm, DEFAULT_INVITE_CODE } from "@/lib/organisasi";
import { getSettings } from "@/lib/settings";
import { simpanProfil } from "@/lib/simpanProfil";
import { jawabGalat } from "@/lib/jawabGalat";

export const dynamic = "force-dynamic";

// POST /api/organisasi/daftar — Pendaftaran Akun Khusus UKM & Organisasi Kampus
export async function POST(req) {
  try {
    const rl = rateLimit(`daftar_ukm:${getClientIp(req)}`, { limit: 20, windowMs: 600_000 });
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Terlalu banyak percobaan. Silakan tunggu ${rl.retryAfter} detik.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const {
      ukm_name,
      ukm_category,
      campus,
      faculty,
      ukm_instagram,
      contact_name,
      contact_wa,
      email,
      password,
      bio,
      photo_url,
      invite_code,
    } = body;

    // Validasi kelengkapan data
    const validationError = validateOrganisasiForm({
      ukm_name,
      ukm_category,
      campus,
      ukm_instagram,
      contact_name,
      contact_wa,
      bio,
    });

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const formattedWa = formatWa(contact_wa);
    if (!formattedWa) {
      return NextResponse.json({ error: "Format nomor WhatsApp narahubung tidak valid." }, { status: 400 });
    }

    // Bersihkan Instagram handle
    const cleanIg = ukm_instagram
      ? ukm_instagram.replace(/^@/, "").replace(/https?:\/\/(www\.)?instagram\.com\//i, "").trim()
      : "";

    const cleanEmail = email ? email.toLowerCase().trim() : null;
    const hashedPassword = password && password.length >= 6 ? hashPin(password) : null;

    const supa = getAdminClient();

    // Centang "terverifikasi" hanya untuk yang memegang kode undangan asli.
    //
    // Sampai 26 Agustus 2026 syaratnya berbunyi:
    //
    //     kode === DEFAULT_INVITE_CODE || kode.trim().length >= 4
    //
    // Cabang kedua membatalkan cabang pertama seluruhnya: `aaaa` menghasilkan
    // centang yang sama persis dengan kode asli. Selama itu berlaku, lencana
    // "organisasi resmi" tidak menyatakan apa pun — siapa saja bisa terdaftar
    // sebagai BEM fakultas mana pun dan memasang oprec atas namanya.
    //
    // Kode pembandingnya kini diambil dari setelan admin, bukan dari konstanta.
    // Kolomnya sudah lama ada di panel (dan panel bahkan membuatkan tautan
    // undangan dari nilainya), tapi tidak ada rute yang pernah membacanya —
    // menggantinya di sana tidak mengubah apa pun. Sekarang mengubahnya berarti.
    const setelan = await getSettings();
    const kodeSah = String(setelan.ukmInviteCode || DEFAULT_INVITE_CODE).trim().toUpperCase();
    const isVerified = Boolean(
      invite_code && String(invite_code).trim().toUpperCase() === kodeSah
    );

    // Profilnya ditulis lewat penulis bersama (lib/simpanProfil.js), bukan
    // dengan payload rakitan sendiri. Rute ini dulu merakit dua payload —
    // "lengkap" dan "standar" — dan keduanya menyebut kolom yang tidak ada
    // (`instagram`, `photo_url`, `avatar_url`), jadi mendaftar dengan foto
    // selalu berakhir 500.
    //
    // `ukm_verified` sengaja TIDAK ikut dikirim ke sana: penulis bersama memang
    // menyaringnya keluar, karena centang resmi tidak boleh bisa dinyalakan
    // lewat formulir mana pun. Yang berhak memberikannya adalah rute ini —
    // satu-satunya yang memeriksa kode undangan — dan ia melakukannya di
    // langkah terpisah di bawah, sesudah profilnya tersimpan.
    const hasil = await simpanProfil(formattedWa, {
      name: ukm_name,
      ukm_name,
      ukm_category: ukm_category || "bem_hima",
      ukm_instagram: cleanIg,
      campus: campus || "USU",
      faculty: faculty ? faculty.trim() : "Universitas",
      bio: bio ? bio.trim() : `Akun Resmi ${ukm_name.trim()} (${campus || "USU"}).`,
      avatar_url: photo_url || undefined,
    }, { supa });

    if (hasil.pesanPengguna) {
      return NextResponse.json({ error: hasil.pesanPengguna }, { status: hasil.status || 400 });
    }
    if (hasil.error) return jawabGalat(hasil.error, { pesan: "Gagal menyimpan akun organisasi." });

    // Kolom yang tidak boleh ditulis pemiliknya sendiri, ditulis di sini karena
    // di sinilah kode undangannya diperiksa.
    const lanjutan = { account_type: "ukm", ukm_verified: isVerified };
    if (cleanEmail) lanjutan.email = cleanEmail;
    if (hashedPassword) lanjutan.pin = hashedPassword;
    const { error: galatLanjutan } = await supa
      .from("seller_profiles").update(lanjutan).eq("wa", formattedWa);
    if (galatLanjutan) {
      return jawabGalat(galatLanjutan, { pesan: "Gagal menyimpan akun organisasi." });
    }

    // Set kuki sesi login langsung
    try {
      setSellerCookie(formattedWa);
    } catch (e) {
      console.warn("Set cookie note:", e.message);
    }

    return NextResponse.json({
      success: true,
      // Dulu kalimat ini selalu berbunyi "…dan terverifikasi! " apa pun
      // hasilnya. Itu tidak apa-apa selama semua orang lolos; sejak kode
      // undangannya benar-benar diperiksa, sebagian pendaftar TIDAK
      // terverifikasi — dan mereka berhak tahu itu sekarang, bukan nanti saat
      // bertanya-tanya kenapa centangnya tidak muncul.
      message: isVerified
        ? "Akun Organisasi / UKM berhasil didaftarkan dan terverifikasi! "
        : "Akun Organisasi / UKM berhasil didaftarkan. Centang resmi belum aktif karena kode undangannya tidak cocok — hubungi admin untuk mendapatkan kode yang benar.",
      wa: formattedWa,
      email: cleanEmail,
      organization: {
        ukm_name: ukm_name.trim(),
        campus: campus || "USU",
        ukm_category: ukm_category || "bem_hima",
        ukm_instagram: cleanIg,
        ukm_verified: isVerified,
      },
    });
  } catch (err) {
    console.error("POST /api/organisasi/daftar exception:", err);
    return jawabGalat(err);
  }
}
