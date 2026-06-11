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
        <p className="mt-2 text-sm text-gray-500">Terakhir Diperbarui: 11 Juni 2026</p>
      </div>

      <div className="card mt-8 p-6 sm:p-8 space-y-6 text-sm text-gray-600 leading-relaxed">
        <p>
          Selamat datang di <strong>Jual Beli USU Polmed</strong>. Dengan mengakses, mendaftar, atau menggunakan platform kami, Anda setuju untuk terikat oleh Syarat dan Ketentuan berikut. Mohon baca dengan saksama sebelum menggunakan layanan kami.
        </p>

        {/* 1. Ketentuan Umum */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-2">1. Ketentuan Umum</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Platform ini merupakan wadah perantara jual-beli barang dan jasa khusus untuk kalangan mahasiswa Universitas Sumatera Utara (USU) dan Politeknik Negeri Medan (POLMED).</li>
            <li>Pengguna wajib berusia minimal 17 tahun atau memiliki kapasitas hukum yang sah untuk melakukan transaksi jual-beli.</li>
          </ul>
        </div>

        {/* 2. Pemasangan Iklan & Kelayakan Produk */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-2">2. Pemasangan Iklan &amp; Kelayakan Produk</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Penjual bertanggung jawab penuh atas keakuratan deskripsi, kondisi, gambar, dan keaslian produk yang ditawarkan.</li>
            <li>Semua produk/jasa yang dijual wajib mencantumkan harga yang jelas dalam mata uang <strong>IDR (Indonesian Rupiah)</strong>.</li>
            <li>Dilarang keras mengiklankan barang yang melanggar hukum Negara Kesatuan Republik Indonesia, termasuk namun tidak terbatas pada: barang ilegal, barang palsu/bajakan, obat-obatan terlarang, senjata tajam, produk yang mengandung pornografi, atau barang hasil tindak kejahatan.</li>
          </ul>
        </div>

        {/* 3. Pembayaran & Biaya Layanan */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-2">3. Transaksi Pembayaran &amp; Biaya Layanan</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Layanan jasa periklanan (iklan barang, poster, *bump*, dan *featured ads*) pada platform kami diproses menggunakan sistem gateway pembayaran pihak ketiga yang aman (iPaymu).</li>
            <li>Pembayaran biaya iklan dilakukan secara di muka (upfront) dan iklan otomatis ditayangkan setelah transaksi divalidasi oleh sistem pembayaran kami.</li>
            <li>Mata uang transaksi yang sah dan digunakan pada seluruh proses pembayaran di platform ini adalah Rupiah (IDR).</li>
          </ul>
        </div>

        {/* 4. Kebijakan Refund & Pembatalan */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-2">4. Kebijakan Pengembalian Dana (Refund) &amp; Pembatalan</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Pembatalan:</strong> Transaksi pemasangan iklan yang telah berhasil diproses dan diverifikasi oleh sistem pembayaran tidak dapat dibatalkan secara sepihak setelah iklan ditayangkan secara aktif di platform kami.
            </li>
            <li>
              <strong>Pengembalian Dana (Refund):</strong> Dana yang telah dibayarkan untuk seluruh layanan periklanan bersifat final dan tidak dapat dikembalikan, kecuali terdapat kendala sistem internal kami yang mengakibatkan iklan gagal ditayangkan selama 24 jam berturut-turut setelah konfirmasi pembayaran berhasil.
            </li>
            <li>
              Untuk mengajukan klaim pengembalian akibat kegagalan transaksi teknis, pengguna dapat mengirimkan bukti transfer iPaymu yang sah ke layanan kontak pelanggan kami.
            </li>
          </ul>
        </div>

        {/* 5. Batasan Tanggung Jawab */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-2">5. Batasan Tanggung Jawab</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Platform kami bertindak sebagai perantara iklan dan tidak bertanggung jawab atas kerugian, kerusakan, cacat produk, atau penipuan yang terjadi dalam transaksi COD (*Cash on Delivery*) langsung antara penjual dan pembeli mahasiswa.</li>
            <li>Kami mengimbau keras agar transaksi serah terima barang dilakukan secara langsung di wilayah kampus USU atau POLMED demi keamanan bersama.</li>
          </ul>
        </div>

        {/* 6. Informasi Kontak Bisnis (Contact Information) */}
        <div className="border-t pt-5">
          <h2 className="text-base font-bold text-gray-900 mb-2">📞 Informasi Kontak &amp; Operasional Bisnis</h2>
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
