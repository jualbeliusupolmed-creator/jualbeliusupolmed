import { WA_GROUP_LINK, MARKETPLACE_WA } from "@/lib/constants";
import { getSettings } from "@/lib/settings";
import { kontakDenganCadangan } from "@/lib/kontakAdmin";

export const metadata = {
  title: "Cara Bergabung — Komunitas Jual Beli Mahasiswa",
  description: "Panduan bergabung di komunitas jual-beli mahasiswa: cara menjual, membeli, memahami biaya, dan menjaga keamanan transaksi.",
  keywords: ["cara bergabung marketplace mahasiswa", "komunitas mahasiswa", "jual beli kampus", "aturan jual beli mahasiswa"],
  alternates: { canonical: "/cara-bergabung" },
  // Tanpa daftar images sendiri: halaman ini mewarisi gambar pratinjau dari
  // src/app/opengraph-image.jsx. Sebelumnya di sini ditulis "/og-image.png",
  // berkas yang tidak pernah ada di public/ — hasilnya 404, dan tautan halaman
  // ini muncul polos tanpa gambar setiap kali dibagikan di WhatsApp.
  openGraph: {
    title: "Cara Bergabung — Kampus Kita",
    description: "Gabung grup WhatsApp komunitas, jual barang gratis, dan transaksi aman dibantu admin.",
    url: "/cara-bergabung",
    siteName: "Kampus Kita",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cara Bergabung — Kampus Kita",
    description: "Gabung grup WhatsApp komunitas, jual barang gratis, dan transaksi aman dibantu admin.",
  },
};

const sellSteps = [
  "Masuk ke komunitas WhatsApp lewat link di bawah.",
  "Masuk ke salah satu grup yang tersedia.",
  "Jual barang lewat website atau kirim permintaan barang ke admin.",
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

export default async function CaraBergabungPage() {
  // Halaman ini dulu memakai konstanta nomor bawaan kode, jadi ia satu-satunya
  // "Hubungi Admin" yang tidak ikut pengaturan admin — apalagi ikut pengalihan
  // saat bot padam. Sekarang sumbernya sama dengan sisa situs.
  const { contact } = await getSettings();
  const kontak = await kontakDenganCadangan(contact);
  const waAdmin = String(kontak?.marketplaceWa || MARKETPLACE_WA).replace(/\D/g, "");
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="rounded-3xl bg-gradient-to-br from-primary to-primary-dark p-8 text-center text-white">
        <h1 className="text-3xl font-extrabold">Cara Bergabung</h1>
        <p className="mt-2 text-white/80">
          Komunitas jual-beli untuk mahasiswa lintas kampus
        </p>
        <a href={WA_GROUP_LINK} target="_blank" rel="noreferrer" className="btn mt-5 bg-white text-primary hover:bg-white/90">
          <span aria-hidden="true"></span> Gabung Grup WhatsApp
        </a>
        <p className="mt-2 text-sm text-white/70">
          Gratis, langsung diterima — untuk umum &amp; warga kampus
        </p>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-lg font-bold"><span aria-hidden="true"></span> Cara Menjual</h2>
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
          <h2 className="text-lg font-bold"><span aria-hidden="true"></span> Cara Membeli</h2>
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
          <h2 className="text-lg font-bold"><span aria-hidden="true">🏷️</span> Transparansi Biaya Layanan</h2>
          <p className="mt-1 text-sm text-gray-500">Pasar Bebas Mahasiswa</p>
          <div className="mt-2 space-y-2">
            <Fee label="Jual Barang & Tawarkan Jasa Mahasiswa" value="100% GRATIS (Rp 0)" />
            <Fee label="Komisi Penjualan Antar-Mahasiswa" value="BEBAS KOMISI (0%)" />
            <Fee label="Pasang Kebutuhan (Barang Dicari)" value="GRATIS" />
            <Fee label="Posting Menfess Kampus" value="GRATIS" />
          </div>
          <p className="mt-4 text-sm text-gray-500">Fitur Tambahan Opsional (Tidak Wajib)</p>
          <div className="mt-2 space-y-2">
            <Fee label="Naikkan Barang (Bump ke Urutan Teratas)" value="Rp 1.000" />
            <Fee label="Iklan Poster / Banner Sponsor Utama" value="Mulai Rp 10.000" />
            <Fee label="Buka Kontak Wanted (Anti-Spam Filter)" value="Rp 2.000" />
          </div>
        </div>
        <div className="card p-6">
          <h2 className="text-lg font-bold"><span aria-hidden="true"></span> Aturan &amp; Keamanan</h2>
          <ul className="mt-4 space-y-3">
            {rules.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-600">
                <span className="text-primary"></span> {r}
              </li>
            ))}
          </ul>
          <a
            href={`https://wa.me/${waAdmin}`}
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
