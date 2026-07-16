"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CATEGORIES, POPULAR_AREAS, formatWa, MARKETPLACE_WA } from "@/lib/constants";
import { rupiah } from "@/lib/fees";
import { Icon } from "@/components/Icons";
import QRISModal from "@/components/QRISModal";
import { toast } from "sonner";

export default function DicariPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState(CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [campus, setCampus] = useState("Semua");

  // Form modal
  const [showModal, setShowModal] = useState(false);
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
  const [qrisModal, setQrisModal] = useState(null);
  const [manualWa, setManualWa] = useState("");
  const [manualStep, setManualStep] = useState(1);
  const [manualOrderId, setManualOrderId] = useState(null);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualFile, setManualFile] = useState(null);
  const [manualError, setManualError] = useState("");
  const [unlockResult, setUnlockResult] = useState(null);

  // Budget masking
  const [budgetRaw, setBudgetRaw] = useState("");
  // Area dropdown
  const [areaMode, setAreaMode] = useState("dropdown"); // "dropdown" | "manual"

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
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Hero compact */}
      <section className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/20">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Gratis · Penjual datang ke kamu</p>
          <h1 className="mt-0.5 text-sm font-extrabold tracking-tight text-gray-900 dark:text-white">
            Cari Barang{!loading && items.length > 0 && <span className="ml-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">· {items.length} aktif</span>}
          </h1>
        </div>
        <button
          onClick={() => {
            const savedWa = localStorage.getItem("seller_wa") || "";
            setForm((f) => ({ ...f, buyer_wa: savedWa }));
            setShowModal(true);
          }}
          className="shrink-0 whitespace-nowrap rounded-full bg-gray-900 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-gray-700 dark:bg-white dark:text-gray-900"
        >
          + Posting
        </button>
      </section>

      {/* Filter Bar */}
      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* Search */}
        <div className="relative min-w-[140px] flex-1">
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
            placeholder="Cari kebutuhan..."
            className="w-full rounded-full border border-gray-200 bg-white py-1.5 pl-9 pr-3 text-xs text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-900/5 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
          />
        </div>

        {/* Campus Filter */}
        <select
          value={campus}
          onChange={(e) => setCampus(e.target.value)}
          className="shrink-0 cursor-pointer rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-350"
        >
          <option value="Semua">Semua Kampus</option>
          <option value="USU">USU</option>
          <option value="POLMED">POLMED</option>
        </select>

        {/* Category Filter */}
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="shrink-0 cursor-pointer rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-350"
        >
          <option value="all">Semua Kategori</option>
          {cats.map((c) => (
            <option key={c.slug} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card animate-pulse p-3 sm:p-5 space-y-3 bg-white dark:border-slate-805 dark:bg-slate-900/30">
              <div className="h-4 w-1/4 rounded bg-gray-150 dark:bg-slate-800" />
              <div className="h-5 w-3/4 rounded bg-gray-150 dark:bg-slate-800" />
              <div className="h-3 w-5/6 rounded bg-gray-150 dark:bg-slate-800" />
              <div className="h-4.5 w-1/3 rounded bg-gray-200 dark:bg-slate-700" />
              <div className="h-9 rounded bg-gray-150 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="mt-8 text-center text-rose-500 py-10">{error}</div>
      ) : items.length === 0 ? (
        <div className="mt-8">
          <div className="card grid place-items-center py-12 text-center text-gray-400">
            <Icon.Package className="h-12 w-12 text-gray-300 dark:text-slate-600 mb-2" />
            <p className="mt-2 text-sm font-medium text-gray-600 dark:text-slate-300">
              Belum ada yang memposting kebutuhan di filter ini.
            </p>
            <p className="mt-1 max-w-sm text-xs text-gray-400 dark:text-slate-500">
              Jadi yang pertama — postinganmu bakal jadi paling atas dan dilihat
              semua penjual yang buka halaman ini.
            </p>
            <button
              onClick={() => {
                const savedWa = localStorage.getItem("seller_wa") || "";
                setForm((f) => ({ ...f, buyer_wa: savedWa }));
                setShowModal(true);
              }}
              className="btn-primary mt-4 px-5 py-2.5 text-xs"
            >
              Posting Kebutuhan Pertama — Gratis
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const condMatch = item.description?.match(/^\[Kondisi:\s*(Baru|Bekas)\]\n?/i);
            const itemCondition = condMatch ? condMatch[1] : null;
            const cleanDesc = condMatch ? item.description.replace(condMatch[0], "") : item.description;

            return (
              <div
                key={item.id}
                className={`card flex flex-col justify-between p-3 sm:p-5 bg-white hover:shadow-md transition-shadow dark:border-slate-800 dark:bg-slate-900/30 ${
                  item.status === "resolved" ? "opacity-60 grayscale-[30%]" : ""
                }`}
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-1 text-[9px] sm:text-xs text-gray-400 dark:text-slate-550">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="badge bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 font-medium truncate max-w-[80px] sm:max-w-none">
                        {item.category}
                      </span>
                      {itemCondition && (
                        <span className={`badge font-semibold ${
                          itemCondition.toLowerCase() === "baru"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                            : "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-350"
                        }`}>
                          {itemCondition}
                        </span>
                      )}
                    </div>
                  </div>
                  <h3 className="mt-1.5 sm:mt-2.5 font-bold text-gray-900 dark:text-white leading-snug text-xs sm:text-sm md:text-base line-clamp-2">
                    {item.title}
                  </h3>
                  <div className="mt-1.5 flex items-center gap-1 text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">
                    <Icon.MapPin className="h-3 w-3 shrink-0 text-gray-400 dark:text-slate-550" />
                    <span className="truncate">{item.campus} · {item.area}</span>
                  </div>
                  <p className="mt-2 text-[10px] sm:text-xs text-gray-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed line-clamp-2 sm:line-clamp-4">
                    {cleanDesc}
                  </p>
                </div>

                <div className="mt-3 sm:mt-5 pt-2 sm:pt-3 border-t border-gray-100 dark:border-slate-800/80">
                  <div className="flex items-center justify-between mb-2 sm:mb-3 text-[10px] sm:text-xs">
                    <span className="text-gray-400 dark:text-slate-500">Budget</span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400 truncate ml-1">
                      {item.budget > 0 ? rupiah(item.budget) : "Nego"}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      const savedWa = localStorage.getItem("seller_wa") || "";
                      setManualWa(savedWa);
                      setManualStep(1);
                      setManualOrderId(null);
                      setManualFile(null);
                      setManualError("");
                      setUnlockResult(null);
                      setQrisModal(item);
                    }}
                    className="btn-outline w-full py-1.5 sm:py-2.5 text-center flex items-center justify-center gap-1 text-[10px] sm:text-xs font-bold bg-gray-50/50 hover:bg-gray-100 dark:bg-slate-950 dark:hover:bg-slate-900 border-gray-200 dark:border-slate-850 rounded-lg"
                  >
                    <Icon.MessageCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> <span className="truncate">Tawarkan</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Posting Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-lg bg-white p-6 shadow-2xl dark:bg-slate-900 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Posting Barang</h2>
              <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-650">✕</button>
            </div>
            <form onSubmit={submitWanted} className="mt-4 space-y-4">
              {/* Form fields same as original */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="floating-group">
                  <input className="floating-input peer" value={form.buyer_name} onChange={handleInputChange("buyer_name")} placeholder=" " required />
                  <label className="floating-label">Nama Lengkap</label>
                </div>
                <div className="floating-group">
                  <input className="floating-input peer" value={form.buyer_wa} onChange={handleInputChange("buyer_wa")} placeholder=" " required />
                  <label className="floating-label">No. WhatsApp</label>
                </div>
              </div>
              <div className="floating-group">
                <input className="floating-input peer" value={form.title} onChange={handleInputChange("title")} placeholder=" " required />
                <label className="floating-label">Barang/Jasa yang Dicari</label>
              </div>
              <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex gap-2 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline px-4 py-2">Batal</button>
                <button type="submit" disabled={submitting} className="btn-primary px-5 py-2">{submitting ? "Mengirim..." : "Post"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Buka Kontak — Transfer Manual */}
      {qrisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="card w-full max-w-sm bg-white p-6 shadow-2xl dark:bg-slate-900 animate-fade-in my-8">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-slate-800">
              <h2 className="text-base font-extrabold text-gray-900 dark:text-white">
                Buka Kontak (Transfer Manual)
              </h2>
              <button
                type="button"
                onClick={() => setQrisModal(null)}
                className="text-gray-400 hover:text-gray-650"
              >
                ✕
              </button>
            </div>

            {manualStep === 1 ? (
              <div className="mt-4 space-y-4">
                <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                  Masukkan nomor WhatsApp Anda. Kontak pembeli akan dikirimkan otomatis ke nomor ini setelah transfer disetujui admin.
                </p>
                <div className="floating-group">
                  <input
                    id="manual-wa"
                    className="floating-input peer"
                    value={manualWa}
                    onChange={(e) => setManualWa(e.target.value)}
                    placeholder=" "
                    required
                  />
                  <label htmlFor="manual-wa" className="floating-label">No. WhatsApp Anda (e.g. 62812...)</label>
                </div>
                <div className="pt-2 flex gap-2 justify-end">
                  <button
                    onClick={() => setQrisModal(null)}
                    className="btn-outline px-4 py-2 text-xs"
                  >
                    Batal
                  </button>
                  <button
                    onClick={async () => {
                      if (!manualWa) {
                        toast.error("Nomor WhatsApp wajib diisi");
                        return;
                      }
                      setManualLoading(true);
                      try {
                        const res = await fetch("/api/payments/unlock-wanted", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            wanted_id: qrisModal.id,
                            method: "manual",
                            requester_wa: manualWa,
                          }),
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || "Gagal mencatat transaksi");

                        localStorage.setItem("seller_wa", manualWa);
                        setManualOrderId(data.orderId);
                        setManualStep(2);
                      } catch (e) {
                        toast.error(e.message);
                      } finally {
                        setManualLoading(false);
                      }
                    }}
                    disabled={manualLoading}
                    className="btn-primary px-4 py-2 text-xs flex items-center justify-center gap-1.5"
                  >
                    {manualLoading ? (
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      "Lanjut ke QRIS"
                    )}
                  </button>
                </div>
              </div>
            ) : unlockResult ? (
              <div className="mt-4 text-center">
                <div className="p-3 rounded-xl bg-green-50 text-green-700 text-sm font-bold border border-green-200 dark:bg-green-900/20 dark:border-green-800/50 dark:text-green-400">
                  🎉 Struk valid! Pembayaran dikonfirmasi AI.
                </div>

                <div className="mt-4 border border-gray-100 dark:border-slate-800/80 rounded-xl divide-y divide-gray-100 dark:divide-slate-850 text-left text-xs">
                  <div className="p-3 flex justify-between gap-4">
                    <span className="text-gray-400 dark:text-slate-500">Nama Pembeli</span>
                    <span className="font-bold text-gray-750 dark:text-slate-300">{unlockResult.buyer_name}</span>
                  </div>
                  <div className="p-3 flex justify-between gap-4">
                    <span className="text-gray-400 dark:text-slate-500">No. WhatsApp</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 select-all">{unlockResult.buyer_wa}</span>
                  </div>
                </div>

                <p className="mt-2 text-[10px] text-gray-400 dark:text-slate-500">
                  Kontak ini juga sudah dikirim ke WhatsApp Anda.
                </p>

                <div className="mt-4 space-y-2">
                  <a
                    href={`https://wa.me/${unlockResult.buyer_wa}?text=${encodeURIComponent(
                      `Halo ${unlockResult.buyer_name}, saya lihat postingan Anda mencari "${unlockResult.title}". Saya ada barangnya.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary w-full py-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <span>💬 Chat Pembeli Sekarang</span>
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
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                    📸 Upload Bukti Transfer
                  </label>
                  <input
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
                    ❌ {manualError}
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
                        const formData = new FormData();
                        formData.append("receipt", manualFile);
                        formData.append("transactionId", manualOrderId);

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
                      <span>🤖 Kirim &amp; Verifikasi AI</span>
                    )}
                  </button>
                  <button
                    onClick={() => setManualStep(1)}
                    disabled={manualLoading}
                    className="btn-outline w-full py-2.5 text-xs font-bold bg-white hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-900 rounded-lg flex items-center justify-center gap-1.5"
                  >
                    Kembali
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
          router.push(`/dashboard?pending=1&wa=${encodeURIComponent(form.buyer_wa || localStorage.getItem("seller_wa") || "")}`);
        }} 
        onSuccess={() => {
          setActiveQrisUrl("");
          router.push(`/dashboard?paid=1&wa=${encodeURIComponent(form.buyer_wa || localStorage.getItem("seller_wa") || "")}`);
        }}
      />
    </div>
  );
}
