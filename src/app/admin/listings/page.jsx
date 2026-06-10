import { isAdmin } from "@/lib/auth";
import { getAdminStats, DEFAULT_DATA } from "@/lib/adminData";
import AdminLogin from "../AdminLogin";
import AdminPanel from "../AdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminListingsPage() {
  if (!isAdmin()) return <AdminLogin />;

  let data = DEFAULT_DATA;
  try {
    data = await getAdminStats();
  } catch (e) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center text-rose-600">
        Gagal memuat data: {e.message}
      </div>
    );
  }

  return <AdminPanel {...data} initialTab="listings" />;
}
