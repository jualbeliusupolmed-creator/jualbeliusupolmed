"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CATEGORIES, POPULAR_AREAS, formatWa, MARKETPLACE_WA } from "@/lib/constants";
import { rupiah } from "@/lib/fees";
import { Icon } from "@/components/Icons";
import { toast } from "sonner";

export default function DicariPage() {
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
  const [offerModal, setOfferModal] = useState(null);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [qrisModal, setQrisModal] = useState(null);

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
        window.location.href = data.paymentUrl;
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

      {/* Cara kerja — 3 langkah */}

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

          {/* Contoh posting — supaya user baru tahu bentuk kontennya */}
          <p className="mt-6 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
            Contoh postingan yang biasa dicari mahasiswa
          </p>
          <div className="grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-3 opacity-75">
            {[
              { cat: "Elektronik", t: "Laptop bekas buat ngoding, RAM 8GB", b: "Budget Rp 3.500.000" },
              { cat: "Buku Kuliah", t: "Buku Purcell jilid 1", b: "Budget Rp 50.000" },
              { cat: "Kos", t: "Kos putri dekat Pintu 1", b: "Budget Rp 700.000/bln" },
            ].map((c, i) => (
              <div
                key={i}
                className="card p-3 sm:p-4 border-dashed bg-gray-50/50 dark:bg-slate-900/20 dark:border-slate-800"
              >
                <div className="flex items-center justify-between text-[9px] sm:text-[10px]">
                  <span className="badge bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 font-medium">
                    {c.cat}
                  </span>
                  <span className="text-gray-400 dark:text-slate-600 hidden xs:inline">Contoh</span>
                </div>
                <p className="mt-2 text-xs font-bold text-gray-750 dark:text-slate-300 line-clamp-2">{c.t}</p>
                <p className="mt-1 text-[10px] text-gray-400 dark:text-slate-550">{c.b}</p>
              </div>
            ))}
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
                  {/* Meta details */}
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
                      {item.status === "resolved" && (
                        <span className="badge bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 font-bold">
                          ✓ Terpenuhi
                        </span>
                      )}
                    </div>
                    <span>
                      {new Date(item.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="mt-1.5 sm:mt-2.5 font-bold text-gray-900 dark:text-white leading-snug text-xs sm:text-sm md:text-base line-clamp-2">
                    {item.title}
                  </h3>

                  {/* Location */}
                  <div className="mt-1.5 flex items-center gap-1 text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">
                    <Icon.MapPin className="h-3 w-3 shrink-0 text-gray-400 dark:text-slate-550" />
                    <span className="truncate" title={`${item.campus === "Semua" ? "USU/POLMED" : item.campus}${item.area ? ` (${item.area})` : ""}`}>
                      {item.campus === "Semua" ? "USU/POLMED" : item.campus}
                      {item.area ? ` · ${item.area}` : ""}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="mt-2 text-[10px] sm:text-xs text-gray-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed line-clamp-2 sm:line-clamp-4">
                    {cleanDesc || "Tidak ada deskripsi detail."}
                  </p>
                </div>

                <div className="mt-3 sm:mt-5 pt-2 sm:pt-3 border-t border-gray-100 dark:border-slate-800/80">
                  {/* Budget */}
                  <div className="flex items-center justify-between mb-2 sm:mb-3 text-[10px] sm:text-xs">
                    <span className="text-gray-400 dark:text-slate-500">Budget</span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400 truncate ml-1">
                      {item.budget > 0 ? rupiah(item.budget) : "Nego"}
                    </span>
                  </div>

                  {/* Action button */}
                  {item.status === "resolved" ? (
                    <div className="w-full py-1.5 sm:py-2.5 text-center flex items-center justify-center gap-1 text-[10px] sm:text-xs font-semibold bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-slate-500 rounded-lg select-none">
                      ✓ Sudah Terpenuhi
                    </div>
                  ) : (
                    <button
                      onClick={() => setOfferModal(item)}
                      className="btn-outline w-full py-1.5 sm:py-2.5 text-center flex items-center justify-center gap-1 text-[10px] sm:text-xs font-bold bg-gray-50/50 hover:bg-gray-100 dark:bg-slate-950 dark:hover:bg-slate-900 border-gray-200 dark:border-slate-850 rounded-lg"
                    >
                      <Icon.MessageCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> <span className="truncate">Tawarkan</span>
                    </button>
                  )}
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
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                <span aria-hidden="true">🔍</span> Posting Barang yang Dicari
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                aria-label="Tutup formulir"
                className="text-gray-400 hover:text-gray-650"
              >
                ✕
              </button>
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
                  <label htmlFor="wanted-buyer-wa" className="floating-label">No. WhatsApp (e.g. 62812...)</label>
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
                      setBudgetRaw(
                        raw ? Number(raw).toLocaleString("id-ID") : ""
                      );
                      setForm((f) => ({ ...f, budget: raw || "" }));
                    }}
                    placeholder=" "
                  />
                  <label htmlFor="wanted-budget" className="floating-label">Budget Maks (Rp) — kosongkan jika nego</label>
                </div>
                <div>
                  <label className="label">Kategori</label>
                  <select
                    className="input py-2.5 h-[53px]"
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
                  <label className="label">Target Kampus</label>
                  <select
                    className="input py-2.5 h-[53px]"
                    value={form.campus}
                    onChange={handleInputChange("campus")}
                  >
                    <option value="Semua">Semua (USU &amp; POLMED)</option>
                    <option value="USU">USU</option>
                    <option value="POLMED">POLMED</option>
                  </select>
                </div>

                <div>
                  <label className="label">Kondisi Barang</label>
                  <select
                    className="input py-2.5 h-[53px]"
                    value={form.item_condition}
                    onChange={handleInputChange("item_condition")}
                  >
                    <option value="Bekas">Bekas (Second)</option>
                    <option value="Baru">Baru (New)</option>
                  </select>
                </div>

                {/* COD Area — dropdown + manual fallback */}
                <div>
                  <label className="label">Area COD</label>
                  {areaMode === "dropdown" ? (
                    <select
                      className="input py-2.5 h-[53px]"
                      value={form.area}
                      onChange={(e) => {
                        if (e.target.value === "__manual__") {
                          setAreaMode("manual");
                          setForm((f) => ({ ...f, area: "" }));
                        } else {
                          setForm((f) => ({ ...f, area: e.target.value }));
                        }
                      }}
                    >
                      <option value="">📍 Pilih area COD...</option>
                      {POPULAR_AREAS.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                      <option value="__manual__">✏️ Ketik manual...</option>
                    </select>
                  ) : (
                    <div className="flex gap-1.5">
                      <input
                        id="wanted-area"
                        className="input flex-1"
                        value={form.area}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, area: e.target.value }))
                        }
                        placeholder="Area COD (opsional)"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setAreaMode("dropdown");
                          setForm((f) => ({ ...f, area: "" }));
                        }}
                        className="btn-outline px-2 text-xs"
                        title="Kembali ke dropdown"
                      >
                        ↩
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-outline px-4 py-2"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary px-5 py-2"
                >
                  {submitting ? "Mengirim..." : "Post Kebutuhan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Offer Choice Modal */}
      {offerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-md bg-white p-6 shadow-2xl dark:bg-slate-900 animate-fade-in">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <span>💬</span> Tawarkan Barang
              </h2>
              <button
                type="button"
                onClick={() => setOfferModal(null)}
                className="text-gray-400 hover:text-gray-650"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Opsi 1: Bayar Rp 2.000 */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/20 p-4 dark:border-blue-900/30 dark:bg-blue-950/10">
                <span className="inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 uppercase">
                  Otomatis &amp; Instan
                </span>
                <h3 className="mt-1.5 text-sm font-bold text-gray-900 dark:text-white">Opsi A: Bayar Rp 2.000</h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                  Buka nomor WhatsApp pembeli secara instan dan langsung tawarkan barang Anda sendiri.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button
                    onClick={async () => {
                      setUnlockLoading(true);
                      try {
                        const res = await fetch("/api/payments/unlock-wanted", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ wanted_id: offerModal.id }),
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || "Gagal membuat invoice");
                        if (data.paymentUrl) {
                          window.location.href = data.paymentUrl;
                        } else {
                          toast.error("Gagal memproses link iPaymu");
                        }
                      } catch (e) {
                        toast.error(e.message);
                      } finally {
                        setUnlockLoading(false);
                      }
                    }}
                    disabled={unlockLoading}
                    className="btn-primary py-2 text-[11px] bg-blue-600 hover:bg-blue-700 border-blue-700 text-white font-bold rounded-lg shadow-sm flex items-center justify-center gap-1.5"
                  >
                    {unlockLoading ? (
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <span>💳 Payment Gateway</span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setQrisModal(offerModal);
                      setOfferModal(null);
                    }}
                    className="btn-outline py-2 text-[11px] text-blue-700 border-blue-200 bg-white hover:bg-blue-50 font-bold rounded-lg flex items-center justify-center gap-1.5"
                  >
                    <span>📱 Transfer Manual</span>
                  </button>
                </div>
              </div>

              {/* Opsi 2: Bagi Hasil */}
              <div className="rounded-xl border border-gray-150 bg-gray-50/30 p-4 dark:border-slate-800 dark:bg-slate-900/20">
                <span className="inline-block rounded-full bg-gray-200 px-2.5 py-0.5 text-[10px] font-bold text-gray-700 dark:bg-slate-800 dark:text-slate-400 uppercase">
                  Bagi Hasil (Nego)
                </span>
                <h3 className="mt-1.5 text-sm font-bold text-gray-900 dark:text-white">Opsi B: Hubungi via Admin</h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                  Tidak perlu membayar di depan. Hubungi admin untuk skema bagi hasil komisi 5-10% setelah barang laku.
                </p>
                <a
                  href={`https://wa.me/${MARKETPLACE_WA}?text=${encodeURIComponent(
                    `Halo Admin Jual Beli USU Polmed, saya tertarik menawarkan barang untuk postingan Cari Barang: "${offerModal.title}" dengan skema bagi hasil. Bagaimana caranya?`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setOfferModal(null)}
                  className="btn-outline w-full mt-3 py-2 text-center text-xs font-bold bg-white hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-900 rounded-lg flex items-center justify-center gap-1.5"
                >
                  <span>💬 Hubungi Admin (Bagi Hasil)</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QRIS Manual Modal */}
      {qrisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-sm bg-white p-6 shadow-2xl dark:bg-slate-900 animate-fade-in text-center">
            <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">
              Transfer via QRIS
            </h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
              Silakan scan QR Code di bawah atau simpan gambar ke galeri untuk membayar melalui m-Banking/e-Wallet Anda.
            </p>

            <div className="mt-4 flex justify-center">
              <div className="rounded-xl border-4 border-emerald-100 p-2 dark:border-emerald-900/50">
                {/* Gunakan placeholder gambar QRIS. Nanti bisa diganti dengan file QRIS asli di /public */}
                <img
                  src="/qris.png"
                  alt="QRIS Admin"
                  className="w-48 h-48 object-cover rounded-lg"
                />
              </div>
            </div>

            <div className="mt-4 bg-gray-50 dark:bg-slate-800/50 p-3 rounded-xl border border-gray-100 dark:border-slate-800">
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Total Pembayaran</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">Rp 2.000</p>
            </div>

            <div className="mt-5 space-y-2">
              <a
                href={`https://wa.me/${MARKETPLACE_WA}?text=${encodeURIComponent(
                  `Halo Admin, saya sudah transfer manual Rp 2.000 via QRIS untuk buka kontak pembeli di postingan Cari Barang:\n\n*Judul:* ${qrisModal.title}\n*ID:* ${qrisModal.id}\n\nBerikut saya lampirkan bukti transfernya. Tolong kirimkan nomor WA pembelinya ya.`
                )}`}
                target="_blank"
                rel="noreferrer"
                onClick={() => setQrisModal(null)}
                className="btn-primary w-full py-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm flex items-center justify-center gap-1.5"
              >
                <span>✅ Konfirmasi ke WhatsApp Admin</span>
              </a>
              <button
                onClick={() => {
                  setOfferModal(qrisModal);
                  setQrisModal(null);
                }}
                className="btn-outline w-full py-2.5 text-xs font-bold bg-white hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-900 rounded-lg flex items-center justify-center gap-1.5"
              >
                Kembali
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
