import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { identitasTeman } from "@/lib/identitasTeman";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const { swiper_id, target_id, action = "like", userId: idKlien } = await request.json();

    if (!swiper_id || !target_id) {
      return NextResponse.json({ error: "swiper_id dan target_id diperlukan" }, { status: 400 });
    }

    if (!["like", "pass", "superlike"].includes(action)) {
      return NextResponse.json({ error: "Aksi tidak valid" }, { status: 400 });
    }

    const supa = getAdminClient();

    // Rute ini dulu tidak menoleh ke sesi sama sekali: `swiper_id` diambil apa
    // adanya dari body. Karena feed Cari Teman membagikan `id` setiap kandidat,
    // menyapu ATAS NAMA ORANG LAIN cuma perlu menyalin satu nilai dari layar.
    //
    // Dan akibatnya tidak berhenti di satu "like" palsu. Beberapa baris di bawah,
    // begitu dua sapuan saling bertemu, sistem mengirim WhatsApp ke KEDUA pihak
    // berisi nomor masing-masing. Jadi memalsukan like dari korban ke diri sendiri
    // adalah cara memaksa sistem menyerahkan nomor korban — tanpa korban pernah
    // membuka aplikasinya.
    //
    // Sekarang penyapunya harus membuktikan bahwa profil itu miliknya.
    const { userId } = identitasTeman(request, { idKlien });
    if (!userId) {
      return NextResponse.json({ error: "Identitas pengguna diperlukan" }, { status: 400 });
    }

    const { data: profilPenyapu } = await supa
      .from("teman_profiles")
      .select("id")
      .eq("id", swiper_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!profilPenyapu) {
      return NextResponse.json({ error: "Profil ini bukan milikmu." }, { status: 403 });
    }

    // 1. Coba panggil RPC atomik process_teman_swipe
    const { data: rpcData, error: rpcError } = await supa.rpc("process_teman_swipe", {
      p_swiper_id: swiper_id,
      p_target_id: target_id,
      p_action: action,
    });

    let matched = false;
    let matchId = null;
    let partner = null;

    if (!rpcError && rpcData) {
      matched = !!rpcData.matched;
      matchId = rpcData.match_id || null;
      partner = rpcData.partner || null;
    } else {
      // Fallback manual jika RPC belum dibuat di Supabase
      await supa
        .from("teman_swipes")
        .upsert(
          { swiper_id, target_id, action, created_at: new Date().toISOString() },
          { onConflict: "swiper_id, target_id" }
        );

      if (action !== "pass") {
        // Cek reciprocal like
        const { data: reciprocal } = await supa
          .from("teman_swipes")
          .select("action")
          .eq("swiper_id", target_id)
          .eq("target_id", swiper_id)
          .in("action", ["like", "superlike"])
          .maybeSingle();

        if (reciprocal) {
          matched = true;
          const u1 = swiper_id < target_id ? swiper_id : target_id;
          const u2 = swiper_id < target_id ? target_id : swiper_id;

          const { data: matchRecord } = await supa
            .from("teman_matches")
            .upsert(
              { user1_id: u1, user2_id: u2, is_active: true, matched_at: new Date().toISOString() },
              { onConflict: "user1_id, user2_id" }
            )
            .select("id")
            .single();

          matchId = matchRecord?.id || null;

          const { data: partnerData } = await supa
            .from("teman_profiles")
            .select("id, display_name, photo_url, campus, faculty, intent, whatsapp, instagram, bio")
            .eq("id", target_id)
            .maybeSingle();

          partner = partnerData || null;
        }
      }
    }

    // 2. Jika Match, otomatis buat DM Room dan beritahu via WA
    if (matched && partner?.whatsapp) {
      try {
        const { data: swiperProfile } = await supa
          .from("teman_profiles")
          .select("display_name, campus, faculty, whatsapp")
          .eq("id", swiper_id)
          .maybeSingle();

        if (swiperProfile?.whatsapp) {
          const myWa = swiperProfile.whatsapp;
          const partnerWa = partner.whatsapp;
          
          const myAlias = swiperProfile.display_name || "Kamu";
          const partnerAlias = partner.display_name || "Teman";

          // Buat room
          const [u1, u2, a1, a2] = myWa < partnerWa
            ? [myWa, partnerWa, myAlias, partnerAlias]
            : [partnerWa, myWa, partnerAlias, myAlias];

          const { data: existing } = await supa
            .from("chat_rooms")
            .select("id")
            .eq("type", "direct")
            .eq("user1_id", u1)
            .eq("user2_id", u2)
            .maybeSingle();

          let finalRoomId = existing?.id;

          if (!finalRoomId) {
            const { data: newRoom } = await supa
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

            if (newRoom) {
              finalRoomId = newRoom.id;
              await supa.from("chat_messages").insert({
                room_id: finalRoomId,
                sender_id: "system",
                sender_alias: "Sistem",
                message: `🎉 ${a1} dan ${a2} match di Cari Teman Kampus! Mulai ngobrol sekarang 👋`,
              });
            }
          }

          const roomUrl = finalRoomId ? `https://usupolmed.com/chat?room=${finalRoomId}` : `https://usupolmed.com/chat`;

          const pesanNotif = `🎉 *IT'S A MATCH! — Teman Kampus USU & Polmed*\n\n` +
            `Hai kak! Profil kamu dan *${partner.display_name || "Seseorang"}* (${partner.campus} · ${partner.faculty}) saling LIKE di fitur Cari Teman!\n\n` +
            `Sistem telah membuat ruang obrolan anonim spesial untuk kalian. Langsung sapa dia di sini:\n${roomUrl}\n\n` +
            `_Teman baru, peluang baru di kampus! 🚀_`;

          await supa.from("wa_outbox").insert({
            nomor: swiperProfile.whatsapp,
            pesan: pesanNotif,
            kategori: "teman_match",
            status: "tertunda",
            created_at: new Date().toISOString(),
          });

          // Notif untuk partner juga
          const pesanPartner = `🎉 *IT'S A MATCH! — Teman Kampus USU & Polmed*\n\n` +
            `Hai kak! Profil kamu dan *${swiperProfile.display_name || "Seseorang"}* (${swiperProfile.campus} · ${swiperProfile.faculty}) saling LIKE di fitur Cari Teman!\n\n` +
            `Yuk balas sapaannya di sini:\n${roomUrl}\n\n` +
            `_Teman baru, peluang baru di kampus! 🚀_`;

          await supa.from("wa_outbox").insert({
            nomor: partner.whatsapp,
            pesan: pesanPartner,
            kategori: "teman_match",
            status: "tertunda",
            created_at: new Date().toISOString(),
          });
        }
      } catch (notifErr) {
        console.warn("Outbox/Room creation error (non-fatal):", notifErr?.message);
      }
    }

    return NextResponse.json({
      ok: true,
      matched,
      matchId,
      partner,
    });
  } catch (err) {
    console.error("POST /api/teman/swipe error:", err);
    return NextResponse.json({ error: err.message || "Gagal memproses swipe" }, { status: 500 });
  }
}
