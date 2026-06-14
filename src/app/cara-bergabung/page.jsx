import { WA_GROUP_LINK, MARKETPLACE_WA } from "@/lib/constants";

export const metadata = {
  title: "Cara Bergabung — Gabung Komunitas Jual Beli Mahasiswa USU & POLMED",
  description: "Panduan lengkap bergabung di komunitas jual-beli mahasiswa USU & POLMED Medan: cara menjual, cara membeli, rincian fee admin yang transparan, dan aturan keamanan transaksi.",
  keywords: ["cara bergabung jual beli USU", "komunitas whatsapp USU", "marketplace mahasiswa medan", "aturan jual beli POLMED", "fee admin jual beli usu"],
  alternates: { canonical: "/cara-bergabung" },
  openGraph: {
    title: "Cara Bergabung — Jual Beli USU Polmed",
    description: "Gabung grup WhatsApp komunitas, pasang iklan, dan transaksi aman dibantu admin. Fee transparan mulai Rp 2.000.",
    url: "/cara-bergabung",
    siteName: "Jual Beli USU Polmed",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Cara Bergabung Jual Beli USU Polmed",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cara Bergabung — Jual Beli USU Polmed",
    description: "Gabung grup WhatsApp komunitas, pasang iklan, dan transaksi aman dibantu admin. Fee transparan mulai Rp 2.000.",
    images: ["/og-image.png"],
  },
};

const sellSteps = [
  "Masuk ke komunitas WhatsApp lewat link di bawah.",
  "Masuk ke salah satu grup yang tersedia.",
  "Pasang iklan di website atau kirim request barang ke admin.",
  "Admin yang memposting & membantu transaksi.",
  "Setelah deal, bayar fee admin sesuai harga barang.",
];

const buySteps = [
  "Lihat barang di halaman Beranda atau di grup WA.",
  "Klik tombol Minat / Chat penjual.",
  "Kalau mau beli, reply ke admin / penjual.",
  "Transaksi dibantu & diawasi admin.",
];

const rules = [
  "Harga & kondisi barang harus jujur (real pict).",
  "Dilarang menjual barang ilegal / palsu.",
  "Fee admin dibayar sesuai ketentuan.",
  "No spam, no penipuan — pelanggar di-blacklist.",
];

function Fee({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="font-bold text-primary">{value}</span>
    </div>
  );
}

export default function CaraBergabungPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="rounded-3xl bg-gradient-to-br from-primary to-primary-dark p-8 text-center text-white">
        <h1 className="text-3xl font-extrabold">Cara Bergabung</h1>
        <p className="mt-2 text-white/80">
          Komunitas jual-beli khusus mahasiswa USU &amp; POLMED
        </p>
        <a href={WA_GROUP_LINK} target="_blank" rel="noreferrer" className="btn mt-5 bg-white text-primary hover:bg-white/90">
          <span aria-hidden="true">🟢</span> Gabung Grup WhatsApp
        </a>
        <p className="mt-2 text-sm text-white/70">
          Gratis, langsung diterima — khusus mahasiswa &amp; warga kampus
        </p>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-lg font-bold"><span aria-hidden="true">🛒</span> Cara Menjual</h2>
          <ol className="mt-4 space-y-3">
            {sellSteps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-white">
                  {i + 1}
                </span>
                <span className="text-sm text-gray-600">{s}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="card p-6">
          <h2 className="text-lg font-bold"><span aria-hidden="true">🛍️</span> Cara Membeli</h2>
          <ol className="mt-4 space-y-3">
            {buySteps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-wa text-xs font-bold text-white">
                  {i + 1}
                </span>
                <span className="text-sm text-gray-600">{s}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-lg font-bold"><span aria-hidden="true">💰</span> Biaya Layanan &amp; Komisi</h2>
          <p className="mt-1 text-sm text-gray-500">Biaya Iklan (Di Awal)</p>
          <div className="mt-2 space-y-2">
            <Fee label="Iklan Barang (< Rp 50.000)" value="Rp 2.000" />
            <Fee label="Iklan Barang (< Rp 100.000)" value="Rp 3.000" />
            <Fee label="Iklan Barang (< Rp 500.000)" value="Rp 5.000" />
            <Fee label="Iklan Barang (< Rp 1.000.000)" value="Rp 7.000" />
            <Fee label="Iklan Barang (≥ Rp 1.000.000)" value="1%" />
            <Fee label="Pasang Wanted / Cari Barang" value="Gratis 3x (Lalu Rp 1.000)" />
            <Fee label="Penawaran Wanted (Unlock WA)" value="Rp 2.000 / Bagi Hasil" />
            <Fee label="Iklan Poster" value="Rp 10.000" />
            <Fee label="Bump ke atas" value="Rp 1.000" />
          </div>
          <p className="mt-4 text-sm text-gray-500">Komisi Setelah Terjual (Sold Fee)</p>
          <div className="mt-2 space-y-2">
            <Fee label="Harga di bawah Rp 50.000" value="Gratis (Bebas Komisi)" />
            <Fee label="Harga di bawah Rp 100.000" value="10%" />
            <Fee label="Harga di atas Rp 100.000" value="5%" />
          </div>
        </div>
        <div className="card p-6">
          <h2 className="text-lg font-bold"><span aria-hidden="true">⚠️</span> Aturan &amp; Keamanan</h2>
          <ul className="mt-4 space-y-3">
            {rules.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-600">
                <span className="text-primary">✓</span> {r}
              </li>
            ))}
          </ul>
          <a
            href={`https://wa.me/${MARKETPLACE_WA}`}
            target="_blank"
            rel="noreferrer"
            className="btn-wa mt-5 w-full"
          >
            Hubungi Admin
          </a>
        </div>
      </div>
    </div>
  );
}
