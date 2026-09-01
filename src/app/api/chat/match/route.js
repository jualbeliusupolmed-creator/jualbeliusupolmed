import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { censorProfanity } from "@/lib/profanity";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { getUserSession } from "@/lib/auth";
import { hashIdentitas } from "@/lib/identitasHash";
import { catatIdentitasWa, cariWaDariHash } from "@/lib/chatIdentity";
import { pushToWa } from "@/lib/webpush";
import { siarkanPesanBaru } from "@/lib/chatRealtime";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

// POST /api/chat/match - Matchmaking Cari Teman Anonim
//
// ── Kenapa tidak ada lagi heartbeat/timeout basi ──────────────────────────
// Versi lama room tunggu jadi "basi" dan tidak bisa dipasangkan lagi kalau
// updated_at-nya lebih tua dari 15 detik — jadi user yang tab-nya di
// belakang, koneksinya lambat, atau sudah tutup tab langsung hilang dari
// radar. Itu menutup gejala (radar berputar terus), tapi tidak menutup akar
// masalahnya: dua orang yang cari teman di jam yang TIDAK tumpang tindih
// (A menunggu lalu pergi, B baru datang belakangan) tidak akan pernah
// dipertemukan, seberapa pun besar toleransinya dinaikkan — itu bukan bug,
// itu keterbatasan "harus online bersamaan".
//
// Sekarang room tunggu TIDAK kedaluwarsa karena tidak ada heartbeat. Begitu
// ada yang cocok — kapan pun, walau berjam-jam kemudian — orang yang sudah
// pergi diberi tahu lewat push notification (lihat pushToWa di bawah) supaya
// bisa kembali. `action: poll` sekarang murni baca, dipakai klien yang masih
// membuka tab supaya terasa seketika tanpa menunggu push.
export async function POST(request) {
  try {
    const wa = getUserSession();
    if (!wa) {
      return NextResponse.json({ error: "Silakan login terlebih dahulu untuk mencari teman chat." }, { status: 401 });
    }
    const userId = hashIdentitas(wa);

    const body = await request.json();
    const { action, roomId } = body;
    const faculty = String(body.faculty || "Umum").trim().slice(0, 50) || "Umum";

    const supa = getAdminClient();
    // Pseudonim Cari Teman selalu diambil dari profil, bukan dari payload
    // browser. Ini mencegah nama berubah-ubah atau pemalsuan nama lawan chat.
    const { data: profile } = await supa
      .from("seller_profiles")
      .select("anonymous_name")
      .eq("wa", wa)
      .maybeSingle();
    const alias = censorProfanity(String(profile?.anonymous_name || "Anonim").trim().slice(0, 30)) || "Anonim";

    // 1. Action: Poll — baca status room, murni untuk klien yang tabnya masih
    // terbuka supaya terasa seketika. Tidak menulis apa pun; matching hanya
    // terjadi lewat action "find" di bawah.
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

    // Blokir hasil laporan (lihat /api/chat/room/[id]/report): yang sedang
    // diblokir tidak boleh masuk antrean — pola bot chat anonim Telegram.
    const { data: ban } = await supa
      .from("chat_bans")
      .select("until")
      .eq("subject_id", userId)
      .gt("until", new Date().toISOString())
      .maybeSingle();
    if (ban) {
      return NextResponse.json(
        {
          error: `Kamu diblokir sementara dari obrolan karena laporan beberapa pengguna lain `
            + `(sampai ${new Date(ban.until).toLocaleDateString("id-ID")}).`,
        },
        { status: 403 }
      );
    }

    // 3. Action: Find or Create Match (Default)
    if (action === "find") {
      // Dicatat supaya kalau ADA orang lain yang gabung ke room tunggu kita
      // nanti, server tahu ke nomor mana push dikirim.
      await catatIdentitasWa(supa, userId, wa);

      // Satu partner aktif pada satu waktu. Tombol "⏭ Ganti" sudah menutup
      // obrolan sebelumnya, tapi " Cari Teman Baru" dari kotak masuk tidak —
      // jadi seseorang bisa punya beberapa obrolan hidup sekaligus (36 slot
      // peserta aktif di 22 orang, 23 Agu 2026). Selama tampilannya masih satu
      // baris per room itu cuma berantakan; sejak semuanya jadi SATU utas, itu
      // ambigu: pesan yang diketik tidak jelas sampai ke siapa. Yang lama
      // ditutup di sini, dengan pesan sistem yang sama seperti keluar manual —
      // partner lama tidak boleh menunggu balasan yang tidak akan datang.
      const { data: masihAktif } = await supa
        .from("chat_rooms")
        .select("id")
        .eq("type", "random")
        .eq("status", "active")
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
      for (const lama of masihAktif || []) {
        await supa
          .from("chat_rooms")
          .update({ status: "closed", updated_at: new Date().toISOString() })
          .eq("id", lama.id);
        await supa.from("chat_messages").insert({
          room_id: lama.id,
          sender_id: "system",
          sender_alias: "Sistem",
          message: " Temanmu telah meninggalkan obrolan.",
        });
        try {
          await siarkanPesanBaru(supa, lama.id);
        } catch {
          // Siaran gagal cuma berarti lawan bicara tahu dari polling 10 detik.
        }
      }

      // Cari room tunggu siapa pun selain diri sendiri — TANPA batas umur.
      // Room yang dibuat kemarin pun tetap sah dipasangkan hari ini.
      const { data: waitingRooms } = await supa
        .from("chat_rooms")
        .select("*")
        .eq("type", "random")
        .eq("status", "waiting")
        .neq("user1_id", userId)
        .order("created_at", { ascending: true })
        .limit(1);

      if (waitingRooms && waitingRooms.length > 0) {
        const targetRoom = waitingRooms[0];
        const kini = new Date().toISOString();
        const { data: updatedRoom, error: joinError } = await supa
          .from("chat_rooms")
          .update({
            user2_id: userId,
            user2_alias: alias,
            user2_faculty: faculty,
            status: "active",
            updated_at: kini,
          })
          .eq("id", targetRoom.id)
          .eq("status", "waiting")
          .select()
          .single();

        if (updatedRoom && !joinError) {
          await supa.from("chat_messages").insert({
            room_id: updatedRoom.id,
            sender_id: "system",
            sender_alias: "Sistem",
            message: " Kalian telah terhubung! Mulai obrolan dengan santai dan sopan ya.",
          });

          // Orang yang tadi menunggu (bisa jadi sudah lama pergi) diberi tahu.
          // Gagal kirim push (belum izinkan notif, VAPID belum di-set, dst)
          // tidak boleh menggagalkan matching-nya sendiri.
          try {
            const waNunggu = await cariWaDariHash(supa, targetRoom.user1_id);
            if (waNunggu) {
              await pushToWa(supa, waNunggu, {
                title: " Ada yang mau ngobrol!",
                body: `${alias} baru bergabung — obrolan kalian sudah bisa dibuka.`,
                url: "/chat?anon=1",
                tag: `chat-match-${updatedRoom.id}`,
              });
            }
          } catch (e) {
            console.error("[chat] Push ke penunggu gagal (matching tetap jalan):", e?.message || e);
          }

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

      // Tidak ada yang menunggu — jadi penunggu. Buang dulu room tunggu lama
      // milik user ini kalau ada (satu antrean aktif per orang).
      await supa.from("chat_rooms").delete().eq("user1_id", userId).eq("status", "waiting");

      const { data: newRoom, error: createError } = await supa
        .from("chat_rooms")
        .insert({
          type: "random",
          user1_id: userId,
          user1_alias: alias,
          user1_faculty: faculty,
          status: "waiting",
          updated_at: new Date().toISOString(),
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
    }

    return NextResponse.json({ error: "Aksi tidak dikenali" }, { status: 400 });
  } catch (err) {
    console.error("POST /api/chat/match error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan internal server" }, { status: 500 });
  }
}
