import { isAdmin } from "@/lib/auth";
import { getAdminStats, DEFAULT_DATA } from "@/lib/adminData";
import AdminLogin from "../AdminLogin";
import PengaturanClient from "./PengaturanClient";
import { LoadError } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminPengaturanPage() {
  if (!isAdmin()) {
    return <AdminLogin />;
  }

  let data = DEFAULT_DATA;
  try {
    data = await getAdminStats(1, "pengaturan");
  } catch (e) {
    return (
      <LoadError message={`${e.message}. Cek konfigurasi Supabase.`} />
    );
  }

  return <PengaturanClient initialSettings={data.settings || {}} />;
}
