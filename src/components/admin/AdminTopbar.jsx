"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAdmin } from "./AdminProvider";
import AdminNav from "./AdminNav";
import { NAV, ICONS, labelTab } from "./nav";

/*
 * Bilah atas ala Modern Admin: nama halaman di kiri, satu kotak cari cepat (Command Palette Ctrl+K),
 * aksi navigasi langsung dan kontrol akun di kanan.
 */
export default function AdminTopbar({ counts = {} }) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAdmin();

  const [q, setQ] = useState("");
  const [buka, setBuka] = useState(false);      // laci menu (ponsel)
  const [fokus, setFokus] = useState(false);    // saran pencarian sedang tampil
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const kotak = useRef(null);

  const currentTab = pathname.split("/").filter(Boolean)[1] || "overview";
  const judul = labelTab(currentTab);

  const hasil = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return NAV.filter((n) => n.label.toLowerCase().includes(s) || n.key.includes(s)).slice(0, 8);
  }, [q]);

  // Global hotkey: Ctrl+K / Cmd+K / Slash to search
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setFokus(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Klik di luar menutup saran
  useEffect(() => {
    function luar(e) {
      if (kotak.current && !kotak.current.contains(e.target)) setFokus(false);
    }
    document.addEventListener("mousedown", luar);
    return () => document.removeEventListener("mousedown", luar);
  }, []);

  // Reset selected index when hasil changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [hasil]);

  // Laci ikut tertutup begitu halamannya berganti
  useEffect(() => {
    setBuka(false);
    setFokus(false);
  }, [pathname]);

  function pilih(key) {
    router.push(`/admin/${key}`);
    setQ("");
    setFokus(false);
  }

  function handleInputKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (hasil.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + hasil.length) % (hasil.length || 1));
    } else if (e.key === "Enter" && hasil[selectedIndex]) {
      e.preventDefault();
      pilih(hasil[selectedIndex].key);
    } else if (e.key === "Escape") {
      setQ("");
      setFokus(false);
      inputRef.current?.blur();
    }
  }

  return (
    <>
      <header className="g-topbar">
        <button
          type="button"
          onClick={() => setBuka(true)}
          className="g-icon-btn lg:hidden"
          aria-label="Buka menu navigasi"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>

        <span className="g-topbar-title mr-2 hidden sm:block lg:hidden">{judul}</span>

        {/* Kotak Cari Global / Command Palette */}
        <div className="g-searchbar relative" ref={kotak}>
          <svg className="h-4 w-4 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d={ICONS.search} />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setFokus(true);
            }}
            onFocus={() => setFokus(true)}
            onKeyDown={handleInputKeyDown}
            placeholder="Cari menu, moderasi, toko, bot… (Ctrl+K)"
            aria-label="Cari menu admin"
          />
          
          {q ? (
            <button
              type="button"
              onClick={() => { setQ(""); inputRef.current?.focus(); }}
              className="g-icon-btn h-6 w-6"
              aria-label="Kosongkan"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <span className="g-searchbar-kbd hidden sm:inline-flex">Ctrl K</span>
          )}

          {/* Popup Hasil Pencarian Menu */}
          {fokus && hasil.length > 0 && (
            <div
              className="g-card absolute left-0 right-0 top-[48px] z-50 overflow-hidden py-1.5 shadow-xl border border-gray-200 dark:border-slate-700"
              style={{ boxShadow: "var(--g-shadow-3)" }}
            >
              <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Pintasan Menu
              </div>
              {hasil.map((n, idx) => (
                <button
                  key={n.key}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pilih(n.key)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                    idx === selectedIndex
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 font-semibold"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-800"
                  }`}
                >
                  <svg className="h-4 w-4 shrink-0 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d={ICONS[n.key] || ICONS.overview} />
                  </svg>
                  <span className="flex-1 truncate">{n.label}</span>
                  {counts[n.key] ? (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-900/40 dark:text-red-300">
                      {counts[n.key]}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tautan Langsung ke Marketplace */}
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-xs transition hover:bg-gray-50 hover:border-gray-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          title="Buka Marketplace di Tab Baru"
        >
          <svg className="h-3.5 w-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
          </svg>
          <span>Lihat Web</span>
        </a>

        {/* Tombol Logout */}
        <button
          type="button"
          onClick={logout}
          className="g-icon-btn text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
          title="Keluar Admin"
          aria-label="Keluar Admin"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={ICONS.logout} />
          </svg>
        </button>
      </header>

      {/* Laci menu responsif untuk perangkat mobile / tablet */}
      {buka && (
        <div className="g-scrim lg:hidden" style={{ placeItems: "stretch" }} onClick={() => setBuka(false)}>
          <div
            className="flex h-full w-[280px] flex-col shadow-2xl animate-fade-in"
            style={{ background: "var(--g-surface)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="g-rail-brand justify-between">
              <div className="flex items-center gap-3">
                <span className="g-rail-brand-mark">
                  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
                  </svg>
                </span>
                <span className="g-rail-brand-text"><b>Admin</b> USU-POLMED</span>
              </div>
              <button
                type="button"
                onClick={() => setBuka(false)}
                className="g-icon-btn h-8 w-8"
                aria-label="Tutup"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <AdminNav counts={counts} onNavigate={() => setBuka(false)} />
          </div>
        </div>
      )}
    </>
  );
}

