import FypCurationWorkspace from "@/components/admin/FypCurationWorkspace";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kurasi FYP Provinsi — Admin Kampus Kita",
  description: "Pilih dan urutkan listing unggulan FYP untuk provinsi yang dikelola.",
};

export default function ProvinceFypPage() {
  return <FypCurationWorkspace />;
}
