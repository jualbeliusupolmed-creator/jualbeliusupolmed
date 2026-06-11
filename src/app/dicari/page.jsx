import DicariClient from "./DicariClient";

export const metadata = {
  title: "Papan Dicari — Posting Barang yang Kamu Butuhkan, Gratis",
  description:
    "Lagi cari laptop bekas, buku kuliah, kos, atau jasa di sekitar USU & POLMED? Posting kebutuhanmu gratis di Papan Dicari — penjual yang punya barangnya akan menghubungimu via WhatsApp.",
  alternates: { canonical: "/dicari" },
  openGraph: {
    title: "Papan Dicari — Jual Beli USU Polmed",
    description:
      "Posting barang/jasa yang kamu cari, gratis. Penjual datang menawarkan langsung ke WhatsApp-mu.",
    url: "/dicari",
  },
  twitter: {
    card: "summary_large_image",
    title: "Papan Dicari — Jual Beli USU Polmed",
    description:
      "Posting barang/jasa yang kamu cari, gratis. Penjual datang menawarkan langsung ke WhatsApp-mu.",
  },
};

export default function Page() {
  return <DicariClient />;
}
