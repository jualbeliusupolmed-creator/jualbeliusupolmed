import Link from "next/link";
import { rupiah } from "@/lib/fees";
import { getSettings } from "@/lib/settings";

export const metadata = {
  title: "Daftar Harga Layanan & Kebijakan",
  description: "Daftar tarif iklan, biaya layanan transaksi, dan kebijakan pengembalian dana di Jual Beli Medan.",
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

// "Iklan Barang" itu berjenjang menurut harga barangnya, jadi tidak bisa
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
      title: "Iklan Poster",
      price: nomor(pricing?.adPoster, 10000),
      unit: "per postingan",
      desc: "Tayangkan poster acara, promosi jasa, atau produk digital dengan visual yang lebih besar.",
      features: ["Ukuran Poster Penuh", "Tampil di Grid Utama", "Bisa Edit Iklan", `Aktif ${hariTayang} Hari`],
      popular: true,
    },
    {
      title: "Sundul Iklan (Bump)",
      price: nomor(pricing?.bump, 1000),
      unit: "per kali sundul",
      desc: "Naikkan kembali posisi iklan Anda ke baris paling atas agar dilihat oleh lebih banyak calon pembeli.",
      features: ["Naik ke Urutan Pertama", "Instan & Real-time", "Tanpa Batas Penggunaan"],
      popular: false,
    },
    {
      title: "Iklan Unggulan (Featured)",
      price: nomor(pricing?.featuredPerDay, 5000),
      unit: "per hari",
      desc: "Sematkan iklan Anda pada banner utama paling atas (horizontal scroll) agar menjadi pusat perhatian.",
      features: ["Tampil di Banner Utama", "Prioritas Dilihat Pertama", `Sampai ${rupiah(nomor(pricing?.featuredMaxPerDay, 10000))}/hari kalau mau lebih di atas`],
      popular: false,
    },
    {
      title: "Paket Penjual Pro (Bulanan)",
      price: nomor(pricing?.proMonthly, 49000),
      unit: "per bulan",
      desc: "Bebas pasang iklan standar sepuasnya tanpa bayar per postingan selama 30 hari penuh.",
      features: ["Gratis Pasang Iklan Unlimited", "Badge Penjual Pro", "Lebih Hemat untuk Toko/Usaha"],
      popular: true,
    },
    {
      title: "Perpanjang Iklan",
      price: nomor(pricing?.renewalFee, 2000),
      unit: "per perpanjangan",
      desc: `Lanjutkan masa tayang iklan yang hampir habis, tanpa memasang ulang dari awal.`,
      features: [`Tambah ${hariTayang} Hari`, "Balas PERPANJANG di WhatsApp", "Statistik iklan tetap"],
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
          Transparan dan terjangkau untuk komunitas warga Medan. Seluruh biaya iklan digunakan untuk pemeliharaan server dan pengembangan platform.
        </p>
      </div>

      {/* Iklan barang: berjenjang menurut harga, jadi tidak bisa satu angka */}
      <section className="mt-10">
        <h2 className="text-xl font-bold text-gray-900 border-b pb-2">1. Iklan Barang</h2>
        <p className="mt-2 text-sm text-gray-500 leading-relaxed">
          Biayanya mengikuti harga barangnya — makin murah barangnya, makin murah iklannya.
        </p>
        {tokoGratis && (
          <p className="mt-3 rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-sm text-emerald-800">
            <strong>Punya halaman toko? Iklannya gratis.</strong> Semua tarif di bawah ini tidak
            berlaku untuk penjual yang sudah membuka toko — dan membuka toko itu sendiri gratis.
          </p>
        )}
        {tierIklan.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {tierIklan.map((t, i) => (
              <div key={i} className="rounded-xl bg-gray-50 p-4 border border-gray-100 flex flex-col justify-between">
                <span className="text-xs font-semibold text-gray-500">{t.range}</span>
                <span className="mt-2 text-lg font-bold text-primary">{t.fee}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-500">Iklan barang sedang gratis.</p>
        )}
      </section>

      {/* Grid Harga Jasa Iklan */}
      <section className="mt-10">
        <h2 className="text-xl font-bold text-gray-900 border-b pb-2">2. Layanan Iklan Lainnya</h2>
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
                      <span className="text-green-500 font-bold">✓</span> {f}
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
          <h3 className="text-lg font-bold text-gray-900">📄 Kebijakan Pembatalan Layanan</h3>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            Pengguna dapat melakukan pembatalan pengajuan iklan barang sebelum iklan dikonfirmasi oleh sistem. Apabila iklan telah diverifikasi dan ditayangkan secara aktif di platform, maka pembatalan iklan yang mengakibatkan penghentian layanan tidak dapat dilakukan di tengah jalan.
          </p>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            Jika stok barang yang Anda iklankan habis sebelum masa aktif 14 hari selesai, Anda disarankan untuk mengubah status barang menjadi <strong>"Terjual" (Sold)</strong> melalui dasbor penjual untuk menghentikan kontak masuk dari calon pembeli.
          </p>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-bold text-gray-900">💸 Kebijakan Pengembalian Dana (Refund)</h3>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            Seluruh transaksi pembayaran untuk biaya pemasangan iklan standar, iklan poster, *bump*, dan *featured ads* bersifat final dan tidak dapat dikembalikan dana (*non-refundable*), kecuali terjadi kondisi kegagalan sistematis dari pihak kami yang menyebabkan layanan iklan sama sekali tidak tayang/aktif dalam waktu 24 jam setelah pembayaran sukses.
          </p>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            Untuk klaim pengembalian dana akibat kesalahan teknis pembayaran, silakan hubungi admin melalui nomor WhatsApp resmi yang tertera pada platform dengan melampirkan bukti struk pembayaran QRIS.
          </p>
        </div>
      </section>

      {/* Footer Call to Action */}
      <div className="mt-12 text-center">
        <Link href="/jual" className="btn-primary px-8 py-3 rounded-2xl text-base shadow-lg shadow-primary/20">
          Mulai Pasang Iklan Sekarang
        </Link>
        <p className="mt-3 text-xs text-gray-400">
          Ada pertanyaan? <Link href="/cara-bergabung" className="text-primary underline">Hubungi Hubungan Pelanggan (Contact Information)</Link>
        </p>
      </div>
    </div>
  );
}
