import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getUserSession } from "@/lib/auth";
import { hashIdentitas } from "@/lib/identitasHash";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// Ambang & masa blokir — pola bot chat anonim Telegram: satu orang yang
// tersinggung tidak bisa memblokir siapa pun sendirian; tiga room berbeda yang
// sama-sama melapor artinya polanya nyata.
const AMBANG_ROOM = 3;
const JENDELA_HARI = 30;
const BLOKIR_HARI = 7;

// POST /api/chat/room/[id]/report { reason? } — laporkan lawan bicara di room ini.
export async function POST(request, { params }) {
  try {
    const wa = getUserSession();
    if (!wa) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const laju = rateLimit(`chat-lapor:${getClientIp(request)}`, { limit: 5, windowMs: 5 * 60_000 });
    if (!laju.ok) {
      return NextResponse.json(
        { error: `Terlalu banyak laporan. Coba lagi dalam ${laju.retryAfter} detik.` },
        { status: 429 }
      );
    }

    const roomId = params.id;
    const body = await request.json().catch(() => ({}));
    const reason = String(body.reason || "").slice(0, 200) || null;

    const supa = getAdminClient();
    const { data: room } = await supa.from("chat_rooms").select("*").eq("id", roomId).maybeSingle();
    if (!room) return NextResponse.json({ error: "Ruangan tidak ditemukan" }, { status: 404 });

    // Identitas pelapor mengikuti cara room mencatatnya: hash utk chat anonim,
    // WA utk marketplace. Hanya peserta yang boleh melapor, dan harus ada lawan
    // bicara untuk dilaporkan (room waiting belum punya).
    const myId = room.type === "marketplace" ? wa : hashIdentitas(wa);
    if (room.user1_id !== myId && room.user2_id !== myId) {
      return NextResponse.json({ error: "Kamu bukan peserta obrolan ini" }, { status: 403 });
    }
    const lawanId = room.user1_id === myId ? room.user2_id : room.user1_id;
    if (!lawanId) {
      return NextResponse.json({ error: "Belum ada lawan bicara di room ini" }, { status: 400 });
    }

    const { error: insErr } = await supa
      .from("chat_reports")
      .insert({ room_id: roomId, reporter_id: myId, reported_id: lawanId, reason });
    // 23505 = sudah pernah melapor di room ini; tetap dihitung satu.
    if (insErr && insErr.code !== "23505") {
      console.error("Insert chat_reports error:", insErr);
      return NextResponse.json({ error: "Gagal menyimpan laporan" }, { status: 500 });
    }

    // Hitung berapa room BERBEDA yang melaporkan orang ini dalam jendela waktu.
    const sejak = new Date(Date.now() - JENDELA_HARI * 864e5).toISOString();
    const { data: laporan } = await supa
      .from("chat_reports")
      .select("room_id")
      .eq("reported_id", lawanId)
      .gte("created_at", sejak);
    const jumlahRoom = new Set((laporan || []).map((r) => r.room_id)).size;

    let diblokir = false;
    if (jumlahRoom >= AMBANG_ROOM) {
      const until = new Date(Date.now() + BLOKIR_HARI * 864e5).toISOString();
      await supa.from("chat_bans").upsert({
        subject_id: lawanId,
        until,
        reason: `${jumlahRoom} room melaporkan dalam ${JENDELA_HARI} hari`,
      });
      diblokir = true;
    }

    return NextResponse.json({
      success: true,
      diblokir,
      pesan: diblokir
        ? "Laporan diterima. Pengguna itu diblokir sementara dari obrolan."
        : "Laporan diterima. Terima kasih sudah menjaga obrolan tetap sehat.",
    });
  } catch (err) {
    console.error("POST /api/chat/room/[id]/report error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan internal server" }, { status: 500 });
  }
}
