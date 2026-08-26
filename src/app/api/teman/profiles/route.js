import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { identitasTeman } from "@/lib/identitasTeman";
import { simpanProfil } from "@/lib/simpanProfil";
import { jawabGalat } from "@/lib/jawabGalat";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const campus = searchParams.get("campus");
    // Identitas dari sesi bila ada; `?userId=` hanya untuk pemakai anonim.
    // Header `x-seller-wa` dan `?wa=` sengaja TIDAK lagi dipercaya — lihat
    // penjelasannya di lib/identitasTeman.js.
    const { userId, wa: sessionWa } = identitasTeman(request, { idKlien: searchParams.get("userId") });

    if (!userId) {
      return NextResponse.json({ error: "Identitas pengguna diperlukan" }, { status: 400 });
    }

    const supa = getAdminClient();

    // 1. Ambil profil user sendiri dari teman_profiles
    let { data: myProfile } = await supa
      .from("teman_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    // 2. Ambil data dari seller_profiles untuk sinkronisasi Satu Pintu
    let sProfile = null;
    if (sessionWa) {
      const { data } = await supa
        .from("seller_profiles")
        .select("wa, name, bio, campus, faculty, avatar_url, anonymous_name")
        .eq("wa", sessionWa)
        .maybeSingle();
      sProfile = data;
    }

    // Jika belum ada di teman_profiles, bangun objek dari seller_profiles
    if (!myProfile && sProfile) {
      myProfile = {
        user_id: userId,
        display_name: sProfile.name || "Anak Kampus",
        bio: sProfile.bio || "",
        campus: sProfile.campus || "USU",
        faculty: sProfile.faculty || "Umum",
        whatsapp: sProfile.wa || sessionWa,
        photo_url: sProfile.avatar_url || "",
        intent: "Teman Santai ☕",
      };
    } else if (myProfile && sProfile) {
      // Jika keduanya ada, pastikan data yang paling lengkap & baru dipakai
      if (!myProfile.photo_url && sProfile.avatar_url) myProfile.photo_url = sProfile.avatar_url;
      if (!myProfile.display_name && sProfile.name) myProfile.display_name = sProfile.name;
      if (!myProfile.bio && sProfile.bio) myProfile.bio = sProfile.bio;
      if (!myProfile.campus && sProfile.campus) myProfile.campus = sProfile.campus;
      if (!myProfile.faculty && sProfile.faculty) myProfile.faculty = sProfile.faculty;
    }

    // 3. Ambil ID target yang sudah pernah di-swipe oleh user
    let swipedTargetIds = [];
    if (myProfile?.id) {
      const { data: swipes } = await supa
        .from("teman_swipes")
        .select("target_id")
        .eq("swiper_id", myProfile.id);
      
      swipedTargetIds = (swipes || []).map((s) => s.target_id);
    }

    // 4. Ambil deck profil teman yang aktif dan belum di-swipe
    let query = supa
      .from("teman_profiles")
      .select("id, photo_url, photo_urls, display_name, gender, campus, faculty, batch, intent, bio, instagram, created_at")
      .eq("is_active", true)
      .neq("user_id", userId);

    if (campus && campus !== "Semua") {
      query = query.eq("campus", campus);
    }

    const { data: candidates, error: candidateErr } = await query
      .order("created_at", { ascending: false })
      .limit(60);

    if (candidateErr) throw candidateErr;

    // Saring calon yang belum di-swipe
    const availableProfiles = (candidates || []).filter(
      (c) => !swipedTargetIds.includes(c.id)
    );

    return NextResponse.json({
      ok: true,
      myProfile: myProfile || null,
      sellerProfile: sProfile || null,
      profiles: availableProfiles,
    });
  } catch (err) {
    console.error("GET /api/teman/profiles error:", err);
    return NextResponse.json({ error: err.message || "Gagal memuat profil" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      userId: customUserId,
      photo_url,
      photo_urls = [],
      display_name,
      campus = "USU",
      faculty = "Umum",
      batch = "2024",
      intent = "Teman Santai ☕",
      bio = "",
      instagram = "",
      whatsapp = "",
      gender = "all",
      target_gender = "all",
    } = body;

    // `whatsapp` dari body TIDAK boleh jadi identitas — dulu bisa, dan itu
    // berarti mengirim nomor orang lain menimpa profil orang itu.
    const { userId, wa: sessionWa } = identitasTeman(request, { idKlien: customUserId });

    if (!userId) {
      return NextResponse.json({ error: "Identitas pengguna diperlukan" }, { status: 400 });
    }

    const cleanName = String(display_name || "Anak Kampus").trim();
    const cleanPhoto = photo_url || "";
    const cleanBio = String(bio || "").trim();
    const cleanCampus = String(campus || "USU").trim();
    const cleanFaculty = String(faculty || "Umum").trim();
    const cleanBatch = String(batch || "2024").trim();
    const cleanIntent = String(intent || "Teman Santai ☕").trim();
    const cleanInstagram = String(instagram || "").replace(/^@/, "").trim();
    const cleanWa = sessionWa || String(whatsapp || "").trim();

    const supa = getAdminClient();

    const profileData = {
      user_id: userId,
      photo_url: cleanPhoto,
      photo_urls: Array.isArray(photo_urls) && photo_urls.length ? photo_urls : (cleanPhoto ? [cleanPhoto] : []),
      display_name: cleanName,
      campus: cleanCampus,
      faculty: cleanFaculty,
      batch: cleanBatch,
      intent: cleanIntent,
      bio: cleanBio,
      instagram: cleanInstagram,
      whatsapp: cleanWa,
      gender: String(gender || "all").trim(),
      target_gender: String(target_gender || "all").trim(),
      is_active: body.is_active !== undefined ? Boolean(body.is_active) : true,
      updated_at: new Date().toISOString(),
    };

    // 1. Simpan ke teman_profiles
    const { data: existing } = await supa
      .from("teman_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    let resultProfile = null;

    if (existing?.id) {
      const { data, error } = await supa
        .from("teman_profiles")
        .update(profileData)
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      resultProfile = data;
    } else {
      const { data, error } = await supa
        .from("teman_profiles")
        .insert({ ...profileData, created_at: new Date().toISOString() })
        .select()
        .single();
      if (error) throw error;
      resultProfile = data;
    }

    // 2. Sinkronisasi Satu Pintu — lewat penulis bersama, bukan aturan sendiri.
    //
    // Rute ini melayani DUA jenis pemakai: yang punya akun, dan yang anonim
    // (Cari Teman memang boleh dipakai tanpa mendaftar). Hanya yang pertama
    // punya profil penjual untuk disinkronkan.
    //
    // Blok yang dulu di sini merakit payload-nya sendiri dan menyebut tiga
    // kolom yang tidak ada — `photo_url`, `whatsapp`, `updated_at` — jadi
    // PostgREST menolak seluruh perintah. Penolakannya tidak terlihat siapa
    // pun: klien Supabase MENGEMBALIKAN galat, tidak melemparnya, jadi `catch`
    // di bawahnya tidak pernah berjalan. Layar tetap berkata "berhasil".
    //
    // Yang bikin makin sulit disadari: perintah BERIKUTNYA — menyeragamkan
    // `seller_name` di semua iklan — berhasil. Nama di kartu iklan berubah,
    // profil penjualnya tidak, dan gejalanya terbaca seperti "kadang tersimpan".
    if (sessionWa) {
      const hasil = await simpanProfil(sessionWa, {
        name: cleanName,
        bio: cleanBio,
        campus: cleanCampus,
        faculty: cleanFaculty,
        avatar_url: cleanPhoto || undefined,
      }, { supa });

      if (hasil.pesanPengguna) {
        return NextResponse.json({ error: hasil.pesanPengguna }, { status: hasil.status || 400 });
      }
      if (hasil.error) {
        return jawabGalat(hasil.error, {
          pesan: "Profil Cari Teman tersimpan, tapi gagal menyinkronkan ke profil penjual.",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      profile: resultProfile,
      seller_wa: sessionWa,
    });
  } catch (err) {
    console.error("POST /api/teman/profiles error:", err);
    return NextResponse.json({ error: err.message || "Gagal menyimpan profil" }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { userId: customUserId, is_active } = body;

    const { userId } = identitasTeman(request, { idKlien: customUserId });

    if (!userId) {
      return NextResponse.json({ error: "Identitas pengguna diperlukan" }, { status: 400 });
    }

    if (is_active === undefined) {
      return NextResponse.json({ error: "is_active diperlukan" }, { status: 400 });
    }

    const supa = getAdminClient();
    const { data, error } = await supa
      .from("teman_profiles")
      .update({ is_active: Boolean(is_active), updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, profile: data });
  } catch (err) {
    console.error("PATCH /api/teman/profiles error:", err);
    return NextResponse.json({ error: err.message || "Gagal mengubah status" }, { status: 500 });
  }
}
