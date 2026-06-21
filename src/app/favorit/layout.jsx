export const metadata = {
  title: "Favorit Saya",
  description:
    "Daftar barang yang kamu simpan di Jual Beli Medan. Tersimpan di perangkat ini, tanpa perlu login.",
  alternates: { canonical: "/favorit" },
  robots: { index: false, follow: true },
};

export default function FavoritLayout({ children }) {
  return children;
}
