"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CATEGORIES, formatWa, MARKETPLACE_WA } from "@/lib/constants";
import { rupiah } from "@/lib/fees";
import { Icon } from "@/components/Icons";
import QRISModal from "@/components/QRISModal";
import { toast } from "sonner";
import { useSesi } from "@/components/SesiProvider";

export default function DicariPage({ initialItems = [] }) {
  const { wa: sesiWa } = useSesi();
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [cats, setCats] = useState(CATEGORIES);
  const [loading, setLoading] = useState(initialItems.length === 0);
  const [error, setError] = useState("");

  // Filters
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [campus, setCampus] = useState("Semua");
  const [campuses, setCampuses] = useState([]);

  // Form modal
  const [showModal, setShowModal] = useState(false);
  const [qrisModal, setQrisModal] = useState(null);
  const postingDialogRef = useRef(null);
  const paymentDialogRef = useRef(null);
  const previousModalFocusRef = useRef(null);

  // Dibuka dari tombol "Buat" di dock bawah: /rute?tulis=1 langsung
  // membuka form, jadi pengguna tidak perlu mencari tombolnya di halaman.
  useEffect(() => {
    fetch("/api/kampus", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (Array.isArray(d?.campuses)) setCampuses(d.campuses);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tulis") === "1") {
      setShowModal(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const dialog = showModal
      ? postingDialogRef.current
      : qrisModal
      ? paymentDialogRef.current
      : null;
    if (!dialog) return;

    previousModalFocusRef.current = document.activeElement;
    const focusable = Array.from(
      dialog.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
    focusable[0]?.focus();

    function handleDialogKeyDown(event) {
      if (event.key === "Escape") {
        if (showModal) setShowModal(false);
        else setQrisModal(null);
        return;
      }

      if (event.key !== "Tab" || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleDialogKeyDown);
    return () => {
      document.removeEventListener("keydown", handleDialogKeyDown);
      if (previousModalFocusRef.current?.isConnected) {
        previousModalFocusRef.current.focus?.();
      }
    };
  }, [showModal, qrisModal]);
  const [activeQrisUrl, setActiveQrisUrl] = useState("");
  const [activeQrisFee, setActiveQrisFee] = useState(0);
  const [activeQrisOrderId, setActiveQrisOrderId] = useState("");
  const [form, setForm] = useState({
    buyer_name: "",
    buyer_wa: "",
    title: "",
    description: "",
    budget: "",
    category: CATEGORIES[0].name,
    campus: "Semua",
    area: "",
    item_condition: "Bekas",
  });
  const [submitting, setSubmitting] = useState(false);
  const [manualOrderId, setManualOrderId] = useState(null);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualFile, setManualFile] = useState(null);
  const [manualError, setManualError] = useState("");
  const [unlockResult, setUnlockResult] = useState(null);

  // Budget masking
  const [budgetRaw, setBudgetRaw] = useState("");

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => {
        if (d?.categories?.length) setCats(d.categories);
      })
      .catch(() => {});
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (cat !== "all") params.set("cat", cat);
      if (campus !== "Semua") params.set("campus", campus);
      if (q) params.set("q", q);

      const res = await fetch(`/api/wanted?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat data");
      setItems(data.listings || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, campus]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems();
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const handleInputChange = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  const submitWanted = async (e) => {
    e.preventDefault();
    const formattedWa = formatWa(form.buyer_wa);
    if (!form.buyer_name || !formattedWa || !form.title || !form.category) {
      toast.error("Lengkapi nama, WA, judul, dan kategori.");
      return;
    }
    setSubmitting(true);
    try {
      const finalDesc = `[Kondisi: ${form.item_condition}]\n${form.description || ""}`;
      const res = await fetch("/api/wanted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, description: finalDesc, buyer_wa: formattedWa }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengirim postingan");

      // Save WA to localStorage for seller/buyer convenience
      localStorage.setItem("seller_wa", formattedWa);

      // Reset & close
      setBudgetRaw("");
      setAreaMode("dropdown");
      setForm({
        buyer_name: "",
        buyer_wa: formattedWa, // Keep WA for next time
        title: "",
        description: "",
        budget: "",
        category: cats[0].name,
        campus: "Semua",
        area: "",
        item_condition: "Bekas",
      });
      if (data.isFree) {
        toast.success("Postingan dicari berhasil ditayangkan! (Gratis via kuota 3 kali posting pertama)");
      } else {
        toast.success("Postingan dicari berhasil dibuat! Silakan selesaikan pembayaran Rp 1.000 agar postingan aktif.");
      }
      setShowModal(false);
      if (data.paymentUrl) {
        setActiveQrisUrl(data.paymentUrl);
        setActiveQrisFee(data.amount || 1000);
        setActiveQrisOrderId(data.orderId || "");
      } else {
        fetchItems();
      }
    } catch (err) {
      if (err.message !== "Unauthorized") {
        toast.error(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-[calc(7rem+env(safe-area-inset-bottom))]">
      {/* Header Section with Heroic Micro-Stats (14.html blueprint) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200/80 dark:border-white/10 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-[#047857] dark:bg-emerald-950/60 dark:text-emerald-400 text-xs font-bold inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#047857] animate-pulse"></span>
              WTB Hub • Permintaan Barang Kampus
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Dicari Mahasiswa (WTB Hub)
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              Lagi butuh barang mendesak untuk kuliah, praktikum, atau kosan? Pasang permintaanmu di sini — penjual mahasiswa yang punya barang langsung menghubungi kamu tanpa perantara calo.
            </p>
          </div>

          <button
            onClick={() => {
              const savedWa = sesiWa || "";
              setForm((f) => ({ ...f, buyer_wa: savedWa }));
              setShowModal(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#047857] hover:bg-[#065F46] text-white text-xs sm:text-sm font-bold shadow-sm transition active:scale-95 shrink-0"
          >
            <Icon.PlusCircle className="w-4 h-4" />
            <span>+ Posting Kebutuhan WTB</span>
          </button>
        </div>

        {/* Live Alert Banner */}
        <div className="mt-6 flex items-center gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 text-xs">
          <Icon.AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Musim Laprak &amp; Sidang:</strong> WTB perlengkapan praktikum dan modul buku kuliah meningkat minggu ini. Cek barang tak terpakai di kosanmu untuk ditawarkan!
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* Search */}
        <div className="relative min-w-0 flex-1">
          <svg
            className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Cari kebutuhan mahasiswa"
            placeholder="Cari kebutuhan..."
            className="w-full rounded-full border border-gray-200 bg-white py-1.5 pl-9 pr-3 text-xs text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-900/5 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
          />
        </div>

        {/* Campus Filter */}
        <select
          value={campus}
          onChange={(e) => setCampus(e.target.value)}
          aria-label="Filter berdasarkan kampus"
          className="shrink-0 cursor-pointer rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
        >
          <option value="Semua">Semua Kampus</option>
          {campuses.map((item) => (
            <option key={item.shortName} value={item.shortName}>{item.shortName}</option>
          ))}
        </select>

        {/* Category Filter */}
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          aria-label="Filter berdasarkan kategori"
          className="shrink-0 cursor-pointer rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
        >
          <option value="all">Semua Kategori</option>
          {cats.map((c) => (
            <option key={c.slug} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* 12-Column Main Layout matching SCREEN_11 */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Core WTB Feed (Left / 8-Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                Daftar Kebutuhan Mahasiswa
              </span>
              {!loading && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#047857] dark:bg-emerald-950/60 dark:text-emerald-400 font-bold text-[11px]">
                  {items.length} Menunggu Penawaran
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400 hidden sm:inline">Diperbarui realtime</span>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card animate-pulse p-2.5 sm:p-4 space-y-2 sm:space-y-3 bg-white dark:border-slate-800 dark:bg-slate-900/30 rounded-xl sm:rounded-2xl">
                  <div className="h-3 w-1/3 rounded bg-gray-100 dark:bg-slate-800" />
                  <div className="h-4 w-3/4 rounded bg-gray-100 dark:bg-slate-800" />
                  <div className="h-2.5 w-5/6 rounded bg-gray-100 dark:bg-slate-800" />
                  <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-slate-700" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center text-rose-500 py-10">{error}</div>
          ) : items.length === 0 ? (
            <div className="card grid place-items-center py-12 text-center text-gray-400 bg-white dark:bg-slate-900 rounded-2xl">
              <Icon.Package className="h-12 w-12 text-gray-300 dark:text-slate-600 mb-2" />
              <p className="mt-2 text-sm font-semibold text-gray-700 dark:text-slate-200">
                Belum ada kebutuhan di filter ini.
              </p>
              <p className="mt-1 max-w-sm text-xs text-gray-400 dark:text-slate-500">
                Posting kebutuhanmu sekarang — gratis dan langsung dilihat oleh penjual mahasiswa lainnya.
              </p>
              <button
                onClick={() => {
                  const savedWa = sesiWa || "";
                  setForm((f) => ({ ...f, buyer_wa: savedWa }));
                  setShowModal(true);
                }}
                className="mt-4 px-5 py-2.5 rounded-full bg-[#047857] hover:bg-[#065F46] text-white text-xs font-bold shadow-sm transition active:scale-95"
              >
                + Posting Kebutuhan Pertama
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {items.map((item) => {
                const condMatch = item.description?.match(/^\[Kondisi:\s*(Baru|Bekas)\]\n?/i);
                const itemCondition = condMatch ? condMatch[1] : null;
                const cleanDesc = condMatch ? item.description.replace(condMatch[0], "") : item.description;
                const isUrgent = (item.title || "").toLowerCase().includes("mendesak") || (item.title || "").toLowerCase().includes("urgent") || (item.category || "").toLowerCase().includes("praktikum");

                return (
                  <article
                    key={item.id}
                    className={`card flex flex-col justify-between p-3 sm:p-4 bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200/80 dark:border-white/10 hover:shadow-md transition-all relative overflow-hidden ${
                      isUrgent ? "border-l-3 border-l-rose-500" : ""
                    } ${item.status === "resolved" ? "opacity-60 grayscale-[30%]" : ""}`}
                  >
                    <div>
                      {/* Top Badges & Budget */}
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1 flex-wrap min-w-0">
                          {isUrgent && (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 text-[8px] font-bold shrink-0">
                              🚨 Mendesak
                            </span>
                          )}
                          <span className="badge bg-emerald-50 text-[#047857] dark:bg-emerald-950/40 dark:text-emerald-400 font-bold text-[8px] px-1 py-0.2 shrink-0">
                            {item.category}
                          </span>
                        </div>
                        <span className="font-extrabold text-[#047857] dark:text-emerald-400 text-[10px] sm:text-xs shrink-0 tracking-tight">
                          {item.budget > 0 ? rupiah(item.budget) : "Nego"}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-900 dark:text-white leading-snug text-xs sm:text-sm line-clamp-2">
                        {item.title}
                      </h3>

                      <div className="mt-2 flex items-center gap-1 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                        <Icon.MapPin className="h-2.5 w-2.5 shrink-0 text-[#047857]" />
                        <span className="truncate">{item.campus} · {item.area || "Kampus"}</span>
                      </div>

                      <p className="mt-1 text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-1">
                        {cleanDesc}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setManualOrderId(null);
                        setManualFile(null);
                        setManualError("");
                        setUnlockResult(null);
                        setQrisModal(item);
                        fetch("/api/payments/unlock-wanted", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ wanted_id: item.id, check: true }),
                        })
                          .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
                          .then(({ ok, d }) => { if (!ok) setManualError(d.error || "Kontak postingan ini belum bisa dibuka."); })
                          .catch(() => {});
                      }}
                      className="w-full mt-2 py-1 px-1.5 rounded-lg bg-slate-100 hover:bg-[#047857] text-slate-700 hover:text-white dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-[#047857] dark:hover:text-white text-[10px] sm:text-xs font-bold transition flex items-center justify-center gap-1 active:scale-95"
                    >
                      <Icon.MessageCircle className="h-3 w-3 shrink-0" />
                      <span className="truncate">Tawari Barang</span>
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Sticky Sidebar (4-Cols on Desktop) */}
        <aside className="hidden lg:flex lg:col-span-4 flex-col gap-4 sticky top-20">
          {/* CTA Box */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-xs border border-slate-200/80 dark:border-white/10 flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] dark:bg-emerald-950/60 text-[#047857] flex items-center justify-center">
              <Icon.ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Cari Kebutuhan Kuliah?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Posting barang yang kamu cari. Mahasiswa yang punya barang akan langsung menghubungimu.
              </p>
            </div>
            <button
              onClick={() => {
                const savedWa = sesiWa || "";
                setForm((f) => ({ ...f, buyer_wa: savedWa }));
                setShowModal(true);
              }}
              className="w-full py-2.5 rounded-xl bg-[#047857] hover:bg-[#065F46] text-white text-xs font-bold shadow-xs transition active:scale-95 text-center"
            >
              + Posting Kebutuhan (100% Gratis)
            </button>
          </div>

          {/* Tips COD Aman */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-xs border border-slate-200/80 dark:border-white/10 flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
              <Icon.ShieldCheck className="w-4 h-4 text-[#047857]" />
              <span>Protokol Keamanan WTB</span>
            </div>
            <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5 list-disc list-inside">
              <li>Pilih titik COD ramai di kampus (Pendopo / Kantin).</li>
              <li>Periksa fisik &amp; fungsi barang sebelum membayar.</li>
              <li>Jangan pernah transfer uang muka (DP) duluan.</li>
              <li>Pastikan identitas stambuk penjual sesuai.</li>
            </ul>
          </div>

          {/* Permintaan Populer */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-xs border border-slate-200/80 dark:border-white/10 flex flex-col gap-2.5">
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Paling Sering Dicari:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {["Papan LED Laprak", "Buku Kalkulus Purcell", "Jas Lab Kimia", "Kosan Pintu 2", "Laptop Core i5"].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setQ(tag)}
                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-[11px] font-medium transition"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Posting Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div ref={postingDialogRef} role="dialog" aria-modal="true" aria-labelledby="wanted-dialog-title" className="card w-full max-w-lg bg-white p-6 shadow-2xl dark:bg-slate-900 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-slate-800">
              <h2 id="wanted-dialog-title" className="text-lg font-bold text-gray-900 dark:text-white">Posting Barang</h2>
              <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600" aria-label="Tutup"><Icon.X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={submitWanted} className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="floating-group">
                  <input
                    id="wanted-buyer-name"
                    className="floating-input peer"
                    value={form.buyer_name}
                    onChange={handleInputChange("buyer_name")}
                    placeholder=" "
                    required
                  />
                  <label htmlFor="wanted-buyer-name" className="floating-label">Nama Lengkap</label>
                </div>
                <div className="floating-group">
                  <input
                    id="wanted-buyer-wa"
                    className="floating-input peer"
                    value={form.buyer_wa}
                    onChange={handleInputChange("buyer_wa")}
                    placeholder=" "
                    required
                  />
                  <label htmlFor="wanted-buyer-wa" className="floating-label">No. WhatsApp</label>
                </div>
              </div>

              <div className="floating-group">
                <input
                  id="wanted-title"
                  className="floating-input peer"
                  value={form.title}
                  onChange={handleInputChange("title")}
                  placeholder=" "
                  required
                />
                <label htmlFor="wanted-title" className="floating-label">Barang/Jasa yang Dicari</label>
              </div>

              <div className="floating-group">
                <textarea
                  id="wanted-desc"
                  className="floating-input peer min-h-20"
                  value={form.description}
                  onChange={handleInputChange("description")}
                  placeholder=" "
                />
                <label htmlFor="wanted-desc" className="floating-label">Deskripsi detail (kondisi, spek, dll)</label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Budget with masking */}
                <div className="floating-group">
                  <input
                    id="wanted-budget"
                    type="text"
                    inputMode="numeric"
                    className="floating-input peer"
                    value={budgetRaw}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setBudgetRaw(raw ? Number(raw).toLocaleString("id-ID") : "");
                      setForm((f) => ({ ...f, budget: raw || "" }));
                    }}
                    placeholder=" "
                  />
                  <label htmlFor="wanted-budget" className="floating-label">Budget Maks (Rp) — kosongkan jika nego</label>
                </div>
                <div>
                  <label htmlFor="wanted-category" className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">Kategori</label>
                  <select
                    id="wanted-category"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-medium text-gray-800 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    value={form.category}
                    onChange={handleInputChange("category")}
                  >
                    {cats.map((c) => (
                      <option key={c.slug} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="wanted-campus" className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">Target Kampus</label>
                  <select
                    id="wanted-campus"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-medium text-gray-800 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    value={form.campus}
                    onChange={handleInputChange("campus")}
                  >
                    <option value="Semua">Semua Kampus</option>
                    {campuses.map((item) => (
                      <option key={item.shortName} value={item.shortName}>{item.shortName} — {item.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="wanted-condition" className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">Kondisi Barang</label>
                  <select
                    id="wanted-condition"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-medium text-gray-800 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    value={form.item_condition}
                    onChange={handleInputChange("item_condition")}
                  >
                    <option value="Bekas">Bekas (Second)</option>
                    <option value="Baru">Baru (New)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="wanted-area" className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1">Area COD</label>
                  <input
                    id="wanted-area"
                    type="text"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-medium text-gray-800 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    value={form.area}
                    onChange={handleInputChange("area")}
                    placeholder="Contoh: area kampus atau lokasi umum"
                  />
                </div>
              </div>
                <Icon.X className="h-5 w-5" />
              <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex gap-2 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline px-4 py-2 text-xs">Batal</button>
                <button type="submit" disabled={submitting} className="btn-primary px-5 py-2 text-xs">{submitting ? "Mengirim..." : "Post Kebutuhan"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Buka Kontak — Transfer Manual */}
      {qrisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div ref={paymentDialogRef} role="dialog" aria-modal="true" aria-labelledby="wanted-payment-title" className="card w-full max-w-sm bg-white p-6 shadow-2xl dark:bg-slate-900 animate-fade-in my-8">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-slate-800">
              <h2 id="wanted-payment-title" className="text-base font-extrabold text-gray-900 dark:text-white">
                Buka Kontak (Transfer Manual)
              </h2>
              <button
                type="button"
                onClick={() => setQrisModal(null)}
                aria-label="Tutup pembayaran"
                className="text-gray-400 hover:text-gray-600"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="inline-block h-[1em] w-[1em] shrink-0 align-[-0.125em] fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {unlockResult?.pending ? (
              <div className="mt-4 text-center">
                <div className="p-3 rounded-xl bg-green-50 text-green-700 text-sm font-bold border border-green-200 dark:bg-green-900/20 dark:border-green-800/50 dark:text-green-400">
                   Pembayaran diterima!
                </div>
                <p className="mt-3 text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                  Nomor pembeli untuk postingan ini sedang diproses admin dan akan dikirim ke WhatsApp Anda segera. Mohon tunggu ya.
                </p>
                <button
                  onClick={() => setQrisModal(null)}
                  className="btn-outline w-full mt-4 py-2.5 text-xs font-bold bg-white hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-900 rounded-lg"
                >
                  Tutup
                </button>
              </div>
            ) : unlockResult ? (
              <div className="mt-4 text-center">
                <div className="p-3 rounded-xl bg-green-50 text-green-700 text-sm font-bold border border-green-200 dark:bg-green-900/20 dark:border-green-800/50 dark:text-green-400">
                   Struk valid! Pembayaran dikonfirmasi AI.
                </div>

                <div className="mt-4 border border-gray-100 dark:border-slate-800/80 rounded-xl divide-y divide-gray-100 dark:divide-slate-800 text-left text-xs">
                  <div className="p-3 flex justify-between gap-4">
                    <span className="text-gray-400 dark:text-slate-500">Nama Pembeli</span>
                    <span className="font-bold text-gray-700 dark:text-slate-300">{unlockResult.buyer_name}</span>
                  </div>
                  <div className="p-3 flex justify-between gap-4">
                    <span className="text-gray-400 dark:text-slate-500">No. WhatsApp</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 select-all">{unlockResult.buyer_wa}</span>
                  </div>
                </div>

                <p className="mt-2 text-[10px] text-gray-400 dark:text-slate-500">
                  Simpan nomor ini sebelum menutup jendela.
                </p>

                <div className="mt-4 space-y-2">
                  <a
                    href={`https://wa.me/${unlockResult.buyer_wa.startsWith("0") ? "62" + unlockResult.buyer_wa.slice(1) : unlockResult.buyer_wa}?text=${encodeURIComponent(
                      `Halo ${unlockResult.buyer_name}, saya lihat postingan Anda mencari "${unlockResult.title}". Saya ada barangnya.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary w-full py-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Icon.MessageCircle className="h-4 w-4" /><span>Chat Pembeli Sekarang</span>
                  </a>
                  <button
                    onClick={() => setQrisModal(null)}
                    className="btn-outline w-full py-2.5 text-xs font-bold bg-white hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-900 rounded-lg"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Scan QR Code di bawah untuk membayar Rp 2.000, lalu upload struk transfernya — AI kami langsung verifikasi otomatis.
                </p>

                <div className="mt-4 flex justify-center">
                  <div className="rounded-xl border-4 border-emerald-100 p-2 dark:border-emerald-900/50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/qris.png"
                      alt="QRIS Admin"
                      className="w-48 h-48 object-cover rounded-lg"
                    />
                  </div>
                </div>

                <div className="mt-4 bg-gray-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-gray-100 dark:border-slate-800">
                  <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Total Pembayaran</p>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">Rp 2.000</p>
                </div>

                <div className="mt-4 text-left">
                  <label htmlFor="wanted-payment-proof" className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                    <span className="inline-flex items-center gap-1.5"><Icon.Camera className="h-4 w-4" /> Upload Bukti Transfer</span>
                  </label>
                  <input
                    id="wanted-payment-proof"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setManualFile(e.target.files[0]);
                        setManualError("");
                      }
                    }}
                    disabled={manualLoading}
                    className="block w-full text-xs text-slate-500
                      file:mr-3 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-xs file:font-semibold
                      file:bg-primary/10 file:text-primary
                      hover:file:bg-primary/20
                      dark:file:bg-primary/20 dark:file:text-primary-light
                      cursor-pointer"
                  />
                </div>

                {manualError && (
                  <div className="mt-3 p-3 rounded-lg bg-red-50 text-red-600 text-xs text-left border border-red-100 dark:bg-red-900/20 dark:border-red-800/50">
                    <span className="inline-flex items-center gap-1.5"><Icon.X className="h-4 w-4" /> {manualError}</span>
                  </div>
                )}

                <div className="mt-4 space-y-2">
                  <button
                    onClick={async () => {
                      if (!manualFile) {
                        setManualError("Mohon pilih gambar struk transfer Anda terlebih dahulu.");
                        return;
                      }
                      setManualLoading(true);
                      setManualError("");
                      try {
                        // Terbitkan tagihannya sekarang — atau pakai lagi yang
                        // sudah terbit kalau struk sebelumnya ditolak AI, supaya
                        // percobaan kedua tidak menambah baris baru.
                        let orderId = manualOrderId;
                        if (!orderId) {
                          const inv = await fetch("/api/payments/unlock-wanted", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              wanted_id: qrisModal.id,
                              method: "manual",
                              requester_wa: sesiWa || "",
                            }),
                          }).then((r) => r.json());
                          if (!inv.orderId) throw new Error(inv.error || "Gagal membuat transaksi");
                          orderId = inv.orderId;
                          setManualOrderId(orderId);
                        }

                        const formData = new FormData();
                        formData.append("receipt", manualFile);
                        formData.append("transactionId", orderId);

                        const res = await fetch("/api/payments/verify-receipt", {
                          method: "POST",
                          body: formData,
                        });
                        const data = await res.json();
                        if (!res.ok || !data.success) throw new Error(data.error || "Gagal memverifikasi struk.");

                        if (data.unlock) {
                          setUnlockResult(data.unlock);
                        } else {
                          toast.success("Pembayaran terverifikasi! Kontak pembeli dikirim ke WhatsApp Anda.");
                          setQrisModal(null);
                        }
                      } catch (err) {
                        setManualError(err.message);
                      } finally {
                        setManualLoading(false);
                      }
                    }}
                    disabled={!manualFile || manualLoading}
                    className="btn-primary w-full py-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {manualLoading ? (
                      <>
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        AI Sedang Membaca Struk...
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1.5"><Icon.Rocket className="h-4 w-4" /> Kirim &amp; Verifikasi AI</span>
                    )}
                  </button>
                  <button
                    onClick={() => setQrisModal(null)}
                    disabled={manualLoading}
                    className="btn-outline w-full py-2.5 text-xs font-bold bg-white hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-900 rounded-lg flex items-center justify-center gap-1.5"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <QRISModal
        qrisUrl={activeQrisUrl} 
        fee={activeQrisFee} 
        transactionId={activeQrisOrderId}
        onClose={() => {
          setActiveQrisUrl("");
          router.push(`/dashboard?pending=1&wa=${encodeURIComponent(form.buyer_wa || sesiWa || "")}`);
        }} 
        onSuccess={() => {
          setActiveQrisUrl("");
          router.push(`/dashboard?paid=1&wa=${encodeURIComponent(form.buyer_wa || sesiWa || "")}`);
        }}
      />
    </div>
  );
}
