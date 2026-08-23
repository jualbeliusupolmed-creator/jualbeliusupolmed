import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getUserSession } from "@/lib/auth";
import { hashIdentitas } from "@/lib/identitasHash";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

// GET /api/chat/anon/inbox — daftar obrolan anonim milikku, terbaru dulu.
//
// Server jadi sumber kebenaran, bukan localStorage: dulu obrolan yang masih
// menunggu cuma diingat lewat localStorage di satu perangkat, jadi hilang
// kalau tab ditutup lama atau dibuka dari perangkat lain. Sekarang daftar ini
// langsung dari chat_rooms, jadi "menunggu" atau "sudah tersambung" selalu
// akurat kapan pun dan di perangkat mana pun dibuka.
export async function GET() {
  try {
    const wa = getUserSession();
    if (!wa) {
      return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });
    }
    const userId = hashIdentitas(wa);
    const supa = getAdminClient();

    const { data: rooms, error } = await supa
      .from("chat_rooms")
      .select("id, status, user1_id, user1_alias, user1_faculty, user2_id, user2_alias, user2_faculty, updated_at")
      .eq("type", "random")
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order("updated_at", { ascending: false })
      .limit(30);

    if (error) {
      console.error("GET /api/chat/anon/inbox error:", error);
      return NextResponse.json({ error: "Gagal memuat kotak masuk" }, { status: 500 });
    }

    if (!rooms?.length) {
      return NextResponse.json({ ok: true, rooms: [], myId: userId });
    }

    const ids = rooms.map((r) => r.id);
    const { data: pesanTerbaru } = await supa
      .from("chat_messages")
      .select("room_id, message, sender_id, created_at")
      .in("room_id", ids)
      .order("created_at", { ascending: false });

    const terakhirPerRoom = {};
    for (const m of pesanTerbaru || []) {
      if (!terakhirPerRoom[m.room_id]) terakhirPerRoom[m.room_id] = m;
    }

    const shaped = rooms.map((r) => {
      const akuUser1 = r.user1_id === userId;
      const partnerAlias = akuUser1 ? r.user2_alias : r.user1_alias;
      const partnerFaculty = akuUser1 ? r.user2_faculty : r.user1_faculty;
      const menunggu = r.status === "waiting"; // hanya user1 yang bisa berstatus waiting
      const pesan = terakhirPerRoom[r.id];
      return {
        id: r.id,
        status: r.status,
        menunggu,
        partnerAlias: menunggu ? null : (partnerAlias || "Anonim"),
        partnerFaculty: partnerFaculty || "Umum",
        pesanTerakhir: pesan
          ? { teks: pesan.message, pada: pesan.created_at, milikku: pesan.sender_id === userId }
          : null,
        updatedAt: r.updated_at,
      };
    });

    return NextResponse.json({ ok: true, rooms: shaped, myId: userId });
  } catch (err) {
    console.error("GET /api/chat/anon/inbox error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan internal server" }, { status: 500 });
  }
}
