import { Roboto } from "next/font/google";
import { AdminProvider } from "@/components/admin/AdminProvider";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { getDemoStats } from "@/lib/demoData";
import "../admin/google.css";

/**
 * Cangkang /admin-demo — salinan terbuka dari panel admin.
 *
 * KENAPA ADA. Panel admin adalah bagian yang paling banyak menjelaskan
 * bagaimana situs ini bekerja, dan ia justru yang paling tidak bisa
 * diperlihatkan: ia bergerbang sandi, dan isinya nomor telepon serta riwayat
 * pembayaran orang sungguhan. Jadi yang dibuka bukan panelnya, melainkan
 * kembarannya — komponen yang sama persis, data yang seluruhnya karangan.
 *
 * TIGA HAL YANG MEMBUATNYA AMAN, dan ketiganya berlapis:
 *
 *   1. Datanya dari src/lib/demoData.js. Tidak ada satu pun pemanggilan
 *      getAdminClient() di seluruh cabang /admin-demo — tidak ada jalan dari
 *      sini menuju database, bukan sekadar "tidak dipakai".
 *   2. AdminProvider mengenali mode demo dan menolak mengirim aksi apa pun.
 *   3. Kalau lapis 1 dan 2 sama-sama bocor, /api/admin/action tetap menuntut
 *      isAdmin(). Tiga lapis untuk satu hal, karena panel admin yang bocor
 *      bukan kesalahan yang bisa ditarik kembali.
 *
 * Yang TIDAK ditiru: cangkang ini tidak memanggil isAdmin(), jadi tidak ada
 * halaman login di sini. Itu memang gunanya.
 */

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-google-sans",
});

export const metadata = {
  // Tanpa sufiks: template di layout akar yang menambahkannya.
  title: "Panel Admin (Demo)",
  description:
    "Salinan terbuka panel admin Jual Beli USU Polmed, berisi data contoh. Dibuat supaya cara kerja sistemnya bisa dipelajari tanpa membuka data siapa pun.",
  // Salinan demo tidak boleh bersaing dengan halaman sungguhan di hasil
  // pencarian, dan tidak ada gunanya diindeks.
  robots: { index: false, follow: false },
};

export default function AdminDemoLayout({ children }) {
  const data = getDemoStats();
  const counts = {
    moderasi:
      data.listings.filter((l) => l.status === "pending").length +
      data.reports.filter((r) => r.status === "open").length +
      data.profileRequests.filter((p) => p.status === "pending").length,
    reports: data.reports.filter((r) => r.status === "open").length,
    profil_request: data.profileRequests.filter((p) => p.status === "pending").length,
    transaksi: data.payments.filter((p) => p.status === "pending").length,
    antrean: data.outboxPending,
    toko: data.stores.filter((s) => s.store_status === "menunggu").length,
  };
  for (const k of Object.keys(counts)) if (!counts[k]) delete counts[k];

  return (
    <div className={`${roboto.variable} g-admin g-shell`}>
      <AdminProvider>
        <AdminSidebar counts={counts} />

        <div className="g-main">
          <AdminTopbar counts={counts} />
          <div className="g-content">
            <div className="mx-auto w-full max-w-[1280px]">
              <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                <p className="text-sm font-bold text-amber-900 dark:text-amber-300">
                  Ini salinan demo — semua isinya karangan
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-amber-800 dark:text-amber-200/90">
                  Tampilannya sama persis dengan panel admin yang sungguhan, dan komponennya memang
                  komponen yang sama. Yang berbeda cuma dua: datanya dibuat-buat (nama, nomor, harga,
                  semuanya), dan tombolnya tidak mengerjakan apa pun — tekan saja, ia akan bilang
                  begitu. Dibuat supaya cara kerja sistem ini bisa dipelajari tanpa membuka data
                  seorang pun.
                </p>
              </div>
              {children}
            </div>
          </div>
        </div>
      </AdminProvider>
    </div>
  );
}
