import { redirect } from "next/navigation";

/*
 * Halaman ini dulu editor toko tersendiri — 593 baris formulir yang menyunting
 * kolom yang sama dengan panel Biodata di dashboard, lewat aturan sendiri.
 *
 * Dua editor untuk satu baris data bukan cuma pekerjaan ganda; ia melahirkan
 * pertanyaan yang tidak punya jawaban benar. Kalau tagline dipotong 120 huruf
 * di sini dan 90 di sana, mana yang berlaku? Kalau yang satu menyensor kata
 * kasar dan yang lain tidak, versi mana yang dibaca pembeli? Sepanjang hidup
 * halaman ini jawabannya adalah "tergantung penjualnya menyimpan dari mana".
 *
 * Sekarang seluruh penyuntingan toko ada di Profil Satu Pintu, di seksi Toko
 * yang menyala untuk pemilik toko. Yang hilang tidak ada: nama, alamat,
 * tagline, area, jam, Instagram, Maps, pengumuman, logo, sampul, warna, dan
 * pengajuan semuanya pindah ke sana — dengan satu tombol Simpan alih-alih dua.
 *
 * Pratinjau tokonya tidak dibuat ulang karena sudah ada dan selalu lebih jujur:
 * /toko/<slug> adalah halaman yang benar-benar dilihat pembeli.
 *
 * Alamat ini dipertahankan sebagai pengalihan, bukan dihapus — ia sudah lama
 * ditaut dari dashboard dan mungkin tersimpan di tab orang.
 */
export const dynamic = "force-dynamic";

export const metadata = {
  robots: { index: false, follow: false },
};

export default function TokoPage() {
  redirect("/dashboard?tab=profil");
}
