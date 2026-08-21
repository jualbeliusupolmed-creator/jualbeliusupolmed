import Halamanaudit from "../../admin/audit/page";

export const dynamic = "force-dynamic";

// Komponen yang SAMA dengan /admin/audit. Ia mengambil datanya sendiri lewat
// fetch, dan alamat yang dipanggilnya mengikuti basis halaman (lihat
// src/components/admin/basis.js) — jadi di sini ia memanggil
// /api/admin-demo/audit, yang isinya karangan. Bukan salinan: satu komponen,
// dua alamat.
export default function auditDemoPage() {
  return <Halamanaudit />;
}
