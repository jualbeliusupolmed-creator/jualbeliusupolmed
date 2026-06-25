import Link from "next/link";
import { MARKETPLACE_WA } from "@/lib/constants";

export const metadata = {
  title: "Kebijakan Privasi",
  description: "Kebijakan privasi perlindungan data pribadi dan privasi pengguna platform Jual Beli Medan.",
  alternates: { canonical: "/kebijakan-privasi" },
};

export default function KebijakanPrivasiPage() {
  const waDisplay = `+62 ${MARKETPLACE_WA.slice(2, 5)}-${MARKETPLACE_WA.slice(5, 9)}-${MARKETPLACE_WA.slice(9)}`;
  
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">Kebijakan Privasi</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">Terakhir Diperbarui: 25 Juni 2026</p>
      </div>

      <div className="card mt-8 p-6 sm:p-8 space-y-6 text-sm text-gray-650 dark:text-slate-300 leading-relaxed">
        <p>
          Di <strong>Jual Beli Medan</strong>, kami sangat menghargai privasi Anda. Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, menyimpan, dan melindungi informasi pribadi Anda saat Anda menggunakan situs web dan platform kami.
        </p>

        {/* 1. Informasi yang Kami Kumpulkan */}
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">1. Informasi yang Kami Kumpulkan</h2>
          <p className="mb-2">Kami mengumpulkan beberapa jenis informasi dari dan tentang pengguna platform kami, termasuk:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Informasi yang Anda Berikan:</strong> Saat Anda memasang iklan, mencari barang, atau menghubungi admin, Anda memberikan informasi seperti nama, nomor telepon (WhatsApp), foto produk, deskripsi produk, lokasi kampus/area kos, serta detail verifikasi (jika ada).</li>
            <li><strong>Informasi Transaksi:</strong> Saat Anda membayar biaya periklanan via QRIS, kami mengumpulkan status transaksi, jumlah pembayaran, dan foto struk yang Anda unggah. Kami tidak menyimpan informasi rekening atau data perbankan sensitif Anda.</li>
            <li><strong>Informasi Teknis & Log:</strong> Kami secara otomatis mengumpulkan informasi tentang perangkat Anda, alamat IP, browser yang digunakan, dan interaksi Anda di platform kami untuk analisis analitik dan optimasi performa.</li>
          </ul>
        </div>

        {/* 2. Penggunaan Informasi */}
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">2. Bagaimana Kami Menggunakan Informasi Anda</h2>
          <p className="mb-2">Kami menggunakan informasi yang kami kumpulkan untuk tujuan berikut:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Menyediakan, mengoperasikan, dan memelihara layanan marketplace kami.</li>
            <li>Menampilkan iklan produk/jasa Anda lengkap dengan nama dan nomor WhatsApp Anda agar pembeli potensial dapat menghubungi Anda secara langsung.</li>
            <li>Memproses verifikasi pembayaran Anda untuk layanan iklan berbayar (bump, featured, dll.) via QRIS statis dengan verifikasi struk oleh AI.</li>
            <li>Mengirimkan notifikasi penting terkait transaksi, status iklan, atau pembaruan layanan melalui WhatsApp atau email.</li>
            <li>Mendeteksi, mencegah, dan menangani aktivitas ilegal, kecurangan (fraud), atau penyalahgunaan platform.</li>
            <li>Meningkatkan pengalaman pengguna, melacak tren popularitas produk, dan menganalisis statistik situs secara anonim.</li>
          </ul>
        </div>

        {/* 3. Pembagian Informasi dengan Pihak Ketiga */}
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">3. Pembagian Informasi dengan Pihak Ketiga</h2>
          <p className="mb-2">Kami tidak menjual, menyewakan, atau menukar data pribadi Anda dengan pihak ketiga mana pun. Informasi Anda hanya dibagikan dalam kondisi berikut:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Penyedia Layanan:</strong> Kami menggunakan <strong>Supabase</strong> untuk menyimpan data dan struk pembayaran yang Anda unggah secara aman.</li>
            <li><strong>Kepatuhan Hukum:</strong> Kami dapat mengungkapkan informasi Anda jika diwajibkan oleh undang-undang atau perintah pengadilan untuk memenuhi kepatuhan hukum Negara Kesatuan Republik Indonesia.</li>
            <li><strong>Publik:</strong> Data iklan (judul, deskripsi, harga, foto, nama penjual, dan link WhatsApp) dipublikasikan di platform agar dapat diakses oleh calon pembeli.</li>
          </ul>
        </div>

        {/* 4. Penyimpanan dan Keamanan Data */}
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">4. Penyimpanan dan Keamanan Data</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Kami berkomitmen untuk menjaga keamanan data pribadi Anda dengan menerapkan protokol enkripsi SSL (Secure Sockets Layer) untuk semua lalu lintas data di situs kami.</li>
            <li>Data iklan dan akun disimpan dengan aman dalam database cloud yang dilindungi oleh firewall dan kebijakan akses ketat.</li>
            <li>Walaupun kami melakukan segala upaya terbaik untuk melindungi informasi pribadi Anda, perlu diingat bahwa tidak ada metode transmisi data melalui internet atau metode penyimpanan elektronik yang 100% aman.</li>
          </ul>
        </div>

        {/* 5. Hak Pengguna */}
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">5. Hak Pengguna (Kontrol atas Data Anda)</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Anda dapat memperbarui, mengubah status menjadi "Terjual" (sold), atau menghapus iklan Anda kapan saja melalui platform kami menggunakan tautan edit iklan yang Anda miliki.</li>
            <li>Anda berhak meminta kami untuk menghapus seluruh data kontak WhatsApp Anda dari sistem database kami secara permanen dengan menghubungi admin kami melalui WhatsApp resmi.</li>
          </ul>
        </div>

        {/* 6. Perubahan Kebijakan Privasi */}
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">6. Perubahan Kebijakan Privasi Ini</h2>
          <p>
            Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu guna menyesuaikan dengan perkembangan hukum atau pembaruan fitur platform. Setiap perubahan akan diumumkan di halaman ini dengan memperbarui tanggal "Terakhir Diperbarui" di bagian atas halaman.
          </p>
        </div>

        {/* 7. Kontak Layanan Pelanggan */}
        <div className="border-t pt-5 dark:border-slate-800">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">📞 Kontak Pengelola Layanan</h2>
          <p className="mb-3">
            Jika Anda memiliki pertanyaan, kekhawatiran, atau keluhan terkait Kebijakan Privasi ini, silakan hubungi kami di:
          </p>
          <dl className="grid gap-2 sm:grid-cols-2 text-xs sm:text-sm">
            <div>
              <dt className="font-semibold text-gray-900 dark:text-white">Pengelola:</dt>
              <dd>Tim Jual Beli Medan</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-900 dark:text-white">Kontak WhatsApp:</dt>
              <dd>{waDisplay}</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-900 dark:text-white">Email Dukungan:</dt>
              <dd>admin@jualbelimedan.web.id</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-900 dark:text-white">Alamat Kantor:</dt>
              <dd className="text-gray-500 dark:text-slate-400">
                Kantor Pengelola Jual Beli Medan,<br />
                Jl. Dr. T. Mansur No. 9, Padang Bulan, Kec. Medan Baru,<br />
                Kota Medan, Sumatera Utara 20155
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-6 text-center">
        <Link href="/" className="btn bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
