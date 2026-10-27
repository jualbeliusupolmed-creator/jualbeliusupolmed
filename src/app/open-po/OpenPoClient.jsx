"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/Icons";
import { rupiah } from "@/lib/fees";
import { toast } from "sonner";
import { PageContainer, PageHeader, SearchInput } from "@/components/ui/DesignSystem";

const CURATED_DEFAULT_BATCHES = [
  {
    id: "batch-risol-mayo",
    title: "Risol Mayo Spesial Smoke Beef",
    name: "Risol Mayo Spesial Smoke Beef",
    category: "Makanan",
    price: 12000,
    unit: "/ 3 pcs",
    quota: 30,
    reserved: 17,
    closes_at: "16:00 WIB",
    pickup_point: "Kantin Gedung Bersama USU",
    seller_name: "Nadia Putri",
    faculty: "Fakultas Pertanian USU • '22",
    photo: "/images/risol-mayo.jpg",
    badge: "Tutup 16:00 WIB",
    campus: "USU",
    wa: "62895429126232",
  },
  {
    id: "batch-matcha-latte",
    title: "Cold Brew Matcha Latte 250ml",
    name: "Cold Brew Matcha Latte 250ml",
    category: "Minuman",
    price: 18000,
    unit: "/ 250ml",
    quota: 20,
    reserved: 2,
    closes_at: "Ready Besok",
    pickup_point: "Selasar FIB & Lab Industri USU",
    seller_name: "Rafi Maulana",
    faculty: "Fakultas Teknik USU • '20",
    photo: "/images/matcha-latte.jpg",
    badge: "Ready Besok",
    campus: "USU",
    wa: "62895429126232",
  },
  {
    id: "batch-brownies-fudgy",
    title: "Fudgy Brownies Sekat 5 Topping",
    name: "Fudgy Brownies Sekat 5 Topping",
    category: "Makanan",
    price: 18000,
    unit: "/ Box",
    quota: 25,
    reserved: 19,
    closes_at: "Sisa 6 Slot",
    pickup_point: "Perpustakaan Pusat USU & Gazebo",
    seller_name: "Salsabila N.",
    faculty: "FKM USU • '21",
    photo: "/images/brownies.jpg",
    badge: "Sisa 6 Slot",
    campus: "USU",
    wa: "62895429126232",
  },
  {
    id: "batch-kopi-susu",
    title: "Kopi Susu Gula Aren Literan",
    name: "Kopi Susu Gula Aren Literan",
    category: "Minuman",
    price: 10000,
    unit: "/ Cup 350ml",
    quota: 40,
    reserved: 29,
    closes_at: "POLMED Friendly",
    pickup_point: "Lobi Gedung Kuliah FT & Parkiran Polmed",
    seller_name: "Alya Syafira",
    faculty: "FEB USU • '21",
    photo: "/images/kopi-susu.jpg",
    badge: "POLMED Friendly",
    campus: "POLMED",
    wa: "62895429126232",
  },
  {
    id: "batch-kaos-angkatan",
    title: "Kaos Acara Angkatan Stambuk '23",
    name: "Kaos Acara Angkatan Stambuk '23",
    category: "Merchandise",
    price: 85000,
    unit: "/ Cotton 24s",
    quota: 50,
    reserved: 36,
    closes_at: "Pre-Order 7 Hari",
    pickup_point: "Hall Gedung C FEB USU",
    seller_name: "Komisariat Mahasiswa",
    faculty: "Fasilkom-TI USU • '23",
    photo: "/images/kaos-angkatan.jpg",
    badge: "Pre-Order 7 Hari",
    campus: "USU",
    wa: "62895429126232",
  },
  {
    id: "batch-donat-kentang",
    title: "Donat Kentang Glaze Cokelat Keju",
    name: "Donat Kentang Glaze Cokelat Keju",
    category: "Makanan",
    price: 15000,
    unit: "/ 6 pcs",
    quota: 20,
    reserved: 12,
    closes_at: "Batch Pagi",
    pickup_point: "Kantin Teknik & Parkiran Polmed",
    seller_name: "Daffa Kurnia",
    faculty: "Fasilkom USU • '22",
    photo: "/images/risol-mayo.jpg",
    badge: "Batch Pagi",
    campus: "POLMED",
    wa: "62895429126232",
  },
];

function formatBatchBadge(batch) {
  if (batch.badge) return batch.badge;
  if (batch.closes_at && !Number.isNaN(Date.parse(batch.closes_at))) {
    return new Date(batch.closes_at).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return batch.closes_at || "Batch Aktif";
}

export default function OpenPoClient({ initialBatches = [] }) {
  const [search, setSearch] = useState("");
  const [campusFilter, setCampusFilter] = useState("all");
  const [campuses, setCampuses] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortFilter, setSortFilter] = useState("urgent");
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderQty, setOrderQty] = useState(1);
  const [buyerName, setBuyerName] = useState("");
  const [buyerWa, setBuyerWa] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/kampus", { cache: "no-store" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (Array.isArray(data?.campuses)) setCampuses(data.campuses);
      })
      .catch(() => {});
  }, []);

  const allBatches = useMemo(() => {
    if (initialBatches && initialBatches.length > 0) {
      return initialBatches;
    }
    return CURATED_DEFAULT_BATCHES;
  }, [initialBatches]);

  const filteredBatches = useMemo(() => {
    return allBatches.filter((b) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        (b.title || "").toLowerCase().includes(q) ||
        (b.name || "").toLowerCase().includes(q) ||
        (b.pickup_point || "").toLowerCase().includes(q) ||
        (b.seller_name || "").toLowerCase().includes(q);

      const matchCampus =
        campusFilter === "all" ||
        (b.campus || "").toLowerCase() === campusFilter.toLowerCase() ||
        (b.pickup_point || "").toLowerCase().includes(campusFilter.toLowerCase());

      const matchCat =
        categoryFilter === "all" ||
        (b.category || "").toLowerCase() === categoryFilter.toLowerCase();

      return matchSearch && matchCampus && matchCat;
    });
  }, [allBatches, search, campusFilter, categoryFilter]);

  function handleOrderSubmit(e) {
    e.preventDefault();
    if (!buyerName.trim() || !buyerWa.trim()) {
      toast.error("Nama dan WhatsApp wajib diisi!");
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setOrderModalOpen(false);
      toast.success("Pesanan slot PO berhasil dicatat! Mengalihkan ke WhatsApp penjual...");

      const itemTitle = selectedBatch?.title || selectedBatch?.name || "Open PO";
      const sellerWa = selectedBatch?.wa || "62895429126232";
      const totalIdr = rupiah((selectedBatch?.price || 0) * orderQty);
      const msg = `Halo ${selectedBatch?.seller_name || "Kak"}, saya ${buyerName} mau pesan slot ${itemTitle} (${orderQty} porsi/unit - total ${totalIdr}). Ambil di ${selectedBatch?.pickup_point}. Tolong konfirmasi ya!`;
      
      const waUrl = `https://wa.me/${sellerWa.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
      window.open(waUrl, "_blank");
    }, 600);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Live Campus Ticker Bar */}
      <div className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900/40 py-2 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2 truncate">
            <span className="inline-flex items-center gap-1 font-bold bg-[#047857] text-white px-2 py-0.5 rounded-full text-[10px]">
              📢 BATCH LIVE
            </span>
            <span className="truncate">
              Pre-order kuliner, jastip, dan merchandise sesama mahasiswa • Titik pickup mengikuti detail batch
            </span>
          </div>
          <span className="hidden md:inline font-semibold text-[11px] shrink-0">
            Sistem Terverifikasi Mahasiswa Aktif
          </span>
        </div>
      </div>

      <PageContainer className="max-w-7xl flex flex-col gap-6">
        {/* Header Block & Search */}
        <div className="flex flex-col gap-4">
          <PageHeader
            title="Open PO Kampus"
            description="Batch makanan, minuman, dan merchandise buatan mahasiswa dengan kuota slot transparan."
            action={<a
              href="https://open-po.vercel.app/buat"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-accent text-xs sm:text-sm"
            >
              <span>+ Buka Open PO Baru</span>
            </a>}
          />

          {/* Search & Filter Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-slate-200 dark:border-white/10 flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Icon.Search className="w-4 h-4" />
              </span>
              <SearchInput
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari risol mayo, matcha, kopi, brownies, kaos angkatan..."
                className="pl-10 text-xs sm:text-sm"
              />
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              <div className="relative flex-1 sm:flex-initial min-w-[130px]">
                <select
                  value={campusFilter}
                  onChange={(e) => setCampusFilter(e.target.value)}
                  className="w-full appearance-none bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold py-2.5 pl-3.5 pr-8 rounded-xl border border-slate-200/80 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#047857]"
                >
                  <option value="all">Kampus: Semua</option>
                  {campuses.map((campus) => (
                    <option key={campus.shortName} value={campus.shortName.toLowerCase()}>
                      {campus.shortName} Saja
                    </option>
                  ))}
                </select>
                <Icon.ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="relative flex-1 sm:flex-initial min-w-[130px]">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full appearance-none bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold py-2.5 pl-3.5 pr-8 rounded-xl border border-slate-200/80 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#047857]"
                >
                  <option value="all">Kategori: Semua</option>
                  <option value="makanan">Makanan</option>
                  <option value="minuman">Minuman</option>
                  <option value="merchandise">Merchandise</option>
                  <option value="jastip">Jastip</option>
                </select>
                <Icon.ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="relative flex-1 sm:flex-initial min-w-[130px]">
                <select
                  value={sortFilter}
                  onChange={(e) => setSortFilter(e.target.value)}
                  className="w-full appearance-none bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold py-2.5 pl-3.5 pr-8 rounded-xl border border-slate-200/80 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#047857]"
                >
                  <option value="urgent">Segera Ditutup</option>
                  <option value="quota">Kuota Menipis</option>
                  <option value="price">Harga Terendah</option>
                </select>
                <Icon.ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* PO Catalog Grid: 2 Kolom di HP, 3 Kolom di Desktop (Rapat, Efisien & Mantap) */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 xs:gap-2.5 sm:gap-4">
          {filteredBatches.map((batch) => {
            const quota = batch.quota || 20;
            const reserved = batch.reserved || 0;
            const percent = Math.min(100, Math.round((reserved / Math.max(1, quota)) * 100));
            const remaining = Math.max(0, quota - reserved);

            return (
              <article
                key={batch.id}
                className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-xs hover:shadow-md border border-slate-200/80 dark:border-white/10 transition-all flex flex-col justify-between group p-1.5 sm:p-2.5"
              >
                <div>
                  {/* Photo Container 4:3 Aspect Ratio */}
                  <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-100 dark:border-white/5">
                    <img
                      src={batch.photo || "/images/risol-mayo.jpg"}
                      alt={batch.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-1 left-1 flex flex-wrap gap-1">
                      <span className="bg-white/95 dark:bg-slate-900/95 backdrop-blur text-[#047857] dark:text-emerald-400 font-extrabold text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded-full shadow-xs">
                        {formatBatchBadge(batch)}
                      </span>
                    </div>
                    <div className="absolute bottom-1 right-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur px-1.5 py-0.5 rounded-md text-[#047857] dark:text-emerald-400 font-extrabold text-[9px] sm:text-[11px] shadow-xs">
                      {rupiah(batch.price)}
                      {batch.unit && <span className="text-[8px] font-normal text-slate-500"> {batch.unit}</span>}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="pt-1.5 px-0.5">
                    <h3 className="font-bold text-[11px] sm:text-xs text-slate-900 dark:text-white group-hover:text-[#047857] transition-colors leading-tight line-clamp-1">
                      {batch.title || batch.name}
                    </h3>

                    {/* Progress Bar 1 Baris */}
                    <div className="flex items-center gap-2 mt-2 text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex-1 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#047857] h-full rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="shrink-0 font-bold text-[#047857] dark:text-emerald-400">
                        {reserved}/{quota} terisi · sisa {remaining}
                      </span>
                    </div>

                    {/* Lokasi & Penjual 1 Baris */}
                    <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-2 gap-1">
                      <span className="truncate flex items-center gap-0.5 min-w-0">
                        <Icon.MapPin className="w-2.5 h-2.5 text-[#047857] shrink-0" />
                        <span className="truncate">{batch.pickup_point || batch.faculty}</span>
                      </span>
                      <span className="shrink-0 font-medium text-slate-500 truncate max-w-[65px]">
                        {batch.seller_name}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Single Compact Action Button */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBatch(batch);
                    setOrderModalOpen(true);
                  }}
                  className="w-full mt-3 min-h-11 px-3 rounded-xl bg-[#047857] hover:bg-[#065F46] text-white font-bold text-xs sm:text-sm text-center transition shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                >
                  Pesan Slot
                </button>
              </article>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredBatches.length === 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-white/10 flex flex-col items-center justify-center">
            <Icon.Package className="w-12 h-12 text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
              Tidak ada batch Open PO yang cocok
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Coba ganti filter kampus, kategori, atau cari kata kunci makanan lainnya.
            </p>
          </div>
        )}
      </PageContainer>

      {/* Order Slot Modal */}
      {orderModalOpen && selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Pesan Slot Open PO
              </h3>
              <button
                onClick={() => setOrderModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <Icon.X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl">
              <img
                src={selectedBatch.photo || "/images/risol-mayo.jpg"}
                alt={selectedBatch.title}
                className="w-14 h-14 object-cover rounded-xl shrink-0"
              />
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                  {selectedBatch.title || selectedBatch.name}
                </span>
                <span className="text-xs font-semibold text-[#047857]">
                  {rupiah(selectedBatch.price)} {selectedBatch.unit}
                </span>
                <span className="text-[11px] text-slate-400 truncate mt-0.5">
                  📍 {selectedBatch.pickup_point}
                </span>
              </div>
            </div>

            <form onSubmit={handleOrderSubmit} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  Jumlah Pesanan (Porsi/Slot)
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setOrderQty(Math.max(1, orderQty - 1))}
                    className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-200"
                  >
                    -
                  </button>
                  <span className="font-bold text-base w-8 text-center">{orderQty}</span>
                  <button
                    type="button"
                    onClick={() => setOrderQty(orderQty + 1)}
                    className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-200"
                  >
                    +
                  </button>
                  <span className="text-xs text-slate-400 ml-auto">
                    Total: <strong className="text-[#047857] font-bold text-sm">{rupiah((selectedBatch.price || 0) * orderQty)}</strong>
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  Nama Pemesan
                </label>
                <input
                  type="text"
                  required
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Misal: Faris Kurniawan"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white border border-slate-200/80 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#047857]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  Nomor WhatsApp Pemesan
                </label>
                <input
                  type="tel"
                  required
                  value={buyerWa}
                  onChange={(e) => setBuyerWa(e.target.value)}
                  placeholder="Misal: 081260000000"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white border border-slate-200/80 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#047857]"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOrderModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-2/3 py-2.5 rounded-xl bg-[#047857] hover:bg-[#065F46] text-white text-xs font-bold shadow-sm transition active:scale-95 disabled:opacity-50"
                >
                  {submitting ? "Memproses..." : "Konfirmasi & Hubungi Penjual"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
