import { redirect } from "next/navigation";
import { getSellerSession } from "@/lib/auth";

// Satu pintu "Profil" untuk navbar bawah (dan tautan mana pun yang butuh
// "bawa saya ke akunku"): sesi diperiksa DI SERVER, lalu pengunjung diarahkan
// ke tempat yang benar untuk keadaannya —
//
//   sudah masuk  → /dashboard?tab=profil   (langsung ke Profil Satu Pintu)
//   belum masuk  → /dashboard/login         (masuk dulu)
//
// `?tab=profil` bukan hiasan: tanpa itu tombol "Profil" mendarat di tab jualan,
// dan pengunjung harus mencari sendiri tab mana yang berisi profilnya. Pintu
// yang membuka ke ruangan yang salah tetap terasa seperti pintu yang salah.
//
// Sebelum halaman ini ada, tombol Profil menunjuk /penjual/login — yang BUKAN
// halaman login, melainkan halaman profil publik untuk penjual bernama "login"
// yang tidak pernah ada. Login sungguhan selalu di /dashboard/login.
export const dynamic = "force-dynamic";

export const metadata = {
  robots: { index: false, follow: false },
};

export default function ProfilPage() {
  redirect(getSellerSession() ? "/dashboard?tab=profil" : "/dashboard/login?next=/dashboard%3Ftab%3Dprofil");
}
