import { AdminProvider } from "@/components/admin/AdminProvider";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { isAdmin } from "@/lib/auth";
import AdminLogin from "../AdminLogin";

export default function AdminLayout({ children }) {
  if (!isAdmin()) {
    return <AdminLogin />;
  }
  return (
    <AdminProvider>
      <div className="mx-auto max-w-7xl px-4 py-6 lg:flex lg:gap-6">
        <AdminSidebar />
        <main className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </AdminProvider>
  );
}
