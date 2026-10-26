import Link from "next/link";
import { Icon } from "@/components/Icons";

export const metadata = {
  title: "Panduan Transaksi Aman & Titik COD Kampus — USU × POLMED",
  description:
    "Panduan resmi bertransaksi aman, daftar 5 titik temu COD terverifikasi di area kampus USU dan POLMED, serta jalur mediasi sengketa mahasiswa.",
  alternates: { canonical: "/panduan-aman" },
};

const SAFE_COD_SPOTS = [
  {
    name: "Lobi Perpustakaan Pusat USU",
    campus: "USU",
    desc: "Area ber-AC, banyak tempat duduk santai, dan selalu dijaga satpam kampus. Sangat cocok untuk cek fungsi laptop, tablet, atau gadget.",
    time: "Senin – Jumat: 08.30 – 16.30 WIB",
    features: ["CCTV Kampus", "Banyak Stopkontak", "Parkir Luas"],
  },
  {
    name: "Selasar Fakultas Ilmu Budaya (FIB) USU",
    campus: "USU",
    desc: "Titik temu favorit mahasiswa untuk COD makanan, buku kuliah, novel, atau pakaian. Suasana rindang dan dekat kantin FIB.",
    time: "Setiap hari perkuliahan: 09.00 – 17.30 WIB",
    features: ["Banyak Meja Duduk", "Area Terbuka Ramai", "Akses Mudah"],
  },
  {
    name: "Hall Gedung Kuliah Bersama Fakultas Teknik USU",
    campus: "USU",
    desc: "Dekat pintu gerbang Dr. Mansur dan kantin teknik. Titik temu strategis bagi mahasiswa teknik, MIPA, dan Fasilkom-TI.",
    time: "Senin – Jumat: 08.00 – 17.00 WIB",
    features: ["Pusat Mobilitas Mahasiswa", "Dekat ATM Center"],
  },
  {
    name: "Kantin Gedung Z Politeknik Negeri Medan (POLMED)",
    campus: "POLMED",
    desc: "Pusat keramaian utama mahasiswa Polmed. Sangat aman untuk COD barang kecil, perkakas kuliah, atau ambil pesanan Pre-Order makanan.",
    time: "Senin – Jumat: 08.00 – 16.00 WIB",
    features: ["Kantin Ramai", "Pusat Mahasiswa Polmed"],
  },
  {
    name: "Gazebo Pintu 2 Kampus USU (Jl. Dr. Mansur)",
    campus: "USU / POLMED",
    desc: "Titik temu netral di gerbang utama perbatasan. Cocok untuk transaksi cepat tanpa perlu masuk jauh ke dalam area fakultas.",
    time: "Setiap hari: 08.00 – 18.00 WIB",
    features: ["Pos Keamanan Pintu 2", "Akses Transportasi Umum"],
  },
];

const MEDIATION_STEPS = [
  {
    step: "1",
    title: "Cek Kelengkapan & Kode Iklan Saat Bertemu",
    desc: "Minta penjual menunjukkan kode iklan atau profil StudentPlace miliknya. Periksa kondisi fisik, garansi, kelengkapan, dan kecocokan dengan deskripsi SEBELUM membayar.",
  },
  {
    step: "2",
    title: "Gunakan Pembayaran Tunai atau Transfer Langsung",
    desc: "Jangan pernah mentransfer uang muka (DP) kepada penjual yang belum Anda kenal atau belum bertemu langsung di kampus.",
  },
  {
    step: "3",
    title: "Jalur Mediasi Tim StudentPlace & Kampus",
    desc: "Jika barang terbukti rusak atau tidak sesuai dalam waktu 1x24 jam setelah deal, hubungi admin mediasi dengan melampirkan screenshot chat WhatsApp dan bukti COD. Akun penjual nakal akan langsung dibekukan dan dilaporkan ke pangkalan data mahasiswa.",
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
          Kampus Aman &amp; Bebas Penipuan
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1d1d1f] dark:text-white tracking-tight">
          Panduan Transaksi Aman &amp; Titik COD Kampus
        </h1>
        <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Sistem keamanan transaksi komunitas mahasiswa Universitas Sumatera Utara (USU) &amp; Politeknik Negeri Medan (POLMED).
        </p>
      </div>

      {/* 5 Titik COD Resmi */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#1d1d1f] dark:text-white flex items-center gap-2">
              <Icon.MapPin className="w-5 h-5 text-emerald-600" />
              5 Rekomendasi Titik Temu COD Resmi Kampus
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pilih lokasi ramai dan berpenerangan baik di bawah pengawasan kampus.
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
          Tim satgas moderasi StudentPlace siap membantu menengahi sengketa transaksi mahasiswa setiap hari pukul 08.00 – 21.00 WIB.
        </p>
        <a
          href="https://wa.me/62895429126232?text=Halo%20Admin%20StudentPlace%2C%20saya%20butuh%20bantuan%20mediasi%20transaksi."
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
