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

    const sessionWa = getUserSession();
    const userId = sessionWa ? hashIdentitas(sessionWa) : customUserId;

    if (!userId) {
      return NextResponse.json({ error: "Identitas pengguna diperlukan" }, { status: 400 });
    }

    const supa = getAdminClient();

    // 1. Ambil profil user sendiri
    const { data: myProfile } = await supa
      .from("teman_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!myProfile) {
      return NextResponse.json({ ok: true, matches: [] });
    }

    // 2. Ambil semua match record
    const { data: rawMatches, error: matchErr } = await supa
      .from("teman_matches")
      .select("id, user1_id, user2_id, matched_at, is_active")
      .or(`user1_id.eq.${myProfile.id},user2_id.eq.${myProfile.id}`)
      .eq("is_active", true)
      .order("matched_at", { ascending: false });

    if (matchErr) throw matchErr;

    if (!rawMatches || rawMatches.length === 0) {
      return NextResponse.json({ ok: true, matches: [] });
    }

    // 3. Kumpulkan partner ID
    const partnerIds = rawMatches.map((m) =>
      m.user1_id === myProfile.id ? m.user2_id : m.user1_id
    );

    const { data: partnerProfiles, error: partnerErr } = await supa
      .from("teman_profiles")
      .select("id, display_name, photo_url, photo_urls, campus, faculty, batch, intent, bio, whatsapp, instagram")
      .in("id", partnerIds);

    if (partnerErr) throw partnerErr;

    const partnerMap = {};
    (partnerProfiles || []).forEach((p) => {
      partnerMap[p.id] = p;
    });

    const matches = rawMatches
      .map((m) => {
        const partnerId = m.user1_id === myProfile.id ? m.user2_id : m.user1_id;
        const partner = partnerMap[partnerId];
        if (!partner) return null;
        return {
          matchId: m.id,
          matchedAt: m.matched_at,
          ...partner,
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      ok: true,
      matches,
    });
  } catch (err) {
    console.error("GET /api/teman/matches error:", err);
    return NextResponse.json({ error: err.message || "Gagal memuat matches" }, { status: 500 });
  }
}
