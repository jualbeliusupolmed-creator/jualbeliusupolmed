import Halamankeuangan from "../../admin/keuangan/page";

export const dynamic = "force-dynamic";

// Komponen yang SAMA dengan /admin/keuangan. Ia mengambil datanya sendiri lewat
// fetch, dan alamat yang dipanggilnya mengikuti basis halaman (lihat
// src/components/admin/basis.js) — jadi di sini ia memanggil
// /api/admin-demo/keuangan, yang isinya karangan. Bukan salinan: satu komponen,
// dua alamat.
export default function keuanganDemoPage() {
  return <Halamankeuangan />;
}
