// Penyimpanan PIN penjual sebagai hash bcrypt (bukan plaintext).
// Backward-compatible: PIN lama yang masih plaintext tetap bisa login, lalu
// sebaiknya di-upgrade ke hash saat login berhasil (lihat pin/verify).
import bcrypt from "bcryptjs";

export function hashPin(pin) {
  return bcrypt.hashSync(String(pin), 10);
}

// true kalau string sudah berupa hash bcrypt ($2a/$2b/$2y$...)
export function isHashed(stored) {
  return typeof stored === "string" && /^\$2[aby]\$/.test(stored);
}

// Cocokkan PIN input dengan yang tersimpan (hash atau — untuk data lama — plaintext).
export function verifyPin(input, stored) {
  if (!stored || input == null) return false;
  if (isHashed(stored)) {
    try { return bcrypt.compareSync(String(input), stored); } catch { return false; }
  }
  return String(input) === String(stored); // legacy plaintext
}
