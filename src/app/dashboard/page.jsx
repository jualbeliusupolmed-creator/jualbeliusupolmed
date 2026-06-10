"use client";

import { useEffect, useState, Suspense } from "react";
import Script from "next/script";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { rupiah, soldFee } from "@/lib/fees";
import ConfirmModal from "@/components/ConfirmModal";
import InputModal from "@/components/InputModal";
import { formatWa } from "@/lib/constants";
import { Icon } from "@/components/Icons";

function statusBadge(s) {
  const map = {
    active: "bg-green-100 text-green-700",
    pending: "bg-amber-100 text-amber-700",
    sold: "bg-gray-200 text-gray-700",
    expired: "bg-rose-100 text-rose-700",
    suspended: "bg-rose-100 text-rose-700",
  };
  return map[s] || "bg-gray-100 text-gray-600";
}

// Countdown: berapa hari tersisa hingga expired_at
function daysLeft(expiredAt) {
  if (!expiredAt) return null;
  const diff = new Date(expiredAt) - new Date();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return { label: <span className="flex items-center gap-1"><Icon.Info className="h-3.5 w-3.5" /> Berakhir hari ini!</span>, cls: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400" };
  if (days <= 3) return { label: <span className="flex items-center gap-1"><Icon.Info className="h-3.5 w-3.5" /> {days} hari lagi</span>, cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" };
  return { label: <span className="flex items-center gap-1"><Icon.Check className="h-3.5 w-3.5" /> Aktif {days} hari lagi</span>, cls: "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400" };
}

function DashboardInner() {
  const params = useSearchParams();
  const [wa, setWa] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const [wantedItems, setWantedItems] = useState([]);
  const [activeTab, setActiveTab] = useState("jual");

  // Modal state
  const [soldModal, setSoldModal] = useState(null);
  const [soldPriceModal, setSoldPriceModal] = useState(null);
  const [stockModal, setStockModal] = useState(null);
  const [featuredModal, setFeaturedModal] = useState(null);
  const [featuredConfirm, setFeaturedConfirm] = useState(null);
  const [qrisModalItem, setQrisModalItem] = useState(null);

  useEffect(() => {
    const urlWa = params.get("wa");
    const saved = localStorage.getItem("seller_wa");
    const waToLoad = formatWa(urlWa || saved || "");
    if (waToLoad) {
      setWa(waToLoad);
      load(waToLoad);
      if (urlWa) {
        localStorage.setItem("seller_wa", waToLoad);
      }
    }
    if (params.get("paid")) setNote("Pembayaran sukses! Iklan tayang sebentar lagi.");
    if (params.get("pending")) setNote("Pembayaran pending. Selesaikan ya.");
    if (params.get("edited")) setNote("Iklan berhasil diperbarui!");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  async function load(num) {
    let raw = (num ?? wa).trim();
    if (!raw) return;
    const n = formatWa(raw);
    setWa(n);
    setBusy(true);
    try {
      const [resListings, resWanted] = await Promise.all([
        fetch(`/api/listings?seller_wa=${encodeURIComponent(n)}`),
        fetch(`/api/wanted?buyer_wa=${encodeURIComponent(n)}`),
      ]);
      const dataListings = await resListings.json();
      const dataWanted = await resWanted.json();

      setItems(dataListings.listings || []);
      setWantedItems(dataWanted.listings || []);

      setLoaded(true);
      localStorage.setItem("seller_wa", n);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  async function resolveWanted(id) {
    setBusy(true);
    try {
      const res = await fetch(`/api/wanted/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolve" }),
      });
      if (!res.ok) throw new Error("Gagal menyelesaikan postingan");
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteWanted(id) {
    if (!confirm("Hapus postingan dicari ini?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/wanted/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Gagal menghapus postingan");
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function patch(id, body) {
    const res = await fetch(`/api/listings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  // Mark sold — step 1: input harga
  function openMarkSold(item) {
    setSoldModal(item);
  }

  // Mark sold — step 2: konfirmasi setelah harga dimasukkan
  function onSoldPriceEntered(item, priceStr) {
    const price = Number(priceStr);
    if (!price || isNaN(price)) return;
    setSoldModal(null);
    setSoldPriceModal({ item, price, fee: soldFee(price) });
  }

  // Mark sold — step 3: eksekusi
  async function doMarkSold() {
    if (!soldPriceModal) return;
    const { item, price } = soldPriceModal;
    setSoldPriceModal(null);
    await patch(item.id, { action: "mark_sold", sold_price: price });
    load();
  }

  // Update stok — step 1: input stok
  function openUpdateStock(item) {
    setStockModal(item);
  }

  // Update stok — eksekusi
  async function doUpdateStock(stockStr) {
    const stock = Number(stockStr);
    if (isNaN(stock)) return;
    setStockModal(null);
    await patch(stockModal.id, { action: "update_stock", stock });
    load();
  }

  async function pay(url, body, label) {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.snapToken && window.snap) {
        window.snap.pay(data.snapToken, { onSuccess: () => load(), onClose: () => load() });
      } else {
        setNote(`Tidak bisa memproses ${label} — cek Midtrans.`);
      }
    } finally {
      setBusy(false);
    }
  }

  function bump(item) {
    return pay("/api/payments/bump", { listing_id: item.id }, "bump");
  }

  // Featured — step 1: input hari
  function openFeatured(item) {
    setFeaturedModal(item);
  }

  // Featured — step 2: konfirmasi bayar
  function onFeaturedDaysEntered(daysStr) {
    const days = Number(daysStr);
    if (!days || isNaN(days) || days < 1) return;
    setFeaturedModal(null);
    setFeaturedConfirm({ item: featuredModal, days, total: days * 5000 });
  }

  // Featured — eksekusi
  function doFeatured() {
    const { item, days } = featuredConfirm;
    setFeaturedConfirm(null);
    pay("/api/payments/featured", { listing_id: item.id, days, per_day: 5000 }, "featured");
  }

  const active = items.filter((i) => i.status === "active");
  const soldItems = items.filter((i) => i.status === "sold");
  const pendingItems = items.filter((i) => i.status === "pending");
  const otherItems = items.filter((i) => i.status === "expired" || i.status === "suspended");
  const totalFee = soldItems.reduce((s, i) => s + (i.sold_fee || 0), 0);

  const snapUrl =
    process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true"
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js";

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Script
        src={snapUrl}
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || ""}
        strategy="afterInteractive"
      />

      {/* ===== Modals ===== */}

      {/* Input harga jual */}
      <InputModal
        open={!!soldModal}
        title="Harga Jual Final"
        label="Harga jual (Rp)"
        type="number"
        min={0}
        defaultValue={soldModal?.price || ""}
        placeholder="Masukkan harga deal"
        confirmLabel="Lanjut"
        onConfirm={(val) => onSoldPriceEntered(soldModal, val)}
        onClose={() => setSoldModal(null)}
      />

      {/* Konfirmasi mark sold */}
      <ConfirmModal
        open={!!soldPriceModal}
        title="Konfirmasi Terjual"
        message={
          soldPriceModal && (
            <div className="space-y-1">
              <p>Tandai <strong>{soldPriceModal.item.title}</strong> sebagai terjual?</p>
              <p className="mt-2 text-gray-500">
                Harga jual: <strong>{rupiah(soldPriceModal.price)}</strong>
              </p>
              <p className="text-gray-500">
                Fee admin: <strong className="text-primary">{rupiah(soldPriceModal.fee)}</strong>
              </p>
            </div>
          )
        }
        confirmLabel="Ya, Tandai Terjual"
        onConfirm={doMarkSold}
        onClose={() => setSoldPriceModal(null)}
      />

      {/* Input stok baru */}
      <InputModal
        open={!!stockModal}
        title="Update Stok"
        label={`Stok baru untuk "${stockModal?.title}"`}
        type="number"
        min={0}
        defaultValue={stockModal?.stock ?? ""}
        placeholder="0"
        confirmLabel="Simpan Stok"
        onConfirm={doUpdateStock}
        onClose={() => setStockModal(null)}
        hint="Stok 0 akan otomatis mengubah status menjadi Terjual"
      />

      {/* Input hari featured */}
      <InputModal
        open={!!featuredModal}
        title="Featured Iklan"
        label="Berapa hari featured?"
        type="number"
        min={1}
        defaultValue="1"
        placeholder="1"
        confirmLabel="Lanjut"
        onConfirm={onFeaturedDaysEntered}
        onClose={() => setFeaturedModal(null)}
        hint="Rp5.000 / hari — iklan tampil di banner utama"
      />

      {/* Konfirmasi bayar featured */}
      <ConfirmModal
        open={!!featuredConfirm}
        title="Konfirmasi Featured"
        message={
          featuredConfirm && (
            <div>
              <p>
                Featured <strong>{featuredConfirm.item.title}</strong> selama{" "}
                <strong>{featuredConfirm.days} hari</strong>?
              </p>
              <p className="mt-2 text-gray-500">
                Total: <strong className="text-primary">{rupiah(featuredConfirm.total)}</strong>
              </p>
            </div>
          )
        }
        confirmLabel="Bayar Sekarang"
        onConfirm={doFeatured}
        onClose={() => setFeaturedConfirm(null)}
      />

      {/* ===== UI ===== */}

      <h1 className="text-2xl font-extrabold">Dashboard Penjual</h1>
      <p className="mt-1 text-gray-500">Kelola iklan, stok, dan status barangmu.</p>

      {note && (
        <div className="mt-4 rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary">
          {note}
        </div>
      )}

      <div className="card mt-4 flex flex-col gap-3 p-4 sm:flex-row">
        <input
          className="input"
          value={wa}
          onChange={(e) => setWa(e.target.value)}
          placeholder="Masukkan no. WhatsApp kamu untuk lihat iklan"
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <button onClick={() => load()} disabled={busy} className="btn-primary shrink-0">
          {busy ? "Memuat…" : "Lihat Iklan"}
        </button>
      </div>

      {loaded && (
        <>
          {/* Tab Selection */}
          <div className="mt-8 flex gap-2 border-b dark:border-slate-800">
            <button
              onClick={() => setActiveTab("jual")}
              className={`pb-2.5 px-4 text-sm font-bold border-b-2 transition-all ${
                activeTab === "jual"
                  ? "border-primary text-gray-900 dark:border-white dark:text-white"
                  : "border-transparent text-gray-400 hover:text-gray-900 dark:hover:text-slate-200"
              }`}
            >
              📦 Iklan Jual ({items.length})
            </button>
            <button
              onClick={() => setActiveTab("dicari")}
              className={`pb-2.5 px-4 text-sm font-bold border-b-2 transition-all ${
                activeTab === "dicari"
                  ? "border-primary text-gray-900 dark:border-white dark:text-white"
                  : "border-transparent text-gray-400 hover:text-gray-900 dark:hover:text-slate-200"
              }`}
            >
              🔍 Kebutuhan Dicari ({wantedItems.length})
            </button>
          </div>

          {activeTab === "jual" ? (
            <div className="space-y-6">
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Iklan aktif" value={active.length} />
                <Stat label="Terjual" value={soldItems.length} />
                <Stat label="Total iklan" value={items.length} />
                <Stat label="Fee dibayar" value={rupiah(totalFee)} />
              </div>

              {/* Iklan Pending / Menunggu Pembayaran */}
              {pendingItems.length > 0 && (
                <div className="card p-4 border border-amber-200 bg-amber-500/5 dark:border-amber-950/40 dark:bg-amber-950/5 space-y-3">
                  <h2 className="text-base font-bold text-amber-700 dark:text-amber-400">
                    ⚠️ Iklan Menunggu Pembayaran ({pendingItems.length})
                  </h2>
                  <p className="text-xs text-amber-600 dark:text-amber-500">
                    Iklan Anda belum aktif di marketplace. Silakan selesaikan pembayaran agar iklan dapat ditayangkan.
                  </p>
                  <div className="space-y-3 mt-2">
                    {pendingItems.map((i) => (
                      <div
                        key={i.id}
                        className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center justify-between border border-amber-200/50 bg-white dark:bg-slate-900 rounded-xl dark:border-slate-800"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-slate-950">
                            {i.image_url && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={i.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate max-w-[200px] dark:text-white">{i.title}</p>
                            <p className="text-xs text-gray-500 dark:text-slate-400">{rupiah(i.price)}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setQrisModalItem(i)}
                            className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1 shadow-sm"
                          >
                            📸 Bayar / Konfirmasi WA
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h2 className="text-base font-bold dark:text-white">Iklan Aktif</h2>
                {active.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-400">
                    Belum ada iklan aktif.{" "}
                    <Link href="/jual" className="text-primary underline">
                      Pasang sekarang
                    </Link>
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {active.map((i) => (
                      <div
                        key={i.id}
                        className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center dark:border-slate-800"
                      >
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-slate-950">
                          {i.image_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={i.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`badge ${statusBadge(i.status)}`}>{i.status}</span>
                            <span className="badge bg-primary/10 text-primary">{i.category}</span>
                            <span className="badge bg-gray-150 text-gray-700 dark:bg-slate-800 dark:text-slate-350 flex items-center gap-1">
                              <Icon.MapPin className="h-3 w-3" /> {i.campus}
                            </span>
                            {daysLeft(i.expired_at) && (
                              <span className={`badge text-[10px] ${daysLeft(i.expired_at).cls}`}>
                                {daysLeft(i.expired_at).label}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 truncate font-semibold">{i.title}</p>
                          <p className="text-sm text-gray-500">
                            {rupiah(i.price)} · stok {i.stock}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => bump(i)} className="btn-outline text-xs flex items-center gap-1">
                            <Icon.ArrowUp className="h-3 w-3" /> Sundul 1k
                          </button>
                          <button onClick={() => openFeatured(i)} className="btn-outline text-xs flex items-center gap-1">
                            <Icon.Star className="h-3 w-3" /> Featured
                          </button>
                          <button onClick={() => openUpdateStock(i)} className="btn-outline text-xs">
                            <Icon.Package className="h-3 w-3 inline mr-1" /> Stok
                          </button>
                          <Link
                            href={`/edit/${i.id}`}
                            className="btn-outline text-xs"
                          >
                            <Icon.Edit2 className="h-3 w-3 inline mr-1" /> Edit
                          </Link>
                          <button onClick={() => openMarkSold(i)} className="btn-primary text-xs">
                            <Icon.CheckCircle className="h-3 w-3 inline mr-1" /> Mark Sold
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {soldItems.length > 0 && (
                <div>
                  <h2 className="text-base font-bold dark:text-white">Riwayat Terjual</h2>
                  <div className="mt-3 space-y-2">
                    {soldItems.map((i) => (
                      <div
                        key={i.id}
                        className="card flex items-center justify-between p-3 text-sm dark:border-slate-800"
                      >
                        <span className="truncate font-medium">{i.title}</span>
                        <span className="text-gray-500">
                          {rupiah(i.sold_price || i.price)} · fee {rupiah(i.sold_fee || 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Iklan Tidak Aktif (Expired / Suspended) */}
              {otherItems.length > 0 && (
                <div className="space-y-3 mt-6">
                  <h2 className="text-base font-bold text-gray-500 dark:text-slate-400">Iklan Tidak Aktif (Expired / Suspended)</h2>
                  <div className="space-y-3">
                    {otherItems.map((i) => (
                      <div
                        key={i.id}
                        className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center justify-between dark:border-slate-800 opacity-60 hover:opacity-100 transition-opacity"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-slate-950">
                            {i.image_url && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={i.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className={`badge ${statusBadge(i.status)}`}>{i.status}</span>
                              <span className="badge bg-gray-105 text-gray-500 dark:bg-slate-800 dark:text-slate-400">{i.category}</span>
                            </div>
                            <p className="font-semibold text-sm mt-0.5 dark:text-white">{i.title}</p>
                            <p className="text-xs text-gray-400">{rupiah(i.price)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {i.status === "expired" && (
                            <Link
                              href={`/edit/${i.id}`}
                              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                            >
                              <Icon.RefreshCw className="h-3 w-3" /> Pasang Ulang
                            </Link>
                          )}
                          <span className="text-xs text-gray-400 font-medium">
                            {i.status === "expired" ? "Masa aktif habis" : "Ditangguhkan admin"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <h2 className="text-base font-bold dark:text-white">Postingan Kebutuhan Dicari</h2>
              {wantedItems.length === 0 ? (
                <p className="text-sm text-gray-400">
                  Belum ada postingan dicari.{" "}
                  <Link href="/dicari" className="text-primary underline">
                    Pasang kebutuhan baru
                  </Link>
                </p>
              ) : (
                <div className="space-y-3">
                  {wantedItems.map((wi) => (
                    <div
                      key={wi.id}
                      className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center justify-between dark:border-slate-800"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`badge ${wi.status === "active" ? "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400" : "bg-gray-200 text-gray-700 dark:bg-slate-800 dark:text-slate-400"}`}>
                            {wi.status}
                          </span>
                          <span className="badge bg-primary/10 text-primary">{wi.category}</span>
                          <span className="badge bg-gray-150 text-gray-700 dark:bg-slate-800 dark:text-slate-350 flex items-center gap-1"><Icon.MapPin className="h-3 w-3 shrink-0" /> {wi.campus}</span>
                        </div>
                        <p className="mt-1.5 font-bold text-gray-900 dark:text-white">{wi.title}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                          Budget: {wi.budget > 0 ? rupiah(wi.budget) : "Nego"} · Area: {wi.area || "Sekitar Kampus"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {wi.status === "active" && (
                          <button
                            onClick={() => resolveWanted(wi.id)}
                            className="btn-primary text-xs"
                          >
                            <Icon.Check className="h-3 w-3 inline mr-1" /> Tandai Terpenuhi
                          </button>
                        )}
                        <button
                          onClick={() => deleteWanted(wi.id)}
                          className="btn-outline text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                        >
                          <Icon.X className="h-3 w-3 inline mr-1" /> Hapus
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal QRIS Manual */}
      {qrisModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-md bg-white p-6 shadow-2xl dark:bg-slate-900/95 dark:border-slate-800 animate-fade-in">
            <div className="text-center relative">
              <button
                type="button"
                onClick={() => setQrisModalItem(null)}
                className="absolute -right-2 -top-2 text-gray-400 hover:text-gray-650 text-lg p-1"
              >
                ✕
              </button>
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center justify-center gap-2">
                📸 QRIS Pembayaran Manual
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                Lakukan pembayaran manual dengan scan QRIS berikut:
              </p>
              
              <div className="mt-4 bg-white p-3 rounded-2xl inline-block border border-gray-100 shadow-sm mx-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src="/qris.png" 
                  alt="QRIS Jual Beli USU Polmed" 
                  className="max-h-[240px] object-contain"
                />
              </div>

              <div className="mt-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-950 border border-gray-150/40 dark:border-slate-850">
                <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wider font-semibold">Nominal Transfer</p>
                <p className="text-2xl font-black text-primary dark:text-white mt-0.5">
                  {rupiah(qrisModalItem.type === "poster" ? 10000 : 5000)}
                </p>
              </div>

              <p className="mt-4 text-xs text-gray-500 dark:text-slate-400 text-left leading-relaxed bg-accent/5 p-3 rounded-xl border border-accent/20">
                👉 Setelah transfer, klik tombol di bawah untuk mengirimkan bukti transfer ke admin agar iklan Anda langsung aktif.
              </p>

              <div className="mt-5 space-y-2">
                <a
                  href={`https://wa.me/62895429126232?text=${encodeURIComponent(
                    `Halo Admin, saya sudah membayar biaya pendaftaran iklan manual sebesar ${rupiah(qrisModalItem.type === "poster" ? 10000 : 5000)} untuk produk "${qrisModalItem.title}".\n\nDetail Iklan:\n- ID: ${qrisModalItem.id}\n- Penjual: ${qrisModalItem.seller_name}\n- WA: ${qrisModalItem.seller_wa}\n\nMohon bantuannya untuk mengaktifkan iklan saya. Terima kasih!`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-wa w-full text-center py-3 text-sm font-bold shadow-md hover:shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
                >
                  💬 Konfirmasi via WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => setQrisModalItem(null)}
                  className="btn-outline w-full text-center py-2.5 text-xs text-gray-600 dark:text-slate-350 hover:bg-gray-100 dark:hover:bg-slate-800"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-1 text-xl font-extrabold text-primary">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Memuat…</div>}>
      <DashboardInner />
    </Suspense>
  );
}
