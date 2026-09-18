import { isAdmin } from "@/lib/auth";
import { getAdminStats, DEFAULT_DATA } from "@/lib/adminData";
import AdminLogin from "../AdminLogin";
import TransaksiClient from "./TransaksiClient";
import { LoadError } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminTransaksiPage() {
  if (!isAdmin()) {
    return <AdminLogin />;
  }

  let data = DEFAULT_DATA;
  try {
    data = await getAdminStats(1, "transaksi");
  } catch (e) {
    return (
      <LoadError message={`${e.message}. Cek konfigurasi Supabase.`} />
    );
  }

  return <TransaksiClient initialPayments={data.payments || []} />;
}
