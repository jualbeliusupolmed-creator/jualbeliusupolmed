// OTP disimpan sebagai hash, bukan apa adanya.
//
// Tabel `otps` adalah satu-satunya jalan pulang ke akun yang lupa sandi: kode
// yang ada di sana bisa ditukar jadi sesi penjual. Menyimpannya terang berarti
// siapa pun yang sempat membaca satu baris tabel itu — cadangan yang bocor,
// kredensial service-role yang salah tempat — bisa memakainya langsung.
//
// bcrypt, bukan sha256: kodenya cuma enam angka, jadi seluruh ruang tebakannya
// sejuta. Hash cepat apa pun bisa dibalik dalam hitungan milidetik dengan tabel
// sederhana; bcrypt membuat satu tebakan berharga ~100 ms, dan percobaan di
// sisi rute sudah dibatasi lima kali per kode.
import bcrypt from "bcryptjs";

export function hashOtp(otp) {
  return bcrypt.hashSync(String(otp), 10);
}

export function verifyOtp(input, stored) {
  if (!stored || input == null) return false;
  try {
    return bcrypt.compareSync(String(input), String(stored));
  } catch {
    return false;
  }
}
