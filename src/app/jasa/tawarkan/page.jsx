import JasaClient from "./JasaClient";

export const metadata = {
  // Sufiksnya ditambahkan template di layout akar; menulisnya lagi di sini
  // membuat judulnya berbunyi "… — Jual Beli USU Polmed — Jual Beli USU Polmed".
  title: "Tawarkan Jasa Mahasiswa",
  description: "Tawarkan jasa pekerjaan lepas, desain, service laptop, dan berbagai skill lainnya ke ribuan mahasiswa USU & Polmed.",
  alternates: { canonical: "/jasa/tawarkan" },
  openGraph: {
    title: "Tawarkan Jasa Mahasiswa — Jual Beli USU Polmed",
    description: "Tawarkan skill dan jasamu ke ribuan mahasiswa USU & Polmed.",
    url: "/jasa/tawarkan",
  },
};

export default function Page() {
  return <JasaClient />;
}
