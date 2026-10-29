import Link from "next/link";
import { rupiah } from "@/lib/fees";
import { getSettings } from "@/lib/settings";

export const metadata = {
  title: "Daftar Harga Layanan & Kebijakan",
  description: "Daftar tarif jual barang, biaya layanan transaksi, dan kebijakan pengembalian dana di Kampus Kita.",
  alternates: { canonical: "/daftar-harga" },
};

// Halaman ini dulu memuat angkanya sendiri, diketik langsung di berkas ini,
// sementara yang benar-benar menagih membaca `settings.pricing` dari database.
// Dua sumber untuk satu harga selalu berakhir sama: pemilik mengubah tarif dari
// panel admin, tagihannya ikut berubah, dan halaman "Daftar Harga" tetap
// menjanjikan angka lama. Sekarang keduanya membaca sumber yang sama.
export const dynamic = "force-dynamic";

const nomor = (v, bawaan) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : bawaan;
};

// Biaya tayang barang berjenjang menurut harganya, jadi tidak bisa
// diringkas jadi satu angka tanpa berbohong. Yang ditampilkan: jenjangnya.
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
      features: ["Ukuran Poster Penuh", "Tampil di Grid Utama", "Bisa Edit Poster", `Aktif ${hariTayang} Hari`],
      popular: true,
    },
    {
      title: "Naikkan Barang (Bump)",
      price: nomor(pricing?.bump, 1000),
      unit: "per kali sundul",
      desc: "Naikkan kembali posisi barang jualan Anda ke baris paling atas agar dilihat lebih banyak calon pembeli.",
      features: ["Naik ke Urutan Pertama", "Instan & Real-time", "Tanpa Batas Penggunaan"],
      popular: false,
    },
    {
      title: "Promosi Unggulan (Featured)",
      price: nomor(pricing?.featuredPerDay, 5000),
      unit: "per hari",
      desc: "Sematkan barang jualan Anda pada banner utama agar lebih mudah ditemukan calon pembeli.",
      features: ["Tampil di Banner Utama", "Prioritas Dilihat Pertama", `Sampai ${rupiah(nomor(pricing?.featuredMaxPerDay, 10000))}/hari kalau mau lebih di atas`],
      popular: false,
    },
    {
      title: "Paket Penjual Pro (Bulanan)",
      price: nomor(pricing?.proMonthly, 49000),
      unit: "per bulan",
      desc: "Jual barang sepuasnya tanpa biaya tayang per barang selama 30 hari penuh.",
      features: ["Jual Barang Tanpa Batas", "Badge Penjual Pro", "Lebih Hemat untuk Toko/Usaha"],
      popular: true,
    },
    {
      title: "Perpanjang Masa Tayang Barang",
      price: nomor(pricing?.renewalFee, 2000),
      unit: "per perpanjangan",
      desc: `Lanjutkan masa tayang barang yang hampir habis, tanpa mengisi ulang detail dari awal.`,
      features: [`Tambah ${hariTayang} Hari`, "Balas PERPANJANG di WhatsApp", "Statistik tetap tersedia"],
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
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-extrabold sm:text-4xl text-gray-900">
          Daftar Harga Layanan &amp; Kebijakan
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-gray-500 text-sm sm:text-base">
          Transparan dan terjangkau untuk komunitas mahasiswa. Seluruh biaya layanan digunakan untuk pemeliharaan server dan pengembangan platform.
        </p>
      </div>

      {/* Jual barang: 100% Gratis untuk mahasiswa */}
      <section className="mt-10">
        <h2 className="text-xl font-bold text-gray-900 border-b pb-2">1. Jual Barang &amp; Tawarkan Jasa Mahasiswa</h2>
        <div className="mt-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-4 text-emerald-900">
          <div className="flex items-center gap-2 font-bold text-base text-emerald-800">
            <span>🎉 Gratis untuk Mahasiswa</span>
          </div>
          <p className="mt-1 text-sm text-emerald-700 leading-relaxed">
            Tidak ada biaya tayang barang (Rp 0), bebas komisi transaksi antar-mahasiswa (0%), dan pembayaran langsung ke tangan penjual via COD atau transfer/QRIS pribadi.
          </p>
        </div>
      </section>

      {/* Grid harga layanan promosi */}
      <section className="mt-10">
        <h2 className="text-xl font-bold text-gray-900 border-b pb-2">2. Layanan Promosi Lainnya</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {advertisingServices.map((s, idx) => (
            <div
              key={idx}
              className={`card flex flex-col justify-between p-5 relative ${
                s.popular ? "border-primary ring-2 ring-primary/20" : ""
              }`}
            >
              {s.popular && (
                <span className="badge absolute -top-3 right-4 bg-primary text-white text-[10px]">
                  Terpopuler
                </span>
              )}
              <div>
                <h3 className="font-bold text-gray-900">{s.title}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-primary">{rupiah(s.price)}</span>
                  <span className="text-xs text-gray-400">/{s.unit}</span>
                </div>
                <p className="mt-3 text-xs text-gray-500 leading-relaxed">{s.desc}</p>
                <ul className="mt-4 space-y-2 text-xs text-gray-600">
                  {s.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <span className="text-green-500 font-bold"></span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Biaya Transaksi */}
      <section className="mt-12">
        <div className="card p-6">
          <h2 className="text-xl font-bold text-gray-900">3. Biaya Layanan Transaksi (Setelah Deal/Sukses)</h2>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            Biaya layanan transaksi (success fee) dibebankan kepada penjual setelah proses transaksi berhasil diselesaikan dan pembeli telah menerima barang dengan baik.
          </p>
          {transactionFees.length === 0 && (
            <p className="mt-4 rounded-xl bg-gray-50 border border-gray-100 p-4 text-sm text-gray-600">
              <strong>Sedang tidak ada biaya transaksi.</strong> Tidak ada potongan setelah barang
              laku. Kalau nanti diberlakukan, jenjangnya muncul di sini.
            </p>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {transactionFees.map((f, i) => (
              <div key={i} className="rounded-xl bg-gray-50 p-4 border border-gray-100 flex flex-col justify-between">
                <span className="text-xs font-semibold text-gray-500">{f.range}</span>
                <span className="mt-2 text-lg font-bold text-primary">{f.fee}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Kebijakan Refund & Cancellation */}
      <section className="mt-12 grid gap-6 md:grid-cols-2">
        <div className="card p-6">
          <h3 className="text-lg font-bold text-gray-900"> Kebijakan Pembatalan Layanan</h3>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            Pengguna dapat membatalkan pengajuan jual barang sebelum dikonfirmasi oleh sistem. Setelah barang diverifikasi dan ditampilkan secara aktif di platform, penayangan tidak dapat dibatalkan di tengah jalan.
          </p>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            Jika stok barang jualan Anda habis sebelum masa aktif 14 hari selesai, ubah statusnya menjadi <strong>"Terjual" (Sold)</strong> melalui dasbor penjual untuk menghentikan kontak masuk dari calon pembeli.
          </p>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-bold text-gray-900"> Kebijakan Pengembalian Dana (Refund)</h3>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            Seluruh pembayaran untuk biaya layanan promosi poster, *bump*, dan *featured* bersifat final dan tidak dapat dikembalikan dana (*non-refundable*), kecuali terjadi kegagalan sistem dari pihak kami yang menyebabkan layanan tidak aktif dalam waktu 24 jam setelah pembayaran sukses.
          </p>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            Untuk klaim pengembalian dana akibat kesalahan teknis pembayaran, silakan hubungi admin melalui nomor WhatsApp resmi yang tertera pada platform dengan melampirkan bukti struk pembayaran QRIS.
          </p>
        </div>
      </section>

      {/* Footer Call to Action */}
      <div className="mt-12 text-center">
        <Link href="/jual" className="btn-primary px-8 py-3 rounded-2xl text-base shadow-lg shadow-primary/20">
          Mulai Jual Barang Sekarang
        </Link>
        <p className="mt-3 text-xs text-gray-400">
          Ada pertanyaan? <Link href="/cara-bergabung" className="text-primary underline">Hubungi Hubungan Pelanggan (Contact Information)</Link>
        </p>
      </div>
    </div>
  );
}
