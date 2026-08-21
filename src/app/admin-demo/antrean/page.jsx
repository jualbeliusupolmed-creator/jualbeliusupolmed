import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

/*
 * Satu-satunya halaman yang TIDAK ditiru apa adanya.
 *
 * /admin/antrean memakai komponen TabAntrean, dan komponen itu memanggil VPS
 * bot lewat proxy untuk membaca antrean notifikasi sungguhan. Memakainya di
 * sini berarti salinan demo yang terbuka untuk umum ikut mengetuk mesin
 * produksi — dan yang ditampilkannya nomor orang sungguhan yang sedang
 * menunggu kabar.
 *
 * Jadi yang ditampilkan penjelasannya, dengan contoh barisnya.
 */
export default function AntreanDemoPage() {
  const contoh = [
    { tujuan: "0800000021", isi: "Iklan \"Laptop Asus VivoBook 14\" sudah tayang.", umur: "3 menit lalu" },
    { tujuan: "0800000024", isi: "Ada yang menawar barangmu Rp 3.700.000.", umur: "18 menit lalu" },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Antrean Notifikasi"
        description="Pesan WhatsApp yang gagal terkirim dan menunggu dicoba ulang."
      />

      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-sm text-gray-600 dark:text-neutral-300">
          Tiap baris di sini adalah satu orang yang menunggu kabar yang tidak pernah datang —
          biasanya karena sambungan bot ke WhatsApp sedang putus. Antreannya disimpan di database
          situs, bukan di bot, supaya pesan tidak ikut hilang saat bot dihidupkan ulang.
        </p>
        <p className="mt-3 text-sm text-gray-600 dark:text-neutral-300">
          Di panel sungguhan, halaman ini membaca antrean langsung dari server bot dan menampilkan
          nomor tujuannya. Salinan demo sengaja tidak memanggil server itu: mengetuk mesin produksi
          dari halaman terbuka bukan demo yang jujur, dan yang akan tampil adalah nomor orang
          sungguhan.
        </p>

        <div className="mt-5 overflow-hidden rounded-lg border border-gray-200 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400 dark:bg-neutral-950">
              <tr><th className="p-3">Tujuan</th><th className="p-3">Isi</th><th className="p-3">Menunggu</th></tr>
            </thead>
            <tbody className="dark:text-neutral-300">
              {contoh.map((c) => (
                <tr key={c.tujuan} className="border-t dark:border-neutral-800">
                  <td className="p-3 font-mono text-xs">{c.tujuan}</td>
                  <td className="p-3">{c.isi}</td>
                  <td className="p-3 text-xs text-gray-400">{c.umur}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
