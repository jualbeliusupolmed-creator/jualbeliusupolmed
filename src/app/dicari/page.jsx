"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CATEGORIES, POPULAR_AREAS, formatWa } from "@/lib/constants";
import { rupiah } from "@/lib/fees";
import { Icon } from "@/components/Icons";

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
  });
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState("");

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
    setFormMsg("");
    const formattedWa = formatWa(form.buyer_wa);
    if (!form.buyer_name || !formattedWa || !form.title || !form.category) {
      setFormMsg("Lengkapi nama, WA, judul, dan kategori.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/wanted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, buyer_wa: formattedWa }),
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
      });
      setShowModal(false);
      fetchItems();
    } catch (err) {
      setFormMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-gray-150/80 bg-gradient-to-br from-white via-white to-gray-50/50 px-4 py-6 sm:px-8 sm:py-8 dark:border-slate-900/60 dark:from-slate-900/30 dark:to-slate-950/20 dark:bg-slate-900/10">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/5 blur-2xl dark:bg-emerald-500/5" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] dark:bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)]" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400 sm:text-xs">
              Reverse Marketplace
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
              Papan "Dicari" Barang &amp; Jasa
            </h1>
            <p className="mt-1.5 max-w-xl text-xs sm:text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
              Mahasiswa butuh sesuatu? Pasang iklan dicari di sini secara gratis! Penjual yang memiliki barang tersebut akan langsung menghubungi Anda.
            </p>
          </div>
          <div>
            <button
              onClick={() => {
                const savedWa = localStorage.getItem("seller_wa") || "";
                setForm((f) => ({ ...f, buyer_wa: savedWa }));
                setShowModal(true);
              }}
              className="btn-primary w-full md:w-auto px-5 py-3 text-sm flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg transition-all"
            >
              <Icon.Edit className="h-4 w-4" /> Posting Kebutuhan
            </button>
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari kebutuhan..."
            className="input pl-10"
          />
        </div>

        {/* Campus Filter */}
        <select
          value={campus}
          onChange={(e) => setCampus(e.target.value)}
          className="input cursor-pointer"
        >
          <option value="Semua">Semua Kampus (USU &amp; POLMED)</option>
          <option value="USU">Universitas Sumatera Utara</option>
          <option value="POLMED">Politeknik Negeri Medan</option>
        </select>

        {/* Category Filter */}
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="input cursor-pointer"
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
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card animate-pulse p-5 space-y-3 bg-white dark:border-slate-805 dark:bg-slate-900/30">
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
        <div className="card mt-8 grid place-items-center py-16 text-center text-gray-400">
          <Icon.Package className="h-12 w-12 text-gray-300 dark:text-slate-600 mb-2" />
          <p className="mt-2 text-sm">Belum ada mahasiswa yang memposting kebutuhan.</p>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary mt-4 px-4 py-2 text-xs"
          >
            Ayo buat postingan pertama
          </button>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="card flex flex-col justify-between p-5 bg-white hover:shadow-md transition-shadow dark:border-slate-800 dark:bg-slate-900/30"
            >
              <div>
                {/* Meta details */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs text-gray-400 dark:text-slate-500">
                  <span className="badge bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 font-medium">
                    {item.category}
                  </span>
                  <span>
                    {new Date(item.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>

                {/* Title */}
                <h3 className="mt-2.5 font-bold text-gray-900 dark:text-white leading-snug">
                  {item.title}
                </h3>

                {/* Campus/Area Badges */}
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                  <span className="badge bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-350 flex items-center gap-1">
                    <Icon.MapPin className="h-3 w-3" /> {item.campus === "Semua" ? "USU / POLMED" : item.campus}
                  </span>
                  {item.area && (
                    <span className="badge bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-350 flex items-center gap-1">
                      <Icon.MapPin className="h-3 w-3" /> {item.area}
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="mt-3 text-xs text-gray-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed line-clamp-4">
                  {item.description || "Tidak ada deskripsi detail."}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-gray-100 dark:border-slate-800/80">
                {/* Budget */}
                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="text-gray-400 dark:text-slate-500">Budget</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                    {item.budget > 0 ? rupiah(item.budget) : "Tanya Pembeli"}
                  </span>
                </div>

                {/* Action button */}
                <a
                  href={`https://wa.me/${item.buyer_wa}?text=${encodeURIComponent(
                    `Halo ${item.buyer_name}, saya melihat postingan Anda di Papan Dicari Jual Beli USU Polmed untuk: "${item.title}". Saya punya barangnya. Apakah masih dicari?`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-outline w-full py-2.5 text-center flex items-center justify-center gap-1.5 text-xs font-bold bg-gray-50/50 hover:bg-gray-100 dark:bg-slate-950 dark:hover:bg-slate-900 border-gray-200 dark:border-slate-850"
                >
                  <Icon.MessageCircle className="h-4 w-4 text-emerald-500" /> Tawarkan via WhatsApp
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Posting Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-lg bg-white p-6 shadow-2xl dark:bg-slate-900 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                🔍 Posting Barang yang Dicari
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
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

              <div className="grid gap-4 sm:grid-cols-2">
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

              {formMsg && <p className="text-sm text-rose-500">{formMsg}</p>}

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
    </div>
  );
}
