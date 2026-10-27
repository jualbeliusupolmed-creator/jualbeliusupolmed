export const metadata = {
  title: "Mading & Menfess Kampus — Suara Mahasiswa",
  description: "Mading digital mahasiswa. Bagikan curhat, info seputar kampus, cari barang hilang, dan dengarkan suara komunitas secara anonim, aman, dan real-time.",
  openGraph: {
    title: "Mading & Menfess Kampus — Suara Mahasiswa",
    description: "Ruang curhat dan mading digital mahasiswa. Baca curhatan terhangat dan info kampus terbaru.",
    url: "/mading",
    type: "website",
    locale: "id_ID",
    siteName: "Kampus Kita",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mading & Menfess Kampus — Suara Mahasiswa",
    description: "Ruang curhat dan mading digital mahasiswa. Baca curhatan terhangat dan info kampus terbaru.",
  },
};

export default function MadingLayout({ children }) {
  return children;
}
