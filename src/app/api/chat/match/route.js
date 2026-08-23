import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { censorProfanity } from "@/lib/profanity";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { getUserSession } from "@/lib/auth";
import { hashIdentitas } from "@/lib/identitasHash";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;
// POST /api/chat/match - Matchmaking Cari Teman Anonim
export async function POST(request) {
  try {
    const wa = getUserSession();
    if (!wa) {
      return NextResponse.json({ error: "Silakan login terlebih dahulu untuk mencari teman chat." }, { status: 401 });
    }
    const userId = hashIdentitas(wa);

    const body = await request.json();
    const { action, roomId } = body;
    const alias = censorProfanity(String(body.alias || "Anonim").trim().slice(0, 50)) || "Anonim";
    const faculty = String(body.faculty || "Umum").trim().slice(0, 50) || "Umum";

    const supa = getAdminClient();

    // 1. Action: Polling status waiting room — hanya peserta room-nya sendiri.
    // Tanpa pemeriksaan ini, siapa pun yang memegang roomId bisa membaca kedua
    // userId peserta, lalu memakai salah satunya untuk menyamar di room itu.
    if (action === "poll" && roomId) {
      const { data: room } = await supa
        .from("chat_rooms")
        .select("*")
        .eq("id", roomId)
        .single();

      if (!room) {
        return NextResponse.json({ status: "not_found" });
      }
      if (room.user1_id !== userId && room.user2_id !== userId) {
        return NextResponse.json({ error: "Kamu bukan peserta obrolan ini" }, { status: 403 });
      }

      return NextResponse.json({
        status: room.status,
        room,
        isMatched: room.status === "active",
      });
    }

    // 2. Action: Cancel waiting — hanya pembuat room yang boleh membatalkannya.
    if (action === "cancel" && roomId) {
      await supa
        .from("chat_rooms")
        .delete()
        .eq("id", roomId)
        .eq("user1_id", userId)
        .eq("status", "waiting");
      return NextResponse.json({ success: true });
    }

    // Membuat/mencari room itu menulis ke database — jangan bisa dibanjiri.
    // Poll di atas sengaja TIDAK dibatasi: klien memanggilnya tiap ~2 detik.
    const laju = rateLimit(`chat-match:${getClientIp(request)}`, { limit: 10, windowMs: 60_000 });
    if (!laju.ok) {
      return NextResponse.json(
        { error: `Terlalu sering mencari teman. Coba lagi dalam ${laju.retryAfter} detik.` },
        { status: 429 }
      );
    }

    // 3. Action: Find or Create Match (Default)
    // Cari room yang sedang menunggu (created dalam 3 menit terakhir) yang bukan dibuat oleh user ini
    const twoMinutesAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();

    const { data: waitingRooms } = await supa
      .from("chat_rooms")
      .select("*")
      .eq("type", "random")
      .eq("status", "waiting")
      .neq("user1_id", userId)
      .gt("created_at", twoMinutesAgo)
      .order("created_at", { ascending: true })
      .limit(1);

    if (waitingRooms && waitingRooms.length > 0) {
      const targetRoom = waitingRooms[0];
      // Join as user2 and activate room
      const { data: updatedRoom, error: joinError } = await supa
        .from("chat_rooms")
        .update({
          user2_id: userId,
          user2_alias: alias,
          user2_faculty: faculty,
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", targetRoom.id)
        .eq("status", "waiting")
        .select()
        .single();

      if (updatedRoom && !joinError) {
        // Kirim salam pembuka otomatis
        await supa.from("chat_messages").insert({
          room_id: updatedRoom.id,
          sender_id: "system",
          sender_alias: "Sistem",
          message: "🎉 Kalian telah terhubung! Mulai obrolan dengan santai dan sopan ya.",
        });

        return NextResponse.json({
          status: "matched",
          room: updatedRoom,
          partner: {
            alias: updatedRoom.user1_alias,
            faculty: updatedRoom.user1_faculty,
          },
        });
      }
    }

    // Jika tidak ada room yang menunggu, buat room baru dengan status waiting
    // Hapus dulu room waiting lama milik user ini jika ada
    await supa.from("chat_rooms").delete().eq("user1_id", userId).eq("status", "waiting");

    const { data: newRoom, error: createError } = await supa
      .from("chat_rooms")
      .insert({
        type: "random",
        user1_id: userId,
        user1_alias: alias,
        user1_faculty: faculty,
        status: "waiting",
      })
      .select()
      .single();

    if (createError) {
      console.error("Create chat_rooms error:", createError);
      return NextResponse.json({ error: "Gagal membuat sesi obrolan" }, { status: 500 });
    }

    return NextResponse.json({
      status: "waiting",
      roomId: newRoom.id,
      room: newRoom,
    });
  } catch (err) {
    console.error("POST /api/chat/match error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan internal server" }, { status: 500 });
  }
}
