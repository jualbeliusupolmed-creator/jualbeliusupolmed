import { headers } from "next/headers";
import OwnerWorkspaceShell from "@/components/admin/OwnerWorkspaceShell";
import { AdminProvider } from "@/components/admin/AdminProvider";
import { getAdminActor, hasAdminPermission } from "@/lib/admin-access";
import AdminLogin from "./AdminLogin";
import "./google.css";

export const dynamic = "force-dynamic";

function moduleForPath(pathname) {
  if (pathname === "/admin" || pathname === "/admin/overview") return "overview";
  if (pathname === "/admin/marketplace" || pathname.startsWith("/admin/marketplace/")) return "marketplace";
  if (pathname === "/admin/users" || pathname.startsWith("/admin/users/")) return "users";
  if (pathname === "/admin/finance" || pathname.startsWith("/admin/finance/")) return "finance";
  if (pathname === "/admin/analytics" || pathname.startsWith("/admin/analytics/")) return "analytics";
  if (pathname === "/admin/content" || pathname.startsWith("/admin/content/")) return "content";
  if (pathname === "/admin/settings" || pathname.startsWith("/admin/settings/")) return "settings";
  if (pathname === "/admin/audit" || pathname.startsWith("/admin/audit/")) return "audit";
  if (pathname === "/admin/po" || pathname.startsWith("/admin/po/")) return "po";
  if (pathname === "/admin/owners" || pathname.startsWith("/admin/owners/")) return "owners";
  if (pathname === "/admin/reports" || pathname.startsWith("/admin/reports/")) return "reports";
  if (["/admin/wabot", "/admin/antrean", "/admin/notifikasi", "/admin/broadcast", "/admin/broadcast_grup", "/admin/grouppost"].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return "whatsapp";
  return "legacy";
}

function AccessNotice({ actor }) {
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-amber-200 bg-white p-7 text-slate-900 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[.15em] text-amber-700">Akses belum diberikan</p>
      <h1 className="mt-2 text-xl font-black">{actor.role === "superadmin" ? "Bagian ini belum tersedia di workspace baru." : "Halaman ini tidak termasuk izin akun Anda."}</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{actor.role === "superadmin" ? "Gunakan Ringkasan, Marketplace, Open PO, atau akses WhatsApp yang tersedia di menu." : "Minta superadmin memperbarui izin workspace atau cakupan kampus Anda."}</p>
      {actor.role !== "superadmin" ? <p className="mt-5 break-all text-xs font-semibold text-slate-400">{actor.email}</p> : null}
    </div>
  );
}

export default async function AdminLayout({ children }) {
  const actor = await getAdminActor();
  if (!actor) return <AdminLogin />;

  const pathname = headers().get("x-admin-path") || "/admin/overview";
  const moduleName = moduleForPath(pathname);
  const allowed = moduleName !== "legacy" && hasAdminPermission(actor, moduleName, "read");

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
