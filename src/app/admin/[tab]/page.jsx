import { notFound } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { getAdminStats, DEFAULT_DATA, ADMIN_TABS } from "@/lib/adminData";
import AdminLogin from "../AdminLogin";
import AdminPanel from "../AdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminTabPage({ params }) {
  const { tab } = params;

  // Validate tab slug
  if (!ADMIN_TABS.includes(tab)) notFound();

  if (!isAdmin()) {
    return <AdminLogin />;
  }

  let data = DEFAULT_DATA;
  try {
    data = await getAdminStats();
  } catch (e) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center text-rose-600">
        Gagal memuat data admin: {e.message}. Cek konfigurasi Supabase.
      </div>
    );
  }

  return <AdminPanel {...data} initialTab={tab} />;
}
