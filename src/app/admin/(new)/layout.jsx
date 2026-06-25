import { AdminProvider } from "@/components/admin/AdminProvider";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { isAdmin } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabaseAdmin";
import AdminLogin from "../AdminLogin";

export default async function AdminLayout({ children }) {
  if (!isAdmin()) {
    return <AdminLogin />;
  }

  // Badge counts untuk sidebar
  const supa = getAdminClient();
  const [pendingRes, reportsRes, profilesRes] = await Promise.all([
    supa.from("listings").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supa.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supa.from("profile_change_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  const moderasiCount = (pendingRes.count || 0) + (reportsRes.count || 0) + (profilesRes.count || 0);

  return (
    <AdminProvider>
      <div className="mx-auto max-w-7xl px-4 py-6 lg:flex lg:gap-6">
        <AdminSidebar counts={moderasiCount ? { moderasi: moderasiCount } : {}} />
        <main className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </AdminProvider>
  );
}
