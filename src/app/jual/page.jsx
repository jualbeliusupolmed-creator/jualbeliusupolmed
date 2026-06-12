import JualClient from "./JualClient";

export const metadata = {
  title: "Jual Barang",
  description: "Jual barang di Jual Beli USU Polmed. Jangkau ribuan mahasiswa USU dan POLMED Medan dengan mudah, aman, dan cepat.",
  openGraph: {
    title: "Jual Barang — Jual Beli USU Polmed",
    description: "Jual barang di Jual Beli USU Polmed. Jangkau ribuan mahasiswa USU dan POLMED Medan dengan mudah, aman, dan cepat.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jual Barang — Jual Beli USU Polmed",
    description: "Jual barang di Jual Beli USU Polmed. Jangkau ribuan mahasiswa USU dan POLMED Medan dengan mudah, aman, dan cepat.",
  },
};

export default function Page() {
  return <JualClient />;
}
