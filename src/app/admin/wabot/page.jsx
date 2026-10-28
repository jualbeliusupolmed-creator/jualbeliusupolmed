import { getAdminActor, hasAdminPermission } from "@/lib/admin-access";
import AdminLogin from "../AdminLogin";
import BaileysDashboard from "./BaileysDashboard";

export const dynamic = "force-dynamic";

export default async function AdminWabotPage() {
  const actor = await getAdminActor();
  if (!hasAdminPermission(actor, "whatsapp", "read")) {
    return <AdminLogin />;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <BaileysDashboard />
    </div>
  );
}
