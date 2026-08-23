import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getUserSession } from "@/lib/auth";
import { sendWa } from "@/lib/fonnte";
import { buildSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const buyerWa = getUserSession();
    if (!buyerWa) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { listingId, message } = await req.json();
    if (!listingId || !message) {
      return NextResponse.json({ error: "Missing listingId or message" }, { status: 400 });
    }

    const supa = getAdminClient();

    // 1. Dapatkan info barang dan profil penjual
    const { data: listing, error: listingError } = await supa
      .from("listings")
      .select("*, seller_profiles(name, faculty)")
      .eq("id", listingId)
      .single();

    if (listingError || !listing) {
      return NextResponse.json({ error: "Barang tidak ditemukan" }, { status: 404 });
    }

    const sellerWa = listing.seller_wa;

    if (sellerWa === buyerWa) {
      return NextResponse.json({ error: "Tidak bisa mengirim chat ke barang sendiri" }, { status: 400 });
    }

    // 2. Dapatkan info pembeli
    const { data: buyerProfile } = await supa
      .from("seller_profiles")
      .select("name, faculty")
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
          user1_faculty: buyerProfile?.faculty || "Umum",
          user2_id: sellerWa,
          user2_alias: sellerName,
          user2_faculty: listing.seller_profiles?.faculty || "Umum",
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
    await supa.channel(`chat-room-${roomId}`).send({
      type: "broadcast",
      event: "pesan",
      payload: { refresh: true },
    });

    // 7. Notifikasi WhatsApp ke Penjual
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id";
    
    let waMsg = `*Pesan Baru dari Pembeli!* 💬\n\n`;
    waMsg += `Ada yang tertarik dengan barang *${listing.title}*.\n\n`;
    waMsg += `*Pesan:* "${message}"\n\n`;
    waMsg += `Balas pesannya secara langsung di Web:\n${baseUrl}/chat`;

    sendWa(sellerWa, waMsg, null, 14400).catch(console.error);

    return NextResponse.json({ success: true, roomId });
  } catch (e) {
    console.error("API marketplace start error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
