import { isAdmin } from "@/lib/auth";
import AdminLogin from "../AdminLogin";
import BuyerContactsPanel from "../BuyerContactsPanel";

export const dynamic = "force-dynamic";

export default function AdminKontakPembeliPage() {
  if (!isAdmin()) {
    return <AdminLogin />;
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-6 text-xl font-bold">Log Kontak Pembeli</h2>
      <p className="mb-4 text-sm text-gray-500">Monitor siapa saja yang menghubungi penjual dan bagaimana status deal-nya.</p>
      <BuyerContactsPanel />
    </div>
  );
}
