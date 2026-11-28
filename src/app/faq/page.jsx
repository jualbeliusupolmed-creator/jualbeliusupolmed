import Link from "next/link";
import { skripJsonLd } from "@/lib/jsonLd";

export const metadata = {
  title: "Pertanyaan Umum (FAQ)",
  description:
    "Jawaban pertanyaan seputar Kampus Kita: cara jual barang, masa tayang, fitur Naikkan Barang (Bump), pembayaran, COD, keranjang, dan refund.",
  alternates: { canonical: "/faq" },
};

const faqs = [
  {
    q: "Apa itu Kampus Kita?",
    a: "Kampus Kita adalah platform marketplace dan komunitas untuk mahasiswa dari berbagai kampus di Indonesia. Pengguna dapat menawarkan barang dan jasa, mencari kebutuhan, serta terhubung dengan komunitas.",
  },
  {
    q: "Apakah harus gabung grup WhatsApp dulu untuk jual barang?",
    a: "Tidak harus. Kamu bisa langsung jual barang lewat halaman Jual Barang di website ini tanpa bergabung ke grup. Namun kami menyarankan ikut grup WhatsApp komunitas agar barang jualanmu juga dilihat anggota grup dan kamu mendapat info barang terbaru lebih cepat.",
  },
  {
    q: "Berapa lama barang jualan saya ditampilkan?",
    a: "Barang jualan ditampilkan selama 14 hari sejak diaktifkan. Setelah masa tayang habis, kamu bisa memperpanjang atau gunakan fitur Naikkan Barang (Bump) agar barangmu kembali ke urutan paling atas.",
  },
  {
    q: "Apa itu fitur Sundul (Bump) dan Sundul Otomatis (Auto-Bump)?",
    a: "Naikkan Barang (Bump) menaikkan posisi barang jualanmu ke baris paling atas beranda seketika, dengan biaya Rp 1.000 per penggunaan. Naikkan Otomatis (Auto-Bump) menaikkan barangmu secara otomatis setiap hari selama 7 hari. Keduanya bisa diaktifkan dari Dashboard penjual.",
  },
  {
    q: "Bagaimana cara tahu barang jualan saya sudah tampil?",
    a: "Setelah pembayaran berhasil, barang otomatis berstatus Aktif dan muncul di beranda, biasanya kurang dari 1 menit. Kamu bisa memastikannya lewat Dashboard (status badge hijau \"active\") atau mencari barangmu di beranda. Admin juga akan membantu membagikan barangmu ke grup WhatsApp komunitas.",
  },
  {
    q: "Bagaimana cara melakukan pembayaran?",
    a: "Pembayaran dilakukan via QRIS statis: pindai kode QR yang tampil di halaman pembayaran, transfer sesuai nominal, lalu unggah foto struk transfer. Iklan jualan akan aktif segera setelah pembayaran diverifikasi otomatis oleh sistem, biasanya dalam hitungan detik.",
  },
  {
    q: "Bagaimana penjual tahu kalau ada yang minat dengan barangnya?",
    a: "Saat calon pembeli menekan tombol Minat / Chat Penjual di halaman produk, sistem otomatis mengirim notifikasi WhatsApp ke nomor penjual. Pembeli juga bisa langsung chat penjual via WhatsApp dari halaman produk atau profil penjual.",
  },
  {
    q: "Bagaimana cara menyimpan barang ke Keranjang?",
    a: "Tekan ikon keranjang di pojok kartu produk atau di halaman detail produk. Barang tersimpan di menu Keranjang tanpa perlu login. Progres pesanan Open PO juga bisa dilihat pada tab Pesanan Open PO di halaman Keranjang.",
  },
  {
    q: "Apakah transaksi barang/COD difasilitasi oleh platform?",
    a: "Tidak. Platform ini mempertemukan penjual dan pembeli. Transaksi serah terima barang (COD) dilakukan langsung antara penjual dan pembeli. Pilih tempat umum yang ramai, sepakati lokasi terlebih dahulu, dan periksa barang sebelum membayar.",
  },
  {
    q: "Bagaimana jika barang yang saya terima tidak sesuai?",
    a: "Karena transaksi COD dilakukan langsung antara pembeli dan penjual, perselisihan kualitas barang berada di luar tanggung jawab platform. Selalu periksa barang dengan teliti sebelum menyerahkan uang. Jika menemukan penjual yang menipu, laporkan lewat tombol Lapor di halaman produk: pelanggar akan ditindak tegas dan diblacklist.",
  },
  {
    q: "Apakah saya bisa membatalkan penjualan barang dan meminta refund?",
    a: "Sesuai kebijakan refund kami, barang yang sudah dibayar untuk ditampilkan tidak dapat dibatalkan sepihak dan dananya tidak dapat dikembalikan. Pengembalian dana hanya diproses jika terjadi kegagalan teknis dari sistem kami sehingga barang tidak tampil sama sekali dalam 1x24 jam setelah pembayaran sukses.",
  },
];

// JSON-LD FAQPage: agar FAQ bisa muncul sebagai rich result di Google.
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
    <div className="min-h-screen bg-[#f4faf5] dark:bg-[#0f1e15] pb-28 lg:pb-14">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: skripJsonLd(faqJsonLd) }}
        />
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#e6f8e8] dark:bg-[#134e35]/40 px-3 py-1 text-xs font-bold text-[#134e35] dark:text-[#ceeb7a] mb-3">
            <span className="material-symbols-outlined text-[15px]">help</span>
            <span>Pusat Bantuan</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#101f15] dark:text-[#ecfeee] sm:text-4xl">Pertanyaan Umum (FAQ)</h1>
          <p className="mt-2 text-sm text-[#404943] dark:text-[#9db8a2]">Temukan jawaban untuk pertanyaan yang paling sering diajukan</p>
        </div>

        <div className="mt-8 space-y-3">
          {faqs.map((faq, index) => (
            <details key={index} className="group border border-[#e2f0e6] dark:border-white/10 bg-white dark:bg-[#112218] rounded-3xl shadow-[0_4px_20px_-4px_rgba(19,78,53,0.05)] overflow-hidden">
              <summary className="flex cursor-pointer items-center justify-between p-5 font-bold text-sm sm:text-base text-[#101f15] dark:text-[#ecfeee] list-none">
                <span>{faq.q}</span>
                <span className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e6f8e8] dark:bg-white/5 text-[#003622] dark:text-[#ceeb7a] transition-transform duration-200 motion-reduce:transition-none group-open:-rotate-180">
                  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </summary>
              <div className="px-5 pb-5 text-sm leading-relaxed text-[#404943] dark:text-[#9db8a2]">
                <p>{faq.a}</p>
              </div>
            </details>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3 text-center">
          <Link href="/jual" className="rounded-full bg-[#003622] hover:bg-[#134e35] text-white font-bold text-sm px-6 py-3 transition-colors shadow-xs">
            Jual Barang Sekarang
          </Link>
          <Link href="/" className="rounded-full border border-[#e2f0e6] dark:border-white/15 bg-white dark:bg-[#112218] text-[#003622] dark:text-[#ecfeee] hover:bg-[#e6f8e8] font-bold text-sm px-6 py-3 transition-colors">
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
