import { isAdmin } from "@/lib/auth";
import { getAdminStats, DEFAULT_DATA } from "@/lib/adminData";
import AdminLogin from "../AdminLogin";
import KategoriClient from "./KategoriClient";
import { LoadError } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminKategoriPage() {
  if (!isAdmin()) {
    return <AdminLogin />;
  }

  let data = DEFAULT_DATA;
  try {
    data = await getAdminStats(1, "kategori");
  } catch (e) {
    return (
      <LoadError message={`${e.message}. Cek konfigurasi Supabase.`} />
    );
  }

  return <KategoriClient initialCategories={data.categories || []} />;
}
