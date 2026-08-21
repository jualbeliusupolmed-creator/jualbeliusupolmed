import { notFound } from "next/navigation";
import Link from "next/link";
import AdminSellerDetail from "../../../admin/penjual/[wa]/AdminSellerDetail";
import { sellersDemo, listingsDemo } from "@/lib/demoData";

export const dynamic = "force-dynamic";

export const metadata = { title: "Detail Penjual (Demo) — Admin" };

export default function PenjualDemoPage({ params }) {
  const angka = decodeURIComponent(params.wa).replace(/\D/g, "");
  const profile = sellersDemo.find((s) => s.wa.replace(/\D/g, "") === angka);
  if (!profile) notFound();

  const listings = listingsDemo.filter((l) => l.seller_wa === profile.wa);
  const terjual = listings.filter((l) => l.status === "sold");

  return (
    <div>
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-gray-400">
        <Link href="/admin-demo/overview" className="hover:text-gray-700 dark:hover:text-slate-200">Admin</Link>
        <span>/</span>
        <Link href="/admin-demo/penjual" className="hover:text-gray-700 dark:hover:text-slate-200">Penjual</Link>
        <span>/</span>
        <span className="text-gray-600 dark:text-slate-300">{profile.name}</span>
      </nav>

      <AdminSellerDetail
        profile={profile}
        listings={listings}
        wa={profile.wa}
        stats={{
          activeCount: listings.filter((l) => l.status === "active").length,
          soldCount: terjual.length,
          pendingCount: listings.filter((l) => l.status === "pending").length,
          totalRevenue: terjual.reduce((t, l) => t + (l.price || 0), 0),
          totalViews: listings.reduce((t, l) => t + (l.views || 0), 0),
        }}
      />
    </div>
  );
}
