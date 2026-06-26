import Link from "next/link";
import { MARKETPLACE_WA } from "@/lib/constants";

export const metadata = {
  title: "Kebijakan Pengembalian Barang (Return Policy)",
  description: "Kebijakan pengembalian dan penukaran barang fisik di Jual Beli Medan.",
  alternates: { canonical: "/return-policy" },
};

export default function ReturnPolicyPage() {
  const waDisplay = `+62 ${MARKETPLACE_WA.slice(2, 5)}-${MARKETPLACE_WA.slice(5, 9)}-${MARKETPLACE_WA.slice(9)}`;
  
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Kebijakan Pengembalian Barang</h1>
        <p className="mt-2 text-sm text-gray-500">Terakhir Diperbarui: {new Date().toLocaleDateString("id-ID", { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className="card mt-8 p-6 sm:p-8 space-y-6 text-sm text-gray-600 leading-relaxed">
        <p>
          Kebijakan Pengembalian Barang (Return Policy) ini berlaku untuk pembelian produk fisik melalui platform <strong>Jual Beli Medan</strong>. Kami berkomitmen untuk memastikan kepuasan Anda dalam setiap transaksi.
        </p>

        <div>
          <h2 className="text-base font-bold text-gray-900 mb-2">1. Ketentuan Pengembalian (Returns)</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Kami <strong>hanya menerima pengembalian untuk produk yang rusak, cacat produksi, atau tidak sesuai dengan deskripsi</strong> saat diterima.</li>
            <li>Kami tidak melayani pengembalian barang atas alasan perubahan pikiran (change of mind) atau kesalahan pembelian dari pihak pembeli.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-bold text-gray-900 mb-2">2. Periode Pengembalian (Return Window)</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Pelanggan memiliki waktu <strong>maksimal 3 hari kalender</strong> terhitung sejak barang dinyatakan berhasil dikirim/diterima untuk mengajukan permohonan pengembalian barang.</li>
            <li>Lewat dari batas waktu 3 hari tersebut, pengajuan pengembalian tidak akan diproses.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-bold text-gray-900 mb-2">3. Biaya Pengembalian Barang (Return Cost)</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Pelanggan bertanggung jawab sepenuhnya untuk menanggung biaya pengiriman pengembalian barang</strong> kembali kepada penjual atau pihak kami.</li>
            <li>Biaya pengiriman awal (saat pembelian) tidak dapat dikembalikan (non-refundable).</li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-bold text-gray-900 mb-2">4. Penukaran Barang (Exchanges)</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Ya, kami menerima penukaran barang (exchange).</strong></li>
            <li>Jika produk yang diterima rusak/cacat, pelanggan berhak meminta penukaran dengan produk yang sama (jika stok masih tersedia) atau produk lain dengan nilai yang setara.</li>
            <li>Proses penukaran tunduk pada syarat dan jangka waktu pengembalian (poin 2) serta biaya pengiriman (poin 3).</li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-bold text-gray-900 mb-2">5. Kondisi Barang yang Dikembalikan</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Barang yang dikembalikan harus dalam keadaan aslinya, lengkap dengan tag, label, kemasan asli, dan bukti pembelian (resi/invoice).</li>
            <li>Barang yang sudah digunakan, dicuci, atau diubah bentuknya tidak memenuhi syarat untuk pengembalian.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-bold text-gray-900 mb-2">6. Prosedur Pengajuan</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Hubungi penjual secara langsung atau tim dukungan kami melalui WhatsApp di <strong>{waDisplay}</strong> dalam waktu 3 hari setelah menerima barang.</li>
            <li>Sertakan nomor order/resi pengiriman, alasan pengembalian, serta bukti foto/video unboxing yang menunjukkan kerusakan produk dengan jelas.</li>
            <li>Tunggu konfirmasi dari tim kami sebelum mengirimkan barang kembali.</li>
          </ol>
        </div>

        <div className="border-t pt-5">
          <p className="font-semibold text-gray-900">Catatan Tambahan untuk Merchant Center:</p>
          <p className="mt-1">
            Halaman ini disediakan untuk memenuhi pedoman kualitas layanan (Return and Refund Policy) agar pelanggan dapat berbelanja dengan aman dan nyaman di ekosistem platform kami.
          </p>
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
