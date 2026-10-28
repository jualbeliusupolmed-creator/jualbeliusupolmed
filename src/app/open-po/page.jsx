import { fetchOpenPoBatches } from "@/lib/openPo";
import OpenPoClient from "./OpenPoClient";
import { getSellerSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Etalase Open PO Kampus — Kuliner, Jastip & Merchandise Mahasiswa | Kampus Kita",
  description:
    "Etalase resmi Open Pre-Order (PO) mahasiswa USU & POLMED. Pesan makanan, minuman, merchandise angkatan, dan jastip langsung dari sesama mahasiswa dengan titik pickup kampus.",
  alternates: { canonical: "/open-po" },
  openGraph: {
    title: "Etalase Open PO Kampus — Kuliner, Jastip & Merchandise | Kampus Kita",
    description: "Pesan batch kuliner & jastip mahasiswa USU & POLMED. Kuota transparan dan pickup langsung di kampus.",
    url: "/open-po",
    siteName: "Kampus Kita",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Etalase Open PO Kampus — USU & POLMED | Kampus Kita",
    description: "Pesan batch kuliner & jastip mahasiswa USU & POLMED. Kuota transparan dan pickup langsung di kampus.",
  },
};

export default async function OpenPoPage() {
  let batches = [];
  let initialError = "";
  try {
    batches = await fetchOpenPoBatches();
  } catch {
    initialError = "Open PO belum tersedia karena database baru belum disiapkan.";
  }

  return <OpenPoClient initialBatches={batches || []} isAuthenticated={!!getSellerSession()} initialError={initialError} />;
}
