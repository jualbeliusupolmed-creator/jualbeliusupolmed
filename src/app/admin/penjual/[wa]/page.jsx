import { notFound } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { formatWa } from "@/lib/constants";
import AdminLogin from "../../AdminLogin";
import AdminSellerDetail from "./AdminSellerDetail";

export const dynamic = "force-dynamic";

async function getSellerData(wa) {
  try {
    const decodedWa = formatWa(decodeURIComponent(wa)) || decodeURIComponent(wa);
    const supa = getAdminClient();

    const { data: profile } = await supa
      .from("seller_profiles")
      .select("*")
      .eq("wa", decodedWa)
      .maybeSingle();

    const { data: listings } = await supa
      .from("listings")
      .select("seller_name")
      .eq("seller_wa", decodedWa)
      .limit(1);

    return { profile, listings: listings || [], decodedWa };
  } catch (err) {
    return null;
  }
}

export async function generateMetadata({ params }) {
  if (!isAdmin()) return { title: "Admin" };
  const decodedWa = formatWa(decodeURIComponent(params.wa)) || decodeURIComponent(params.wa);
  return { title: `${decodedWa} — Edit Penjual` };
}

export default async function AdminSellerPage({ params }) {
  if (!isAdmin()) return <AdminLogin />;

  const data = await getSellerData(params.wa);
  // It's possible that data.profile is null (if the seller isn't registered yet), 
  // but we can still edit them and create the profile!
  if (!data) notFound();

  const { profile, listings, decodedWa } = data;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-gray-400">
        <Link href="/admin/overview" className="hover:text-gray-700 dark:hover:text-slate-200">
          Admin
        </Link>
        <span>/</span>
        <Link href="/admin/penjual" className="hover:text-gray-700 dark:hover:text-slate-200">
          Penjual
        </Link>
        <span>/</span>
        <span className="truncate text-gray-700 dark:text-slate-200">
          {decodedWa}
        </span>
      </nav>

      <AdminSellerDetail profile={profile} listings={listings} wa={decodedWa} />
    </div>
  );
}
