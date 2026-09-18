import { isAdmin } from "@/lib/auth";
import AdminLogin from "../AdminLogin";
import BaileysDashboard from "./BaileysDashboard";

export const dynamic = "force-dynamic";

export default function AdminWabotPage() {
  if (!isAdmin()) {
    return <AdminLogin />;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <BaileysDashboard />
    </div>
  );
}
