import { AdminProvider } from "@/components/admin/AdminProvider";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { isAdmin } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabaseAdmin";
import AdminLogin from "./AdminLogin";

/**
 * Satu cangkang untuk SELURUH /admin.
 *
 * Dulu cangkangnya ada dua: halaman baru (Ringkasan, Moderasi, Keuangan, Tren,
 * Audit) memakai sidebar penuh-layar ini, sedangkan halaman lama menggambar
 * sidebar-nya sendiri di dalam AdminPanel. Akibatnya menu berpindah tempat,
 * berganti label, dan kadang hilang begitu admin membuka tab lain — padahal
 * semuanya satu panel yang sama.
 *
 * Sekarang layout ini membungkus semua rute /admin/*, jadi tidak ada halaman
 * yang bisa punya kerangka sendiri.
 */
export default async function AdminLayout({ children }) {
  if (!isAdmin()) {
    return <AdminLogin />;
  }

  const supa = getAdminClient();
  const [pendingRes, reportsRes, profilesRes, payRes] = await Promise.all([
    supa.from("listings").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supa.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supa.from("profile_change_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supa.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  const counts = {
    moderasi: (pendingRes.count || 0) + (reportsRes.count || 0) + (profilesRes.count || 0),
    reports: reportsRes.count || 0,
    profil_request: profilesRes.count || 0,
    transaksi: payRes.count || 0,
  };
  // Angka nol tidak perlu dipajang — lencana kosong cuma jadi noise.
  for (const k of Object.keys(counts)) if (!counts[k]) delete counts[k];

  return (
    <AdminProvider>
      {/* Sidebar dan isi halaman scroll sendiri-sendiri. */}
      <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-950">
        <AdminSidebar counts={counts} />

        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {/* Ruang untuk bilah atas versi ponsel (tingginya ± 100px). */}
          <div className="h-[100px] lg:hidden" />
          <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">{children}</div>
        </main>
      </div>
    </AdminProvider>
  );
}
