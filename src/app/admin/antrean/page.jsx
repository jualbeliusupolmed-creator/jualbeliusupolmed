import { TabAntrean } from "@/components/baileys/TabAntrean";

/*
 * Antrean notifikasi WhatsApp — halamannya sendiri.
 *
 * Panelnya sudah ada sejak antrean wa_outbox dibuat, tapi satu-satunya jalan
 * menuju ke sana adalah /admin/wabot lalu menekan sub-tab "Antrean" di antara
 * tujuh belas sub-tab lain. Tidak ada di sidebar, tidak ada di Ringkasan, dan
 * /admin/antrean sendiri berakhir 404 — jadi satu-satunya orang yang tahu
 * antrean itu ada adalah orang yang membuatnya.
 *
 * Isi antrean ini justru yang paling tidak boleh terlewat: tiap barisnya
 * adalah satu orang yang menunggu kabar yang tidak pernah datang. Ia berhak
 * punya alamat sendiri dan lencana di menu.
 *
 * Komponennya SATU dan dipakai bersama halaman ini serta sub-tab di /admin/wabot
 * — bukan salinan, supaya tidak ada dua layar yang perlahan berbeda.
 */
export const dynamic = "force-dynamic";

export const metadata = { title: "Antrean Notifikasi — Admin" };

export default function AntreanPage() {
  // Tanpa PageHeader: komponennya sudah membawa judul, penjelasan, dan lencana
  // "n tertunda" sendiri. Menambah satu judul lagi cuma menghasilkan dua judul.
  return (
    <div className="animate-fade-in">
      <TabAntrean />
    </div>
  );
}
