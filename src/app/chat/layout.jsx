export const metadata = {
  title: "Obrolan Mahasiswa",
  description:
    "Ruang obrolan mahasiswa untuk transaksi jual beli barang dan kesepakatan titik temu COD aman.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
  alternates: {
    canonical: "/chat",
  },
  openGraph: {
    title: "Obrolan Mahasiswa | Kampus Kita",
    description: "Ruang obrolan mahasiswa untuk transaksi jual beli barang dan kesepakatan COD aman.",
    siteName: "Kampus Kita",
  },
};

export default function ChatLayout({ children }) {
  return children;
}
