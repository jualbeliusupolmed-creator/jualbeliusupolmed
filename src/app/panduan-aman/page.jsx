import Link from "next/link";
import { Icon } from "@/components/Icons";
import { MARKETPLACE_WA } from "@/lib/constants";

export const metadata = {
  title: "Panduan Transaksi Aman",
  description:
    "Panduan transaksi aman untuk mahasiswa: cara memilih titik temu, memeriksa barang, dan melaporkan kendala.",
  alternates: { canonical: "/panduan-aman" },
  openGraph: {
    title: "Panduan Transaksi Aman | Kampus Kita",
    description:
      "Panduan transaksi aman untuk mahasiswa: cara memilih titik temu, memeriksa barang, dan melaporkan kendala.",
    url: "/panduan-aman",
    siteName: "Kampus Kita",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Panduan Transaksi Aman | Kampus Kita",
    description:
      "Panduan transaksi aman untuk mahasiswa: cara memilih titik temu, memeriksa barang, dan melaporkan kendala.",
  },
};

const SAFE_COD_SPOTS = [
  {
    name: "Pilih tempat umum yang ramai",
    campus: "Saran umum",
    desc: "Utamakan area terbuka dengan pengunjung lain dan petugas di sekitar. Hindari tempat sepi atau berpindah ke lokasi yang tidak disepakati.",
    time: "Sebelum berangkat: pastikan lokasi dan waktu disepakati kedua pihak.",
    features: ["Area publik", "Mudah dijangkau"],
  },
  {
    name: "Ajak teman menemani",
    campus: "Saran umum",
    desc: "Beri tahu teman atau keluarga tentang rencana transaksi. Untuk barang bernilai tinggi, pertimbangkan datang bersama orang lain.",
    time: "Saat bertemu: tetap di area ramai dan jangan terburu-buru.",
    features: ["Beritahu orang terdekat", "Utamakan keselamatan"],
  },
  {
    name: "Periksa barang sebelum membayar",
    campus: "Saran umum",
    desc: "Cocokkan barang dengan deskripsi dan uji fungsi yang memungkinkan. Pastikan harga serta cara pembayaran sudah disepakati.",
    time: "Sebelum pembayaran: simpan bukti percakapan dan kesepakatan.",
    features: ["Cek kondisi", "Simpan bukti"],
  },
  {
    name: "Sepakati titik temu yang mudah dikenali",
    campus: "Saran umum",
    desc: "Pilih lokasi yang diketahui kedua pihak dan memiliki akses transportasi yang sesuai. Platform tidak menetapkan lokasi COD resmi.",
    time: "Jika rencana berubah: kabari pihak lain dan sepakati ulang.",
    features: ["Mudah dikenali", "Akses transportasi"],
  },
];

const MEDIATION_STEPS = [
  {
    step: "1",
    title: "Cek Kelengkapan & Kode Barang Saat Bertemu",
    desc: "Periksa profil penjual dan kode barang. Periksa kondisi fisik, garansi, kelengkapan, dan kecocokan dengan deskripsi sebelum membayar.",
  },
  {
    step: "2",
    title: "Gunakan Pembayaran Tunai atau Transfer Langsung",
    desc: "Berhati-hati terhadap permintaan uang muka sebelum identitas dan kesepakatan transaksi jelas.",
  },
  {
    step: "3",
    title: "Laporkan kendala melalui saluran bantuan",
    desc: "Simpan bukti transaksi dan percakapan, lalu hubungi pihak terkait melalui saluran bantuan yang tersedia. Tim akan meninjau laporan sesuai kebijakan platform; penyelesaian atau waktu respons tidak dijamin.",
  },
];

export default function PanduanAmanPage() {
  return (
    <div className="min-h-screen bg-[#f4faf5] dark:bg-[#0f1e15] pb-28 lg:pb-14">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-[#707972] dark:text-[#9db8a2] mb-6">
          <Link href="/" className="hover:text-[#003622] dark:hover:text-[#ceeb7a]">Beranda</Link>
          <span>/</span>
          <span className="text-[#101f15] dark:text-[#ecfeee] font-semibold">Panduan Transaksi Aman</span>
        </nav>

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#e6f8e8] dark:bg-[#134e35]/40 px-3 py-1 text-xs font-bold text-[#134e35] dark:text-[#ceeb7a] mb-3">
            <span className="material-symbols-outlined text-[15px]">verified_user</span>
            <span>Keamanan Transaksi</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#101f15] dark:text-[#ecfeee] tracking-tight">
            Panduan Transaksi Aman &amp; Titik Temu
          </h1>
          <p className="mt-2.5 text-sm text-[#404943] dark:text-[#9db8a2] leading-relaxed">
            Gunakan langkah praktis berikut saat bertransaksi dengan mahasiswa dari kampus mana pun di Indonesia.
          </p>
        </div>

        {/* Panduan memilih titik temu COD */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-extrabold text-[#101f15] dark:text-[#ecfeee] flex items-center gap-2">
                <Icon.MapPin className="w-5 h-5 text-[#134e35] dark:text-[#ceeb7a]" aria-hidden="true" />
                Panduan Memilih Titik Temu COD
              </h2>
              <p className="text-xs text-[#707972] dark:text-[#9db8a2] mt-0.5">
                Tidak ada lokasi resmi universal. Pilih tempat yang aman dan disepakati bersama.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SAFE_COD_SPOTS.map((spot, i) => (
              <div
                key={i}
                className="p-5 rounded-3xl bg-white dark:bg-[#112218] border border-[#e2f0e6] dark:border-white/10 shadow-[0_4px_20px_-4px_rgba(19,78,53,0.06)] flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <h3 className="font-bold text-sm text-[#101f15] dark:text-[#ecfeee]">{spot.name}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#e6f8e8] text-[#134e35] dark:bg-[#134e35]/40 dark:text-[#ceeb7a] shrink-0">
                      {spot.campus}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {spot.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-[11px]">
                  <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>{spot.time}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {spot.features.map((f, fi) => (
                      <span key={fi} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10.5px]">
                        ✓ {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Jalur Mediasi Sengketa */}
        <section id="mediasi" className="mb-12 scroll-mt-20">
          <div className="p-6 sm:p-8 rounded-3xl bg-[#e6f8e8] dark:bg-[#134e35]/30 border border-[#c8ecd0] dark:border-[#134e35]/50">
            <h2 className="text-lg font-extrabold text-[#003622] dark:text-[#ceeb7a] flex items-center gap-2 mb-1">
              <Icon.AlertCircle className="w-5 h-5 text-[#134e35] dark:text-[#ceeb7a]" aria-hidden="true" />
              Alur Mediasi Sengketa &amp; Perlindungan Pembeli
            </h2>
            <p className="text-xs text-[#404943] dark:text-[#9db8a2] mb-6">
              Langkah-langkah yang harus dilakukan jika terjadi kendala pada transaksi barang atau pre-order.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {MEDIATION_STEPS.map((s) => (
                <div key={s.step} className="p-4 rounded-2xl bg-white dark:bg-[#112218] border border-[#e2f0e6] dark:border-white/10 space-y-2 shadow-xs">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#003622] text-white font-extrabold text-xs">
                    {s.step}
                  </span>
                  <h3 className="font-bold text-xs sm:text-sm text-[#101f15] dark:text-[#ecfeee] leading-snug">
                    {s.title}
                  </h3>
                  <p className="text-[11.5px] text-[#404943] dark:text-[#9db8a2] leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Kontak Mediasi */}
        <section className="text-center p-6 rounded-3xl bg-white dark:bg-[#112218] border border-[#e2f0e6] dark:border-white/10 shadow-[0_4px_20px_-4px_rgba(19,78,53,0.06)]">
          <h3 className="text-sm font-extrabold text-[#101f15] dark:text-[#ecfeee] mb-1">
            Perlu Bantuan Mediasi Langsung?
          </h3>
          <p className="text-xs text-[#404943] dark:text-[#9db8a2] max-w-md mx-auto mb-4">
            Jika memerlukan bantuan, hubungi pengelola melalui WhatsApp. Waktu respons dapat bervariasi.
          </p>
          <a
            href={`https://wa.me/${MARKETPLACE_WA}?text=${encodeURIComponent("Halo admin Kampus Kita, saya membutuhkan bantuan terkait transaksi.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#003622] hover:bg-[#134e35] text-white font-bold text-xs shadow-xs transition-colors active:translate-y-px focus-visible:outline-2 focus-visible:outline-[#003622] disabled:opacity-50"
          >
            <span>Hubungi Admin Mediasi (WhatsApp)</span>
            <Icon.ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
        </section>
      </div>
    </div>
  );
}
