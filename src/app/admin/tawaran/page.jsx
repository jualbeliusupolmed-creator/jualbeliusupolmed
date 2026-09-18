import { isAdmin } from "@/lib/auth";
import AdminLogin from "../AdminLogin";
import TawaranPanel from "../TawaranPanel";

export const dynamic = "force-dynamic";

export default function AdminTawaranPage() {
  if (!isAdmin()) {
    return <AdminLogin />;
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-6 text-xl font-bold">Monitor Tawaran Harga</h2>
      <p className="mb-4 text-sm text-gray-500">Monitor semua tawaran harga dari pembeli ke penjual di seluruh marketplace.</p>
      <TawaranPanel />
    </div>
  );
}
