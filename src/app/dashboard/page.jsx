"use client";

import { useEffect, useState, Suspense } from "react";
import Script from "next/script";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { rupiah, soldFee } from "@/lib/fees";
import ConfirmModal from "@/components/ConfirmModal";
import InputModal from "@/components/InputModal";
import { formatWa } from "@/lib/constants";
import { buildSlug } from "@/lib/slug";
import { Icon } from "@/components/Icons";
import { toast } from "sonner";

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
  const [sellerProfile, setSellerProfile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const [wantedItems, setWantedItems] = useState([]);
  const [activeTab, setActiveTab] = useState("jual");

  // Config from API (for dynamic admin WA number)
  const [cfg, setCfg] = useState(null);

  // Modal state
  const [soldModal, setSoldModal] = useState(null);
  const [soldPriceModal, setSoldPriceModal] = useState(null);
  const [stockModal, setStockModal] = useState(null);

  const [featuredModal, setFeaturedModal] = useState(null);
  const [featuredConfirm, setFeaturedConfirm] = useState(null);

  const [autobumpConfirm, setAutobumpConfirm] = useState(null);

  const [qrisModalItem, setQrisModalItem] = useState(null);

  useEffect(() => {
    // FIXED: Load config from API for dynamic admin WA
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => setCfg(d))
      .catch(() => {});

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
      setSellerProfile(dataListings.profile || null);
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
      toast.error(err.message);
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
      toast.success("Postingan dicari berhasil dihapus");
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function patch(id, body) {
    const res = await fetch(`/api/listings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, seller_wa: wa }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gagal menyimpan perubahan");
    return data;
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
    try {
      await patch(item.id, { action: "mark_sold", sold_price: price });
      toast.success("Berhasil ditandai terjual");
      load();
    } catch (e) {
      toast.error(e.message);
    }
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
    try {
      await patch(stockModal.id, { action: "update_stock", stock });
      toast.success("Stok berhasil diperbarui");
      load();
    } catch (e) {
      toast.error(e.message);
    }
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
      if (!res.ok) throw new Error(data.error || "Gagal memproses pembayaran");

      if (data.freeBumpUsed) {
        toast.success("Berhasil disundul menggunakan Kuota Free Bump!");
        load();
        return;
      }

      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        setNote(`Tidak bisa memproses ${label} — link iPaymu tidak ditemukan.`);
      }
    } catch (e) {
      toast.error(e.message);
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

  // Autobump
  function doAutobump() {
    const { item } = autobumpConfirm;
    setAutobumpConfirm(null);
    pay("/api/payments/autobump", { listing_id: item.id }, "autobump");
  }

  const active = items.filter((i) => i.status === "active");
  const soldItems = items.filter((i) => i.status === "sold");
  const pendingItems = items.filter((i) => i.status === "pending");
  const otherItems = items.filter((i) => i.status === "expired" || i.status === "suspended");
  const totalFee = soldItems.reduce((s, i) => s + (i.sold_fee || 0), 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">

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

      {/* Konfirmasi bayar autobump */}
      <ConfirmModal
        open={!!autobumpConfirm}
        title="Konfirmasi Auto-Bump"
        message={
          autobumpConfirm && (
            <div>
              <p>
                Aktifkan Auto-Bump untuk <strong>{autobumpConfirm.item.title}</strong>?
              </p>
              <ul className="mt-2 list-inside list-disc text-sm text-gray-500 space-y-1">
                <li>Iklan otomatis naik ke atas setiap jam 8 pagi.</li>
                <li>Berlaku selama 7 hari berturut-turut.</li>
              </ul>
              <p className="mt-3 text-gray-500">
                Total: <strong className="text-primary">{rupiah(15000)}</strong>
              </p>
            </div>
          )
        }
        confirmLabel="Bayar Rp 15.000"
        onConfirm={doAutobump}
        onClose={() => setAutobumpConfirm(null)}
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

      {busy && !loaded && (
        <div className="mt-8 space-y-6">
          <div className="flex gap-2 border-b dark:border-slate-800">
            <div className="h-8 w-32 animate-pulse bg-gray-200 dark:bg-slate-800 rounded-t-md"></div>
            <div className="h-8 w-32 animate-pulse bg-gray-100 dark:bg-slate-900 rounded-t-md"></div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl animate-pulse bg-white dark:bg-slate-900/30 border border-gray-100 dark:border-slate-800"></div>
            ))}
          </div>
          <div className="space-y-4">
            <div className="h-6 w-32 animate-pulse bg-gray-200 dark:bg-slate-800 rounded"></div>
            <div className="flex flex-col gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 rounded-xl animate-pulse bg-white dark:bg-slate-900/30 border border-gray-100 dark:border-slate-800"></div>
              ))}
            </div>
          </div>
        </div>
      )}

      {loaded && !busy && (
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
            <button
              onClick={() => setActiveTab("referral")}
              className={`pb-2.5 px-4 text-sm font-bold border-b-2 transition-all ${
                activeTab === "referral"
                  ? "border-primary text-gray-900 dark:border-white dark:text-white"
                  : "border-transparent text-gray-400 hover:text-gray-900 dark:hover:text-slate-200"
              }`}
            >
              🎁 Referral
            </button>
            <button
              onClick={() => setActiveTab("pro")}
              className={`pb-2.5 px-4 text-sm font-bold border-b-2 transition-all ${
                activeTab === "pro"
                  ? "border-amber-500 text-amber-600 dark:border-amber-400 dark:text-amber-400"
                  : "border-transparent text-gray-400 hover:text-gray-900 dark:hover:text-slate-200"
              }`}
            >
              🌟 Paket Pro
            </button>
          </div>

          {activeTab === "pro" ? (
            <div className="space-y-6 mt-6">
              <div className="card p-6 border-2 border-amber-200 bg-amber-50/30 dark:border-amber-900/30 dark:bg-amber-900/10">
                <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left">
                  <div className="h-24 w-24 shrink-0 rounded-2xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-4xl">
                    👑
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-extrabold text-amber-900 dark:text-amber-300">Langganan Penjual Pro</h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-slate-400 leading-relaxed max-w-lg">
                      Dengan Paket Pro, Anda bisa memasang iklan standar sepuasnya (0 Rp per iklan) selama 30 hari penuh. Sangat cocok untuk Anda yang memiliki toko atau sering berjualan!
                    </p>

                    {sellerProfile?.subscription_tier === "pro" && new Date(sellerProfile?.subscription_expires_at) > new Date() ? (
                      <div className="mt-4 p-4 rounded-xl bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-900/50">
                        <p className="text-sm font-bold text-green-700 dark:text-green-400">✅ Anda adalah Penjual Pro</p>
                        <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                          Langganan aktif sampai dengan {new Date(sellerProfile.subscription_expires_at).toLocaleDateString("id-ID", { dateStyle: "long" })}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-5">
                        <button
                          onClick={() => pay("/api/payments/subscribe", { seller_wa: wa }, "subscribe")}
                          disabled={busy}
                          className="btn-primary bg-amber-500 hover:bg-amber-600 border-amber-600 text-white shadow-lg shadow-amber-500/30 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 w-full sm:w-auto justify-center disabled:opacity-50"
                        >
                          🌟 Beli Paket Pro (Rp 49.000 / 30 Hari)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === "referral" ? (
            <div className="space-y-6 mt-6">
              <div className="card p-6 border-2 border-indigo-100 bg-indigo-50/30 dark:border-indigo-900/30 dark:bg-indigo-900/10">
                <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left">
                  <div className="h-24 w-24 shrink-0 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-4xl">
                    🤝
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-extrabold text-indigo-900 dark:text-indigo-300">Program Ajak Teman</h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-slate-400 leading-relaxed max-w-lg">
                      Bagikan kode referral Anda ke teman-teman yang belum menggunakan Jual Beli USU Polmed. Setiap teman yang mendaftar menggunakan kode Anda, Anda berdua akan mendapatkan <strong className="text-indigo-600 dark:text-indigo-400">1x Kuota Bump Iklan Gratis!</strong>
                    </p>
                    
                    {sellerProfile?.referral_code ? (
                      <div className="mt-4 flex flex-col sm:flex-row gap-3 items-center">
                        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg">
                          <span className="text-xs text-gray-500 font-semibold uppercase">Kode Anda:</span>
                          <span className="font-mono text-lg font-bold tracking-wider text-gray-900 dark:text-white select-all">{sellerProfile.referral_code}</span>
                        </div>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(sellerProfile.referral_code);
                            toast.success("Kode referral disalin!");
                          }}
                          className="btn-outline text-sm py-2 px-4"
                        >
                          📋 Salin Kode
                        </button>
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-amber-600 font-medium">Buat iklan pertamamu untuk mendapatkan kode referral!</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="card p-5">
                  <h3 className="text-gray-500 text-sm font-semibold mb-1">Kuota Free Bump Anda</h3>
                  <div className="text-4xl font-black text-indigo-600 dark:text-indigo-400">{sellerProfile?.free_bumps || 0}</div>
                  <p className="mt-2 text-xs text-gray-400">Gunakan kuota ini saat menaikkan iklan (sundul) agar gratis.</p>
                </div>
              </div>
            </div>
          ) : activeTab === "jual" ? (
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
                              <Image src={i.image_url} alt="" width={48} height={48} loading="lazy" className="h-full w-full object-cover" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate max-w-[200px] dark:text-white">{i.title}</p>
                            <p className="text-xs text-gray-500 dark:text-slate-400">{rupiah(i.price)}</p>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={async () => {
                              try {
                                setBusy(true);
                                const res = await fetch("/api/payments/resume", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ listing_id: i.id, seller_wa: wa }),
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.error);
                                
                                if (data.paymentUrl) {
                                  window.location.href = data.paymentUrl;
                                } else {
                                  toast.error("Gagal mendapatkan link iPaymu.");
                                }
                              } catch (e) {
                                toast.error(e.message);
                              } finally {
                                setBusy(false);
                              }
                            }}
                            className="btn-primary py-1.5 px-3 text-xs flex items-center justify-center gap-1 shadow-sm"
                          >
                            💳 Lanjutkan Pembayaran
                          </button>
                          <button
                            onClick={() => setQrisModalItem(i)}
                            className="btn-outline py-1.5 px-3 text-xs flex items-center justify-center gap-1 shadow-sm"
                          >
                            📸 Bayar Manual
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
                  <div className="mt-6 flex flex-col items-center justify-center py-12 px-4 text-center bg-gray-50/50 dark:bg-slate-900/20 rounded-3xl border border-gray-100 dark:border-slate-800/60">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full w-24 h-24 -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2"></div>
                      <Icon.Package className="w-24 h-24 text-gray-300 dark:text-slate-700 relative z-10" />
                    </div>
                    <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2">Belum ada iklan aktif</h3>
                    <p className="max-w-md text-sm text-gray-500 dark:text-slate-400 mb-6 leading-relaxed">
                      Barang tidak terpakai? Ubah jadi uang jajan! Pasang iklan pertamamu sekarang.
                    </p>
                    <Link
                      href="/jual"
                      className="group relative inline-flex items-center justify-center overflow-hidden rounded-full p-3 px-6 font-bold text-white bg-primary hover:bg-primary-dark transition-all duration-300 active:scale-95 shadow-lg shadow-primary/30"
                    >
                      <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black"></span>
                      <span className="relative flex items-center gap-2">
                        + Pasang Iklan Sekarang
                      </span>
                    </Link>
                  </div>
                ) : (
                  <div className="mt-3 space-y-3">
                    {active.map((i) => (
                      <div
                        key={i.id}
                        className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center dark:border-slate-800"
                      >
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-slate-950">
                          {i.image_url && (
                            <Image src={i.image_url} alt="" width={64} height={64} loading="lazy" className="h-full w-full object-cover" />
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
                          
                          {/* Tools Promosi */}
                          <div className="flex flex-wrap gap-2 mt-3">
                            <button
                              onClick={() => bump(i)}
                              className="btn-outline border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-900/30 flex-1 sm:flex-none text-xs px-3 py-1.5"
                              title="Sundul iklan ke atas"
                            >
                              🚀 Sundul (Rp 1rb)
                            </button>
                            <button
                              onClick={() => setAutobumpConfirm({ item: i })}
                              className="btn-outline border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-400 dark:hover:bg-indigo-900/30 flex-1 sm:flex-none text-xs px-3 py-1.5"
                              title="Sundul otomatis setiap pagi selama 7 hari"
                            >
                              ⚡ Auto-Bump
                            </button>
                            <button
                              onClick={() => openFeatured(i)}
                              className="btn-outline border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-400 dark:hover:bg-amber-900/30 flex-1 sm:flex-none text-xs px-3 py-1.5"
                            >
                              ⭐️ Featured
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
                              <Image src={i.image_url} alt="" width={48} height={48} loading="lazy" className="h-full w-full object-cover" />
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
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                          {i.status === "expired" && (
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                ⏰ Masa aktif habis
                              </span>
                              <Link
                                href={`/edit/${i.id}`}
                                className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1 w-fit"
                                aria-label={`Perpanjang iklan ${i.title}`}
                              >
                                🔄 Perpanjang Iklan
                              </Link>
                              <p className="text-[10px] text-gray-400 max-w-[180px]">
                                Edit & pasang ulang iklan ini tanpa buat baru
                              </p>
                            </div>
                          )}
                          {i.status === "suspended" && (
                            <span className="text-xs text-rose-500 font-medium">
                              🚫 Ditangguhkan admin
                            </span>
                          )}
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
                <div className="mt-6 flex flex-col items-center justify-center py-12 px-4 text-center bg-gray-50/50 dark:bg-slate-900/20 rounded-3xl border border-gray-100 dark:border-slate-800/60">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full w-24 h-24 -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2"></div>
                    <Icon.Search className="w-24 h-24 text-gray-300 dark:text-slate-700 relative z-10" />
                  </div>
                  <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2">Belum ada postingan dicari</h3>
                  <p className="max-w-md text-sm text-gray-500 dark:text-slate-400 mb-6 leading-relaxed">
                    Sedang mencari barang spesifik? Buat postingan di Papan Dicari agar penjual yang punya barang bisa langsung menghubungi Anda.
                  </p>
                  <Link
                    href="/dicari"
                    className="group relative inline-flex items-center justify-center overflow-hidden rounded-full p-3 px-6 font-bold text-gray-700 bg-white border border-gray-200 hover:border-gray-300 transition-all duration-300 active:scale-95 shadow-sm dark:bg-transparent dark:border-slate-700 dark:text-slate-200"
                  >
                    <span className="relative flex items-center gap-2">
                      <Icon.Edit2 className="w-4 h-4" /> Pasang Kebutuhan Baru
                    </span>
                  </Link>
                </div>
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
                <Image 
                  src="/qris.png" 
                  alt="QRIS Jual Beli USU Polmed" 
                  width={400}
                  height={400}
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
                  href={`https://wa.me/${cfg?.contact?.marketplaceWa || "62895429126232"}?text=${encodeURIComponent(
                    `Halo Admin, saya sudah membayar biaya pendaftaran iklan manual sebesar ${rupiah(qrisModalItem.type === "poster" ? 10000 : 5000)} untuk produk "${qrisModalItem.title}".\n\n🔗 *Cek langsung iklannya di sini:*\nhttps://www.jualbeliusupolmed.web.id/admin/listings/${buildSlug(qrisModalItem.title, qrisModalItem.id)}\n\nDetail Iklan:\n- Penjual: ${qrisModalItem.seller_name}\n- WA: ${qrisModalItem.seller_wa}\n\nMohon bantuannya untuk mengaktifkan iklan saya. Terima kasih!`
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
