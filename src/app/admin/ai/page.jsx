import { isAdmin } from "@/lib/auth";
import { getAdminStats, DEFAULT_DATA } from "@/lib/adminData";
import AdminLogin from "../AdminLogin";
import AiClient from "./AiClient";
import { LoadError } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminAiPage() {
  if (!isAdmin()) {
    return <AdminLogin />;
  }

  let data = DEFAULT_DATA;
  try {
    data = await getAdminStats(1, "ai");
  } catch (e) {
    return (
      <LoadError message={`${e.message}. Cek konfigurasi Supabase.`} />
    );
  }

  return <AiClient settings={data.settings || {}} />;
}
