import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getUserSession } from "@/lib/auth";
import { hashIdentitas } from "@/lib/identitasHash";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const customUserId = searchParams.get("userId");
    const campus = searchParams.get("campus");

    const sessionWa = getUserSession();
    const userId = sessionWa ? hashIdentitas(sessionWa) : customUserId;

    if (!userId) {
      return NextResponse.json({ error: "Identitas pengguna diperlukan" }, { status: 400 });
    }

    const supa = getAdminClient();

    // 1. Ambil profil user sendiri
    let { data: myProfile } = await supa
      .from("teman_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    // Jika belum ada di teman_profiles, coba fallback dari seller_profiles (Satu Pintu)
    if (!myProfile && sessionWa) {
      const { data: sProfile } = await supa
        .from("seller_profiles")
        .select("name, bio, campus, faculty, whatsapp, photo_url")
        .eq("wa", sessionWa)
        .maybeSingle();

      if (sProfile) {
        myProfile = {
          user_id: userId,
          display_name: sProfile.name || "Anak Kampus",
          bio: sProfile.bio || "",
          campus: sProfile.campus || "USU",
          faculty: sProfile.faculty || "Umum",
          whatsapp: sProfile.whatsapp || sessionWa,
          photo_url: sProfile.photo_url || "",
          intent: "Teman Santai ☕",
        };
      }
    }

    // 2. Ambil ID target yang sudah pernah di-swipe oleh user
    let swipedTargetIds = [];
    if (myProfile?.id) {
      const { data: swipes } = await supa
        .from("teman_swipes")
        .select("target_id")
        .eq("swiper_id", myProfile.id);
      
      swipedTargetIds = (swipes || []).map((s) => s.target_id);
    }

    // 3. Ambil deck profil teman yang aktif dan belum di-swipe
    let query = supa
      .from("teman_profiles")
      .select("id, user_id, photo_url, photo_urls, display_name, gender, campus, faculty, batch, intent, bio, instagram, created_at")
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

    const sessionWa = getUserSession();
    const userId = sessionWa ? hashIdentitas(sessionWa) : customUserId;

    if (!userId) {
      return NextResponse.json({ error: "Identitas pengguna diperlukan" }, { status: 400 });
    }

    if (!photo_url || typeof photo_url !== "string" || photo_url.length < 5) {
      return NextResponse.json({ error: "Foto profil wajib diunggah" }, { status: 400 });
    }

    const supa = getAdminClient();

    const profileData = {
      user_id: userId,
      photo_url,
      photo_urls: Array.isArray(photo_urls) && photo_urls.length ? photo_urls : [photo_url],
      display_name: String(display_name || "Anak Kampus").trim(),
      campus: String(campus || "USU").trim(),
      faculty: String(faculty || "Umum").trim(),
      batch: String(batch || "2024").trim(),
      intent: String(intent || "Teman Santai ☕").trim(),
      bio: String(bio || "").trim(),
      instagram: String(instagram || "").replace(/^@/, "").trim(),
      whatsapp: String(whatsapp || (sessionWa || "")).trim(),
      gender: String(gender || "all").trim(),
      target_gender: String(target_gender || "all").trim(),
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    // Cari apakah sudah punya profil
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

    // Sinkronisasi Satu Pintu: jika ada sesi login, update juga seller_profiles
    if (sessionWa) {
      try {
        await supa
          .from("seller_profiles")
          .upsert(
            {
              wa: sessionWa,
              name: profileData.display_name,
              bio: profileData.bio,
              campus: profileData.campus,
              faculty: profileData.faculty,
              photo_url: profileData.photo_url,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "wa" }
          );
      } catch (syncErr) {
        console.warn("Sync to seller_profiles warning:", syncErr?.message);
      }
    }

    return NextResponse.json({
      ok: true,
      profile: resultProfile,
    });
  } catch (err) {
    console.error("POST /api/teman/profiles error:", err);
    return NextResponse.json({ error: err.message || "Gagal menyimpan profil" }, { status: 500 });
  }
}
