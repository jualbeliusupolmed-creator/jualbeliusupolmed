import { isAdmin } from "@/lib/auth";
import { getAdminStats, DEFAULT_DATA } from "@/lib/adminData";
import AdminLogin from "../AdminLogin";
import AdminPanel from "../AdminPanel";
import { LoadError } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminListingsPage() {
  if (!isAdmin()) return <AdminLogin />;

  let data = DEFAULT_DATA;
  try {
    data = await getAdminStats();
  } catch (e) {
    return (
      <LoadError message={`${e.message}. Cek konfigurasi Supabase.`} />
    );
  }

  return <AdminPanel {...data} initialTab="listings" />;
}
