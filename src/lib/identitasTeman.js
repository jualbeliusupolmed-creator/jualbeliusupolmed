import { getUserSession } from "@/lib/auth";
import { hashIdentitas } from "@/lib/identitasHash";
import { formatWa } from "@/lib/constants";

// Siapa yang sedang memakai Cari Teman?
//
// Fitur ini sengaja bisa dipakai TANPA akun — pengunjung baru mendapat
// `teman_client_id` acak di localStorage dan itulah identitasnya. Jadi
// identitas di sini memang boleh datang dari klien; yang tidak boleh adalah
// klien MEMILIH identitas milik orang lain.
//
// Sampai 26 Agustus 2026 keempat rute teman/* menerima identitas dari mana pun:
//
//   GET  profiles  : sesi, header `x-seller-wa`, ATAU query `?wa=`
//   POST profiles  : sesi, header, ATAU field `whatsapp` DI DALAM BODY
//   PATCH profiles : sesi, header, ATAU `userId` di body
//   matches        : sesi ATAU `?userId=`
//   swipe          : `swiper_id` di body, tanpa menoleh ke sesi sama sekali
//
// Yang paling parah baris kedua: `whatsapp` dari body dipakai sebagai
// identitas, jadi mengirim nomor orang lain berarti menimpa profil orang itu —
// foto, nama, bio. Dan karena feed membagikan `user_id` setiap kandidat,
// nomor/id yang dibutuhkan untuk memalsukan tidak perlu ditebak: sistem
// menyerahkannya sendiri.
//
// Rantai terburuknya lewat swipe: palsukan "like" dari korban ke penyerang,
// itu menjadi match, dan sistem otomatis mengirim WhatsApp berisi NOMOR kedua
// pihak. Korban tidak menyentuh apa pun dan nomornya berpindah tangan.
//
// Aturannya sekarang satu kalimat: kalau ada sesi, sesi yang menentukan dan
// klaim klien diabaikan. Kalau tidak ada sesi, barulah id anonim dipakai.
// Klaim klien tidak pernah bisa MENGGESER identitas yang sudah punya sesi.
export function identitasTeman(request, { idKlien = null } = {}) {
  const waSesi = formatWa(getUserSession() || "");
  if (waSesi) {
    return { userId: hashIdentitas(waSesi), wa: waSesi, bersesi: true };
  }
  const anon = String(idKlien || "").trim();
  if (!anon) return { userId: null, wa: null, bersesi: false };
  // Batasi bentuknya supaya id anonim tidak bisa dipakai menyamar jadi hash
  // identitas (64 heksadesimal) milik pengguna yang punya akun.
  if (/^[0-9a-f]{64}$/i.test(anon)) return { userId: null, wa: null, bersesi: false };
  return { userId: anon.slice(0, 100), wa: null, bersesi: false };
}
