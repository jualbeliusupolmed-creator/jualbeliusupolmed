import Link from "next/link";

export const metadata = {
  title: "Pertanyaan Umum (FAQ)",
  description:
    "Jawaban pertanyaan seputar Jual Beli USU Polmed: cara pasang iklan, durasi tayang, fitur Sundul (Bump), pembayaran, COD, favorit, dan refund.",
  alternates: { canonical: "/faq" },
};

const faqs = [
  {
    q: "Apa itu Jual Beli USU Polmed?",
    a: "Jual Beli USU Polmed adalah platform marketplace khusus untuk mahasiswa Universitas Sumatera Utara (USU) dan Politeknik Negeri Medan (POLMED) untuk melakukan transaksi jual beli barang bekas, buku kuliah, fashion, makanan, mencari kos, hingga menawarkan jasa.",
  },
  {
    q: "Apakah harus gabung grup WhatsApp dulu untuk pasang iklan?",
    a: "Tidak harus. Kamu bisa langsung pasang iklan lewat halaman Pasang Iklan di website ini tanpa bergabung ke grup. Namun kami menyarankan ikut grup WhatsApp komunitas agar iklanmu juga dilihat anggota grup dan kamu mendapat info barang terbaru lebih cepat.",
  },
  {
    q: "Berapa lama iklan saya akan tayang?",
    a: "Iklan standar dan iklan poster tayang selama 14 hari sejak diaktifkan. Setelah masa tayang habis, kamu bisa memperpanjang dengan memasang ulang, atau gunakan fitur Sundul (Bump) selama masa tayang agar iklan kembali naik ke urutan paling atas.",
  },
  {
    q: "Apa itu fitur Sundul (Bump) dan Sundul Otomatis (Auto-Bump)?",
    a: "Sundul (Bump) menaikkan posisi iklanmu kembali ke baris paling atas beranda seketika — biayanya Rp 1.000 per sundul. Sundul Otomatis (Auto-Bump) menyundul iklanmu secara otomatis setiap hari selama 7 hari tanpa perlu kamu lakukan manual. Keduanya bisa diaktifkan dari Dashboard penjual.",
  },
  {
    q: "Bagaimana cara tahu iklan saya sudah tayang?",
    a: "Setelah pembayaran berhasil, iklan otomatis berstatus Aktif dan langsung muncul di beranda — biasanya kurang dari 1 menit. Kamu bisa memastikannya lewat Dashboard (status badge hijau \"active\") atau mencari iklanmu di beranda. Admin juga akan membantu mempostingkan iklanmu ke grup WhatsApp komunitas.",
  },
  {
    q: "Bagaimana cara melakukan pembayaran?",
    a: "Transaksi pembayaran fitur berbayar (pasang iklan, sundul, iklan unggulan) diproses secara aman melalui gerbang pembayaran DOKU. Kamu dapat membayar menggunakan QRIS, virtual account bank, dan metode pembayaran lain yang tersedia di halaman pembayaran.",
  },
  {
    q: "Bagaimana penjual tahu kalau ada yang minat dengan barangnya?",
    a: "Saat calon pembeli menekan tombol Minat / Chat Penjual di halaman produk, sistem otomatis mengirim notifikasi WhatsApp ke nomor penjual. Pembeli juga bisa langsung chat penjual via WhatsApp dari halaman produk atau profil penjual.",
  },
  {
    q: "Bagaimana cara menyimpan barang ke Favorit?",
    a: "Tekan ikon hati (♡) di pojok kartu produk atau di halaman detail produk. Barang yang disimpan bisa dilihat kapan saja lewat menu Favorit di navbar. Daftar favorit tersimpan di perangkatmu tanpa perlu login.",
  },
  {
    q: "Apakah transaksi barang/COD difasilitasi oleh platform?",
    a: "Tidak. Platform ini berfungsi sebagai papan iklan digital (classified ads). Transaksi serah terima barang (COD) dilakukan langsung antara penjual dan pembeli. Kami sangat menyarankan COD di titik ramai sekitar kampus seperti Pintu 1 USU, Perpustakaan USU, atau Polmed Gedung Z — lokasi-lokasi ini juga tersedia sebagai pilihan saat memasang iklan.",
  },
  {
    q: "Bagaimana jika barang yang saya terima tidak sesuai?",
    a: "Karena transaksi COD dilakukan langsung antara pembeli dan penjual, perselisihan kualitas barang berada di luar tanggung jawab platform. Selalu periksa barang dengan teliti sebelum menyerahkan uang. Jika menemukan penjual yang menipu, laporkan lewat tombol Lapor di halaman produk — pelanggar akan di-blacklist.",
  },
  {
    q: "Apakah saya bisa membatalkan iklan dan meminta refund?",
    a: "Sesuai Refund Policy kami, iklan yang sudah dibayar dan ditayangkan tidak dapat dibatalkan sepihak dan dananya tidak dapat dikembalikan. Pengembalian dana hanya diproses jika terjadi kegagalan teknis dari sistem kami yang menyebabkan iklan tidak tayang sama sekali dalam 1x24 jam setelah pembayaran sukses.",
  },
];

// JSON-LD FAQPage — agar FAQ bisa muncul sebagai rich result di Google.
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
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

      <div className="mt-10 flex flex-wrap justify-center gap-3 text-center">
        <Link href="/jual" className="btn-primary px-6">
          Pasang Iklan Sekarang
        </Link>
        <Link href="/" className="btn bg-gray-200 text-gray-700 hover:bg-gray-300">
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
