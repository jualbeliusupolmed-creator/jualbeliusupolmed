import { AdminProvider } from "@/components/admin/AdminProvider";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { isAdmin } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabaseAdmin";
import AdminLogin from "../AdminLogin";

export default async function AdminLayout({ children }) {
  if (!isAdmin()) {
    return <AdminLogin />;
  }

  const supa = getAdminClient();
  const [pendingRes, reportsRes, profilesRes] = await Promise.all([
    supa.from("listings").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supa.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supa.from("profile_change_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  const moderasiCount =
    (pendingRes.count || 0) + (reportsRes.count || 0) + (profilesRes.count || 0);

  return (
    <AdminProvider>
      {/* Full-viewport flex layout — sidebar dan konten scroll terpisah */}
      <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-950">
        <AdminSidebar counts={moderasiCount ? { moderasi: moderasiCount } : {}} />

        {/* Konten area — scroll independen dari sidebar */}
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:pt-0 pt-0">
          {/* Spacer untuk mobile top bar (sticky bar height ≈ 100px) */}
          <div className="lg:hidden h-[100px]" />
          <div className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </AdminProvider>
  );
}
