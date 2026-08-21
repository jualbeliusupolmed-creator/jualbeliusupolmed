import ApproveTokoClient from "../../admin/approve-toko/ApproveTokoClient";
import { sellersDemo } from "@/lib/demoData";

export const dynamic = "force-dynamic";

export const metadata = { title: "Persetujuan Toko (Demo) — Admin" };

/**
 * Kembaran /admin/approve-toko. Halaman ini yang dituju tautan di pesan
 * WhatsApp saat penjual mengajukan tokonya — jadi ia ikut ditiru, supaya
 * orang yang mempelajari panel lewat demo melihat alur itu utuh sampai
 * ujungnya, bukan berhenti di 404.
 */
export default function ApproveTokoDemoPage({ searchParams }) {
  const wa = searchParams?.wa || sellersDemo.find((s) => s.store_status === "menunggu")?.wa || "";
  const profil = sellersDemo.find((s) => s.wa === wa) || null;
  const jumlahIklan = 3;

  return <ApproveTokoClient wa={wa} profil={profil} jumlahIklan={jumlahIklan} galat={null} />;
}
