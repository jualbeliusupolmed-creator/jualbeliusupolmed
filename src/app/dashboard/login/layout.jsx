import { redirect } from "next/navigation";
import { getSellerSession } from "@/lib/auth";

// Sisi lain dari pintu tunggal /profil: penjual yang SUDAH masuk tidak perlu
// melihat halaman login lagi — langsung ke dashboard. Diperiksa di layout
// (server) karena halaman loginnya sendiri client component.
export const dynamic = "force-dynamic";

export default function LoginLayout({ children }) {
  if (getSellerSession()) redirect("/dashboard");
  return children;
}
