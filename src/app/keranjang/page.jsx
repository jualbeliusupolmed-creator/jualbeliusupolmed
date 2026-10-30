"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { Icon } from "@/components/Icons";
import { getCartItems, toggleCartItem } from "@/lib/cart";
import { rupiah } from "@/lib/fees";
import { useSesi } from "@/components/SesiProvider";

const ORDER_STATUS = {
  pending: { label: "Menunggu konfirmasi", style: "bg-amber-50 text-amber-800" },
  confirmed: { label: "Dikonfirmasi", style: "bg-sky-50 text-sky-800" },
  fulfilled: { label: "Selesai", style: "bg-emerald-50 text-emerald-800" },
  cancelled: { label: "Dibatalkan", style: "bg-slate-100 text-slate-600" },
};
const ORDER_STEPS = ["Reservasi dibuat", "Dikonfirmasi penjual", "Pesanan selesai"];

function OrderTimeline({ status }) {
  const activeStep = status === "pending" ? 0 : status === "confirmed" ? 1 : status === "fulfilled" ? 2 : -1;
  const isCancelled = status === "cancelled";

  return (
    <div className="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
      <ol aria-label="Progres pesanan" className="grid grid-cols-3 gap-2">
        {ORDER_STEPS.map((step, index) => {
          const complete = !isCancelled && index <= activeStep;
          return (
            <li key={step} className="relative flex flex-col items-center text-center">
              {index < ORDER_STEPS.length - 1 && <span aria-hidden="true" className={`absolute left-1/2 top-2 h-0.5 w-full ${!isCancelled && index < activeStep ? "bg-emerald-600" : "bg-slate-200 dark:bg-slate-700"}`} />}
              <span className={`relative z-10 grid h-4 w-4 place-items-center rounded-full border-2 ${complete ? "border-emerald-700 bg-emerald-700" : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900"}`}>
                {complete && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
              <span className={`mt-2 text-[10px] leading-tight ${complete ? "font-bold text-emerald-800 dark:text-emerald-300" : "text-slate-500"}`}>{step}</span>
            </li>
          );
        })}
      </ol>
      {isCancelled && <p className="mt-3 rounded-lg bg-slate-200/70 px-3 py-2 text-center text-[11px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">Pesanan ini dibatalkan.</p>}
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
    setItems(savedItems.map((item) => currentById.get(item.id) ? { ...item, ...currentById.get(item.id) } : item));
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

  const activeItems = items.filter((item) => !item.status || item.status === "active");
  const inactiveItems = items.filter((item) => item.status && item.status !== "active");

  return (
    <main className="mx-auto min-h-[70vh] max-w-7xl px-4 pb-28 pt-6 md:px-6 md:pb-12">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#1d1d1f] dark:text-white sm:text-3xl">Keranjang Saya</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Barang yang kamu simpan dan perkembangan pesanan Open PO.</p>
        </div>
        <Link href="/open-po" className="inline-flex min-h-10 items-center gap-2 self-start rounded-full border border-emerald-200 bg-white px-4 text-xs font-extrabold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-slate-900 dark:text-emerald-300">
          <Icon.Coffee className="h-4 w-4" />
          Cari Open PO
        </Link>
      </header>

      <div className="mb-5 flex gap-2 overflow-x-auto" role="tablist" aria-label="Isi keranjang">
        <button type="button" role="tab" aria-selected={tab === "items"} onClick={() => selectTab("items")} className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-xs font-extrabold ${tab === "items" ? "bg-emerald-800 text-white" : "border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"}`}>
          <Icon.ShoppingCart className="h-4 w-4" />Barang disimpan ({items.length})
        </button>
        <button type="button" role="tab" aria-selected={tab === "po"} onClick={() => selectTab("po")} className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-xs font-extrabold ${tab === "po" ? "bg-emerald-800 text-white" : "border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"}`}>
          <Icon.Coffee className="h-4 w-4" />Pesanan Open PO
        </button>
      </div>

      {tab === "items" ? (
        loadingItems && items.length === 0 ? (
          <div className="flex justify-center py-24"><span className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary dark:border-slate-700" /></div>
        ) : items.length === 0 ? (
          <section className="flex min-h-[40vh] flex-col items-center justify-center rounded-3xl border border-black/[0.05] bg-white p-6 text-center shadow-xs dark:border-white/[0.06] dark:bg-slate-900">
            <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-700"><Icon.ShoppingCart className="h-8 w-8" /></div>
            <h2 className="text-lg font-bold text-[#1d1d1f] dark:text-white">Keranjangmu masih kosong</h2>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500 dark:text-slate-400">Tekan ikon keranjang pada barang untuk menyimpannya dan melihatnya lagi di sini.</p>
            <Link href="/jual-beli" className="btn-primary mt-5 inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold shadow-md"><Icon.ShoppingBag className="h-4 w-4" />Jelajahi Marketplace</Link>
          </section>
        ) : (
          <div className="space-y-8">
            {activeItems.length > 0 && <section><h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Masih tersedia ({activeItems.length})</h2><div className="grid grid-cols-2 gap-2.5 xs:gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">{activeItems.map((item) => <ProductCard key={item.id} listing={item} />)}</div></section>}
            {inactiveItems.length > 0 && <section className="border-t border-slate-200 pt-6 dark:border-slate-800"><h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Terjual / tidak aktif ({inactiveItems.length})</h2><div className="grid grid-cols-2 gap-2.5 opacity-60 xs:gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">{inactiveItems.map((item) => <div key={item.id} className="relative"><ProductCard listing={item} /><button type="button" onClick={() => removeItem(item)} aria-label="Hapus dari keranjang" className="absolute right-2 top-2 z-20 rounded-full bg-black/75 px-2.5 py-1 text-[10px] font-bold text-white transition-colors hover:bg-rose-600">Hapus</button></div>)}</div></section>}
          </div>
        )
      ) : !siap ? (
        <div className="flex justify-center py-20"><span className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary" /></div>
      ) : !wa ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <Icon.Coffee className="mx-auto h-10 w-10 text-emerald-700" />
          <h2 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">Masuk untuk melihat pesanan PO</h2>
          <p className="mt-1 text-sm text-slate-500">Pesanan tersimpan pada akun yang digunakan saat reservasi.</p>
          <Link href={`/dashboard/login?next=${encodeURIComponent("/keranjang?tab=po")}`} className="mt-5 inline-flex min-h-10 items-center justify-center rounded-full bg-emerald-800 px-5 text-xs font-extrabold text-white">Masuk ke akun</Link>
        </section>
      ) : (
        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Progres pesanan Open PO</h2><p className="mt-1 text-xs text-slate-500">Status reservasi dari penjual akan muncul di sini.</p></div>
            <div className="flex items-center gap-4">
              <button type="button" onClick={refreshOrders} disabled={loadingOrders} className="inline-flex min-h-9 items-center gap-1.5 text-xs font-bold text-emerald-800 disabled:opacity-50 dark:text-emerald-300"><RefreshCw className={`h-3.5 w-3.5 ${loadingOrders ? "animate-spin" : ""}`} />Perbarui</button>
              <Link href="/dashboard?tab=open-po" className="text-xs font-bold text-emerald-800 underline dark:text-emerald-300">Buka dashboard PO</Link>
            </div>
          </div>
          {ordersError ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><p>{ordersError}</p><button type="button" onClick={refreshOrders} className="mt-2 font-bold underline">Coba lagi</button></div> : null}
          {loadingOrders ? <div className="flex justify-center py-16"><span className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary" /></div> : ordersError ? null : orders.length ? orders.map((order) => {
            const batch = order.batch || {};
            const product = batch.product || {};
            const status = ORDER_STATUS[order.status] || { label: order.status, style: "bg-slate-100 text-slate-600" };
            return <article key={order.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-extrabold text-slate-900 dark:text-white">{batch.title || product.name || "Open PO"}</h3><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${status.style}`}>{status.label}</span></div>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{order.quantity} {product.unit || "unit"} × {rupiah(order.unit_price_idr)} <span className="font-bold">· Total {rupiah(order.total_idr)}</span></p>
                  <p className="mt-1 text-[11px] text-slate-500">{batch.pickup_point || "Titik pengambilan mengikuti detail batch"} · Dipesan {formatDate(order.created_at)}</p>
                  <OrderTimeline status={order.status} />
                </div>
              </div>
            </article>;
          }) : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900"><Icon.Coffee className="mx-auto h-8 w-8 text-slate-400" /><h3 className="mt-3 text-sm font-bold text-slate-800 dark:text-white">Belum ada pesanan PO</h3><p className="mt-1 text-xs text-slate-500">Setelah reservasi dibuat, progresnya akan tampil di sini.</p><Link href="/open-po" className="mt-4 inline-flex min-h-9 items-center rounded-full bg-emerald-800 px-4 text-xs font-bold text-white">Cari Open PO</Link></div>}
        </section>
      )}
    </main>
  );
}
