import DicariClient from "./DicariClient";

export const metadata = {
  title: "Cari Barang — Tulis Kebutuhanmu, Penjual yang Datang",
  description:
    "Lagi cari laptop bekas, buku, kos, atau jasa di sekitar Medan? Posting kebutuhanmu gratis di halaman Cari Barang — penjual yang punya barangnya akan menghubungimu via WhatsApp.",
  alternates: { canonical: "/dicari" },
  openGraph: {
    title: "Cari Barang — Jual Beli Medan",
    description:
      "Posting barang/jasa yang kamu cari, gratis. Penjual datang menawarkan langsung ke WhatsApp-mu.",
    url: "/dicari",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cari Barang — Jual Beli Medan",
    description:
      "Posting barang/jasa yang kamu cari, gratis. Penjual datang menawarkan langsung ke WhatsApp-mu.",
  },
};

export default function Page() {
  return <DicariClient />;
}
