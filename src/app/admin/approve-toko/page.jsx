import { isAdmin } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { formatWa } from "@/lib/constants";
import AdminLogin from "../AdminLogin";
import ApproveTokoClient from "./ApproveTokoClient";

export const dynamic = "force-dynamic";

export const metadata = { title: "Aktivasi Toko — Admin" };

/*
 * Halaman yang dituju tautan di dalam pesan WhatsApp permohonan toko.
 *
 * Tautannya sengaja mengarah ke SINI dan bukan ke sebuah token yang langsung
 * mengaktifkan: pesan itu mendarat di chat, dan chat diteruskan. Tautan yang
 * bekerja hanya dengan dibuka akan ikut berpindah tangan bersama pesannya.
 * Yang ada di pesan cuma alamat halaman — membukanya tetap menuntut admin
 * sudah masuk panel (kalau belum, yang muncul kotak sandi), dan mengaktifkan
 * tetap menuntut satu tombol ditekan dengan sadar.
 */
export default async function ApproveTokoPage({ searchParams }) {
  if (!isAdmin()) return <AdminLogin />;

  const waMentah = searchParams?.wa || "";
  const wa = formatWa(waMentah) || waMentah;

  const supa = getAdminClient();
  const { data: profil, error } = await supa
    .from("seller_profiles")
    .select("*")
    .eq("wa", wa)
    .maybeSingle();

  // Jumlah iklan penjual ini — angka kecil yang menolong admin memutuskan:
  // toko yang sudah punya isi beda urusannya dengan yang masih kosong.
  let jumlahIklan = 0;
  if (profil) {
    const { count } = await supa
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("seller_wa", wa);
    jumlahIklan = count || 0;
  }

  return (
    <ApproveTokoClient
      wa={wa}
      profil={profil || null}
      jumlahIklan={jumlahIklan}
      galat={error?.message || null}
    />
  );
}
