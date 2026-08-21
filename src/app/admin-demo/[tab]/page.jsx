import { notFound } from "next/navigation";
import { ADMIN_TABS } from "@/lib/adminData";
import { getDemoStats } from "@/lib/demoData";
import AdminPanel from "../../admin/AdminPanel";

export const dynamic = "force-dynamic";

/**
 * Kembaran /admin/[tab]. Komponen yang dipakai sama persis — AdminPanel yang
 * itu juga — dan daftar tab-nya dibaca dari ADMIN_TABS yang sama, supaya tab
 * yang ditambahkan di panel sungguhan otomatis ada di sini juga.
 */
export default function AdminDemoTabPage({ params }) {
  const { tab } = params;
  if (!ADMIN_TABS.includes(tab)) notFound();
  return <AdminPanel {...getDemoStats(1, tab)} initialTab={tab} />;
}
