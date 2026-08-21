// Penyimpanan PIN penjual sebagai hash bcrypt.
//
// Sampai 21 Agustus 2026 berkas ini menerima PIN plaintext sebagai jalur
// mundur, dan meng-upgrade-nya jadi hash saat penjualnya berhasil login.
// Niatnya benar, hasilnya tidak: penjual yang tidak pernah login lagi tidak
// pernah kena giliran, jadi 32 dari 41 PIN masih telanjang di database hari
// itu — 78%, dua bulan setelah bcrypt dipasang.
//
// Ke-41-nya sudah di-bcrypt lewat BAGIAN 28 migrasi (dihitung di dalam
// database, nilai polosnya tidak pernah keluar dari sana), jadi jalur mundur
// itu tidak lagi menolong siapa pun — ia cuma menyisakan pintu untuk
// perbandingan plaintext kalau suatu saat ada kode baru yang menulis PIN tanpa
// melewati hashPin(). Karena itu dicabut.
import bcrypt from "bcryptjs";

export function hashPin(pin) {
  return bcrypt.hashSync(String(pin), 10);
}

// true kalau string sudah berupa hash bcrypt ($2a/$2b/$2y$...)
export function isHashed(stored) {
  return typeof stored === "string" && /^\$2[aby]\$/.test(stored);
}

// Cocokkan PIN input dengan hash tersimpan. Nilai yang bukan hash SELALU
// ditolak — termasuk kalau kebetulan sama persis dengan yang diketik.
export function verifyPin(input, stored) {
  if (!stored || input == null) return false;
  if (!isHashed(stored)) return false;
  try {
    return bcrypt.compareSync(String(input), stored);
  } catch {
    return false;
  }
}
