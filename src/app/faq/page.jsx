import Link from "next/link";

export const metadata = {
  title: "Pertanyaan Umum (FAQ)",
  description: "Pertanyaan yang sering diajukan mengenai layanan Jual Beli USU Polmed.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  const faqs = [
    {
      q: "Apa itu Jual Beli USU Polmed?",
      a: "Jual Beli USU Polmed adalah platform marketplace khusus untuk mahasiswa Universitas Sumatera Utara (USU) dan Politeknik Negeri Medan (POLMED) untuk melakukan transaksi jual beli barang bekas, buku kuliah, fashion, makanan, mencari kos, hingga menawarkan jasa."
    },
    {
      q: "Bagaimana cara melakukan pembayaran?",
      a: "Transaksi pembayaran untuk fitur premium (seperti pasang iklan, sundul, atau fitur khusus lainnya) diproses secara aman melalui Midtrans. Anda dapat membayar menggunakan QRIS, GoPay, OVO, transfer bank (Virtual Account), dan metode lainnya."
    },
    {
      q: "Apakah transaksi barang/COD difasilitasi oleh platform?",
      a: "Tidak. Platform ini hanya berfungsi sebagai papan iklan digital (classified ads). Transaksi serah terima barang (Cash on Delivery/COD) dilakukan langsung secara mandiri antara penjual dan pembeli. Kami sangat menyarankan agar COD dilakukan di tempat ramai dalam lingkungan kampus."
    },
    {
      q: "Berapa lama iklan saya akan tayang?",
      a: "Iklan standar akan tayang selama masa aktif yang telah ditentukan (umumnya 7, 14, atau 30 hari). Anda dapat menggunakan fitur Auto-Bump atau Sundul Iklan agar iklan Anda kembali naik ke atas pencarian."
    },
    {
      q: "Bagaimana jika barang yang saya terima tidak sesuai?",
      a: "Karena transaksi serah terima (COD) dilakukan langsung antara pembeli dan penjual, segala bentuk perselisihan terkait kualitas barang di luar tanggung jawab platform kami. Mohon selalu teliti memeriksa barang sebelum menyerahkan uang saat COD."
    },
    {
      q: "Apakah saya bisa membatalkan iklan dan meminta refund?",
      a: "Sesuai dengan Refund Policy kami, iklan yang sudah berhasil dibayar dan ditayangkan tidak dapat dibatalkan secara sepihak dan dana tidak dapat dikembalikan. Pengembalian dana hanya diproses jika terjadi kegagalan teknis sistem kami yang menyebabkan iklan tidak tayang sama sekali."
    }
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Pertanyaan Umum (FAQ)</h1>
        <p className="mt-2 text-sm text-gray-500">Temukan jawaban untuk pertanyaan yang paling sering diajukan</p>
      </div>

      <div className="mt-8 space-y-4">
        {faqs.map((faq, index) => (
          <details key={index} className="group border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg">
            <summary className="flex cursor-pointer items-center justify-between p-4 font-semibold text-gray-900 dark:text-slate-100">
              {faq.q}
              <span className="ml-4 flex-shrink-0 transition-transform duration-300 group-open:-rotate-180">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </summary>
            <div className="px-4 pb-4 text-sm text-gray-600 dark:text-slate-400">
              <p>{faq.a}</p>
            </div>
          </details>
        ))}
      </div>

      <div className="mt-10 text-center">
        <Link href="/" className="btn bg-gray-200 text-gray-700 hover:bg-gray-300">
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
