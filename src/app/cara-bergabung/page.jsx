import { WA_GROUP_LINK, MARKETPLACE_WA } from "@/lib/constants";

export const metadata = { title: "Cara Bergabung — Jual Beli USU Polmed" };

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
          🟢 Gabung Grup WhatsApp
        </a>
        <p className="mt-2 text-sm text-white/70">chat.whatsapp.com/DQMZK2qSgq2D0WvH7BlBSA</p>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-lg font-bold">🛒 Cara Menjual</h2>
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
          <h2 className="text-lg font-bold">🛍️ Cara Membeli</h2>
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
          <h2 className="text-lg font-bold">💰 Fee Admin</h2>
          <p className="mt-1 text-sm text-gray-500">Sebelum deal (biaya iklan)</p>
          <div className="mt-2 space-y-2">
            <Fee label="Up barang / iklan" value="Rp 2.000" />
            <Fee label="Iklan poster" value="Rp 10.000" />
            <Fee label="Bump ke atas" value="Rp 1.000" />
          </div>
          <p className="mt-4 text-sm text-gray-500">Setelah deal (terjual)</p>
          <div className="mt-2 space-y-2">
            <Fee label="Di bawah Rp50.000" value="Rp 2.000" />
            <Fee label="Di bawah Rp100.000" value="10%" />
            <Fee label="Di atas Rp100.000" value="5%" />
          </div>
        </div>
        <div className="card p-6">
          <h2 className="text-lg font-bold">⚠️ Aturan &amp; Keamanan</h2>
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
