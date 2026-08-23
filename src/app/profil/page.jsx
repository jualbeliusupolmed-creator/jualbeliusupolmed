import { redirect } from "next/navigation";
import { getSellerSession } from "@/lib/auth";

// Satu pintu "Profil" untuk navbar bawah (dan tautan mana pun yang butuh
// "bawa saya ke akunku"): sesi diperiksa DI SERVER, lalu pengunjung diarahkan
// ke tempat yang benar untuk keadaannya —
//
//   sudah masuk  → /dashboard        (kelola iklan & toko)
//   belum masuk  → /dashboard/login  (masuk dulu, lalu dashboard)
//
// Sebelum halaman ini ada, tombol Profil menunjuk /penjual/login — yang BUKAN
// halaman login, melainkan halaman profil publik untuk penjual bernama "login"
// yang tidak pernah ada. Login sungguhan selalu di /dashboard/login.
export const dynamic = "force-dynamic";

export const metadata = {
  robots: { index: false, follow: false },
};

export default function ProfilPage() {
  redirect(getSellerSession() ? "/dashboard" : "/dashboard/login");
}
