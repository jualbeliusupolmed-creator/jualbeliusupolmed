import { redirect } from "next/navigation";
import { getSellerSession } from "@/lib/auth";
import LoginClient from "./LoginClient";

/*
 * Pintu masuk — dan pintu yang menolak membuka dirinya untuk orang yang
 * sudah ada di dalam.
 *
 * Sebelum ini halaman ini seluruhnya klien, jadi ia tidak tahu apa-apa
 * tentang kuki `seller_session` yang httpOnly. Siapa pun yang mendarat di
 * sini disodori formulir masuk — termasuk orang yang kukinya masih sah 29
 * hari lagi. Dan mendarat di sini gampang: tombol "Profil" mengarah ke
 * /profil, tautan lama, tombol kembali peramban, atau pintasan yang
 * disimpan seseorang di layar depan ponselnya.
 *
 * Pemeriksaannya di server, sebelum satu piksel pun dikirim, jadi tidak ada
 * formulir yang sempat berkedip.
 *
 * `next` dibawa terus supaya tujuan semula tidak hilang — dan disaring di
 * `tujuanAman()` (LoginClient) supaya halaman ini tidak bisa dipakai sebagai
 * batu loncatan ke situs orang lain.
 */
export const dynamic = "force-dynamic";

export const metadata = {
  robots: { index: false, follow: false },
};

function tujuanAman(next) {
  const t = String(next || "");
  if (!t.startsWith("/") || t.startsWith("//")) return "/dashboard";
  return t;
}

export default function DashboardLoginPage({ searchParams }) {
  if (getSellerSession()) redirect(tujuanAman(searchParams?.next));
  return <LoginClient />;
}
