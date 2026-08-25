import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getUserSession } from "@/lib/auth";
import { formatWa } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * POST /api/teman/match-dm
 * Membuat atau mencari DM room antara dua user yang match di fitur Cari Teman.
 * Body: { partnerWa: string }
 * Return: { roomId: string }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { partnerWa } = body;

    if (!partnerWa) {
      return NextResponse.json({ error: "partnerWa diperlukan" }, { status: 400 });
    }

    // Ambil identitas user yang sedang login (WA number dari session cookie)
    const sessionWa = formatWa(getUserSession() || "");
    if (!sessionWa) {
      return NextResponse.json({ error: "Kamu perlu masuk / punya akun jual-beli untuk membuka DM web" }, { status: 401 });
    }

    const cleanPartnerWa = formatWa(partnerWa);
    if (!cleanPartnerWa) {
      return NextResponse.json({ error: "Nomor WhatsApp partner tidak valid" }, { status: 400 });
    }

    if (cleanPartnerWa === sessionWa) {
      return NextResponse.json({ error: "Tidak bisa membuka DM ke diri sendiri" }, { status: 400 });
    }

    const supa = getAdminClient();

    // Cari profil kedua user
    const [{ data: myProfile }, { data: partnerProfile }] = await Promise.all([
      supa.from("seller_profiles").select("name").eq("wa", sessionWa).maybeSingle(),
      supa.from("seller_profiles").select("name").eq("wa", cleanPartnerWa).maybeSingle(),
    ]);

    const myAlias = myProfile?.name || "Aku";
    const partnerAlias = partnerProfile?.name || "Teman";

    // user1 selalu yang lexicographically kecil agar unik
    const [u1, u2, a1, a2] = sessionWa < cleanPartnerWa
      ? [sessionWa, cleanPartnerWa, myAlias, partnerAlias]
      : [cleanPartnerWa, sessionWa, partnerAlias, myAlias];

    // Cek room sudah ada
    const { data: existing } = await supa
      .from("chat_rooms")
      .select("id")
      .eq("type", "direct")
      .eq("user1_id", u1)
      .eq("user2_id", u2)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ roomId: existing.id });
    }

    // Buat room baru
    const { data: newRoom, error: roomError } = await supa
      .from("chat_rooms")
      .insert({
        type: "direct",
        user1_id: u1,
        user1_alias: a1,
        user1_faculty: "Teman Kampus",
        user2_id: u2,
        user2_alias: a2,
        user2_faculty: "Teman Kampus",
        status: "active",
      })
      .select("id")
      .single();

    if (roomError) throw new Error("Gagal membuat ruang DM: " + roomError.message);

    // Kirim pesan sistem penanda awal
    await supa.from("chat_messages").insert({
      room_id: newRoom.id,
      sender_id: "system",
      sender_alias: "Sistem",
      message: `🎉 ${myAlias} dan ${partnerAlias} match di Cari Teman Kampus! Mulai ngobrol sekarang 👋`,
    });

    return NextResponse.json({ roomId: newRoom.id });
  } catch (err) {
    console.error("POST /api/teman/match-dm error:", err);
    return NextResponse.json({ error: err.message || "Gagal membuat DM" }, { status: 500 });
  }
}
