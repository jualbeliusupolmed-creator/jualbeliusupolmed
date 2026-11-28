"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import { getCartItems, toggleCartItem } from "@/lib/cart";
import { rupiah } from "@/lib/fees";
import { useSesi } from "@/components/SesiProvider";
import { isListingAvailable } from "@/lib/listingAvailability";

const ORDER_STATUS = {
  pending: { label: "Menunggu konfirmasi", style: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  confirmed: { label: "Dikonfirmasi", style: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300" },
  fulfilled: { label: "Selesai", style: "bg-[#e6f8e8] text-[#134e35] dark:bg-[#134e35]/40 dark:text-[#bef264]" },
  cancelled: { label: "Dibatalkan", style: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
};
const ORDER_STEPS = ["Reservasi dibuat", "Dikonfirmasi penjual", "Pesanan selesai"];

function OrderTimeline({ status }) {
  const activeStep = status === "pending" ? 0 : status === "confirmed" ? 1 : status === "fulfilled" ? 2 : -1;
  const isCancelled = status === "cancelled";

  return (
    <div className="mt-4 rounded-2xl bg-[#f4faf5] dark:bg-white/5 p-3.5">
      <ol aria-label="Progres pesanan" className="grid grid-cols-3 gap-2">
        {ORDER_STEPS.map((step, index) => {
          const complete = !isCancelled && index <= activeStep;
          return (
            <li key={step} className="relative flex flex-col items-center text-center">
              {index < ORDER_STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`absolute left-1/2 top-2 h-0.5 w-full ${
                    !isCancelled && index < activeStep ? "bg-[#134e35]" : "bg-[#e2f0e6] dark:bg-white/10"
                  }`}
                />
              )}
              <span
                className={`relative z-10 grid h-4 w-4 place-items-center rounded-full border-2 ${
                  complete
                    ? "border-[#134e35] bg-[#134e35]"
                    : "border-[#c0c9c1] bg-white dark:border-white/20 dark:bg-[#112218]"
                }`}
              >
                {complete && <span className="h-1.5 w-1.5 rounded-full bg-[#ceeb7a]" />}
              </span>
              <span
                className={`mt-2 text-[10px] leading-tight ${
                  complete ? "font-extrabold text-[#003622] dark:text-[#bef264]" : "text-[#707972]"
                }`}
              >
                {step}
              </span>
            </li>
          );
        })}
      </ol>
      {isCancelled && (
        <p className="mt-3 rounded-xl bg-slate-200/70 dark:bg-white/10 px-3 py-2 text-center text-[11px] font-bold text-[#404943] dark:text-slate-300">
          Pesanan ini dibatalkan.
        </p>
      )}
    </div>
  );
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export default function KeranjangPage() {
  const router = useRouter();
  const { wa, siap } = useSesi();
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState("items");
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [ordersReload, setOrdersReload] = useState(0);

  const loadItems = useCallback(async () => {
    const savedItems = getCartItems();
    setItems(savedItems);
    if (!savedItems.length) return;

    const ids = savedItems.map((item) => item.id).filter(Boolean);
    if (!ids.length) return;
    const response = await fetch(`/api/listings/batch?ids=${encodeURIComponent(ids.join(","))}`);
    if (!response.ok) return;
    const data = await response.json();
    if (!Array.isArray(data)) return;
    const currentById = new Map(data.map((item) => [item.id, item]));
    setItems(savedItems.map((item) => (currentById.get(item.id) ? { ...item, ...currentById.get(item.id) } : item)));
  }, []);

  useEffect(() => {
    const initialTab = new URLSearchParams(window.location.search).get("tab");
    if (initialTab === "po") setTab("po");
    loadItems()
      .catch(() => {})
      .finally(() => setLoadingItems(false));

    const sync = () => loadItems().catch(() => {});
    window.addEventListener("cart-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("cart-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, [loadItems]);

  useEffect(() => {
    setOrders([]);
    setOrdersLoaded(false);
    setOrdersError("");
  }, [wa]);

  useEffect(() => {
    if (tab !== "po" || !siap || !wa || ordersLoaded) return;
    const controller = new AbortController();
    setLoadingOrders(true);
    setOrdersError("");
    fetch("/api/open-po/mine", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "Pesanan Open PO gagal dimuat.");
        setOrders(result.outgoing || []);
        setOrdersLoaded(true);
      })
      .catch((error) => {
        if (error.name !== "AbortError") setOrdersError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingOrders(false);
      });
    return () => controller.abort();
  }, [tab, siap, wa, ordersLoaded, ordersReload]);

  function selectTab(nextTab) {
    setTab(nextTab);
    router.replace(nextTab === "po" ? "/keranjang?tab=po" : "/keranjang", { scroll: false });
  }

  function removeItem(listing) {
    toggleCartItem(listing);
  }

  function refreshOrders() {
    setOrdersError("");
    setOrdersLoaded(false);
    setOrdersReload((current) => current + 1);
  }

  const activeItems = items.filter(isListingAvailable);
  const inactiveItems = items.filter((item) => !isListingAvailable(item));
  const totalEstimasi = activeItems.reduce((sum, it) => sum + Number(it.price || 0), 0);

  return (
    <main className="min-h-screen bg-[#f4faf5] dark:bg-[#0a1710] pb-28 lg:pb-14 font-sans text-[#101f15] dark:text-[#ecfeee]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#003622] text-[#ceeb7a] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">shopping_cart</span>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-[#003622] dark:text-white">Keranjang Saya</h1>
              <p className="text-xs sm:text-sm text-[#404943] dark:text-slate-400">
                Barang yang kamu simpan dan perkembangan pesanan Open PO.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/favorit"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white dark:bg-white/10 border border-[#e2f0e6] dark:border-white/10 text-xs font-bold text-[#101f15] dark:text-white hover:bg-[#e6f8e8] transition"
            >
              <span className="material-symbols-outlined text-[16px] text-rose-500">favorite</span>
              Favorit
            </Link>
            <Link
              href="/open-po"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#e6f8e8] dark:bg-[#134e35]/40 text-xs font-extrabold text-[#003622] dark:text-[#bef264] hover:bg-[#ceeb7a] transition"
            >
              <span className="material-symbols-outlined text-[16px]">receipt_long</span>
              Cari Open PO
            </Link>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar" role="tablist" aria-label="Isi keranjang">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "items"}
            onClick={() => selectTab("items")}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-xs font-extrabold transition ${
              tab === "items"
                ? "bg-[#003622] text-white shadow-xs"
                : "bg-white dark:bg-[#112218] border border-[#e2f0e6] dark:border-white/10 text-[#404943] dark:text-slate-300"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">shopping_bag</span>
            Barang Disimpan ({items.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "po"}
            onClick={() => selectTab("po")}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-xs font-extrabold transition ${
              tab === "po"
                ? "bg-[#003622] text-white shadow-xs"
                : "bg-white dark:bg-[#112218] border border-[#e2f0e6] dark:border-white/10 text-[#404943] dark:text-slate-300"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">receipt_long</span>
            Pesanan Open PO
          </button>
        </div>

        {/* Content */}
        {tab === "items" ? (
          loadingItems && items.length === 0 ? (
            <div className="flex justify-center py-24">
              <span className="h-8 w-8 animate-spin rounded-full border-4 border-[#e2f0e6] border-t-[#134e35]" />
            </div>
          ) : items.length === 0 ? (
            <section className="flex min-h-[42dvh] flex-col items-center justify-center rounded-3xl border border-[#e2f0e6] dark:border-white/10 bg-white dark:bg-[#112218] p-8 text-center shadow-[0_4px_20px_-4px_rgba(19,78,53,0.06)]">
              <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-[#e6f8e8] dark:bg-[#134e35]/40 text-[#134e35] dark:text-[#bef264]">
                <span className="material-symbols-outlined text-[32px]">shopping_cart</span>
              </div>
              <h2 className="text-lg font-extrabold text-[#003622] dark:text-white">Keranjangmu masih kosong</h2>
              <p className="mt-1 max-w-xs text-xs leading-relaxed text-[#707972] dark:text-slate-400">
                Tekan ikon keranjang pada barang di marketplace untuk menyimpannya dan membandingkan di sini.
              </p>
              <Link
                href="/jual-beli"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#003622] hover:bg-[#134e35] px-6 py-3 text-xs font-extrabold text-white shadow-sm transition"
              >
                <span className="material-symbols-outlined text-[16px]">storefront</span>
                Jelajahi Marketplace
              </Link>
            </section>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-8 space-y-6">
                {activeItems.length > 0 && (
                  <section className="space-y-3">
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#707972]">
                      Masih Tersedia ({activeItems.length})
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                      {activeItems.map((item) => (
                        <div key={item.id} className="relative">
                          <ProductCard listing={item} />
                          <button
                            type="button"
                            onClick={() => removeItem(item)}
                            aria-label="Hapus dari keranjang"
                            className="absolute right-2 top-2 z-20 w-7 h-7 rounded-full bg-black/65 text-white flex items-center justify-center hover:bg-rose-600 transition"
                          >
                            <span className="material-symbols-outlined text-[15px]">close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {inactiveItems.length > 0 && (
                  <section className="border-t border-[#e2f0e6] dark:border-white/10 pt-6 space-y-3">
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#707972]">
                      Terjual atau Tidak Aktif ({inactiveItems.length})
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 opacity-65">
                      {inactiveItems.map((item) => (
                        <div key={item.id} className="relative">
                          <ProductCard listing={item} />
                          <button
                            type="button"
                            onClick={() => removeItem(item)}
                            className="absolute right-2 top-2 z-20 rounded-full bg-black/75 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-rose-600"
                          >
                            Hapus
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              {/* Order Summary Sidebar */}
              <aside className="lg:col-span-4 bg-white dark:bg-[#112218] rounded-3xl p-6 border border-[#e2f0e6] dark:border-white/10 shadow-[0_4px_20px_-4px_rgba(19,78,53,0.06)] space-y-4 lg:sticky lg:top-24">
                <h2 className="text-sm font-extrabold text-[#003622] dark:text-white">Ringkasan Barang Disimpan</h2>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-[#404943] dark:text-slate-300">
                    <span>Barang tersedia</span>
                    <span className="font-bold">{activeItems.length} item</span>
                  </div>
                  <div className="flex justify-between text-[#404943] dark:text-slate-300">
                    <span>Estimasi total</span>
                    <span className="font-extrabold text-[#003622] dark:text-[#bef264] text-sm">{rupiah(totalEstimasi)}</span>
                  </div>
                </div>
                <p className="rounded-2xl bg-[#f4faf5] dark:bg-white/5 p-3 text-[11px] leading-relaxed text-[#404943] dark:text-slate-300">
                  Transaksi dilakukan langsung dengan masing-masing penjual via chat atau COD aman di area kampus.
                </p>
                <Link
                  href="/jual-beli"
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-full bg-[#003622] hover:bg-[#134e35] text-white text-xs font-extrabold transition"
                >
                  Cari Barang Lainnya
                </Link>
              </aside>
            </div>
          )
        ) : !siap ? (
          <div className="flex justify-center py-20">
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-[#e2f0e6] border-t-[#134e35]" />
          </div>
        ) : !wa ? (
          <section className="rounded-3xl border border-[#e2f0e6] dark:border-white/10 bg-white dark:bg-[#112218] p-8 text-center shadow-xs">
            <span className="material-symbols-outlined text-[40px] text-[#134e35] dark:text-[#bef264]">receipt_long</span>
            <h2 className="mt-3 text-lg font-extrabold text-[#003622] dark:text-white">Masuk untuk melihat pesanan PO</h2>
            <p className="mt-1 text-xs sm:text-sm text-[#707972]">Pesanan tersimpan pada akun yang digunakan saat reservasi.</p>
            <Link
              href={`/dashboard/login?next=${encodeURIComponent("/keranjang?tab=po")}`}
              className="mt-5 inline-flex items-center justify-center rounded-full bg-[#003622] px-6 py-3 text-xs font-extrabold text-white"
            >
              Masuk ke Akun
            </Link>
          </section>
        ) : (
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-[#003622] dark:text-white">Progres Pesanan Open PO</h2>
                <p className="text-xs text-[#707972]">Status reservasi dari penjual akan muncul di sini.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={refreshOrders}
                  disabled={loadingOrders}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white dark:bg-white/10 text-xs font-bold text-[#134e35] dark:text-[#bef264] disabled:opacity-50"
                >
                  <span className={`material-symbols-outlined text-[15px] ${loadingOrders ? "animate-spin" : ""}`}>refresh</span>
                  Perbarui
                </button>
                <Link href="/dashboard?tab=open-po" className="text-xs font-bold text-[#003622] dark:text-[#bef264] underline">
                  Buka Dashboard PO
                </Link>
              </div>
            </div>

            {ordersError && (
              <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                <p>{ordersError}</p>
                <button type="button" onClick={refreshOrders} className="mt-2 font-bold underline">Coba lagi</button>
              </div>
            )}

            {loadingOrders ? (
              <div className="flex justify-center py-16">
                <span className="h-8 w-8 animate-spin rounded-full border-4 border-[#e2f0e6] border-t-[#134e35]" />
              </div>
            ) : orders.length ? (
              <div className="space-y-3">
                {orders.map((order) => {
                  const batch = order.batch || {};
                  const product = batch.product || {};
                  const status = ORDER_STATUS[order.status] || { label: order.status, style: "bg-slate-100 text-slate-600" };
                  return (
                    <article
                      key={order.id}
                      className="rounded-3xl border border-[#e2f0e6] dark:border-white/10 bg-white dark:bg-[#112218] p-5 shadow-xs"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-extrabold text-[#101f15] dark:text-white">
                          {batch.title || product.name || "Open PO"}
                        </h3>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${status.style}`}>
                          {status.label}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-[#404943] dark:text-slate-300">
                        {order.quantity} {product.unit || "unit"} × {rupiah(order.unit_price_idr)}{" "}
                        <span className="font-extrabold text-[#003622] dark:text-[#bef264]">· Total {rupiah(order.total_idr)}</span>
                      </p>
                      <p className="mt-1 text-[11px] text-[#707972]">
                        {batch.pickup_point || "Titik pengambilan mengikuti detail batch"} · Dipesan {formatDate(order.created_at)}
                      </p>
                      <OrderTimeline status={order.status} />
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-[#c0c9c1] dark:border-white/15 bg-white dark:bg-[#112218] p-10 text-center">
                <span className="material-symbols-outlined text-[36px] text-[#707972]">receipt_long</span>
                <h3 className="mt-2 text-sm font-bold text-[#101f15] dark:text-white">Belum ada pesanan PO</h3>
                <p className="mt-1 text-xs text-[#707972]">Setelah reservasi dibuat, progresnya akan tampil di sini.</p>
                <Link href="/open-po" className="mt-4 inline-flex items-center rounded-full bg-[#003622] px-5 py-2.5 text-xs font-extrabold text-white">
                  Cari Open PO
                </Link>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
