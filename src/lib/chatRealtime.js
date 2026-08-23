// Satu-satunya tempat pesan chat disiarkan ke peserta yang sedang membuka room.
//
// Klien (/chat) mendengar broadcast "pesan" di kanal `chat-room-<id>` lalu
// menarik ulang isi room lewat API yang memeriksa keanggotaan. Broadcast tidak
// pernah membawa isi pesan — dia cuma ketukan pintu. Itu disengaja: kebijakan
// RLS SELECT untuk anon sudah dicabut karena membuat seluruh isi chat terbaca
// siapa pun, jadi data asli tidak boleh lewat kanal realtime.
//
// Dulu ketukan ini cuma ada di /api/chat/marketplace/start, sehingga hanya
// pesan pembuka yang terasa seketika dan setiap balasan sesudahnya menunggu
// polling 10 detik. Sekarang setiap penulis pesan memanggil fungsi yang sama.
export async function siarkanPesanBaru(supa, roomId) {
  if (!roomId) return;
  let kanal = null;
  try {
    kanal = supa.channel(`chat-room-${roomId}`);
    await kanal.send({
      type: "broadcast",
      event: "pesan",
      payload: { refresh: true },
    });
  } catch (e) {
    // Realtime cuma mempercepat kedatangan; pesannya sudah aman di database.
    // Menggagalkan permintaan di sini berarti menukar "telat 10 detik" dengan
    // "pesan hilang" — jauh lebih buruk bagi pengguna.
    console.error("[chat] Broadcast realtime gagal (pesan tetap tersimpan):", e?.message || e);
  } finally {
    if (kanal) {
      try { await supa.removeChannel(kanal); } catch {}
    }
  }
}
