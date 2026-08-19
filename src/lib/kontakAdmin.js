// Pengalihan kontak admin saat bot WhatsApp sedang padam.
//
// Tombol "Hubungi Admin" di situs ini menunjuk satu nomor: nomor bot. Selama bot
// padam — dan itu terjadi, 19 Agu 2026 selama enam jam — tombolnya tetap terlihat
// normal, tetap bisa diklik, dan pesan pelanggan masuk ke nomor yang tidak akan
// menjawab. Tombol yang menyesatkan lebih buruk daripada tombol yang hilang.
//
// Bot menyiarkan keadaannya di /kontak-admin: sehat atau tidak, dan ke nomor mana
// harus dialihkan. Nomor cadangannya diisi dari dashboard bot, jadi menggantinya
// tidak perlu deploy ulang situs.
//
// Semua kegagalan di sini berakhir "jangan ubah apa pun": endpoint mati, balasan
// aneh, jaringan lambat — situs tetap memakai nomor utama. Pengalihan yang salah
// arah lebih berbahaya daripada tidak mengalihkan.

const URL_KONTAK_BOT =
  process.env.BOT_KONTAK_URL || "https://bot.jualbeliusupolmed.web.id/kontak-admin";

export async function kontakDenganCadangan(contact) {
  const utama = String(contact?.marketplaceWa || "").replace(/\D/g, "");
  try {
    const res = await fetch(URL_KONTAK_BOT, {
      // Dipanggil dari /api/config yang ikut dimuat hampir tiap halaman: tanpa
      // cache, tiap kunjungan jadi satu permintaan tambahan ke VPS bot. Satu
      // menit cukup cepat untuk padam yang berlangsung belasan menit.
      next: { revalidate: 60 },
      // Bot yang lambat tidak boleh ikut memperlambat situs.
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return contact;
    const data = await res.json();
    // `sehat !== false` — bukan `sehat === true`. Balasan yang tidak memuat medan
    // itu sama sekali berarti kita tidak tahu, dan tidak tahu bukan alasan untuk
    // memindahkan pelanggan ke nomor lain.
    if (data?.sehat !== false) return contact;
    // Bot sudah menormalkan nomornya, tapi wa.me tidak memaafkan "08…" — dan yang
    // kena akibatnya pelanggan yang menekan tombol saat admin sedang repot.
    const digit = String(data?.cadangan || "").replace(/\D/g, "");
    const cadangan = digit.startsWith("0") ? `62${digit.slice(1)}` : digit;
    if (cadangan.length < 9 || cadangan === utama) return contact;
    return {
      ...contact,
      marketplaceWa: cadangan,
      supportPhone: `+${cadangan}`,
      // Dibaca komponen yang mau memberi tahu pengunjung kenapa nomornya beda.
      botPadam: true,
    };
  } catch {
    return contact;
  }
}
