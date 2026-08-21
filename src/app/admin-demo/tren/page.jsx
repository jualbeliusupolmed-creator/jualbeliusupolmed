import Halamantren from "../../admin/tren/page";

export const dynamic = "force-dynamic";

// Komponen yang SAMA dengan /admin/tren. Ia mengambil datanya sendiri lewat
// fetch, dan alamat yang dipanggilnya mengikuti basis halaman (lihat
// src/components/admin/basis.js) — jadi di sini ia memanggil
// /api/admin-demo/tren, yang isinya karangan. Bukan salinan: satu komponen,
// dua alamat.
export default function trenDemoPage() {
  return <Halamantren />;
}
