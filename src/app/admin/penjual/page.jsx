import { isAdmin } from "@/lib/auth";
import { getAdminStats, DEFAULT_DATA } from "@/lib/adminData";
import AdminLogin from "../AdminLogin";
import PenjualClient from "./PenjualClient";
import { LoadError } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminPenjualPage() {
  if (!isAdmin()) {
    return <AdminLogin />;
  }

  let data = DEFAULT_DATA;
  try {
    data = await getAdminStats(1, "penjual");
  } catch (e) {
    return (
      <LoadError message={`${e.message}. Cek konfigurasi Supabase.`} />
    );
  }

  return (
    <PenjualClient 
      initialSellers={data.sellersList || []} 
      initialBlacklist={data.blacklist || []} 
      settings={data.settings || {}}
    />
  );
}
