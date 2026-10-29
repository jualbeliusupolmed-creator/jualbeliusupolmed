import JualClient from "./JualClient";

export const metadata = {
  title: "Jual Barang — Kampus Kita",
  description: "Jual barang dan tawarkan jasa di Kampus Kita. Jangkau mahasiswa lintas kampus dan sepakati titik temu yang aman.",
  openGraph: {
    title: "Jual Barang — Kampus Kita",
    description: "Jual barang dan tawarkan jasa untuk mahasiswa lintas kampus.",
    siteName: "Kampus Kita",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jual Barang — Kampus Kita",
    description: "Jual barang dan tawarkan jasa untuk mahasiswa lintas kampus.",
  },
};

export default function Page() {
  return <JualClient />;
}
