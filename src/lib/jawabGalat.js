import { NextResponse } from "next/server";

// Jawaban 500 yang seragam: sebabnya masuk log server, bukan ke badan respons.
//
// Sampai 26 Agustus 2026 hampir seluruh rute menutup blok try-nya dengan
// `return NextResponse.json({ error: e.message }, { status: 500 })`. Yang
// dikirim ke pemanggil di situ bukan kalimat yang ditulis siapa pun, melainkan
// apa pun yang kebetulan dilempar — dan yang paling sering melempar adalah
// PostgREST. Pesannya membawa nama tabel, nama kolom, nama constraint, kadang
// isi baris yang bentrok. Cukup untuk menggambar ulang skema dari luar dengan
// mengirim permintaan yang sengaja salah.
//
// Yang benar-benar dibutuhkan pemanggil cuma "gagal, coba lagi". Rinciannya
// dibutuhkan oleh yang memperbaiki, dan tempatnya di log — jadi ke sanalah ia
// pergi, lengkap dengan tumpukan jejaknya.
//
// Galat yang MEMANG untuk dibaca pengguna ("Nomor WA tidak valid", "Iklan ini
// bukan milikmu") tidak lewat sini. Itu jawaban 4xx yang ditulis sengaja di
// tempatnya masing-masing, dan tidak ada yang berubah pada mereka.
export function jawabGalat(e, { status = 500, pesan = "Terjadi kesalahan di server. Coba lagi sebentar lagi." } = {}) {
  console.error("[api]", e?.stack || e?.message || e);
  return NextResponse.json({ error: pesan }, { status });
}
