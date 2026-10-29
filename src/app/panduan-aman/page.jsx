import Link from "next/link";
import { Icon } from "@/components/Icons";
import { MARKETPLACE_WA } from "@/lib/constants";

export const metadata = {
  title: "Panduan Transaksi Aman",
  description:
    "Panduan transaksi aman untuk mahasiswa: cara memilih titik temu, memeriksa barang, dan melaporkan kendala.",
  alternates: { canonical: "/panduan-aman" },
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
    <div className="mx-auto max-w-4xl px-4 py-8 pb-20">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-6">
        <Link href="/" className="hover:text-primary">Beranda</Link>
        <span>/</span>
        <span className="text-slate-800 dark:text-slate-200 font-semibold">Panduan Transaksi Aman</span>
      </nav>

      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 mb-3 border border-emerald-500/20">
          <Icon.Shield className="w-3.5 h-3.5 text-emerald-600" />
          Panduan untuk Semua Kampus
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1d1d1f] dark:text-white tracking-tight">
          Panduan Transaksi Aman &amp; Titik Temu
        </h1>
        <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Gunakan langkah berikut saat bertransaksi dengan mahasiswa dari kampus mana pun.
        </p>
      </div>

      {/* Panduan memilih titik temu COD */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#1d1d1f] dark:text-white flex items-center gap-2">
              <Icon.MapPin className="w-5 h-5 text-emerald-600" />
              Panduan Memilih Titik Temu COD
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tidak ada lokasi resmi universal. Pilih tempat yang aman dan disepakati bersama.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SAFE_COD_SPOTS.map((spot, i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">{spot.name}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary/10 text-primary dark:text-violet-400 shrink-0">
                    {spot.campus}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {spot.desc}
                </p>
              </div>

              <div className="pt-2 border-t border-black/[0.04] dark:border-white/[0.06] space-y-1.5 text-[11px]">
                <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span>🕒</span>
                  <span>{spot.time}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {spot.features.map((f, fi) => (
                    <span key={fi} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-slate-300 text-[10.5px]">
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
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
            <Icon.AlertCircle className="w-5 h-5 text-emerald-600" />
            Alur Mediasi Sengketa &amp; Perlindungan Pembeli
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-6">
            Langkah-langkah yang harus dilakukan jika terjadi kendala pada transaksi barang atau pre-order.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {MEDIATION_STEPS.map((s) => (
              <div key={s.step} className="p-4 rounded-2xl bg-white/80 dark:bg-black/40 backdrop-blur-sm border border-emerald-500/10 space-y-2">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-600 text-white font-extrabold text-xs">
                  {s.step}
                </span>
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-snug">
                  {s.title}
                </h3>
                <p className="text-[11.5px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Kontak Mediasi */}
      <section className="text-center p-6 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.08]">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
          Perlu Bantuan Mediasi Langsung?
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
          Jika memerlukan bantuan, hubungi pengelola melalui WhatsApp. Waktu respons dapat bervariasi.
        </p>
        <a
          href={`https://wa.me/${MARKETPLACE_WA}?text=${encodeURIComponent("Halo admin Kampus Kita, saya membutuhkan bantuan terkait transaksi.")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all"
        >
          <span>Hubungi Admin Mediasi (WhatsApp)</span>
          <Icon.ArrowRight className="w-3.5 h-3.5" />
        </a>
      </section>
    </div>
  );
}
