import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { censorProfanity } from "@/lib/profanity";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;
// GET /api/chat/room/[id] - Ambil data ruangan & pesan
export async function GET(request, { params }) {
  try {
    const roomId = params.id;
    if (!roomId) return NextResponse.json({ error: "Room ID wajib diisi" }, { status: 400 });

    const supa = getAdminClient();
    const [roomRes, msgRes] = await Promise.all([
      supa.from("chat_rooms").select("*").eq("id", roomId).single(),
      supa.from("chat_messages").select("*").eq("room_id", roomId).order("created_at", { ascending: true }),
    ]);

    if (roomRes.error || !roomRes.data) {
      return NextResponse.json({ error: "Ruangan obrolan tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({
      room: roomRes.data,
      messages: msgRes.data || [],
    });
  } catch (err) {
    console.error("GET /api/chat/room/[id] error:", err);
    return NextResponse.json({ error: "Gagal memuat pesan obrolan" }, { status: 500 });
  }
}

// POST /api/chat/room/[id] - Kirim pesan ke ruangan
export async function POST(request, { params }) {
  try {
    const roomId = params.id;
    const body = await request.json();
    let { senderId, senderAlias, message } = body;

    if (!roomId || !senderId || !message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Pesan tidak boleh kosong" }, { status: 400 });
    }

    const cleanMessage = censorProfanity(message.trim().slice(0, 500));
    senderAlias = (senderAlias || "Anonim").trim().slice(0, 50);

    const supa = getAdminClient();

    // Periksa apakah ruangan masih aktif
    const { data: room } = await supa.from("chat_rooms").select("status").eq("id", roomId).single();
    if (!room || room.status === "closed") {
      return NextResponse.json({ error: "Obrolan ini telah berakhir" }, { status: 400 });
    }

    const { data, error } = await supa
      .from("chat_messages")
      .insert({
        room_id: roomId,
        sender_id: senderId,
        sender_alias: senderAlias,
        message: cleanMessage,
      })
      .select()
      .single();

    if (error) {
      console.error("Insert chat_messages error:", error);
      return NextResponse.json({ error: "Gagal mengirim pesan" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: data });
  } catch (err) {
    console.error("POST /api/chat/room/[id] error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan internal server" }, { status: 500 });
  }
}

// DELETE /api/chat/room/[id] - Tinggalkan / akhiri obrolan
export async function DELETE(request, { params }) {
  try {
    const roomId = params.id;
    if (!roomId) return NextResponse.json({ error: "Room ID wajib diisi" }, { status: 400 });

    const supa = getAdminClient();
    await supa
      .from("chat_rooms")
      .update({ status: "closed", updated_at: new Date().toISOString() })
      .eq("id", roomId);

    // Kirim pesan sistem bahwa lawan obrolan telah keluar
    await supa.from("chat_messages").insert({
      room_id: roomId,
      sender_id: "system",
      sender_alias: "Sistem",
      message: "👋 Temanmu telah meninggalkan obrolan.",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/chat/room/[id] error:", err);
    return NextResponse.json({ error: "Gagal mengakhiri obrolan" }, { status: 500 });
  }
}
