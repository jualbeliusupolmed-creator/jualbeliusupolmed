import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { censorProfanity } from "@/lib/profanity";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export const fetchCache = "force-no-store";
export const revalidate = 0;

import { getUserSession } from "@/lib/auth";
import { hashIdentitas } from "@/lib/identitasHash";

// Obrolan ini anonim, tapi anonim BUKAN publik: isi room hanya boleh dibaca dan
// ditulis oleh dua peserta yang dipertemukan matchmaking. Karena tidak ada
// login, "bukti keanggotaan" satu-satunya adalah userId acak yang dibuat klien
// saat pertama kali membuka /chat — cukup untuk menahan orang luar yang cuma
// memegang roomId, dan itulah ancaman yang nyata di sini.
async function ambilRoomUntuk(supa, roomId, userId) {
  if (!roomId) return { error: "Room ID wajib diisi", status: 400 };
  const { data: room, error } = await supa
    .from("chat_rooms")
    .select("*")
    .eq("id", roomId)
    .single();
  if (error || !room) return { error: "Ruangan obrolan tidak ditemukan", status: 404 };
  const wa = getUserSession();
  if (!wa) return { error: "Unauthorized", status: 401 };

  if (room.type === "marketplace") {
    if (room.user1_id !== wa && room.user2_id !== wa) {
      return { error: "Kamu bukan peserta obrolan ini", status: 403 };
    }
    return { room, actingUserId: wa };
  } else {
    const hashedWa = hashIdentitas(wa);
    if (room.user1_id !== hashedWa && room.user2_id !== hashedWa) {
      return { error: "Kamu bukan peserta obrolan ini", status: 403 };
    }
    return { room, actingUserId: hashedWa };
  }
}

// GET /api/chat/room/[id]?userId=... - Ambil data ruangan & pesan
export async function GET(request, { params }) {
  try {
    const roomId = params.id;
    const userId = new URL(request.url).searchParams.get("userId");

    const supa = getAdminClient();
    const hasil = await ambilRoomUntuk(supa, roomId, userId);
    if (hasil.error) return NextResponse.json({ error: hasil.error }, { status: hasil.status });

    const { data: messages } = await supa
      .from("chat_messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });

    return NextResponse.json({
      room: hasil.room,
      messages: messages || [],
      myId: hasil.actingUserId,
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

    const laju = rateLimit(`chat-msg:${getClientIp(request)}`, { limit: 25, windowMs: 30_000 });
    if (!laju.ok) {
      return NextResponse.json(
        { error: `Terlalu cepat. Coba lagi dalam ${laju.retryAfter} detik.` },
        { status: 429 }
      );
    }

    const cleanMessage = censorProfanity(message.trim().slice(0, 500));
    senderAlias = (senderAlias || "Anonim").trim().slice(0, 50);

    const supa = getAdminClient();

    const hasil = await ambilRoomUntuk(supa, roomId, senderId);
    if (hasil.error) return NextResponse.json({ error: hasil.error }, { status: hasil.status });
    if (hasil.room.status === "closed") {
      return NextResponse.json({ error: "Obrolan ini telah berakhir" }, { status: 400 });
    }
    
    // Gunakan actingUserId dari session jika marketplace
    const actingUserId = hasil.actingUserId;
    
    // Jika marketplace, ambil alias dari tabel seller_profiles atau room
    let finalAlias = senderAlias;
    if (hasil.room.type === "marketplace") {
      if (hasil.room.user1_id === actingUserId) {
        finalAlias = hasil.room.user1_alias;
      } else {
        finalAlias = hasil.room.user2_alias;
      }
    }

    const { data, error } = await supa
      .from("chat_messages")
      .insert({
        room_id: roomId,
        sender_id: actingUserId,
        sender_alias: finalAlias,
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

// DELETE /api/chat/room/[id]?userId=... - Tinggalkan / akhiri obrolan
export async function DELETE(request, { params }) {
  try {
    const roomId = params.id;
    const userId = new URL(request.url).searchParams.get("userId");

    const supa = getAdminClient();
    const hasil = await ambilRoomUntuk(supa, roomId, userId);
    if (hasil.error) return NextResponse.json({ error: hasil.error }, { status: hasil.status });

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
