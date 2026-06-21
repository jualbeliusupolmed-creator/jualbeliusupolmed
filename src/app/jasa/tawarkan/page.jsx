import JasaClient from "./JasaClient";

export const metadata = {
  title: "Tawarkan Jasa warga — Jual Beli Medan",
  description: "Tawarkan jasa pekerjaan lepas, desain, service laptop, dan berbagai skill lainnya ke ribuan warga Medan.",
  alternates: { canonical: "/jasa/tawarkan" },
  openGraph: {
    title: "Tawarkan Jasa warga — Jual Beli Medan",
    description: "Tawarkan skill dan jasamu ke ribuan warga Medan.",
    url: "/jasa/tawarkan",
  },
};

export default function Page() {
  return <JasaClient />;
}
