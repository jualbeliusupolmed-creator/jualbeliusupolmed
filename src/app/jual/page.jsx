import JualClient from "./JualClient";

export const metadata = {
  title: "Pasang Iklan",
  description: "Pasang iklan jualan Anda di Jual Beli USU Polmed. Jangkau ribuan mahasiswa USU dan POLMED Medan dengan mudah, aman, dan cepat.",
  openGraph: {
    title: "Pasang Iklan — Jual Beli USU Polmed",
    description: "Pasang iklan jualan Anda di Jual Beli USU Polmed. Jangkau ribuan mahasiswa USU dan POLMED Medan dengan mudah, aman, dan cepat.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pasang Iklan — Jual Beli USU Polmed",
    description: "Pasang iklan jualan Anda di Jual Beli USU Polmed. Jangkau ribuan mahasiswa USU dan POLMED Medan dengan mudah, aman, dan cepat.",
  },
};

export default function Page() {
  return <JualClient />;
}
