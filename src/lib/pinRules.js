// Aturan panjang & isi PIN/sandi penjual.
//
// Berkas terpisah dari lib/pin.js dengan sengaja: pin.js meng-import bcryptjs,
// dan layar login adalah komponen klien. Kalau aturan ini menumpang di sana,
// bcrypt ikut terseret ke bundel peramban — puluhan kilobyte yang tidak pernah
// dipakai di sana, hanya untuk membaca satu angka 6.
//
// Dulu aturannya "PIN 6 digit angka". Enam angka cuma 10^6 kemungkinan, dan
// yang dipilih orang bukan angka acak — tanggal lahir, tahun masuk, 123456.
// Membiarkan huruf masuk tidak memaksa siapa pun mengetik huruf; yang mau
// memakai sandi betulan saja yang berhenti dilarang. Batas atas 64 karena
// bcrypt berhenti membaca di 72 byte — sandi yang lebih panjang dari itu
// memberi rasa aman yang tidak ditepati.
export const PIN_MIN = 6;
export const PIN_MAX = 64;

// Satu tempat untuk aturannya, dipakai server DAN layar. Kalau keduanya
// mengarang aturan sendiri, yang lolos di layar bisa ditolak server tanpa
// penjelasan yang masuk akal bagi yang mengetiknya.
// Mengembalikan null kalau sah, atau kalimat siap-tampil kalau tidak.
export function validasiPin(pin) {
  const s = String(pin ?? "");
  if (!s) return "PIN / sandi wajib diisi.";
  // Spasi di ujung hampir selalu salah ketik (salin-tempel, keyboard HP), dan
  // sandi yang salahnya tidak kelihatan adalah sandi yang hilang.
  if (s !== s.trim()) return "PIN / sandi tidak boleh diawali atau diakhiri spasi.";
  if (s.length < PIN_MIN) return `PIN / sandi minimal ${PIN_MIN} karakter.`;
  if (s.length > PIN_MAX) return `PIN / sandi maksimal ${PIN_MAX} karakter.`;
  return null;
}
