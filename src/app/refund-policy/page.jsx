import Link from "next/link";
import { MARKETPLACE_WA } from "@/lib/constants";

export const metadata = {
  title: "Kebijakan Pengembalian Dana (Refund Policy)",
  description: "Kebijakan pengembalian dana dan pembatalan transaksi di Jual Beli Medan.",
  alternates: { canonical: "/refund-policy" },
};

export default function RefundPolicyPage() {
  const waDisplay = `+62 ${MARKETPLACE_WA.slice(2, 5)}-${MARKETPLACE_WA.slice(5, 9)}-${MARKETPLACE_WA.slice(9)}`;
  
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Refund Policy</h1>
        <p className="mt-2 text-sm text-gray-500">Terakhir Diperbarui: 11 Juni 2026</p>
      </div>

      <div className="card mt-8 p-6 sm:p-8 space-y-6 text-sm text-gray-600 leading-relaxed">
        <p>
          Kebijakan Pengembalian Dana (Refund Policy) ini mengatur prosedur pembatalan dan pengembalian dana untuk seluruh layanan berbayar (seperti pemasangan iklan, fitur Sundul (Bump), Sundul Otomatis (Auto-Bump), dan iklan unggulan (featured)) di platform <strong>Jual Beli Medan</strong>.
        </p>

        <div>
          <h2 className="text-base font-bold text-gray-900 mb-2">1. Kebijakan Pembatalan</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Transaksi pembayaran layanan periklanan yang telah berhasil diproses oleh sistem (pembayaran telah dikonfirmasi dan layanan telah aktif) <strong>tidak dapat dibatalkan secara sepihak</strong> oleh pengguna.</li>
            <li>Jika pengguna memilih untuk menghapus iklan secara mandiri sebelum masa aktifnya berakhir, dana tidak akan dikembalikan.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-bold text-gray-900 mb-2">2. Syarat Pengembalian Dana (Refund)</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Dana yang telah dibayarkan bersifat <strong>final dan tidak dapat dikembalikan</strong> dalam kondisi normal.</li>
            <li>Pengembalian dana <strong>hanya dapat diberikan</strong> apabila terjadi kesalahan teknis dari sistem kami, misalnya: Anda telah melakukan pembayaran yang berhasil terverifikasi oleh DOKU, namun layanan (seperti fitur sundul atau penayangan iklan) gagal diaktifkan oleh sistem kami dalam waktu 1x24 jam.</li>
            <li>Pengembalian dana tidak berlaku jika iklan Anda diturunkan (take-down) secara paksa oleh administrator karena melanggar Syarat dan Ketentuan platform (misalnya menjual barang ilegal, penipuan, atau spam).</li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-bold text-gray-900 mb-2">3. Prosedur Klaim Pengembalian Dana</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Klaim pengembalian dana harus diajukan maksimal <strong>3x24 jam</strong> sejak transaksi dilakukan.</li>
            <li>Pengajuan klaim harus disertai dengan: <br/>- Bukti pembayaran sah (struk/screenshot dari DOKU atau Bank)<br/>- Nomor WhatsApp yang terdaftar pada transaksi<br/>- Penjelasan detail mengenai kendala teknis yang dialami.</li>
            <li>Silakan ajukan klaim dengan menghubungi Admin kami melalui WhatsApp ke nomor <strong>{waDisplay}</strong> atau email ke <strong>admin@jualbelimedan.web.id</strong>.</li>
            <li>Proses investigasi dan pengembalian dana akan memakan waktu hingga <strong>7-14 hari kerja</strong>, dan dana akan dikembalikan melalui metode transfer bank.</li>
          </ul>
        </div>

        <div className="border-t pt-5">
          <h2 className="text-base font-bold text-gray-900 mb-2">Persetujuan</h2>
          <p>
            Dengan menggunakan layanan berbayar di Jual Beli Medan, Anda secara otomatis dianggap telah membaca, memahami, dan menyetujui seluruh ketentuan yang tercantum dalam Refund Policy ini.
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
