import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getUserSession } from "@/lib/auth";
import { hashIdentitas } from "@/lib/identitasHash";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

// GET /api/chat/anon/inbox — RINGKASAN satu baris untuk kotak masuk.
//
// Dulu endpoint ini mengembalikan satu baris per room, dan kotak masuk
// merendernya apa adanya: lima kali "cari teman" = lima baris dengan lima nama
// asing, empat di antaranya berisi cuplikan yang sama persis (" Kalian telah
// terhubung!"). Sekarang seluruh obrolan anonim adalah SATU utas
// (/api/chat/anon/thread), jadi kotak masuk cuma perlu tahu satu hal: apa yang
// terakhir terjadi di sana.
//
// Server tetap sumber kebenarannya — status "menunggu" ikut dari sini, supaya
// membuka situs dari perangkat lain tetap menampilkan antrean yang sedang
// jalan.
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
      .limit(60);

    if (error) {
      console.error("GET /api/chat/anon/inbox error:", error);
      return NextResponse.json({ error: "Gagal memuat kotak masuk" }, { status: 500 });
    }

    const semua = rooms || [];
    const menunggu = semua.find((r) => r.status === "waiting") || null;
    const berpesan = semua.filter((r) => r.status !== "waiting");
    const aktif = berpesan.find((r) => r.status === "active") || null;

    const aliasLawan = (r) => {
      if (!r) return null;
      const akuUser1 = r.user1_id === userId;
      return (akuUser1 ? r.user2_alias : r.user1_alias) || "Anonim";
    };

    let pesanTerakhir = null;
    if (berpesan.length) {
      // Satu baris saja — dulu di sini SELURUH pesan dari 30 room ditarik cuma
      // untuk mengambil yang paling baru di tiap room.
      const { data: pesan } = await supa
        .from("chat_messages")
        .select("message, sender_id, created_at")
        .in("room_id", berpesan.map((r) => r.id))
        .order("created_at", { ascending: false })
        .limit(1);
      const m = pesan?.[0];
      if (m) {
        pesanTerakhir = {
          teks: m.message,
          pada: m.created_at,
          milikku: m.sender_id === userId,
          sistem: m.sender_id === "system",
        };
      }
    }

    return NextResponse.json({
      ok: true,
      myId: userId,
      utas: {
        ada: berpesan.length > 0 || !!menunggu,
        jumlahOrang: berpesan.length,
        menunggu: !!menunggu,
        menungguRoomId: menunggu?.id || null,
        aktifRoomId: aktif?.id || null,
        partnerAktif: aliasLawan(aktif),
        pesanTerakhir,
        updatedAt: berpesan[0]?.updated_at || menunggu?.updated_at || null,
      },
    });
  } catch (err) {
    console.error("GET /api/chat/anon/inbox error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan internal server" }, { status: 500 });
  }
}
