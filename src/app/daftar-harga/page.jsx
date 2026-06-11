import Link from "next/link";
import { rupiah } from "@/lib/fees";

export const metadata = {
  title: "Daftar Harga Layanan & Kebijakan",
  description: "Daftar tarif iklan, biaya layanan transaksi, dan kebijakan pengembalian dana di Jual Beli USU Polmed.",
  alternates: { canonical: "/daftar-harga" },
};

const advertisingServices = [
  {
    title: "Iklan Barang Standar",
    price: 2000,
    unit: "per postingan",
    desc: "Tayangkan barang dagangan Anda (Laptop, HP, Buku, Kos, dll.) di halaman utama selama 14 hari.",
    features: ["Tampil di Grid Utama", "Bisa Edit Iklan", "Fitur Chat WA Langsung", "Aktif 14 Hari"],
    popular: false,
  },
  {
    title: "Iklan Poster",
    price: 10000,
    unit: "per postingan",
    desc: "Tayangkan poster acara, promosi jasa, atau produk digital dengan visual yang lebih besar.",
    features: ["Ukuran Poster Penuh", "Tampil di Grid Utama", "Bisa Edit Iklan", "Aktif 14 Hari"],
    popular: true,
  },
  {
    title: "Sundul Iklan (Bump)",
    price: 1000,
    unit: "per kali sundul",
    desc: "Naikkan kembali posisi iklan Anda ke baris paling atas agar dilihat oleh lebih banyak calon pembeli.",
    features: ["Naik ke Urutan Pertama", "Instan & Real-time", "Tanpa Batas Penggunaan"],
    popular: false,
  },
  {
    title: "Iklan Unggulan (Featured)",
    price: 5000,
    unit: "per hari",
    desc: "Sematkan iklan Anda pada banner utama paling atas (horizontal scroll) agar menjadi pusat perhatian.",
    features: ["Tampil di Banner Utama", "Prioritas Dilihat Pertama", "Meningkatkan Penjualan 3x Lipat"],
    popular: false,
  },
];

const transactionFees = [
  { range: "Nilai Transaksi < Rp 50.000", fee: "Rp 2.000" },
  { range: "Nilai Transaksi < Rp 100.000", fee: "10% dari Nilai Transaksi" },
  { range: "Nilai Transaksi ≥ Rp 100.000", fee: "5% dari Nilai Transaksi" },
];

export default function DaftarHargaPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-extrabold sm:text-4xl text-gray-900">
          Daftar Harga Layanan &amp; Kebijakan
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-gray-500 text-sm sm:text-base">
          Transparan dan terjangkau untuk komunitas mahasiswa USU &amp; POLMED. Seluruh biaya iklan digunakan untuk pemeliharaan server dan pengembangan platform.
        </p>
      </div>

      {/* Grid Harga Jasa Iklan */}
      <section className="mt-10">
        <h2 className="text-xl font-bold text-gray-900 border-b pb-2">1. Layanan Jasa Iklan (Awal)</h2>
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
          <h2 className="text-xl font-bold text-gray-900">2. Biaya Layanan Transaksi (Setelah Deal/Sukses)</h2>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            Biaya layanan transaksi (*success fee*) dibebankan kepada penjual setelah proses transaksi berhasil diselesaikan dan pembeli telah menerima barang dengan baik.
          </p>
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

      {/* Kebijakan Kepatuhan Midtrans (Refund & Cancellation) */}
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
            Untuk klaim pengembalian dana akibat kesalahan teknis pembayaran, silakan hubungi admin melalui nomor WhatsApp resmi yang tertera pada platform dengan melampirkan bukti pembayaran Midtrans yang sah.
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
