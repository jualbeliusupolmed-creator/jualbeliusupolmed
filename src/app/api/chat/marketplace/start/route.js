import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getUserSession } from "@/lib/auth";
import { sendWa } from "@/lib/fonnte";
import { buildSlug } from "@/lib/slug";
import { censorProfanity } from "@/lib/profanity";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { siarkanPesanBaru } from "@/lib/chatRealtime";
import { jawabGalat } from "@/lib/jawabGalat";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const buyerWa = getUserSession();
    if (!buyerWa) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Tiap chat pertama memicu notifikasi WA ke penjual — tanpa rem, satu akun
    // bisa menghujani penjual mana pun.
    const laju = rateLimit(`mp-chat-start:${getClientIp(req)}`, { limit: 10, windowMs: 60_000 });
    if (!laju.ok) {
      return NextResponse.json(
        { error: `Terlalu sering memulai chat. Coba lagi dalam ${laju.retryAfter} detik.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { listingId } = body;
    // Disensor & dibatasi seperti pesan chat lain — pesan pertama tidak boleh
    // jadi satu-satunya pesan yang lolos tanpa saringan.
    const message = censorProfanity(String(body.message || "").trim().slice(0, 500));
    if (!listingId || !message) {
      return NextResponse.json({ error: "Missing listingId or message" }, { status: 400 });
    }

    const supa = getAdminClient();

    // Blokir hasil laporan (lihat /api/chat/room/[id]/report) berlaku juga di sini.
    const { data: ban } = await supa
      .from("chat_bans")
      .select("until")
      .eq("subject_id", buyerWa)
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

    // 1. Dapatkan info barang dan profil penjual
    //
    // `faculty` DIBUANG dari select ini — kolom itu TIDAK ADA di seller_profiles
    // (hanya dipakai chat_rooms.user1_faculty/user2_faculty, kolom tabel yang
    // berbeda). Selama kolomnya disebut di sini, PostgREST menjawab galat
    // "column ... does not exist" untuk SETIAP iklan tanpa kecuali, dan galat
    // itu tertangkap sebagai listingError — jadi tombol Chat Penjual menjawab
    // "Barang tidak ditemukan" walau barangnya jelas ada. Dibuktikan dengan
    // memanggil PostgREST langsung memakai kueri persis ini, 23 Agu 2026 malam.
    const { data: listing, error: listingError } = await supa
      .from("listings")
      .select("*, seller_profiles(name)")
      .eq("id", listingId)
      .single();

    if (listingError || !listing) {
      return NextResponse.json({ error: "Barang tidak ditemukan" }, { status: 404 });
    }

    const sellerWa = listing.seller_wa;

    if (sellerWa === buyerWa) {
      return NextResponse.json({ error: "Tidak bisa mengirim chat ke barang sendiri" }, { status: 400 });
    }

    // 2. Dapatkan info pembeli (faculty dibuang — lihat catatan di query listing)
    const { data: buyerProfile } = await supa
      .from("seller_profiles")
      .select("name")
      .eq("wa", buyerWa)
      .single();

    const buyerName = buyerProfile?.name || "Mahasiswa";
    const sellerName = listing.seller_profiles?.name || "Penjual";

    // 3. Cek apakah ruang obrolan sudah ada
    let roomId = null;
    const { data: existingRoom } = await supa
      .from("chat_rooms")
      .select("id")
      .eq("type", "marketplace")
      .eq("listing_id", listingId)
      .eq("user1_id", buyerWa) // user1 selalu kita set sebagai pembeli
      .eq("user2_id", sellerWa)
      .maybeSingle();

    if (existingRoom) {
      roomId = existingRoom.id;
    } else {
      // 4. Buat ruang obrolan baru
      const { data: newRoom, error: roomError } = await supa
        .from("chat_rooms")
        .insert({
          type: "marketplace",
          listing_id: listingId,
          user1_id: buyerWa,
          user1_alias: buyerName,
          user1_faculty: "Umum", // seller_profiles tidak punya kolom fakultas
          user2_id: sellerWa,
          user2_alias: sellerName,
          user2_faculty: "Umum",
          status: "active",
        })
        .select()
        .single();

      if (roomError) throw new Error("Gagal membuat ruang obrolan: " + roomError.message);
      roomId = newRoom.id;
    }

    // 5. Masukkan pesan pembeli
    const { error: msgError } = await supa
      .from("chat_messages")
      .insert({
        room_id: roomId,
        sender_id: buyerWa,
        sender_alias: buyerName,
        message: message,
      });

    if (msgError) throw new Error("Gagal mengirim pesan: " + msgError.message);

    // 6. Broadcast Realtime
    await siarkanPesanBaru(supa, roomId);

    // 7. Notifikasi WhatsApp ke Penjual — HANYA sekali saat pertama kali dihubungi (ruang baru dibuat)
    if (!existingRoom) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id";
      const kutipan = message.replace(/[\r\n*_~`]/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
      let waMsg = `*Pesan Baru dari Pembeli!* 💬\n\n`;
      waMsg += `Ada yang tertarik dengan barang *${listing.title}*.\n\n`;
      waMsg += `*Pesan:* "${kutipan}"\n\n`;
      waMsg += `Balas pesannya secara langsung di Web:\n${baseUrl}/chat`;

      sendWa(sellerWa, waMsg, null, 14400).catch(console.error);
    }

    return NextResponse.json({ success: true, roomId });
  } catch (e) {
    console.error("API marketplace start error:", e);
    return jawabGalat(e);
  }
}
