import DicariClient from "./DicariClient";

export const metadata = {
  title: "Papan Dicari",
  description: "Mahasiswa butuh sesuatu? Pasang iklan dicari di sini secara gratis! Penjual yang memiliki barang tersebut akan langsung menghubungi Anda.",
  openGraph: {
    title: "Papan Dicari — Jual Beli USU Polmed",
    description: "Mahasiswa butuh sesuatu? Pasang iklan dicari di sini secara gratis! Penjual yang memiliki barang tersebut akan langsung menghubungi Anda.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Papan Dicari — Jual Beli USU Polmed",
    description: "Mahasiswa butuh sesuatu? Pasang iklan dicari di sini secara gratis! Penjual yang memiliki barang tersebut akan langsung menghubungi Anda.",
  },
};

export default function Page() {
  return <DicariClient />;
}
