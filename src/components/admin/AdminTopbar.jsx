"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAdmin } from "./AdminProvider";
import AdminNav from "./AdminNav";
import { NAV, ICONS, labelTab } from "./nav";

/*
 * Bilah atas ala Google: nama halaman di kiri, satu kotak cari di tengah,
 * aksi akun di kanan.
 *
 * Kotak carinya mencari MENU, dan itu disebutkan pada placeholder-nya. Panel
 * ini punya dua puluh lebih halaman; sebelum ini satu-satunya cara pindah
 * adalah memindai rel kiri dengan mata.
 */
export default function AdminTopbar({ counts = {} }) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAdmin();

  const [q, setQ] = useState("");
  const [buka, setBuka] = useState(false);      // laci menu (ponsel)
  const [fokus, setFokus] = useState(false);    // saran pencarian sedang tampil
  const kotak = useRef(null);

  const currentTab = pathname.split("/").filter(Boolean)[1] || "overview";
  const judul = labelTab(currentTab);

  const hasil = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return NAV.filter((n) => n.label.toLowerCase().includes(s) || n.key.includes(s)).slice(0, 8);
  }, [q]);

  // Klik di luar menutup saran. Tanpa ini daftarnya menggantung menutupi isi
  // halaman sampai ada yang menekan Escape — dan tidak ada yang tahu harus begitu.
  useEffect(() => {
    function luar(e) {
      if (kotak.current && !kotak.current.contains(e.target)) setFokus(false);
    }
    document.addEventListener("mousedown", luar);
    return () => document.removeEventListener("mousedown", luar);
  }, []);

  // Laci ikut tertutup begitu halamannya berganti.
  useEffect(() => { setBuka(false); }, [pathname]);

  function pilih(key) {
    router.push(`/admin/${key}`);
    setQ("");
    setFokus(false);
  }

  return (
    <>
      <header className="g-topbar">
        <button
          type="button"
          onClick={() => setBuka(true)}
          className="g-icon-btn lg:hidden"
          aria-label="Buka menu"
        >
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>

        <span className="g-topbar-title mr-3 hidden sm:block lg:hidden">{judul}</span>

        <div className="g-searchbar relative" ref={kotak}>
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d={ICONS.search} />
          </svg>
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setFokus(true); }}
            onFocus={() => setFokus(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && hasil[0]) pilih(hasil[0].key);
              if (e.key === "Escape") { setQ(""); setFokus(false); }
            }}
            placeholder="Cari halaman admin…"
            aria-label="Cari halaman admin"
          />
          {q ? (
            <button type="button" onClick={() => setQ("")} className="g-icon-btn h-7 w-7" aria-label="Kosongkan">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          ) : null}

          {fokus && hasil.length > 0 && (
            <div
              className="g-card absolute left-0 right-0 top-[52px] z-50 overflow-hidden py-2"
              style={{ boxShadow: "var(--g-shadow-2)" }}
            >
              {hasil.map((n) => (
                <button
                  key={n.key}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pilih(n.key)}
                  className="g-nav-item"
                  style={{ borderRadius: 0, paddingLeft: 16 }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d={ICONS[n.key] || ICONS.overview} />
                  </svg>
                  <span>{n.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <a
          href="/"
          className="g-icon-btn hidden sm:inline-flex"
          title="Buka situs"
          aria-label="Buka situs"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2c2.5 2.7 3.8 6.2 3.8 10S14.5 19.3 12 22c-2.5-2.7-3.8-6.2-3.8-10S9.5 4.7 12 2z" />
          </svg>
        </a>

        <button type="button" onClick={logout} className="g-icon-btn" title="Keluar" aria-label="Keluar">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d={ICONS.logout} />
          </svg>
        </button>
      </header>

      {/* Laci menu untuk ponsel — isinya persis rel kiri, bukan versi ringkasnya. */}
      {buka && (
        <div className="g-scrim lg:hidden" style={{ placeItems: "stretch" }} onClick={() => setBuka(false)}>
          <div
            className="flex h-full w-[280px] flex-col"
            style={{ background: "var(--g-bg)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="g-rail-brand">
              <span className="g-rail-brand-mark">
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
                </svg>
              </span>
              <span className="g-rail-brand-text"><b>Admin</b> Console</span>
            </div>
            <AdminNav counts={counts} onNavigate={() => setBuka(false)} />
          </div>
        </div>
      )}
    </>
  );
}
