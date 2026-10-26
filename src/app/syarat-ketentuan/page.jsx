import Link from "next/link";
import { MARKETPLACE_WA } from "@/lib/constants";

export const metadata = {
  title: "Syarat & Ketentuan",
  description: "Syarat dan ketentuan penggunaan platform serta kebijakan transaksi di Jual Beli USU Polmed.",
  alternates: { canonical: "/syarat-ketentuan" },
};

export default function SyaratKetentuanPage() {
  const waDisplay = `+62 ${MARKETPLACE_WA.slice(2, 5)}-${MARKETPLACE_WA.slice(5, 9)}-${MARKETPLACE_WA.slice(9)}`;
  
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Syarat &amp; Ketentuan</h1>
        <p className="mt-2 text-sm text-gray-500">Terakhir Diperbarui: 25 Juni 2026</p>
      </div>

      <div className="card mt-8 p-6 sm:p-8 space-y-6 text-sm text-gray-600 leading-relaxed">
        <p>
          Selamat datang di <strong>Jual Beli USU Polmed</strong>. Dengan mengakses, mendaftar, atau menggunakan platform kami, Anda setuju untuk terikat oleh Syarat dan Ketentuan berikut. Mohon baca dengan saksama sebelum menggunakan layanan kami.
        </p>

        {/* 1. Ketentuan Umum */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-2">1. Ketentuan Umum</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Platform ini merupakan wadah perantara jual-beli barang dan jasa khusus untuk masyarakat umum Universitas Sumatera Utara (USU) dan Politeknik Negeri Medan (POLMED).</li>
            <li>Pengguna wajib berusia minimal 17 tahun atau memiliki kapasitas hukum yang sah untuk melakukan transaksi jual-beli.</li>
          </ul>
        </div>

        {/* 2. Pemasangan Iklan, Aturan Barang Terlarang & Kepatuhan AdSense */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-2">2. Pemasangan Iklan &amp; Daftar Barang Terlarang</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Penjual bertanggung jawab penuh atas keakuratan deskripsi, kondisi, foto riil, dan keaslian produk/jasa yang ditawarkan.</li>
            <li>Semua produk/jasa yang dijual wajib mencantumkan harga yang jelas dan transparan dalam mata uang <strong>Rupiah (IDR)</strong>.</li>
            <li>
              <strong>Barang yang Dilarang Keras (Zero Tolerance):</strong> Demi kepatuhan hukum Negara Kesatuan Republik Indonesia dan standar periklanan Google AdSense, pengguna dilarang keras mengiklankan:
              <ul className="list-circle pl-5 mt-1 space-y-1 text-rose-700 dark:text-rose-400">
                <li>Rokok konvensional, rokok elektrik (vape), pod, mod, dan cairan rokok elektrik (e-liquid).</li>
                <li>Minuman keras, minuman beralkohol, dan zat memabukkan.</li>
                <li>Obat-obatan terlarang, narkotika, psikotropika, dan obat keras tanpa resep dokter resmi.</li>
                <li>Senjata tajam, senjata api, amunisi, dan bahan peledak.</li>
                <li>Produk bermuatan pornografi, jasa asusila, atau konten dewasa sensitif.</li>
                <li>Barang tiruan/bajakan tanpa izin, barang hasil kejahatan, atau akun peretasan.</li>
              </ul>
            </li>
            <li>Iklan yang memuat barang terlarang di atas akan langsung dihapus seketika oleh tim moderator, dan nomor akun dapat diblokir permanen.</li>
          </ul>
        </div>

        {/* 3. Biaya Layanan & Kebijakan Masa Peluncuran */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-2">3. Biaya Layanan &amp; Transparansi Masa Peluncuran</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>100% Bebas Biaya (Masa Peluncuran):</strong> Selama masa peluncuran, seluruh mahasiswa USU &amp; POLMED dapat memasang iklan dan membuka kuota Pre-Order secara 100% gratis tanpa potongan komisi (0% komisi).</li>
            <li>Penjual menerima 100% hasil penjualan secara langsung dari pembeli (COD tunai atau QRIS penjual pribadi).</li>
            <li><strong>Pemberitahuan Dini:</strong> Jika di masa mendatang diberlakukan opsi fitur berbayar (seperti penonjolan iklan prioritas atau badge distributor pro), perubahan tarif akan diumumkan secara transparan minimal 30 (tiga puluh) hari sebelumnya kepada seluruh pengguna komunitas.</li>
          </ul>
        </div>

        {/* 4. Perlindungan Data Pribadi (UU PDP No. 27/2022) */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-2">4. Perlindungan Data Pribadi (UU PDP No. 27/2022)</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Platform memproses data identitas (nama, fakultas, nomor WhatsApp) semata-mata atas dasar persetujuan (*opt-in consent*) pengguna untuk memfasilitasi transaksi jual-beli dan koordinasi pengambilan barang.</li>
            <li>Nomor telepon pada tautan profil publik diproteksi dan disamarkan menggunakan slug nama akun untuk mencegah pengikisan (*scraping*) otomatis oleh pihak ketiga yang tidak bertanggung jawab.</li>
            <li>Pengguna berhak mengajukan penarikan data pribadi atau penutupan iklan kapan saja melalui menu edit atau layanan bantuan admin.</li>
          </ul>
        </div>

        {/* 5. Transaksi COD Aman & Jalur Mediasi Sengketa */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-2">5. Titik COD Aman &amp; Jalur Mediasi Sengketa</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Untuk keselamatan bersama, setiap transaksi tatap muka (*Cash on Delivery*) wajib dilakukan di <strong>Titik Temu Resmi Kampus</strong> (Lobi Perpustakaan USU, Selasar FIB, Hall FT, Kantin Gedung Z POLMED, atau Gazebo Pintu 2).</li>
            <li>Selalu periksa fisik dan fungsi barang secara langsung sebelum menyelesaikan pembayaran.</li>
            <li>
              <strong>Jalur Mediasi Resmi:</strong> Jika terjadi ketidaksesuaian barang, dugaan penipuan, atau sengketa transaksi, kedua belah pihak dapat mengajukan mediasi melalui tombol lapor di halaman iklan atau menghubungi Tim Mediasi Komunitas di WhatsApp. Laporan akan ditindaklanjuti dalam waktu maksimal 1×24 jam.
            </li>
          </ul>
        </div>

        {/* 6. Informasi Kontak Bisnis (Contact Information) */}
        <div className="border-t pt-5">
          <h2 className="text-base font-bold text-gray-900 mb-2"> Informasi Kontak &amp; Operasional Bisnis</h2>
          <p className="mb-3">
            Apabila Anda memiliki pertanyaan lebih lanjut mengenai Syarat &amp; Ketentuan ini atau memerlukan bantuan teknis transaksi, Anda dapat menghubungi kami melalui saluran resmi berikut:
          </p>
          <dl className="grid gap-2 sm:grid-cols-2 text-xs sm:text-sm">
            <div>
              <dt className="font-semibold text-gray-900">Nama Layanan:</dt>
              <dd>Jual Beli USU Polmed</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-900">Kontak WhatsApp:</dt>
              <dd>{waDisplay}</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-900">Email Hubungan Pelanggan:</dt>
              <dd>admin@jualbeliusupolmed.web.id</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-900">Alamat Operasional:</dt>
              <dd>
                Kantor Pengelola Jual Beli USU Polmed,<br />
                Jl. Dr. T. Mansur No. 9, Padang Bulan, Kec. Medan Baru,<br />
                Kota Medan, Sumatera Utara 20155
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-6 text-center">
        <Link href="/" className="btn bg-gray-200 text-gray-700 hover:bg-gray-300">
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
