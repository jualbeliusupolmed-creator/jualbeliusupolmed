import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getUserSession } from "@/lib/auth";
import { hashIdentitas } from "@/lib/identitasHash";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

// Berapa pesan terakhir yang dikirim ke klien. Utas ini tidak pernah dipotong
// per lawan bicara, jadi tanpa batas ia tumbuh selamanya — dan yang paling
// jarang dibaca justru yang paling atas.
const MAKS_PESAN = 400;
const MAKS_ROOM = 60;

// Pesan sistem ini digantikan oleh garis pemisah di UI. Kalau ikut dirender,
// tiap pergantian partner muncul dua kali: sekali sebagai garis, sekali lagi
// sebagai gelembung abu-abu yang isinya sama.
const SAPAAN_TERHUBUNG = " Kalian telah terhubung!";

// GET /api/chat/anon/thread — SATU utas berisi semua obrolan anonim milikku.
//
// Kenapa satu utas, padahal di database tetap satu room per pertemuan: room
// adalah unit matchmaking, laporan, dan blokir — itu tidak boleh dilebur. Yang
// dulu salah cuma penyajiannya: tiap partner baru lahir sebagai baris baru di
// kotak masuk, jadi lima kali "cari teman" terlihat seperti lima obrolan
// berbeda dengan lima nama asing — padahal bagi pemakainya itu satu kebiasaan
// yang sama. Sekarang room-nya dirangkai jadi segmen, dan pergantian orang
// jadi garis pemisah di dalam utas.
//
// Tidak ada kebocoran silang: utas dirangkai dari room yang HANYA diikuti
// pemanggilnya sendiri, jadi partner baru tidak pernah melihat percakapan
// dengan partner sebelumnya.
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
      .select("id, status, user1_id, user1_alias, user1_faculty, user2_id, user2_alias, user2_faculty, created_at, updated_at")
      .eq("type", "random")
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(MAKS_ROOM);

    if (error) {
      console.error("GET /api/chat/anon/thread error:", error);
      return NextResponse.json({ error: "Gagal memuat obrolan" }, { status: 500 });
    }

    // Query dibatasi dari yang terbaru agar sesi baru tidak terpotong, lalu
    // dibalik lagi supaya utas tetap tampil kronologis dari lama ke baru.
    const semua = [...(rooms || [])].reverse();
    const menunggu = semua.find((r) => r.status === "waiting") || null;
    // Yang aktif seharusnya cuma satu (lihat action "find" di /api/chat/match
    // yang menutup sisanya), tapi data lama masih menyimpan beberapa. Ambil
    // yang paling baru supaya kotak ketiknya tidak pernah ambigu.
    const aktif = semua
      .filter((r) => r.status === "active")
      .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))[0] || null;

    const idBerpesan = semua.filter((r) => r.status !== "waiting").map((r) => r.id);
    let pesanPerRoom = {};
    if (idBerpesan.length) {
      // Diambil terbaru-dulu lalu dibalik: yang dipotong batas adalah riwayat
      // paling lama, bukan pesan yang barusan masuk.
      const { data: pesan } = await supa
        .from("chat_messages")
        .select("id, room_id, sender_id, sender_alias, message, created_at")
        .in("room_id", idBerpesan)
        .order("created_at", { ascending: false })
        .limit(MAKS_PESAN);
      for (const m of (pesan || []).reverse()) {
        if (m.sender_id === "system" && String(m.message || "").startsWith(SAPAAN_TERHUBUNG)) continue;
        (pesanPerRoom[m.room_id] ||= []).push(m);
      }
    }

    const segmen = semua
      .filter((r) => r.status !== "waiting")
      .map((r) => {
        const akuUser1 = r.user1_id === userId;
        return {
          roomId: r.id,
          status: r.status,
          alias: (akuUser1 ? r.user2_alias : r.user1_alias) || "Anonim",
          faculty: (akuUser1 ? r.user2_faculty : r.user1_faculty) || "Umum",
          // Nama samaran yang AKU pakai di segmen ini. Klien memakainya saat
          // mengirim, supaya pesan tidak tercatat atas nama "Anonim" bawaan
          // hanya karena halaman dibuka ulang dan modalnya tidak diisi lagi.
          aliasKu: (akuUser1 ? r.user1_alias : r.user2_alias) || "Anonim",
          mulai: r.created_at,
          pesan: pesanPerRoom[r.id] || [],
        };
      });

    return NextResponse.json({
      ok: true,
      myId: userId,
      aktifRoomId: aktif?.id || null,
      menungguRoomId: menunggu?.id || null,
      segmen,
    });
  } catch (err) {
    console.error("GET /api/chat/anon/thread error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan internal server" }, { status: 500 });
  }
}
