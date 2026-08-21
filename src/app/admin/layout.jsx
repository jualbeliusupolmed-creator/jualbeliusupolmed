import { Roboto } from "next/font/google";
import { AdminProvider } from "@/components/admin/AdminProvider";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { isAdmin } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabaseAdmin";
import AdminLogin from "./AdminLogin";
import "./google.css";

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
 * yang bisa punya kerangka sendiri. Bentuk rupanya mengikuti konsol Google
 * (rel kiri berpil, bilah atas dengan kotak cari, kartu bersudut 8px) dan
 * seluruh aturannya ada di ./google.css, dikurung di dalam kelas `.g-admin`
 * supaya situs publiknya tidak ikut berubah.
 */

// Roboto: muka huruf Google. "Google Sans" tidak dibagikan untuk umum, jadi
// Roboto adalah yang paling dekat dan memang dipakai Google sendiri di seluruh
// permukaan konsolnya. Situs publik tetap memakai Plus Jakarta Sans.
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-google-sans",
});

export default async function AdminLayout({ children }) {
  if (!isAdmin()) {
    return <AdminLogin />;
  }

  const supa = getAdminClient();
  const [pendingRes, reportsRes, profilesRes, payRes, outboxRes, tokoRes] = await Promise.all([
    supa.from("listings").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supa.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supa.from("profile_change_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supa.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending"),
    // wa_outbox lahir belakangan lewat migrasi terpisah. Kalau tabelnya belum
    // ada di sebuah lingkungan, supabase-js menjawab dengan error di dalam
    // hasilnya (bukan melempar), jadi seluruh sidebar tidak ikut mati — count
    // tinggal null dan lencananya tidak muncul. Itu perilaku yang diinginkan:
    // menu boleh kehilangan satu lencana, tidak boleh kehilangan seluruh menu.
    supa.from("wa_outbox").select("id", { count: "exact", head: true }).eq("status", "tertunda"),
    // Toko yang menunggu persetujuan. Alasannya sama dengan wa_outbox: kolomnya
    // lahir lewat migrasi terpisah (BAGIAN 26), dan lencana yang hilang lebih
    // baik daripada seluruh menu yang hilang.
    supa.from("seller_profiles").select("wa", { count: "exact", head: true }).eq("store_status", "menunggu"),
  ]);

  const counts = {
    moderasi: (pendingRes.count || 0) + (reportsRes.count || 0) + (profilesRes.count || 0),
    reports: reportsRes.count || 0,
    profil_request: profilesRes.count || 0,
    transaksi: payRes.count || 0,
    antrean: outboxRes.count || 0,
    toko: tokoRes.count || 0,
  };
  // Angka nol tidak perlu dipajang — lencana kosong cuma jadi noise.
  for (const k of Object.keys(counts)) if (!counts[k]) delete counts[k];

  return (
    // `.g-admin` di LUAR AdminProvider, bukan di dalam: toast dan dialog
    // konfirmasi digambar oleh provider sebagai saudara dari isi halaman, dan
    // kalau kurungannya di dalam, keduanya kehilangan seluruh token warna
    // Google — muncul sebagai kotak tanpa warna di pojok layar.
    <div className={`${roboto.variable} g-admin g-shell`}>
      <AdminProvider>
        <AdminSidebar counts={counts} />

        <div className="g-main">
          <AdminTopbar counts={counts} />
          <div className="g-content">
            <div className="mx-auto w-full max-w-[1280px]">{children}</div>
          </div>
        </div>
      </AdminProvider>
    </div>
  );
}
