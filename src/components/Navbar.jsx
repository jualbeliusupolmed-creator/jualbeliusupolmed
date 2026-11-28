"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useMemo } from "react";
import { Icon } from "@/components/Icons";
import PrimaryNavigation from "@/components/PrimaryNavigation";
import { useSesi } from "@/components/SesiProvider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getCartItems } from "@/lib/cart";
import { fetchCampusesCached } from "@/lib/cachedKampus";

// Dynamic imports untuk memangkas bundle navigasi desktop & mobile
const OTPModal = dynamic(() => import("@/components/OTPModal"), { ssr: false });
const NotificationCenter = dynamic(() => import("@/components/NotificationCenter"), { ssr: false });
const QuickSearchSheet = dynamic(() => import("@/components/QuickSearchSheet"), { ssr: false });

export default function Navbar({ config }) {
  const pathname = usePathname();
  const router = useRouter();
  const { wa: sesiWa, nama: sesiNama, siap, segarkan, keluar, profil } = useSesi();
  const session = { wa: sesiWa, name: sesiNama || sesiWa };
  
  const [selectedCampus, setSelectedCampus] = useState("Semua");
  const [campuses, setCampuses] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [profileCampus, setProfileCampus] = useState("");
  const [profileProvince, setProfileProvince] = useState("");
  const [campusDropdownOpen, setCampusDropdownOpen] = useState(false);
  const [unreadChat, setUnreadChat] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [notifTerbuka, setNotifTerbuka] = useState(false);
  const [cariTerbuka, setCariTerbuka] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const dropdownRef = useRef(null);
  const mobileDropdownRef = useRef(null);

  // Load campus preference
  useEffect(() => {
    const updateCartCount = () => setCartCount(getCartItems().length);
    updateCartCount();
    window.addEventListener("cart-changed", updateCartCount);
    window.addEventListener("storage", updateCartCount);
    return () => {
      window.removeEventListener("cart-changed", updateCartCount);
      window.removeEventListener("storage", updateCartCount);
    };
  }, []);

  useEffect(() => {
    fetchCampusesCached()
      .then((data) => {
        if (Array.isArray(data?.campuses)) {
          setCampuses(data.campuses);
          if (Array.isArray(data?.provinces)) setProvinces(data.provinces);
          const urlParams = new URLSearchParams(window.location.search);
          const urlCampus = urlParams.get("campus") || urlParams.get("univ");
          let initial = null;

          if (urlCampus) {
            const clean = urlCampus.trim().toLowerCase();
            const matched = data.campuses.find((c) => c.shortName.toLowerCase() === clean || c.id.toLowerCase() === clean);
            if (matched) initial = matched.shortName;
          }

          if (!initial) {
            const saved = localStorage.getItem("preferred_campus");
            const valid = saved === "Semua" || data.campuses.some((campus) => campus.shortName === saved);
            if (valid && saved) initial = saved;
            else if (saved) localStorage.removeItem("preferred_campus");
          }

          if (initial) setSelectedCampus(initial);
        }
      })
      .catch(() => {});

    const onCampusSync = (e) => {
      if (e.detail?.campus) setSelectedCampus(e.detail.campus);
      if (e.detail?.province) setProfileProvince(e.detail.province);
    };
    window.addEventListener("campus:change", onCampusSync);

    const onChatUnread = (e) => setUnreadChat(e.detail?.count ?? 3);
    window.addEventListener("chat:unread", onChatUnread);

    const handleClickOutside = (e) => {
      if (
        (dropdownRef.current && !dropdownRef.current.contains(e.target)) ||
        (mobileDropdownRef.current && !mobileDropdownRef.current.contains(e.target))
      ) {
        setCampusDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("campus:change", onCampusSync);
      window.removeEventListener("chat:unread", onChatUnread);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (profil) {
      const camp = profil.campus || profil.marketplace_campus;
      if (camp) {
        setProfileCampus(camp);
        setSelectedCampus(camp);
        try { localStorage.setItem("preferred_campus", camp); } catch {}
      }
      const prov = profil.marketplace_province_id || profil.fyp_province_id;
      if (prov) {
        setProfileProvince(prov);
        try { localStorage.setItem("preferred_province", prov); } catch {}
      }
    }
  }, [profil]);

  useEffect(() => {
    if (!sesiWa) {
      try {
        const savedCamp = localStorage.getItem("preferred_campus");
        const savedProv = localStorage.getItem("preferred_province");
        if (savedCamp) {
          setProfileCampus(savedCamp);
          setSelectedCampus(savedCamp);
        }
        if (savedProv) setProfileProvince(savedProv);
      } catch {}
      return;
    }

    fetch("/api/profil", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.ok && data.profil) {
          const camp = data.profil.campus || data.profil.marketplace_campus;
          if (camp) {
            setProfileCampus(camp);
            setSelectedCampus(camp);
            try { localStorage.setItem("preferred_campus", camp); } catch {}
          }
          const prov = data.profil.marketplace_province_id || data.profil.fyp_province_id;
          if (prov) {
            setProfileProvince(prov);
            try { localStorage.setItem("preferred_province", prov); } catch {}
          }
        }
      })
      .catch(() => {});
  }, [sesiWa]);

  const activeProvince =
    profileProvince ||
    (profileCampus &&
      campuses.find((c) => {
        const p = profileCampus.toLowerCase().trim();
        return (
          c.shortName?.toLowerCase() === p ||
          c.id?.toLowerCase() === p ||
          c.name?.toLowerCase() === p ||
          p.includes(c.shortName?.toLowerCase()) ||
          (c.name && p.includes(c.name.toLowerCase()))
        );
      })?.provinceId) ||
    (selectedCampus &&
      selectedCampus !== "Semua" &&
      campuses.find((c) => {
        const s = selectedCampus.toLowerCase().trim();
        return (
          c.shortName?.toLowerCase() === s ||
          c.id?.toLowerCase() === s ||
          c.name?.toLowerCase() === s
        );
      })?.provinceId) ||
    (typeof window !== "undefined" ? localStorage.getItem("preferred_province") : null) ||
    "sumatera-utara";

  // Universitas dari provinsi yang aktif
  const displayCampuses = useMemo(() => {
    const scoped = campuses.filter((c) => {
      const cProv = c.provinceId || c.province_id || "sumatera-utara";
      return cProv === activeProvince;
    });
    return scoped.length > 0 ? scoped : campuses.filter((c) => (c.provinceId || c.province_id || "") === "sumatera-utara");
  }, [campuses, activeProvince]);

  const primaryCampus = profileCampus || config?.primary_campus || "";

  const sortedCampuses = [...displayCampuses].sort((a, b) => {
    const aIsPrimary = primaryCampus && a.shortName?.toLowerCase() === primaryCampus.toLowerCase();
    const bIsPrimary = primaryCampus && b.shortName?.toLowerCase() === primaryCampus.toLowerCase();
    if (aIsPrimary && !bIsPrimary) return -1;
    if (!aIsPrimary && bIsPrimary) return 1;
    return (a.name || "").localeCompare(b.name || "");
  });

  const campusOptions = [
    ...sortedCampuses.map((camp) => ({
      key: camp.shortName,
      label: `${camp.name} (${camp.shortName})`,
    })),
    { key: "Semua", label: "Semua Kampus" },
  ];

  const changeCampus = (camp) => {
    setSelectedCampus(camp);
    localStorage.setItem("preferred_campus", camp);
    const matched = campuses.find((c) => c.shortName === camp);
    const nextProv = matched?.provinceId || activeProvince;
    if (nextProv) {
      setProfileProvince(nextProv);
      localStorage.setItem("preferred_province", nextProv);
    }
    setCampusDropdownOpen(false);
    window.dispatchEvent(new CustomEvent("campus:change", { detail: { campus: camp, province: nextProv } }));
    toast.success(`Kampus aktif: ${camp}`);
  };

  const isSubPage = pathname?.startsWith("/produk/") || pathname === "/jual" || pathname?.startsWith("/edit/") || pathname?.startsWith("/penjual/");
  
  const getSubPageTitle = () => {
    if (pathname?.startsWith("/produk/")) return "Detail Produk";
    if (pathname === "/jual") return "Jual Barang";
    if (pathname?.startsWith("/edit/")) return "Edit Barang";
    if (pathname?.startsWith("/penjual/")) return "Profil Penjual";
    return "Kampus Kita";
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/70 dark:border-white/[0.08] shadow-xs">
      {/* ── DESKTOP NAVBAR (Tinggi 64px — max-w-[1440px]) ── */}
      <div className="hidden xl:block max-w-[1440px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand Identity (Kiri) */}
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/" className="flex items-center gap-3 group focus-visible:outline-2 focus-visible:outline-emerald-600">
              <div className="w-9 h-9 rounded-xl bg-[#0a2e1f] text-[#bef264] flex items-center justify-center shadow-xs group-hover:bg-[#134e35] transition-colors">
                <svg className="w-5 h-5 text-[#bef264] stroke-[2.2]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 22V12h6v10" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">
                Kampus Kita
              </span>
            </Link>
          </div>

          <PrimaryNavigation variant="desktop" />

          {/* Right Controls */}
          <div className="flex items-center gap-2.5 shrink-0 whitespace-nowrap">
            {/* Kampus Switcher Dropdown */}
            <div className="relative group shrink-0" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setCampusDropdownOpen(!campusDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 rounded-full transition-colors border border-slate-200 dark:border-white/10 shadow-xs whitespace-nowrap focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span>
                  Kampus: <strong className="font-bold text-slate-900 dark:text-white">{selectedCampus}</strong>
                </span>
                <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 motion-safe:transition-transform motion-reduce:transition-none group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </button>

              {campusDropdownOpen && (
                <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200/80 dark:border-white/10 py-1.5 z-50 overflow-hidden">
                  {provinces.length > 0 && (
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-slate-900/50 flex items-center justify-between gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Daerah</span>
                      <select
                        aria-label="Pilih daerah provinsi"
                        value={activeProvince}
                        onChange={(e) => {
                          const newProv = e.target.value;
                          setProfileProvince(newProv);
                          localStorage.setItem("preferred_province", newProv);
                          const firstCamp = campuses.find((c) => (c.provinceId || "sumatera-utara") === newProv);
                          const nextCamp = firstCamp ? firstCamp.shortName : "Semua";
                          setSelectedCampus(nextCamp);
                          localStorage.setItem("preferred_campus", nextCamp);
                          window.dispatchEvent(new CustomEvent("campus:change", { detail: { campus: nextCamp, province: newProv } }));
                        }}
                        className="text-[11px] font-bold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5 outline-none cursor-pointer"
                      >
                        {provinces.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {campusOptions.map((camp) => (
                    <button
                      key={camp.key}
                      type="button"
                      onClick={() => changeCampus(camp.key)}
                      className={cn(
                        "w-full flex items-center justify-between px-3.5 py-2 text-xs transition-colors active:translate-y-px text-left",
                        selectedCampus === camp.key
                          ? "font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40"
                          : "font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      )}
                    >
                      <span className="truncate pr-2">{camp.label}</span>
                      {selectedCampus === camp.key && <span className="shrink-0 text-emerald-600 dark:text-emerald-400 font-bold">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link
              href="/chat"
              aria-label="Pesan dan obrolan"
              title="Pesan dan obrolan"
              className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#134e35] dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Icon.MessageCircle className="h-4 w-4" aria-hidden="true" />
              {unreadChat > 0 && session?.wa && (
                <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-[#bef264] ring-2 ring-white dark:ring-slate-800" />
              )}
            </Link>

            <Link
              href="/keranjang"
              aria-label={`Keranjang${cartCount ? `, ${cartCount} barang` : ""}`}
              title="Keranjang"
              className={cn(
                "relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors",
                pathname?.startsWith("/keranjang")
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/60"
              )}
            >
              <Icon.ShoppingCart className="h-4 w-4" />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-extrabold leading-none text-white shadow-sm">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>

            <div className="h-5 w-px bg-slate-200 dark:bg-white/10 shrink-0" />

            {/* Masuk / Profil */}
            {siap && session.wa ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 whitespace-nowrap text-slate-700 dark:text-slate-200"
                title="Buka Dashboard Akun"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-800 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                  {session.name ? session.name[0].toUpperCase() : "U"}
                </div>
                <span className="hidden md:inline-block text-xs font-bold text-slate-800 dark:text-slate-100">
                  {session.name || "Akun"}
                </span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setShowOtp(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 whitespace-nowrap text-slate-700 dark:text-slate-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50"
              >
                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 border border-slate-200/80 dark:border-white/10">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </div>
                <span className="hidden md:inline-block text-xs font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                  Masuk
                </span>
              </button>
            )}

            {/* Primary Action Button: + Jual Barang */}
            <Link
              href="/jual"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs rounded-full shadow-xs hover:shadow transition duration-150 shrink-0 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-emerald-600"
            >
              <svg className="w-3.5 h-3.5 text-emerald-300 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>+ Jual Barang</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── MOBILE TOP APP BAR (Tinggi 56px — h-14) ── */}
      <div className={cn("xl:hidden px-3 sm:px-4 flex items-center justify-between gap-2.5", isSubPage ? "h-14" : "min-h-14 py-1.5")}>
        {isSubPage ? (
          /* Sub/Detail Pages: Back + Centered Title + Share/Action */
          <>
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Kembali"
              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:translate-y-px transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50"
            >
              <Icon.ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <h1 className="text-sm font-bold text-slate-900 dark:text-white truncate flex-1 text-center">
              {getSubPageTitle()}
            </h1>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setCariTerbuka(true)}
                aria-label="Cari"
                className="h-11 w-11 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:translate-y-px transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50"
              >
                <Icon.Search className="w-4 h-4" aria-hidden="true" />
              </button>
              <Link
                href="/keranjang"
                aria-label={`Keranjang${cartCount ? `, ${cartCount} barang` : ""}`}
                className="relative h-11 w-11 rounded-full flex items-center justify-center text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40 active:translate-y-px transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600"
              >
                <Icon.ShoppingCart className="w-4 h-4" aria-hidden="true" />
                {cartCount > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-extrabold leading-none text-white shadow-xs">{cartCount > 99 ? "99+" : cartCount}</span>}
              </Link>
              <Link
                href="/jual"
                aria-label="Jual Barang"
                className="h-11 w-11 rounded-full bg-[#134e35] text-white flex items-center justify-center shadow-xs active:translate-y-px transition-colors focus-visible:outline-2 focus-visible:outline-[#134e35]"
              >
                <Icon.Plus className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
              </Link>
            </div>
          </>
        ) : (
          /* Root Pages: Brand + campus selector + actions */
          <>
            <div className="flex items-center gap-2 min-w-0">
              <Link href="/" aria-label="Kampus Kita - Beranda" className="h-9 w-9 rounded-xl bg-[#0a2e1f] text-white flex items-center justify-center shrink-0 shadow-xs focus-visible:outline-2 focus-visible:outline-[#134e35]">
                <Icon.GraduationCap className="w-4.5 h-4.5 text-[#bef264]" aria-hidden="true" />
              </Link>
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="flex flex-col text-sm font-extrabold leading-[0.95] tracking-tight text-slate-900 dark:text-white">
                  <span>Kampus</span>
                  <span>Kita</span>
                </span>
                <div className="relative hidden min-[380px]:flex items-center" ref={mobileDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setCampusDropdownOpen(!campusDropdownOpen)}
                    aria-label={`Pilih kampus, saat ini ${selectedCampus === "Semua" ? "Semua kampus" : selectedCampus}`}
                    aria-expanded={campusDropdownOpen}
                    className="inline-flex min-h-11 items-center gap-1 rounded-full border border-emerald-600/20 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 active:translate-y-px transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50"
                  >
                    <span>{selectedCampus === "Semua" ? "Semua" : selectedCampus}</span>
                    <svg className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                    </svg>
                  </button>
                  {campusDropdownOpen && (
                    <div className="absolute left-0 top-full z-[60] mt-1 w-56 rounded-2xl border border-slate-200/80 bg-white py-1.5 shadow-xl dark:border-white/10 dark:bg-slate-800 overflow-hidden">
                      {provinces.length > 0 && (
                        <div className="px-3 py-2 border-b border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-slate-900/50 flex items-center justify-between gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Daerah</span>
                          <select
                            aria-label="Pilih daerah provinsi"
                            value={activeProvince}
                            onChange={(e) => {
                              const newProv = e.target.value;
                              setProfileProvince(newProv);
                              localStorage.setItem("preferred_province", newProv);
                              const firstCamp = campuses.find((c) => (c.provinceId || "sumatera-utara") === newProv);
                              const nextCamp = firstCamp ? firstCamp.shortName : "Semua";
                              setSelectedCampus(nextCamp);
                              localStorage.setItem("preferred_campus", nextCamp);
                              window.dispatchEvent(new CustomEvent("campus:change", { detail: { campus: nextCamp, province: newProv } }));
                            }}
                            className="text-[11px] font-bold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5 outline-none cursor-pointer"
                          >
                            {provinces.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      {campusOptions.map((camp) => (
                        <button
                          key={camp.key}
                          type="button"
                          onClick={() => changeCampus(camp.key)}
                          className={cn(
                            "flex w-full items-center justify-between px-3.5 py-2 text-left text-xs transition-colors active:translate-y-px",
                            selectedCampus === camp.key
                              ? "bg-emerald-50/80 font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/50"
                          )}
                        >
                          <span className="truncate pr-2">{camp.label}</span>
                          {selectedCampus === camp.key && <span className="shrink-0 text-emerald-600 dark:text-emerald-400 font-bold">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setCariTerbuka(true)}
                aria-label="Cari"
                className="h-11 w-11 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:translate-y-px focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50"
              >
                <Icon.Search className="w-4 h-4" aria-hidden="true" />
              </button>
              <Link
                href="/keranjang"
                aria-label={`Keranjang${cartCount ? `, ${cartCount} barang` : ""}`}
                className="relative h-11 w-11 rounded-full flex items-center justify-center text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40 transition-colors active:translate-y-px focus-visible:outline-2 focus-visible:outline-emerald-600"
              >
                <Icon.ShoppingCart className="w-4 h-4" aria-hidden="true" />
                {cartCount > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-extrabold leading-none text-white shadow-xs">{cartCount > 99 ? "99+" : cartCount}</span>}
              </Link>
              <Link
                href="/chat"
                aria-label="Pesan & Obrolan"
                className="relative h-11 w-11 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:translate-y-px focus-visible:outline-2 focus-visible:outline-emerald-600"
              >
                <Icon.MessageCircle className="w-4 h-4" aria-hidden="true" />
                {unreadChat > 0 && Boolean(session?.wa) && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-600 ring-2 ring-white dark:ring-slate-900" />
                )}
              </Link>
              {siap && session.wa ? (
                <Link
                  href="/dashboard"
                  aria-label="Dashboard Akun"
                  className="h-11 w-11 rounded-full bg-[#134e35] text-white flex items-center justify-center text-xs font-bold shadow-xs active:translate-y-px transition-colors focus-visible:outline-2 focus-visible:outline-[#134e35]"
                >
                  {session.name ? session.name[0].toUpperCase() : "U"}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowOtp(true)}
                  aria-label="Masuk Akun"
                  className="h-11 w-11 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center active:translate-y-px transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50"
                >
                  <Icon.User className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <QuickSearchSheet isOpen={cariTerbuka} onClose={() => setCariTerbuka(false)} />
      <OTPModal
        isOpen={showOtp}
        onClose={() => setShowOtp(false)}
        onSuccess={() => {
          setShowOtp(false);
          segarkan();
          router.refresh();
        }}
      />
    </header>
  );
}
