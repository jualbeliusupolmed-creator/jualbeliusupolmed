import GabungAdminClient from "./GabungAdminClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Gabung Jadi Admin & Pengelola Kampus — Kampus Kita",
  description:
    "Jadilah pemimpin komunitas dan pengelola resmi marketplace, Instagram, dan WhatsApp Channel di universitasmu.",
  keywords: [
    "admin kampus kita",
    "mitra kampus",
    "pengelola jual beli kampus",
    "komunitas mahasiswa nasional",
  ],
  alternates: { canonical: "/gabung-admin" },
  openGraph: {
    title: "Gabung Jadi Admin & Pengelola Kampus — Kampus Kita",
    description:
      "Kelola ekosistem marketplace, akun Instagram resmi, dan saluran WhatsApp di kampusmu.",
    url: "/gabung-admin",
    siteName: "Kampus Kita",
    locale: "id_ID",
    type: "website",
  },
};

export default function GabungAdminPage() {
  return <GabungAdminClient />;
}
