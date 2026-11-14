import { headers } from "next/headers";
import OwnerWorkspaceShell from "@/components/admin/OwnerWorkspaceShell";
import { AdminProvider } from "@/components/admin/AdminProvider";
import { getAdminActor, hasAdminPermission } from "@/lib/admin-access";
import AdminLogin from "./AdminLogin";
import "./google.css";

export const dynamic = "force-dynamic";

function moduleForPath(pathname) {
  if (pathname === "/admin" || pathname === "/admin/overview") return "overview";
  if (pathname === "/admin/operasional-sumut" || pathname.startsWith("/admin/operasional-sumut/")) return "overview";
  if (
    pathname === "/admin/marketplace" || pathname.startsWith("/admin/marketplace/") ||
    pathname === "/admin/listings" || pathname.startsWith("/admin/listings/") ||
    pathname === "/admin/dicari" || pathname.startsWith("/admin/dicari/") ||
    pathname === "/admin/toko" || pathname.startsWith("/admin/toko/") ||
    pathname === "/admin/approve-toko" || pathname.startsWith("/admin/approve-toko/") ||
    pathname === "/admin/kategori" || pathname.startsWith("/admin/kategori/") ||
    pathname === "/admin/rating" || pathname.startsWith("/admin/rating/") ||
    pathname === "/admin/tawaran" || pathname.startsWith("/admin/tawaran/")
  ) return "marketplace";
  if (pathname === "/admin/fyp" || pathname.startsWith("/admin/fyp/")) return "fyp";
  if (
    pathname === "/admin/users" || pathname.startsWith("/admin/users/") ||
    pathname === "/admin/penjual" || pathname.startsWith("/admin/penjual/") ||
    pathname === "/admin/profil_request" || pathname.startsWith("/admin/profil_request/") ||
    pathname === "/admin/kontak_pembeli" || pathname.startsWith("/admin/kontak_pembeli/") ||
    pathname === "/admin/teman" || pathname.startsWith("/admin/teman/") ||
    pathname === "/admin/referral" || pathname.startsWith("/admin/referral/") ||
    pathname === "/admin/distributor" || pathname.startsWith("/admin/distributor/") ||
    pathname === "/admin/approve-unlock" || pathname.startsWith("/admin/approve-unlock/")
  ) return "users";
  if (
    pathname === "/admin/finance" || pathname.startsWith("/admin/finance/") ||
    pathname === "/admin/transaksi" || pathname.startsWith("/admin/transaksi/") ||
    pathname === "/admin/keuangan" || pathname.startsWith("/admin/keuangan/") ||
    pathname === "/admin/approve-payment" || pathname.startsWith("/admin/approve-payment/")
  ) return "finance";
  if (pathname === "/admin/analytics" || pathname.startsWith("/admin/analytics/") || pathname === "/admin/tren" || pathname.startsWith("/admin/tren/")) return "analytics";
  if (
    pathname === "/admin/content" || pathname.startsWith("/admin/content/") ||
    pathname === "/admin/blogs" || pathname.startsWith("/admin/blogs/") ||
    pathname === "/admin/mading" || pathname.startsWith("/admin/mading/")
  ) return "content";
  if (
    pathname === "/admin/settings" || pathname.startsWith("/admin/settings/") ||
    pathname === "/admin/pengaturan" || pathname.startsWith("/admin/pengaturan/") ||
    pathname === "/admin/ai" || pathname.startsWith("/admin/ai/")
  ) return "settings";
  if (pathname === "/admin/audit" || pathname.startsWith("/admin/audit/")) return "audit";
  if (pathname === "/admin/po" || pathname.startsWith("/admin/po/")) return "po";
  if (pathname === "/admin/owners" || pathname.startsWith("/admin/owners/")) return "owners";
  if (pathname === "/admin/organization" || pathname.startsWith("/admin/organization/")) return "organization";
  if (pathname === "/admin/admin-requests" || pathname.startsWith("/admin/admin-requests/")) return "admin_requests";
  if (pathname === "/admin/social" || pathname.startsWith("/admin/social/") || pathname === "/admin/instagram" || pathname.startsWith("/admin/instagram/")) return "social";
  if (
    pathname === "/admin/reports" || pathname.startsWith("/admin/reports/") ||
    pathname === "/admin/obrolan" || pathname.startsWith("/admin/obrolan/")
  ) return "reports";
  if (["/admin/wabot", "/admin/antrean", "/admin/notifikasi", "/admin/broadcast", "/admin/broadcast_grup", "/admin/grouppost"].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return "whatsapp";
  return "legacy";
}

function AccessNotice({ actor }) {
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-amber-200 bg-white p-7 text-slate-900 shadow-sm">
      <h1 className="text-xl font-black text-amber-900">Akses belum diberikan</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">Halaman ini tidak termasuk izin akun Anda. Minta superadmin memperbarui izin workspace atau cakupan kampus Anda.</p>
      <p className="mt-5 break-all text-xs font-semibold text-slate-400">{actor.email}</p>
    </div>
  );
}

export default async function AdminLayout({ children }) {
  const actor = await getAdminActor();
  if (!actor) return <AdminLogin />;

  const headerList = await headers();
  const pathname = headerList.get("x-admin-path") || "/admin/overview";
  const moduleName = moduleForPath(pathname);
  const hasSuperadminRole = actor.role === "superadmin" || actor.roles?.some((role) => role.role_code === "superadmin");
  // Semua admin berwenang memiliki akses penuh bebas hambatan
  const allowed = hasSuperadminRole || hasAdminPermission(actor, moduleName, "read");

  return (
    <div className="g-admin min-h-screen font-sans">
      <AdminProvider>
        <OwnerWorkspaceShell actor={actor}>
          {allowed ? children : <AccessNotice actor={actor} />}
        </OwnerWorkspaceShell>
      </AdminProvider>
    </div>
  );
}
