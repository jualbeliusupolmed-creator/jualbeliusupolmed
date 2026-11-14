import Link from "next/link";
import { rupiah } from "@/lib/fees";
import { getSettings } from "@/lib/settings";
import { Icon } from "@/components/Icons";

export const metadata = {
  title: "Daftar Harga Layanan & Kebijakan",
  description: "Daftar tarif jual barang, biaya layanan transaksi, dan kebijakan pengembalian dana di Kampus Kita.",
  alternates: { canonical: "/daftar-harga" },
};

export const dynamic = "force-dynamic";

const nomor = (v, bawaan) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : bawaan;
};

function jenjangIklan(pricing) {
  const tiers = Array.isArray(pricing?.adTiers) && pricing.adTiers.length
    ? pricing.adTiers
    : [];
  return tiers.map((t) => {
    const batas = t.upto == null
      ? "Rp 1.000.000 ke atas"
      : `di bawah ${rupiah(t.upto)}`;
    const biaya = t.flat != null ? rupiah(t.flat) : `${t.pct}% dari harga barang`;
    return { range: `Harga barang ${batas}`, fee: biaya };
  });
}

function layananIklan(pricing) {
  const hariTayang = nomor(pricing?.listingDays, 14);
  const daftar = [
    {
      title: "Promosi Poster",
      price: nomor(pricing?.adPoster, 10000),
      unit: "per postingan",
      desc: "Tayangkan poster acara, promosi jasa, atau produk digital dengan visual yang lebih besar.",
      features: ["Ukuran poster penuh", "Tampil di grid utama", "Bisa edit konten poster", `Masa aktif ${hariTayang} hari`],
      popular: true,
    },
    {
      title: "Naikkan Barang (Bump)",
      price: nomor(pricing?.bump, 1000),
      unit: "per kali sundul",
      desc: "Naikkan kembali posisi barang jualan Anda ke baris paling atas agar dilihat lebih banyak calon pembeli.",
      features: ["Naik ke urutan pertama", "Pembaruan instan & real-time", "Tanpa batas penggunaan harian"],
      popular: false,
    },
    {
      title: "Promosi Unggulan (Featured)",
      price: nomor(pricing?.featuredPerDay, 5000),
      unit: "per hari",
      desc: "Sematkan barang jualan Anda pada banner utama agar lebih mudah ditemukan calon pembeli.",
      features: ["Tampil di banner utama", "Prioritas dilihat pertama", `Maksimal ${rupiah(nomor(pricing?.featuredMaxPerDay, 10000))}/hari untuk posisi teratas`],
      popular: false,
    },
    {
      title: "Paket Penjual Pro",
      price: nomor(pricing?.proMonthly, 49000),
      unit: "per bulan",
      desc: "Jual barang sepuasnya tanpa biaya tayang per barang selama 30 hari penuh.",
      features: ["Jual barang tanpa batas", "Badge terverifikasi Penjual Pro", "Lebih hemat untuk usaha & toko kampus"],
      popular: true,
    },
    {
      title: "Perpanjang Masa Tayang",
      price: nomor(pricing?.renewalFee, 2000),
      unit: "per perpanjangan",
      desc: "Lanjutkan masa tayang barang yang hampir habis, tanpa mengisi ulang detail dari awal.",
      features: [`Perpanjangan ${hariTayang} hari`, "Balas PERPANJANG via WhatsApp", "Statistik klik & tayang tetap tersimpan"],
      popular: false,
    },
  ];
  return daftar;
}

function biayaTransaksi(pricing) {
  const tiers = Array.isArray(pricing?.soldTiers) ? pricing.soldTiers : [];
  if (!tiers.length) return [];
  return tiers.map((t) => {
    const batas = t.upto == null ? "Rp 100.000 ke atas" : `di bawah ${rupiah(t.upto)}`;
    const biaya = t.flat != null ? rupiah(t.flat) : `${t.pct}% dari nilai transaksi`;
    return { range: `Nilai transaksi ${batas}`, fee: biaya };
  });
}

export default async function DaftarHargaPage() {
  const { pricing } = await getSettings();
  const advertisingServices = layananIklan(pricing);
  const tierIklan = jenjangIklan(pricing);
  const transactionFees = biayaTransaksi(pricing);
  const tokoGratis = pricing?.tokoGratis !== false;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14 space-y-12">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
          <Icon.Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Transparan &amp; Terjangkau</span>
        </div>
        <h1 className="text-3xl font-extrabold sm:text-4xl text-slate-900 dark:text-white tracking-tight">
          Daftar Harga Layanan &amp; Kebijakan
        </h1>
        <p className="mx-auto max-w-2xl text-slate-500 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
          Biaya dirancang transparan dan ramah kantong mahasiswa. Seluruh biaya layanan digunakan untuk operasional server dan pengembangan platform Kampus Kita.
        </p>
      </div>

      {/* 1. Jual barang: 100% Gratis untuk mahasiswa */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-xs font-bold text-emerald-800 dark:text-emerald-300">
            1
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            Jual Barang &amp; Tawarkan Jasa Mahasiswa
          </h2>
        </div>

        <div className="rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent dark:from-emerald-950/40 dark:via-teal-950/20 border border-emerald-500/30 dark:border-emerald-700/40 p-5 sm:p-6 text-emerald-950 dark:text-emerald-100 shadow-xs">
          <div className="flex items-center gap-2 font-bold text-base text-emerald-900 dark:text-emerald-300 mb-2">
            <Icon.CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>100% Gratis untuk Mahasiswa</span>
          </div>
          <p className="text-sm text-emerald-900/90 dark:text-emerald-200/90 leading-relaxed mb-4">
            Tidak ada biaya tayang barang (Rp 0), bebas komisi transaksi antar-mahasiswa (0%), dan pembayaran langsung ke tangan penjual via COD atau transfer/QRIS pribadi.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-emerald-500/20 dark:border-emerald-700/30 text-xs">
            <div className="flex items-center gap-2">
              <Icon.Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Biaya pasang iklan: <strong>Rp 0</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Icon.Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Komisi transaksi: <strong>0%</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Icon.Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Pembayaran langsung: <strong>COD / Transfer</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Grid harga layanan promosi */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-xs font-bold text-emerald-800 dark:text-emerald-300">
            2
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            Layanan Promosi Tambahan
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {advertisingServices.map((s, idx) => (
            <div
              key={idx}
              className={`rounded-2xl border p-5 flex flex-col justify-between transition-colors duration-150 bg-white dark:bg-slate-900/80 ${
                s.popular
                  ? "border-emerald-500/80 dark:border-emerald-500/60 shadow-md ring-1 ring-emerald-500/30"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {s.title}
                  </h3>
                  {s.popular && (
                    <span className="rounded-full bg-emerald-800 dark:bg-emerald-700 px-2.5 py-0.5 text-[10px] font-semibold text-white shrink-0">
                      Paling Populer
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {rupiah(s.price)}
                  </span>
                  <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                    /{s.unit}
                  </span>
                </div>

                <p className="mt-2.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed min-h-[36px]">
                  {s.desc}
                </p>

                <ul className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-300 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  {s.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Icon.Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Biaya Transaksi */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-xs font-bold text-emerald-800 dark:text-emerald-300">
            3
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            Biaya Layanan Transaksi (Setelah Sukses)
          </h2>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 sm:p-6 shadow-xs space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Biaya layanan transaksi (*success fee*) hanya berlaku untuk transaksi terfasilitasi dan dibebankan kepada penjual setelah proses transaksi berhasil diselesaikan serta pembeli telah menerima barang dengan baik.
          </p>

          {transactionFees.length === 0 ? (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 p-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2">
              <Icon.Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong>Saat ini tidak ada potongan biaya transaksi.</strong> Seluruh transaksi COD langsung antar-mahasiswa bebas potongan 100%. Jika ada program terfasilitasi baru, perinciannya akan dicantumkan di sini.
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3 pt-2">
              {transactionFees.map((f, i) => (
                <div
                  key={i}
                  className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between"
                >
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {f.range}
                  </span>
                  <span className="mt-2 text-lg font-extrabold text-emerald-700 dark:text-emerald-400">
                    {f.fee}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. Kebijakan Refund & Pembatalan */}
      <section className="grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 sm:p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Icon.Clock3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Kebijakan Pembatalan Layanan
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Pengguna dapat membatalkan pengajuan jual barang sebelum dikonfirmasi oleh sistem. Setelah barang diverifikasi dan ditampilkan secara aktif di platform, penayangan tidak dapat dibatalkan di tengah jalan.
          </p>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Jika stok barang jualan Anda habis sebelum masa aktif 14 hari selesai, ubah statusnya menjadi <strong>&ldquo;Terjual&rdquo; (Sold)</strong> melalui dasbor penjual untuk menghentikan kontak masuk dari calon pembeli.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 sm:p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Icon.ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Kebijakan Pengembalian Dana (Refund)
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Seluruh pembayaran untuk biaya layanan promosi poster, *bump*, dan *featured* bersifat final dan tidak dapat dikembalikan (*non-refundable*), kecuali terjadi kendala sistem dari pihak kami yang menyebabkan layanan tidak aktif dalam waktu 24 jam setelah pembayaran sukses.
          </p>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Untuk klaim pengembalian dana akibat kesalahan teknis pembayaran, silakan hubungi admin melalui nomor WhatsApp resmi yang tertera pada platform dengan melampirkan bukti struk pembayaran QRIS.
          </p>
        </div>
      </section>

      {/* 5. Footer Call to Action */}
      <div className="text-center pt-4 space-y-3">
        <Link
          href="/jual"
          className="inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white px-8 py-3.5 rounded-full text-sm font-bold shadow-md shadow-emerald-700/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 transition-colors duration-150"
        >
          <Icon.ShoppingBag className="w-4 h-4" />
          <span>Mulai Jual Barang Sekarang</span>
        </Link>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Ada pertanyaan seputar tarif?{" "}
          <Link
            href="/cara-bergabung"
            className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline"
          >
            Hubungi Layanan Pengguna
          </Link>
        </p>
      </div>
    </div>
  );
}
