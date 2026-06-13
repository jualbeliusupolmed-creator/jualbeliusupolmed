import JasaClient from "./JasaClient";

export const metadata = {
  title: "Tawarkan Jasa Mahasiswa — Jual Beli USU Polmed",
  description: "Tawarkan jasa joki tugas, desain, service laptop, dan berbagai skill lainnya ke ribuan mahasiswa USU dan POLMED.",
  alternates: { canonical: "/jasa/tawarkan" },
  openGraph: {
    title: "Tawarkan Jasa Mahasiswa — Jual Beli USU Polmed",
    description: "Tawarkan skill dan jasamu ke ribuan mahasiswa USU dan POLMED.",
    url: "/jasa/tawarkan",
  },
};

export default function Page() {
  return <JasaClient />;
}
