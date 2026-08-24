import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getUserSession } from "@/lib/auth";
import { hashIdentitas } from "@/lib/identitasHash";
import { cariWaDariHash } from "@/lib/chatIdentity";
import { siarkanPesanBaru } from "@/lib/chatRealtime";

export const dynamic = "force-dynamic";

// POST /api/chat/room/[id]/exchange-contact
// Fitur Saling Setuju Lanjut DM Pribadi di Website (Mutual Consent Direct Message)
export async function POST(request, { params }) {
  try {
    const roomId = params.id;
    if (!roomId) {
      return NextResponse.json({ error: "Room ID diperlukan" }, { status: 400 });
    }

    const wa = getUserSession();
    if (!wa) {
      return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 });
    }

    const userId = hashIdentitas(wa);
    const supa = getAdminClient();

    // 1. Ambil data room Cari Teman
    const { data: room, error: roomError } = await supa
      .from("chat_rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "Ruangan obrolan tidak ditemukan" }, { status: 404 });
    }

    if (room.type !== "random") {
      return NextResponse.json({ error: "Fitur ini khusus untuk Cari Teman" }, { status: 400 });
    }

    if (room.status !== "active") {
      return NextResponse.json({ error: "Obrolan ini sudah tidak aktif" }, { status: 400 });
    }

    if (room.user1_id !== userId && room.user2_id !== userId) {
      return NextResponse.json({ error: "Kamu bukan peserta obrolan ini" }, { status: 403 });
    }

    const isUser1 = room.user1_id === userId;
    const partnerId = isUser1 ? room.user2_id : room.user1_id;
    const myAlias = isUser1 ? room.user1_alias : room.user2_alias;

    // 2. Ambil pesan sistem consent yang sudah ada di room ini
    const { data: existingMessages } = await supa
      .from("chat_messages")
      .select("*")
      .eq("room_id", roomId)
      .in("sender_id", ["system:consent_request", "system:consent_revealed"])
      .order("created_at", { ascending: false });

    const revealedMsg = (existingMessages || []).find((m) => m.sender_id === "system:consent_revealed");
    if (revealedMsg) {
      try {
        const parsed = JSON.parse(revealedMsg.message);
        return NextResponse.json({ success: true, status: "already_revealed", directRoomId: parsed.directRoomId });
      } catch {
        return NextResponse.json({ success: true, status: "already_revealed" });
      }
    }

    const partnerRequest = (existingMessages || []).find((m) => {
      if (m.sender_id !== "system:consent_request") return false;
      try {
        const parsed = JSON.parse(m.message);
        return parsed.requesterId === partnerId;
      } catch {
        return false;
      }
    });

    if (partnerRequest) {
      // ── KEDUA BELAH PIHAK TELAH SETUJU! (MUTUAL CONSENT) ──────────────────
      const [wa1, wa2] = await Promise.all([
        cariWaDariHash(supa, room.user1_id),
        cariWaDariHash(supa, room.user2_id),
      ]);

      const realWa1 = wa1 || (room.user1_id === userId ? wa : null);
      const realWa2 = wa2 || (room.user2_id === userId ? wa : null);

      if (!realWa1 || !realWa2) {
        throw new Error("Nomor identitas pengguna tidak ditemukan");
      }

      // Ambil nama profil asli dari seller_profiles jika ada
      const { data: profiles } = await supa
        .from("seller_profiles")
        .select("phone, name, faculty")
        .in("phone", [realWa1, realWa2]);

      const profMap = {};
      (profiles || []).forEach((p) => { profMap[p.phone] = p; });

      const name1 = profMap[realWa1]?.name || room.user1_alias || "Teman Kampus";
      const faculty1 = profMap[realWa1]?.faculty || room.user1_faculty || "Umum";
      const name2 = profMap[realWa2]?.name || room.user2_alias || "Teman Kampus";
      const faculty2 = profMap[realWa2]?.faculty || room.user2_faculty || "Umum";

      // Cek apakah sudah ada room direct sebelumnya antara kedua user ini
      let directRoomId = null;
      const { data: existingDirect } = await supa
        .from("chat_rooms")
        .select("id")
        .eq("type", "direct")
        .or(`and(user1_id.eq.${realWa1},user2_id.eq.${realWa2}),and(user1_id.eq.${realWa2},user2_id.eq.${realWa1})`)
        .maybeSingle();

      if (existingDirect) {
        directRoomId = existingDirect.id;
      } else {
        // Buat room direct baru yang terintegrasi di website
        const { data: newDirect, error: createError } = await supa
          .from("chat_rooms")
          .insert({
            type: "direct",
            user1_id: realWa1,
            user1_alias: name1,
            user1_faculty: faculty1,
            user2_id: realWa2,
            user2_alias: name2,
            user2_faculty: faculty2,
            status: "active",
          })
          .select()
          .single();

        if (createError) throw new Error("Gagal membuat ruang DM: " + createError.message);
        directRoomId = newDirect.id;

        // Pesan pembuka di ruang DM baru
        await supa.from("chat_messages").insert({
          room_id: directRoomId,
          sender_id: "system",
          sender_alias: "Sistem",
          message: "🎉 Kalian telah saling setuju terhubung di DM Pribadi! Obrolan ini tersimpan permanen di Kotak Masuk akun kalian.",
        });
      }

      // Catat di obrolan Cari Teman bahwa DM sudah terbuka
      const revealedPayload = JSON.stringify({
        type: "consent_revealed",
        directRoomId,
        user1_id: room.user1_id,
        user1_alias: name1,
        user2_id: room.user2_id,
        user2_alias: name2,
      });

      const { data: newMsg, error: insertError } = await supa
        .from("chat_messages")
        .insert({
          room_id: roomId,
          sender_id: "system:consent_revealed",
          sender_alias: "Sistem",
          message: revealedPayload,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error("Gagal membuka DM: " + insertError.message);
      }

      await siarkanPesanBaru(supa, roomId);

      return NextResponse.json({
        success: true,
        status: "revealed",
        directRoomId,
        message: newMsg,
      });
    }

    // ── BELUM ADA PERSETUJUAN DARI LAWAN: KIRIM AJAKAN BARU ────────────────
    const myExistingRequest = (existingMessages || []).find((m) => {
      if (m.sender_id !== "system:consent_request") return false;
      try {
        const parsed = JSON.parse(m.message);
        return parsed.requesterId === userId;
      } catch {
        return false;
      }
    });

    if (myExistingRequest) {
      return NextResponse.json({ success: true, status: "waiting_partner" });
    }

    const requestPayload = JSON.stringify({
      type: "consent_request",
      requesterId: userId,
      requesterAlias: myAlias || "Teman Chat",
    });

    const { data: reqMsg, error: reqError } = await supa
      .from("chat_messages")
      .insert({
        room_id: roomId,
        sender_id: "system:consent_request",
        sender_alias: "Sistem",
        message: requestPayload,
      })
      .select()
      .single();

    if (reqError) {
      throw new Error("Gagal mengirim ajakan: " + reqError.message);
    }

    await siarkanPesanBaru(supa, roomId);

    return NextResponse.json({
      success: true,
      status: "requested",
      message: reqMsg,
    });
  } catch (err) {
    console.error("POST /api/chat/room/[id]/exchange-contact error:", err);
    return NextResponse.json({ error: err.message || "Terjadi kesalahan internal" }, { status: 500 });
  }
}
