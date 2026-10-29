import JasaClient from "./JasaClient";

export const metadata = {
  // Sufiksnya ditambahkan template di layout akar; menulisnya lagi di sini
  // membuat nama situs terduplikasi pada judul halaman.
  title: "Tawarkan Jasa Mahasiswa",
  description: "Tawarkan jasa pekerjaan lepas, desain, servis perangkat, dan berbagai keahlian kepada mahasiswa lintas kampus.",
  alternates: { canonical: "/jasa/tawarkan" },
  openGraph: {
    title: "Tawarkan Jasa Mahasiswa — Kampus Kita",
    description: "Tawarkan keahlianmu kepada mahasiswa lintas kampus.",
    url: "/jasa/tawarkan",
  },
};

export default function Page() {
  return <JasaClient />;
}
