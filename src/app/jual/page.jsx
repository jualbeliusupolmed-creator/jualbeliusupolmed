import JualClient from "./JualClient";

export const metadata = {
  title: "Pasang Iklan Marketplace — Kampus Kita USU • POLMED",
  description: "Pasang iklan jual barang & tawarkan jasa di Kampus Kita USU • POLMED. Jangkau ribuan mahasiswa dengan COD aman titik kumpul kampus.",
  openGraph: {
    title: "Pasang Iklan Marketplace — Kampus Kita USU • POLMED",
    description: "Pasang iklan jual barang & tawarkan jasa di Kampus Kita USU • POLMED. Jangkau ribuan mahasiswa dengan COD aman titik kumpul kampus.",
    siteName: "Kampus Kita",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pasang Iklan Marketplace — Kampus Kita USU • POLMED",
    description: "Pasang iklan jual barang & tawarkan jasa di Kampus Kita USU • POLMED. Jangkau ribuan mahasiswa dengan COD aman titik kumpul kampus.",
  },
};

export default function Page() {
  return <JualClient />;
}
