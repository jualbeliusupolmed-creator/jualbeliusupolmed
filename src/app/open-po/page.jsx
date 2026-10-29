import { fetchOpenPoBatches } from "@/lib/openPo";
import OpenPoClient from "./OpenPoClient";
import { getSellerSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Etalase Open PO Kampus — Kuliner, Jastip & Merchandise Mahasiswa | Kampus Kita",
  description:
    "Etalase Open Pre-Order (PO) mahasiswa lintas kampus. Pesan makanan, minuman, merchandise, dan jastip langsung dari sesama mahasiswa dengan titik pickup yang disepakati.",
  alternates: { canonical: "/open-po" },
  openGraph: {
    title: "Etalase Open PO Kampus — Kuliner, Jastip & Merchandise | Kampus Kita",
    description: "Pesan batch kuliner dan jastip mahasiswa. Kuota transparan dan titik pickup disepakati bersama.",
    url: "/open-po",
    siteName: "Kampus Kita",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Etalase Open PO Mahasiswa | Kampus Kita",
    description: "Pesan batch kuliner dan jastip mahasiswa lintas kampus. Kuota transparan dan titik pickup disepakati bersama.",
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
