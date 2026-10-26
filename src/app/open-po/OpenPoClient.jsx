"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/Icons";
import { rupiah } from "@/lib/fees";
import { toast } from "sonner";

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

export default function OpenPoClient({ initialBatches = [] }) {
  const [search, setSearch] = useState("");
  const [campusFilter, setCampusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortFilter, setSortFilter] = useState("urgent");
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderQty, setOrderQty] = useState(1);
  const [buyerName, setBuyerName] = useState("");
  const [buyerWa, setBuyerWa] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 pb-20">
      {/* Live Campus Ticker Bar */}
      <div className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900/40 py-2 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2 truncate">
            <span className="inline-flex items-center gap-1 font-bold bg-[#047857] text-white px-2 py-0.5 rounded-full text-[10px]">
              📢 BATCH LIVE
            </span>
            <span className="truncate">
              [USU &amp; POLMED] Pre-order kuliner &amp; jastip sesama mahasiswa • Titik Pickup Resmi: Pendopo USU, Fasilkom &amp; Kantin Z Polmed
            </span>
          </div>
          <span className="hidden md:inline font-semibold text-[11px] shrink-0">
            Sistem Terverifikasi Mahasiswa Aktif
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        {/* Header Block & Search */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Open PO Kampus
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Batch makanan, minuman, dan merchandise buatan mahasiswa USU &amp; POLMED dengan kuota slot transparan.
              </p>
            </div>
            <a
              href="https://open-po.vercel.app/buat"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#047857] hover:bg-[#065F46] text-white text-xs sm:text-sm font-bold shadow-sm transition active:scale-95 shrink-0"
            >
              <span>+ Buka Open PO Baru</span>
            </a>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-slate-200 dark:border-white/10 flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Icon.Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari risol mayo, matcha, kopi, brownies, kaos angkatan..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#047857] transition"
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
                  <option value="usu">USU Saja</option>
                  <option value="polmed">POLMED Saja</option>
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

        {/* PO Catalog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBatches.map((batch) => {
            const quota = batch.quota || 20;
            const reserved = batch.reserved || 0;
            const percent = Math.min(100, Math.round((reserved / Math.max(1, quota)) * 100));
            const remaining = Math.max(0, quota - reserved);

            return (
              <article
                key={batch.id}
                className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-xs hover:shadow-md border border-slate-200/70 dark:border-white/10 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Photo Container */}
                  <div className="relative h-48 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img
                      src={batch.photo || "/images/risol-mayo.jpg"}
                      alt={batch.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                      <span className="bg-white/90 dark:bg-slate-900/90 backdrop-blur text-[#047857] dark:text-emerald-400 font-bold text-[11px] px-2.5 py-1 rounded-full shadow-xs">
                        {batch.badge || batch.closes_at || "Batch Aktif"}
                      </span>
                    </div>
                    <div className="absolute bottom-3 right-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur px-2.5 py-1 rounded-lg text-[#047857] dark:text-emerald-400 font-bold text-sm shadow-xs">
                      {rupiah(batch.price)}
                      {batch.unit && <span className="text-[11px] font-normal text-slate-500"> {batch.unit}</span>}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 flex flex-col gap-3">
                    {/* Seller Chip */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#ECFDF5] dark:bg-emerald-950/60 text-[#047857] dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                        {batch.seller_name ? batch.seller_name.slice(0, 2).toUpperCase() : "PO"}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {batch.seller_name}
                          </span>
                          <span className="text-[#047857] text-xs">✓</span>
                        </div>
                        <span className="text-[10px] text-slate-400 truncate">
                          {batch.faculty}
                        </span>
                      </div>
                    </div>

                    <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-[#047857] transition-colors leading-snug line-clamp-1">
                      {batch.title || batch.name}
                    </h3>

                    {/* Quota Progress Bar */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl flex flex-col gap-1.5 border border-slate-100 dark:border-white/5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-600 dark:text-slate-300">
                          Kuota Terisi: <strong className="text-[#047857] dark:text-emerald-400">{reserved} / {quota} Slot</strong>
                        </span>
                        <span className="text-[#047857] dark:text-emerald-400 font-bold text-[11px]">{percent}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#047857] h-full rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {remaining > 0 ? `Sisa ${remaining} slot sebelum batch diproduksi` : "Batch kuota telah penuh"}
                      </span>
                    </div>

                    {/* Pickup Point */}
                    <div className="flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                      <Icon.MapPin className="w-3.5 h-3.5 text-[#047857] shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{batch.pickup_point}</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="p-4 pt-0 flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBatch(batch);
                      setOrderModalOpen(true);
                    }}
                    className="flex-1 bg-[#047857] hover:bg-[#065F46] text-white py-2.5 px-3 rounded-xl font-bold text-xs text-center transition shadow-xs flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <span>Pesan Slot</span>
                  </button>
                  <a
                    href={`https://wa.me/${(batch.wa || "62895429126232").replace(/\D/g, "")}?text=${encodeURIComponent(`Halo ${batch.seller_name}, mau tanya tentang Open PO ${batch.title}...`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                    title="Chat Penjual"
                  >
                    <Icon.MessageCircle className="w-4 h-4 text-[#047857]" />
                  </a>
                </div>
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
      </div>

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
