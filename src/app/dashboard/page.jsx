"use client";

import { useEffect, useState, Suspense } from "react";
import Script from "next/script";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { rupiah, soldFeeFrom, adFeeFrom } from "@/lib/fees";
import ConfirmModal from "@/components/ConfirmModal";
import InputModal from "@/components/InputModal";
import { formatWa } from "@/lib/constants";
import { buildSlug } from "@/lib/slug";
import { Icon } from "@/components/Icons";
import { toast } from "sonner";
import QRISModal from "@/components/QRISModal";
import PushNotificationButton from "@/components/PushNotificationButton";
import BagikanIklan from "@/components/BagikanIklan";
import BlogPenulisPanel from "@/components/BlogPenulisPanel";
import UnifiedProfilePanel from "@/components/dashboard/UnifiedProfilePanel";
import SellerAnalyticsView from "@/components/dashboard/SellerAnalyticsView";
import UkmDashboardView from "@/components/dashboard/UkmDashboardView";
import OprecPengurusPanel from "@/components/oprec/OprecPengurusPanel";
import BuatOprecModal from "@/components/oprec/BuatOprecModal";
import UserOpenPoWorkspace from "@/components/open-po/UserOpenPoWorkspace";
import { useSesi } from "@/components/SesiProvider";
import { StatusBadge } from "@/components/ui/DesignSystem";
import { DASHBOARD_TABS, resolveDashboardTab } from "@/lib/dashboardTabs";

function statusBadge(s) {
  const map = {
    active: "success",
    pending: "warning",
    sold: "neutral",
    expired: "danger",
    suspended: "danger",
  };
  return map[s] || "neutral";
}

function daysLeft(expiredAt) {
  if (!expiredAt) return null;
  const diff = new Date(expiredAt) - new Date();
  if (diff <= 0) return { label: "Masa aktif habis", cls: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400", IconComponent: Icon.Clock3 };
  const days = Math.ceil(diff / 864e5);
  if (days <= 3) return { label: `Sisa ${days} hari`, cls: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400", IconComponent: Icon.AlertCircle };
  if (days <= 7) return { label: `Sisa ${days} hari`, cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", IconComponent: Icon.Clock3 };
  return null;
}

function DashboardInner() {
  const { wa: sesiWa, siap: sesiSiap } = useSesi();
  const params = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [wa, setWa] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [items, setItems] = useState([]);
  const [sellerProfile, setSellerProfile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [loadError, setLoadError] = useState(false);

  const [wantedItems, setWantedItems] = useState([]);
  const [offers, setOffers] = useState([]);
  const [activeTab, setActiveTab] = useState("jual");
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // UKM / Organisasi state
  const [oprecList, setOprecList] = useState([]);
  const [oprecLoading, setOprecLoading] = useState(false);
  const [oprecLoaded, setOprecLoaded] = useState(false);
  const [pengurusPanel, setPengurusPanel] = useState(null); // oprec yang sedang dibuka panelnya
  const [buatOprecModal, setBuatOprecModal] = useState(false);
  const isUkmAccount = !!(sellerProfile?.account_type === "ukm" || sellerProfile?.ukm_verified || sellerProfile?.ukm_name);

  const [sponsoredModal, setSponsoredModal] = useState(null);
  const [sponsoredConfirm, setSponsoredConfirm] = useState(null);

  // Config from API (for dynamic admin WA number)
  const [cfg, setCfg] = useState(null);

  // Modal state
  const [soldModal, setSoldModal] = useState(null);
  const [soldPriceModal, setSoldPriceModal] = useState(null);
  const [stockModal, setStockModal] = useState(null);

  const [featuredModal, setFeaturedModal] = useState(null);
  const [featuredConfirm, setFeaturedConfirm] = useState(null);

  const [autobumpConfirm, setAutobumpConfirm] = useState(null);
  const [renewConfirm, setRenewConfirm] = useState(null);
  const [deleteListingConfirm, setDeleteListingConfirm] = useState(null);
  const [deleteWantedConfirm, setDeleteWantedConfirm] = useState(null);

  const [qrisModalItem, setQrisModalItem] = useState(null);
  const [openActionMenu, setOpenActionMenu] = useState(null);
  // Iklan yang sedang dibuka lembar "Bagikan"-nya.
  const [bagikan, setBagikan] = useState(null);
  const [activeQrisUrl, setActiveQrisUrl] = useState("");
  const [activeQrisFee, setActiveQrisFee] = useState(0);
  const [activeQrisOrderId, setActiveQrisOrderId] = useState("");

  const router = useRouter();

  function selectTab(tab) {
    if (!DASHBOARD_TABS.includes(tab)) return;
    const currentTabParam = params.get("tab");
    if (
      activeTab === tab &&
      (tab === "jual" ? !currentTabParam : currentTabParam === tab)
    ) {
      return;
    }

    setActiveTab(tab);
    router.push(tab === "jual" ? "/dashboard" : `/dashboard?tab=${tab}`, { scroll: false });
  }

  useEffect(() => {
    setMounted(true);
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => setCfg(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Keep browser history, direct links, and the selected workspace in sync.
    setActiveTab(resolveDashboardTab(params.get("tab"), { isUkmAccount, loaded }));
    if (params.get("paid")) setNote("Pembayaran sukses! Barang segera ditampilkan.");
    if (params.get("pending")) setNote("Pembayaran pending. Selesaikan ya.");
    if (params.get("edited")) setNote("Detail jual barang berhasil diperbarui!");
  }, [params, loaded, isUkmAccount]);

  useEffect(() => {
    if (!wa) return;
    if (activeTab === "statistik" && !analytics) loadAnalytics(wa);
    if (activeTab === "ukm" && isUkmAccount && !oprecLoaded) loadOprec(wa);
    // Load tab-specific data for direct links and browser history navigation too.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, wa, isUkmAccount]);

  // Identitas dashboard datang dari sesi bersama.
  //
  // Dulu ia membaca localStorage lebih dulu dan baru menoleh ke
  // /api/auth/me kalau kosong. Dua akibatnya: (1) nomor basi di localStorage
  // — kuki sudah kedaluwarsa, atau peranti itu dipakai bergantian — dipercaya
  // apa adanya dan dashboard memuat akun yang salah; (2) panggilan
  // /api/auth/me kedua, sesudah Navbar memanggilnya juga.
  //
  // Sekarang kukinya yang menentukan, dan menunggu `siap` berarti tidak ada
  // lagi lemparan ke halaman login yang berkedip sepersekian detik sebelum
  // sesi selesai terbaca.
  useEffect(() => {
    if (!sesiSiap) return;
    if (!sesiWa) {
      router.push("/dashboard/login?next=" + encodeURIComponent(pathAsli()));
      return;
    }
    const cleanWa = formatWa(sesiWa) || sesiWa;
    setWa(cleanWa);
    load(cleanWa);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesiSiap, sesiWa]);

  async function load(num) {
    let raw = (num ?? wa)?.trim();
    if (!raw) return;
    const n = formatWa(raw) || raw;
    setWa(n);
    setBusy(true);
    setLoadError(false);
    try {
      const [resListings, resWanted, resOffers, resProfil] = await Promise.all([
        fetch(`/api/listings?seller_wa=${encodeURIComponent(n)}`),
        fetch(`/api/wanted?buyer_wa=${encodeURIComponent(n)}`),
        fetch(`/api/offers?seller_wa=${encodeURIComponent(n)}`),
        // Satu pintu. Dulu baris ini menembak /api/teman/profiles — kartu Cari
        // Teman dipakai sebagai sumber kebenaran untuk nama dan foto SELURUH
        // dashboard, lalu ditumpuk di atas profil penjual dengan rantai `||`.
        // Akibatnya siapa yang menang bergantung pada fitur mana yang kebetulan
        // diisi lebih dulu, dan identitas orang yang sama bisa berbeda antar
        // halaman. Sekarang sumbernya satu dan tahu perannya sendiri.
        fetch("/api/profil", { cache: "no-store" }),
      ]);
      const dataListings = await resListings.json();
      const dataWanted = await resWanted.json();
      const dataOffers = await resOffers.json();
      const dataProfil = await resProfil.json();
      const p = dataProfil?.profil || {};

      const mergedProfile = {
        ...(dataListings.profile || {}),
        ...p,
        name: p.name || dataListings.profile?.name || "Penjual",
        // Nama kolomnya `avatar_url`; `photo_url` dipertahankan di sini karena
        // itulah yang dibaca header dashboard dan beberapa komponen lain.
        photo_url: p.avatar_url || p.teman?.photo_url || "",
        campus: p.campus || "Umum",
        faculty: p.faculty || "Umum",
        bio: p.bio || "",
      };

      setItems(dataListings.listings || []);
      setSellerProfile(mergedProfile);
      setWantedItems(dataWanted.listings || []);
      setOffers(dataOffers.offers || []);

      const isUkm = !!(mergedProfile?.account_type === "ukm" || mergedProfile?.ukm_verified || mergedProfile?.ukm_name);
      if (!loaded) {
        setActiveTab(resolveDashboardTab(params.get("tab"), { isUkmAccount: isUkm, loaded: true }));
      }
      setLoaded(true);
      localStorage.setItem("seller_wa", n);
    } catch (e) {
      console.error(e);
      setLoadError(true);
      toast.error("Gagal memuat data dashboard. Periksa koneksi internet lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function loadAnalytics(num) {
    const raw = (num ?? wa)?.trim();
    if (!raw) return;
    const n = formatWa(raw) || raw;
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`/api/analytics/seller?wa=${encodeURIComponent(n)}`);
      const data = await res.json();
      setAnalytics(data);
    } catch (_) {
    } finally {
      setAnalyticsLoading(false);
    }
  }

  async function loadOprec(num) {
    const raw = (num ?? wa)?.trim();
    if (!raw) return;
    const n = formatWa(raw) || raw;
    setOprecLoading(true);
    try {
      const res = await fetch(`/api/oprec?ukm_wa=${encodeURIComponent(n)}&status=all`);
      const data = await res.json();
      setOprecList(data.oprecs || []);
      setOprecLoaded(true);
    } catch (_) {
    } finally {
      setOprecLoading(false);
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
      load(wa);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  function deleteListing(id, title) {
    setDeleteListingConfirm({ id, title });
  }

  async function confirmDeleteListing() {
    if (!deleteListingConfirm) return;
    const { id } = deleteListingConfirm;
    setDeleteListingConfirm(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus barang jualan");
      toast.success("Barang jualan berhasil dihapus.");
      load(wa);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  function deleteWanted(id) {
    setDeleteWantedConfirm({ id });
  }

  async function confirmDeleteWanted() {
    if (!deleteWantedConfirm) return;
    const { id } = deleteWantedConfirm;
    setDeleteWantedConfirm(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/wanted/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Gagal menghapus postingan");
      toast.success("Postingan dicari berhasil dihapus");
      load(wa);
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
    setSoldPriceModal({ item, price, fee: soldFeeFrom(cfg?.pricing, price) });
  }

  // Mark sold — step 3: eksekusi
  async function doMarkSold() {
    if (!soldPriceModal) return;
    const { item, price } = soldPriceModal;
    setSoldPriceModal(null);
    try {
      const data = await patch(item.id, { action: "mark_sold", sold_price: price });
      toast.success("Barang berhasil ditandai terjual.");
      if (data.paymentUrl && data.fee > 0) {
        setActiveQrisUrl(data.paymentUrl);
        setActiveQrisFee(data.finalAmount || data.fee);
        setActiveQrisOrderId(data.orderId || "");
      }
      load(wa);
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
    // Bug #3 Fix: Simpan referensi stockModal ke variable lokal SEBELUM di-null-kan,
    // karena setStockModal(null) bersifat async dan state lama tidak bisa dibaca
    // setelah null di-set. Mengakses stockModal.id setelah null → TypeError crash.
    const modalTarget = stockModal;
    setStockModal(null);
    try {
      const data = await patch(modalTarget.id, { action: "update_stock", stock });
      if (stock === 0 && data.fee > 0) {
        toast.success("Barang ditandai terjual. Silakan lunasi komisi sukses di bagian Tagihan Pending.");
      } else {
        toast.success("Stok berhasil diperbarui");
      }
      load(wa);
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
        load(wa);
        return;
      }

      if (data.paymentUrl) {
        setActiveQrisUrl(data.paymentUrl);
        // Gunakan finalAmount (total KlikQris termasuk kode unik) sebagai nominal yang harus dibayar
        const feeToShow = data.finalAmount || data.fee || data.amount;
        if (label === 'autobump') setActiveQrisFee(feeToShow || 15000);
        else if (label === 'bump') setActiveQrisFee(feeToShow || 1000);
        else if (label === 'featured') setActiveQrisFee(feeToShow || body.total || body.days * 5000);
        else if (label === 'renewal') setActiveQrisFee(feeToShow || 10000);
        else if (label === 'subscribe') setActiveQrisFee(feeToShow || 49000);
        else if (label === 'sponsored') setActiveQrisFee(feeToShow || (body.days || 1) * 7000);
        else if (label === 'sold_fee') setActiveQrisFee(feeToShow || 0);
        setActiveQrisOrderId(data.orderId || "");
      } else {
        setNote(`Tidak bisa memproses ${label} — link pembayaran tidak ditemukan.`);
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

  // Renew (Perpanjang)
  function doRenew() {
    const { item } = renewConfirm;
    setRenewConfirm(null);
    pay("/api/payments/renew", { listing_id: item.id, seller_wa: wa }, "renewal");
  }

  const active = items.filter((i) => i.status === "active");
  const soldItems = items.filter((i) => i.status === "sold");
  const pendingItems = items.filter((i) => i.status === "pending");
  const otherItems = items.filter((i) => i.status === "expired" || i.status === "suspended");
  const totalFee = soldItems.reduce((s, i) => s + (i.sold_fee || 0), 0);
  const totalViews = items.reduce((s, i) => s + (i.views || 0), 0);

  if (!mounted) {
    return (
      <div
        role="status"
        aria-label="Memuat data dashboard"
        className="mx-auto max-w-6xl space-y-6 px-4 py-6 animate-pulse sm:px-7"
      >
        <span className="sr-only">Memuat dashboard akun.</span>
        <div className="h-32 rounded-3xl bg-gray-100 dark:bg-slate-800/50" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="h-10 rounded-xl bg-gray-100 dark:bg-slate-800/50" />
          <div className="h-10 rounded-xl bg-gray-100 dark:bg-slate-800/50" />
          <div className="h-10 rounded-xl bg-gray-100 dark:bg-slate-800/50" />
          <div className="h-10 rounded-xl bg-gray-100 dark:bg-slate-800/50" />
        </div>
        <div className="h-64 rounded-2xl bg-gray-100 dark:bg-slate-800/50" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 pb-24 sm:px-7 sm:py-8 sm:pb-10">

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

      {/* Lembar "Bagikan" satu iklan — dipanggil dari tombol di kartu iklan. */}
      {bagikan && <BagikanIklan listing={bagikan} onClose={() => setBagikan(null)} />}

      {/* Konfirmasi mark sold */}
      <ConfirmModal
        open={!!soldPriceModal}
        title="Konfirmasi Terjual"
        message={
          soldPriceModal && (
            <div className="space-y-2">
              <p>Tandai <strong>{soldPriceModal.item.title}</strong> sebagai terjual?</p>
              <p className="text-gray-500">
                Harga jual: <strong>{rupiah(soldPriceModal.price)}</strong>
              </p>
              {soldPriceModal.fee > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-900/50 text-sm">
                  <p className="inline-flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                    <Icon.AlertCircle className="h-4 w-4" />
                    Barang langsung diturunkan
                  </p>
                  <p className="text-amber-700 dark:text-amber-400 mt-1">
                    Fee komisi <strong>{rupiah(soldPriceModal.fee)}</strong> akan muncul sebagai tagihan. Bayar via QRIS sekarang atau nanti.
                  </p>
                </div>
              )}
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
        title="Unggulkan Barang"
        label="Berapa hari featured?"
        type="number"
        min={1}
        defaultValue="1"
        placeholder="1"
        confirmLabel="Lanjut"
        onConfirm={onFeaturedDaysEntered}
        onClose={() => setFeaturedModal(null)}
        hint="Rp5.000 / hari — barang tampil di banner utama"
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

      {/* Input hari sponsored */}
      <InputModal
        open={!!sponsoredModal}
        title="Promosikan Barang"
        label="Berapa hari ingin disponsori?"
        type="number"
        min={1}
        defaultValue="1"
        placeholder="1"
        confirmLabel="Lanjut"
        onConfirm={(daysStr) => {
          const days = Number(daysStr);
          if (!days || isNaN(days) || days < 1) return;
          setSponsoredModal(null);
          setSponsoredConfirm({ item: sponsoredModal, days, total: days * 7000 });
        }}
        onClose={() => setSponsoredModal(null)}
        hint="Rp7.000 / hari — barang tampil paling atas dengan label Sponsor"
      />
      <ConfirmModal
        open={!!sponsoredConfirm}
        title="Konfirmasi Sponsored"
        message={
          sponsoredConfirm && (
            <div>
              <p>Promosikan barang <strong>{sponsoredConfirm.item.title}</strong> selama <strong>{sponsoredConfirm.days} hari</strong>?</p>
              <p className="mt-2 text-gray-500">Total: <strong className="text-primary">{rupiah(sponsoredConfirm.total)}</strong></p>
            </div>
          )
        }
        confirmLabel="Bayar Sekarang"
        onConfirm={() => {
          const { item, days } = sponsoredConfirm;
          setSponsoredConfirm(null);
          pay("/api/payments/sponsored", { listing_id: item.id, days }, "sponsored");
        }}
        onClose={() => setSponsoredConfirm(null)}
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
                <li>Barang otomatis naik ke atas setiap jam 8 pagi.</li>
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

      {/* Konfirmasi bayar perpanjang (renew) */}
      <ConfirmModal
        open={!!renewConfirm}
        title="Konfirmasi Perpanjang Masa Tayang"
        message={
          renewConfirm && (
            <div>
              <p>
                Perpanjang masa tayang barang <strong>{renewConfirm.item.title}</strong>?
              </p>
              <ul className="mt-2 list-inside list-disc text-sm text-gray-500 space-y-1">
                <li>Barang akan kembali aktif dan naik ke atas feed.</li>
                <li>Masa tayang bertambah.</li>
              </ul>
            </div>
          )
        }
        confirmLabel="Lanjut Pembayaran"
        onConfirm={doRenew}
        onClose={() => setRenewConfirm(null)}
      />

      {/* Konfirmasi hapus barang jualan */}
      <ConfirmModal
        open={!!deleteListingConfirm}
        title="Hapus Barang Jualan Permanen"
        message={
          deleteListingConfirm && (
            <p>
              Hapus barang <strong>&ldquo;{deleteListingConfirm.title}&rdquo;</strong> secara permanen? Aksi ini tidak dapat dibatalkan.
            </p>
          )
        }
        confirmLabel="Ya, Hapus"
        onConfirm={confirmDeleteListing}
        onClose={() => setDeleteListingConfirm(null)}
      />

      {/* Konfirmasi hapus postingan dicari */}
      <ConfirmModal
        open={!!deleteWantedConfirm}
        title="Hapus Postingan Dicari"
        message="Hapus postingan dicari ini secara permanen?"
        confirmLabel="Ya, Hapus"
        onConfirm={confirmDeleteWanted}
        onClose={() => setDeleteWantedConfirm(null)}
      />

      <QRISModal 
        qrisUrl={activeQrisUrl} 
        fee={activeQrisFee} 
        transactionId={activeQrisOrderId}
        onClose={() => { setActiveQrisUrl(""); load(wa); }} 
      />

      {/* ===== UI ===== */}

      {/* ===== DASHBOARD HEADER ===== */}
      <header className="mb-5 flex flex-col gap-4 border-b border-emerald-950/10 pb-5 dark:border-white/10 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Ruang akun</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            Dashboard
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-700 dark:text-slate-300">
            Kelola barang, pesanan, performa, dan profil akunmu.
          </p>
        </div>
        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:items-center">
          {wa && <PushNotificationButton wa={wa} />}
          {loaded && (
            <Link 
              href={isUkmAccount ? "/jual?type=danus" : "/jual"} 
              className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#134e35] px-5 text-sm font-bold text-white transition-colors hover:bg-[#0a2e1f] active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:w-auto"
            >
              <Icon.PlusCircle className="h-4 w-4" aria-hidden="true" />
              <span>{isUkmAccount ? "Tambah Danus / Merch" : "Jual Barang"}</span>
            </Link>
          )}
        </div>
      </header>

      <section className="mb-5 overflow-hidden rounded-2xl border border-emerald-950/10 bg-[#0a2e1f] p-5 text-white sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-lime-200/70 bg-emerald-950 text-lg font-black text-lime-200">
              {sellerProfile?.photo_url ? (
                <Image
                  src={sellerProfile.photo_url}
                  alt="Avatar"
                  fill
                  className="object-cover"
                />
              ) : sellerProfile?.name ? (
                sellerProfile.name.charAt(0).toUpperCase()
              ) : (
                <Icon.User className="h-7 w-7" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="break-words text-base font-extrabold tracking-tight text-white sm:text-lg">
                  {sellerProfile?.ukm_name || sellerProfile?.name || "Dashboard Penjual"}
                </h2>
                {isUkmAccount && (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-lime-200/50 bg-emerald-950/70 px-2 py-1 text-[10px] font-bold text-lime-100">
                    <Icon.Landmark className="h-3.5 w-3.5" aria-hidden="true" />
                    UKM / BEM RESMI
                  </span>
                )}
                {sellerProfile?.subscription_tier === "pro" && new Date(sellerProfile?.subscription_expires_at) > new Date() && (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200/50 bg-amber-950/50 px-2 py-1 text-[10px] font-bold text-amber-100">
                    <Icon.Star className="h-3.5 w-3.5" aria-hidden="true" />
                    PRO
                  </span>
                )}
                {sellerProfile?.distributor && (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-orange-200/50 bg-orange-950/50 px-2 py-1 text-[10px] font-bold text-orange-100">
                    <Icon.Store className="h-3.5 w-3.5" aria-hidden="true" />
                    DISTRIBUTOR
                  </span>
                )}
              </div>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-emerald-50">
                <span className="inline-flex min-h-6 items-center gap-1.5">
                  <Icon.Phone className="h-3.5 w-3.5" aria-hidden="true" />
                  {wa || "Nomor terhubung"}
                </span>
                {sellerProfile?.free_bumps > 0 && (
                  <span className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-lime-200/50 bg-emerald-950/60 px-2 text-[10px] font-bold text-lime-100">
                    <Icon.RefreshCcw className="h-3 w-3" aria-hidden="true" />
                    {sellerProfile.free_bumps}x Free Bump
                  </span>
                )}
              </p>
            </div>
          </div>

          {sellerProfile?.slug && (
            <a
              href={isUkmAccount ? "/organisasi" : `/toko/${sellerProfile.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-emerald-50/60 px-4 text-sm font-bold text-white transition-colors hover:bg-white/10 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300 sm:self-auto"
            >
              <span>{isUkmAccount ? "Lihat Direktori Organisasi" : "Lihat Profil Publik"}</span>
              <Icon.ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          )}
        </div>
      </section>

      {note && (
        <div className="mb-6 rounded-2xl bg-primary/10 border border-primary/20 px-4 py-3 text-xs font-semibold text-primary">
          {note}
        </div>
      )}

      {/* Bug #2 Fix: Tampilkan UI error yang jelas + tombol retry kalau load() gagal */}
      {loadError && !busy && (
        <div role="alert" className="mb-6 flex flex-col gap-3 rounded-2xl border border-rose-300 bg-rose-50 px-5 py-4 text-rose-950 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-100 sm:flex-row sm:items-center">
          <Icon.AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-700 dark:text-rose-300 sm:mt-0" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-sm font-bold">Gagal memuat data dashboard</p>
            <p className="mt-0.5 text-xs">Periksa koneksi internet lalu coba lagi. Jika masalah berlanjut, muat ulang halaman.</p>
          </div>
          <button
            type="button"
            onClick={() => load(wa)}
            className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-rose-800 px-4 text-sm font-bold text-white transition-colors hover:bg-rose-900 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-800"
          >
            <Icon.RefreshCcw className="h-4 w-4" aria-hidden="true" />
            Coba Lagi
          </button>
        </div>
      )}

      {busy && !loaded && (

        <div className="mt-6 space-y-6">
          <div className="flex gap-2 border-b dark:border-slate-800">
            <div className="h-8 w-32 animate-pulse bg-gray-200 dark:bg-slate-800 rounded-t-md"></div>
            <div className="h-8 w-32 animate-pulse bg-gray-100 dark:bg-slate-900 rounded-t-md"></div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl animate-pulse bg-white dark:bg-slate-900/30 border border-gray-100 dark:border-slate-800"></div>
            ))}
          </div>
        </div>
      )}


      {loaded && (
        <>
          {/* One navigation layer for every dashboard workspace. */}
          <nav
            aria-label="Bagian dashboard"
            className="mb-5 flex min-w-0 gap-2 overflow-x-auto rounded-2xl border border-emerald-950/10 bg-white p-2 dark:border-white/10 dark:bg-slate-900 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {(isUkmAccount ? [
              {
                id: "ukm",
                label: "UKM",
                IconComponent: Icon.Landmark,
                active: activeTab === "ukm",
                count: oprecList.filter((item) => item.status === "active").length,
                onClick: () => selectTab("ukm"),
              },
            ] : []).concat([
              {
                id: "jual",
                label: isUkmAccount ? "Danus" : "Barang",
                IconComponent: Icon.Package,
                active: activeTab === "jual" || activeTab === "dicari",
                count: active.length,
                onClick: () => selectTab(activeTab === "dicari" ? "dicari" : "jual"),
              },
              {
                id: "open-po",
                label: "Open PO",
                IconComponent: Icon.ShoppingBag,
                active: activeTab === "open-po",
                onClick: () => selectTab("open-po"),
              },
              {
                id: "tawaran",
                label: "Tawaran",
                IconComponent: Icon.MessageCircle,
                active: activeTab === "tawaran",
                count: offers.filter((offer) => offer.status === "pending").length,
                badgeColor: "bg-rose-500 text-white",
                onClick: () => selectTab("tawaran"),
              },
              {
                id: "performa",
                label: "Performa",
                IconComponent: Icon.Eye,
                active: ["statistik", "pro", "referral"].includes(activeTab),
                onClick: () => selectTab(["statistik", "pro", "referral"].includes(activeTab) ? activeTab : "statistik"),
              },
              {
                id: "akun",
                label: "Profil",
                IconComponent: Icon.User,
                active: activeTab === "profil" || activeTab === "blog",
                onClick: () => selectTab(["profil", "blog"].includes(activeTab) ? activeTab : "profil"),
              },
            ]).map((hub) => (
              <button
                key={hub.id}
                onClick={hub.onClick}
                type="button"
                aria-pressed={hub.active}
                className={`relative flex min-h-12 min-w-[68px] flex-1 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-center text-xs font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:min-w-0 sm:py-2.5 ${
                  hub.active
                    ? "bg-[#134e35] text-white"
                    : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                }`}
              >
                <hub.IconComponent className="h-4 w-4 shrink-0" />
                <span className="max-w-full truncate">{hub.label}</span>
                {typeof hub.count === "number" && hub.count > 0 && (
                  <span className={`absolute right-1 top-1 rounded-full px-1 py-0.5 text-[8px] font-bold ${hub.badgeColor || "bg-primary/10 text-primary dark:bg-emerald-950 dark:text-emerald-400"}`}>
                    {hub.count}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* SUB-TABS ROW (Contextual inside active category) */}
          {(activeTab === "jual" || activeTab === "dicari") && (
            <div role="group" aria-label="Barang dan kebutuhan" className="mb-5 flex min-w-0 items-center gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-900 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                onClick={() => selectTab("jual")}
                aria-pressed={activeTab === "jual"}
                className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition-all ${
                  activeTab === "jual"
                    ? "bg-white text-emerald-800 shadow-sm dark:bg-slate-800 dark:text-emerald-300"
                    : "text-slate-600 hover:bg-white/70 dark:text-slate-400 dark:hover:bg-slate-800/70"
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Icon.Package className="h-3.5 w-3.5" />
                  Barang Dijual ({items.length})
                </span>
              </button>
              <button
                onClick={() => selectTab("dicari")}
                aria-pressed={activeTab === "dicari"}
                className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition-all ${
                  activeTab === "dicari"
                    ? "bg-white text-emerald-800 shadow-sm dark:bg-slate-800 dark:text-emerald-300"
                    : "text-slate-600 hover:bg-white/70 dark:text-slate-400 dark:hover:bg-slate-800/70"
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Icon.Search className="h-3.5 w-3.5" />
                  Kebutuhan Dicari ({wantedItems.length})
                </span>
              </button>
            </div>
          )}

          {(activeTab === "statistik" || activeTab === "pro" || activeTab === "referral") && (
            <div role="group" aria-label="Performa akun" className="mb-5 flex min-w-0 items-center gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-900 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                onClick={() => selectTab("statistik")}
                aria-pressed={activeTab === "statistik"}
                className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition-all ${
                  activeTab === "statistik"
                    ? "bg-white text-emerald-800 shadow-sm dark:bg-slate-800 dark:text-emerald-300"
                    : "text-slate-600 hover:bg-white/70 dark:text-slate-400 dark:hover:bg-slate-800/70"
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Icon.Eye className="h-3.5 w-3.5" />
                  Statistik Kinerja
                </span>
              </button>
              <button
                onClick={() => selectTab("pro")}
                aria-pressed={activeTab === "pro"}
                className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition-all ${
                  activeTab === "pro"
                    ? "bg-white text-emerald-800 shadow-sm dark:bg-slate-800 dark:text-emerald-300"
                    : "text-slate-600 hover:bg-white/70 dark:text-slate-400 dark:hover:bg-slate-800/70"
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Icon.Star className="h-3.5 w-3.5" />
                  Paket PRO Langganan
                </span>
              </button>
              <button
                onClick={() => selectTab("referral")}
                aria-pressed={activeTab === "referral"}
                className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition-all ${
                  activeTab === "referral"
                    ? "bg-white text-emerald-800 shadow-sm dark:bg-slate-800 dark:text-emerald-300"
                    : "text-slate-600 hover:bg-white/70 dark:text-slate-400 dark:hover:bg-slate-800/70"
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Icon.Share className="h-3.5 w-3.5" />
                  Program Referral
                </span>
              </button>
            </div>
          )}

          {(activeTab === "profil" || activeTab === "blog") && (
            <div role="group" aria-label="Profil dan tulisan" className="mb-5 flex min-w-0 items-center gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-900 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                onClick={() => selectTab("profil")}
                aria-pressed={activeTab === "profil"}
                className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition-all ${
                  activeTab === "profil"
                    ? "bg-white text-emerald-800 shadow-sm dark:bg-slate-800 dark:text-emerald-300"
                    : "text-slate-600 hover:bg-white/70 dark:text-slate-400 dark:hover:bg-slate-800/70"
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Icon.User className="h-3.5 w-3.5" />
                  Biodata Satu Pintu
                </span>
              </button>
              <button
                onClick={() => selectTab("blog")}
                aria-pressed={activeTab === "blog"}
                className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition-all ${
                  activeTab === "blog"
                    ? "bg-white text-emerald-800 shadow-sm dark:bg-slate-800 dark:text-emerald-300"
                    : "text-slate-600 hover:bg-white/70 dark:text-slate-400 dark:hover:bg-slate-800/70"
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Icon.Edit2 className="h-3.5 w-3.5" />
                  Tulis Blog Mahasiswa
                </span>
              </button>
            </div>
          )}

          {/* ===== TAB UKM / ORGANISASI ===== */}
          {activeTab === "ukm" && isUkmAccount && (
            <UkmDashboardView
              sellerProfile={sellerProfile}
              wa={wa}
              items={items}
              onRefresh={() => load(wa)}
              onOpenBumpModal={(item) => bump(item)}
              onOpenBagikanModal={(item) => setBagikan(item)}
            />
          )}

          {activeTab === "open-po" && <UserOpenPoWorkspace embedded />}

          {activeTab === "tawaran" ? (

            <section className="space-y-5">
              <header className="flex flex-col gap-3 border-b border-emerald-950/10 pb-4 dark:border-white/10 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Tawaran masuk</p>
                  <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                    Respons calon pembeli
                  </h2>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                    Periksa harga yang diajukan dan tanggapi tawaran yang masih menunggu.
                  </p>
                </div>
                <p className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                  {offers.filter((offer) => offer.status === "pending").length} menunggu
                </p>
              </header>
              {offers.length === 0 ? (
                <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-emerald-950/20 bg-white px-5 py-10 text-center dark:border-white/15 dark:bg-slate-900">
                  <div>
                    <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                      <Icon.MessageCircle className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <h3 className="mt-3 text-lg font-extrabold text-slate-950 dark:text-white">Belum ada tawaran</h3>
                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                      Tawaran dari pembeli akan muncul di sini.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {["pending", "accepted", "rejected"].map((statusGroup) => {
                    const grouped = offers.filter((o) => o.status === statusGroup);
                    if (!grouped.length) return null;
                    const MetaIcon = statusGroup === "pending" ? Icon.Clock3 : statusGroup === "accepted" ? Icon.Check : Icon.X;
                    const label = statusGroup === "pending" ? "Menunggu" : statusGroup === "accepted" ? "Diterima" : "Ditolak";
                    return (
                      <section key={statusGroup} aria-label={`${label}, ${grouped.length} tawaran`}>
                        <h3 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-slate-100">
                          <MetaIcon className="h-4 w-4 text-emerald-800 dark:text-emerald-300" aria-hidden="true" />
                          {label}
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">({grouped.length})</span>
                        </h3>
                        <div className="space-y-2">
                          {grouped.map((offer) => (
                            <article key={offer.id} className="card flex flex-col gap-4 rounded-2xl p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                              <div className="min-w-0 flex-1">
                                <p className="break-words text-xs font-semibold text-slate-700 dark:text-slate-300">{offer.listing_title}</p>
                                <p className="mt-1 text-lg font-extrabold text-slate-950 dark:text-white">{rupiah(offer.offer_price)}</p>
                                <p className="mt-1 break-words text-sm text-slate-700 dark:text-slate-300">
                                  {offer.buyer_name}
                                  {offer.message && <span className="text-slate-600 dark:text-slate-400"> · "{offer.message}"</span>}
                                </p>
                              </div>
                              <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                                <a
                                  href={`https://wa.me/${offer.buyer_wa.startsWith("0") ? "62" + offer.buyer_wa.slice(1) : offer.buyer_wa}`}
                                  target="_blank" rel="noreferrer"
                                  className="btn-wa inline-flex min-h-11 items-center justify-center rounded-lg px-3 text-xs"
                                >
                                  <span className="inline-flex items-center gap-1.5">
                                    <Icon.MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                                    WhatsApp
                                  </span>
                                </a>
                                {offer.status === "pending" && (
                                  <>
                                    <button
                                    type="button"
                                      onClick={async () => {
                                        try {
                                          const res = await fetch(`/api/offers/${offer.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "accept" }) });
                                          if (!res.ok) throw new Error((await res.json()).error);
                                          toast.success("Tawaran diterima! Pembeli sudah dinotif via WA.");
                                          load(wa);
                                        } catch (e) { toast.error(e.message); }
                                      }}
                                      className="btn-primary min-h-11 justify-center rounded-lg border-emerald-800 bg-[#134e35] px-3 text-xs hover:bg-[#0a2e1f]"
                                    >
                                      <span className="inline-flex items-center gap-1.5">
                                        <Icon.Check className="h-3.5 w-3.5" aria-hidden="true" />
                                        Terima
                                      </span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        try {
                                          const res = await fetch(`/api/offers/${offer.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reject" }) });
                                          if (!res.ok) throw new Error((await res.json()).error);
                                          toast.success("Tawaran ditolak.");
                                          load(wa);
                                        } catch (e) { toast.error(e.message); }
                                      }}
                                      className="btn-outline min-h-11 justify-center rounded-lg px-3 text-xs text-rose-800 hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/20"
                                    >
                                      <span className="inline-flex items-center gap-1.5">
                                        <Icon.X className="h-3.5 w-3.5" aria-hidden="true" />
                                        Tolak
                                      </span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </article>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
            </section>
          ) : activeTab === "pro" ? (
            <div className="space-y-6">
              <div className="card p-6 border-2 border-amber-200 bg-amber-50/30 dark:border-amber-900/30 dark:bg-amber-900/10">
                <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left">
                  <div className="h-24 w-24 shrink-0 rounded-2xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-4xl">
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="inline-block h-[1em] w-[1em] shrink-0 align-[-0.125em] fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/><path d="M5 17l.75 2.25L8 20l-2.25.75L5 23l-.75-2.25L2 20l2.25-.75L5 17z"/></svg>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-extrabold text-amber-900 dark:text-amber-300">Langganan Penjual Pro</h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-slate-400 leading-relaxed max-w-lg">
                      Dengan Paket Pro, Anda bisa menjual barang standar sepuasnya (Rp 0 per barang) selama 30 hari penuh. Sangat cocok untuk Anda yang memiliki toko atau sering berjualan!
                    </p>

                    {sellerProfile?.subscription_tier === "pro" && new Date(sellerProfile?.subscription_expires_at) > new Date() ? (
                      <div className="mt-4 p-4 rounded-xl bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-900/50">
                        <p className="text-sm font-bold text-green-700 dark:text-green-400"> Anda adalah Penjual Pro</p>
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
                           Beli Paket Pro (Rp 49.000 / 30 Hari)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === "referral" ? (
            <div className="space-y-6">
              <div className="card p-6 border-2 border-indigo-100 bg-indigo-50/30 dark:border-indigo-900/30 dark:bg-indigo-900/10">
                <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left">
                  <div className="h-24 w-24 shrink-0 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-4xl">
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="inline-block h-[1em] w-[1em] shrink-0 align-[-0.125em] fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/><path d="M5 17l.75 2.25L8 20l-2.25.75L5 23l-.75-2.25L2 20l2.25-.75L5 17z"/></svg>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-extrabold text-indigo-900 dark:text-indigo-300">Program Ajak Teman</h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-slate-400 leading-relaxed max-w-lg">
                      Bagikan kode referral Anda kepada teman yang belum menggunakan Kampus Kita. Setiap teman yang mendaftar menggunakan kode Anda, Anda berdua akan mendapatkan <strong className="text-indigo-600 dark:text-indigo-400">1x Kuota Naikkan Barang Gratis!</strong>
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
                           Salin Kode
                        </button>
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-amber-600 font-medium">Jual barang pertamamu untuk mendapatkan kode referral!</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="card p-5">
                  <h3 className="text-gray-500 text-sm font-semibold mb-1">Kuota Free Bump Anda</h3>
                  <div className="text-4xl font-black text-indigo-600 dark:text-indigo-400">{sellerProfile?.free_bumps || 0}</div>
                  <p className="mt-2 text-xs text-gray-400">Gunakan kuota ini untuk menaikkan barang (sundul) secara gratis.</p>
                </div>
              </div>
            </div>
          ) : activeTab === "blog" ? (
            <BlogPenulisPanel />
          ) : activeTab === "jual" ? (
            <div className="space-y-6">
              {/* Peringatan Batas PRO */}
              {sellerProfile && (!sellerProfile.subscription_tier || sellerProfile.subscription_tier !== "pro" || new Date(sellerProfile.subscription_expires_at) < new Date()) && active.length >= 12 && (
                <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 dark:from-amber-900/20 dark:to-orange-900/20 dark:border-amber-900/50 p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-xl">
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="inline-block h-[1em] w-[1em] shrink-0 align-[-0.125em] fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/><path d="M5 17l.75 2.25L8 20l-2.25.75L5 23l-.75-2.25L2 20l2.25-.75L5 17z"/></svg>
                    </div>
                    <div>
                      <p className="font-bold text-amber-900 dark:text-amber-300">
                        {active.length >= 15
                          ? "Batas jual barang gratis tercapai!"
                          : `Kamu punya sisa ${15 - active.length} slot jual barang gratis.`}
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-500 mt-0.5">
                        Upgrade ke Paket PRO untuk menjual barang tanpa batas.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => selectTab("pro")}
                    className="btn-primary whitespace-nowrap bg-amber-500 hover:bg-amber-600 border-amber-600 text-white shadow-md shadow-amber-500/20 px-4 py-2 text-sm rounded-lg"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Icon.Star className="h-4 w-4" />
                      Upgrade PRO
                    </span>
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Barang Aktif" value={active.length} icon={<Icon.Package className="h-4 w-4" />} />
                <Stat label="Terjual" value={soldItems.length} icon={<Icon.CheckCircle className="h-4 w-4" />} />
                <Stat label="Total Dilihat" value={totalViews} icon={<Icon.Eye className="h-4 w-4" />} />
                <Stat label="Fee Dibayar" value={rupiah(totalFee)} icon={<Icon.CreditCard className="h-4 w-4" />} />
              </div>

              {/* Barang menunggu pembayaran */}
              {pendingItems.length > 0 && (
                <div className="card p-4 border border-amber-200 bg-amber-500/5 dark:border-amber-950/40 dark:bg-amber-950/5 space-y-3">
                  <h2 className="inline-flex items-center gap-1.5 text-base font-bold text-amber-700 dark:text-amber-400">
                    <Icon.AlertCircle className="h-4 w-4" />
                    Barang Menunggu Pembayaran ({pendingItems.length})
                  </h2>
                  <p className="text-xs text-amber-600 dark:text-amber-500">
                    Barang jualan belum aktif di marketplace. Silakan selesaikan pembayaran agar barang dapat ditampilkan.
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
                              <Image src={i.image_url} alt={i.title || "Foto produk"} width={48} height={48} loading="lazy" data-zoom data-zoom-alt={i.title || "Foto produk"} className="h-full w-full object-cover" />
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
                                  setActiveQrisUrl(data.paymentUrl);
                                  setActiveQrisFee(data.finalAmount || data.amount || (i.price ? adFeeFrom(cfg?.pricing, i.type, i.price) : 0));
                                  setActiveQrisOrderId(data.orderId || "");
                                } else {
                                  toast.error("Gagal mendapatkan link pembayaran.");
                                }
                              } catch (e) {
                                toast.error(e.message);
                              } finally {
                                setBusy(false);
                              }
                            }}
                            className="btn-primary py-1.5 px-3 text-xs flex items-center justify-center gap-1 shadow-sm"
                          >
                            <Icon.CreditCard className="h-3.5 w-3.5" />
                            Lanjutkan Pembayaran
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h2 className="section-heading">Daftar Barang</h2>
                {active.length === 0 ? (
                  <div className="mt-3 flex items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 dark:border-slate-800 dark:bg-slate-900/40">
                    <Icon.Package className="h-5 w-5 shrink-0 text-slate-400" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Belum ada barang aktif</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Mulai jual barang lewat tombol di bagian atas.</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 grid gap-4 lg:grid-cols-2">
                    {active.map((i) => {
                      const expiry = daysLeft(i.expires_at);
                      return (
                      <div
                        key={i.id}
                        className="card grid gap-4 p-4 dark:border-slate-800 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.8fr)] sm:items-start sm:p-5"
                      >
                        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-emerald-50 dark:bg-slate-950 sm:aspect-square">
                          {i.image_url ? (
                            <Image
                              src={i.image_url}
                              alt={i.title || "Foto produk"}
                              fill
                              sizes="(min-width: 640px) 30vw, 100vw"
                              loading="lazy"
                              data-zoom
                              data-zoom-alt={i.title || "Foto produk"}
                              className="object-cover"
                            />
                          ) : (
                            <div className="grid h-full place-items-center text-emerald-900 dark:text-emerald-300">
                              <Icon.Package className="h-10 w-10" aria-hidden="true" />
                              <span className="sr-only">Foto produk belum tersedia</span>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <StatusBadge tone={statusBadge(i.status)}>{i.status}</StatusBadge>
                            <span className="badge bg-primary/10 text-primary">{i.category}</span>
                            <span className="badge bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300 flex items-center gap-1">
                              <Icon.MapPin className="h-3 w-3" /> {i.campus}
                            </span>
                            {i.auto_bump_until && new Date(i.auto_bump_until) > new Date() && (
                              <span className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                <span className="inline-flex items-center gap-1">
                                  <Icon.RefreshCcw className="h-3 w-3" />
                                  Auto-Bump aktif
                                </span>
                              </span>
                            )}
                            {i.sponsored_until && new Date(i.sponsored_until) > new Date() && (
                              <span className="badge bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                                <span className="inline-flex items-center gap-1">
                                  <Icon.Megaphone className="h-3 w-3" />
                                  Sponsor aktif
                                </span>
                              </span>
                            )}
                            {i.featured && i.featured_until && new Date(i.featured_until) > new Date() && (
                              <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                <span className="inline-flex items-center gap-1">
                                  <Icon.Star className="h-3 w-3" />
                                  Featured aktif
                                </span>
                              </span>
                            )}
                            {expiry && (
                              <span className={`badge inline-flex items-center gap-1 text-[10px] ${expiry.cls}`}>
                                {expiry.IconComponent && <expiry.IconComponent className="h-3 w-3" />}
                                {expiry.label}
                              </span>
                            )}
                          </div>
                          <p className="mt-2 break-words text-base font-extrabold text-slate-950 dark:text-white">{i.title}</p>
                          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-700 dark:text-slate-300">
                            <span>{rupiah(i.price)} · stok {i.stock}</span>
                            {i.views > 0 && (
                              <span className="flex items-center gap-0.5 text-xs text-gray-400">
                                <Icon.Eye className="h-3 w-3" /> {i.views}
                              </span>
                            )}
                          </p>
                          {/* Tagihan Sold Fee */}
                          {i.pending_sold_fee_order_id && (
                            <div className="mt-3 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl">
                              <p className="text-sm font-bold text-rose-700 dark:text-rose-400 mb-1">
                                Tagihan Komisi Terjual Belum Lunas
                              </p>
                              <p className="text-xs text-rose-600 dark:text-rose-500 mb-3">
                                Lunasi tagihan sebesar <strong className="font-bold">{rupiah(i.pending_sold_fee_amount)}</strong> agar barang ini diturunkan dari beranda dan Anda tidak diganggu pembeli lagi.
                              </p>
                              <div className="flex gap-2">
                                <button
                                  onClick={async () => {
                                    try {
                                      setBusy(true);
                                      const res = await fetch("/api/payments/resume", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ listing_id: i.id, seller_wa: wa, type: "sold_fee" }),
                                      });
                                      const data = await res.json();
                                      if (!res.ok) throw new Error(data.error);
                                      
                                      if (data.paymentUrl) {
                                        setActiveQrisUrl(data.paymentUrl);
                                        setActiveQrisFee(data.amount || i.pending_sold_fee_amount || 0);
                                        setActiveQrisOrderId(data.orderId || "");
                                      } else {
                                        toast.error("Gagal mendapatkan link pembayaran.");
                                      }
                                    } catch (e) {
                                      toast.error(e.message);
                                    } finally {
                                      setBusy(false);
                                    }
                                }}
                                  className="btn-primary py-1.5 px-3 text-xs bg-rose-600 hover:bg-rose-700 border-rose-600 shadow-rose-500/20"
                                >
                                  <span className="inline-flex items-center gap-1.5">
                                    <Icon.CreditCard className="h-3.5 w-3.5" />
                                    Bayar Tagihan (QRIS + AI)
                                  </span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Tools Promosi */}
                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                              onClick={() => bump(i)}
                              className="btn-outline min-h-11 w-full justify-center rounded-lg border-emerald-200 px-3 text-xs text-emerald-800 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
                              title="Naikkan barang ke atas"
                            >
                              <span className="inline-flex items-center gap-1.5">
                                <Icon.Rocket className="h-3.5 w-3.5" />
                                Sundul
                              </span>
                            </button>
                            <button onClick={() => openMarkSold(i)} className="btn-primary min-h-11 w-full justify-center rounded-lg px-3 text-xs">
                              <Icon.CheckCircle className="h-3 w-3 inline mr-1" /> Mark Sold
                            </button>
                            {/* Bagikan: satu-satunya cara penjual menyebarkan
                                barangnya sendiri tanpa menunggu bot. Sengaja
                                sejajar dengan Sundul dan Mark Sold, bukan
                                disembunyikan di menu "•••" — menyebarkan barang
                                adalah hal yang paling sering ingin dilakukan
                                penjual sesudah memasangnya. */}
                            <button
                              onClick={() => setBagikan(i)}
                              className="btn-outline min-h-11 w-full justify-center rounded-lg px-3 text-xs"
                              title="Bagikan ke grup WA atau aplikasi lain"
                            >
                              <span className="inline-flex items-center gap-1.5">
                                <Icon.Share className="h-3.5 w-3.5" />
                                Bagikan
                              </span>
                            </button>
                            {/* More actions "..." */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setOpenActionMenu(openActionMenu === i.id ? null : i.id)}
                                aria-label={`Aksi lainnya untuk ${i.title}`}
                                aria-expanded={openActionMenu === i.id}
                                aria-controls={openActionMenu === i.id ? `listing-actions-${i.id}` : undefined}
                                className="btn-outline min-h-11 w-full justify-center rounded-lg px-3 text-xs font-bold"
                              >
                                Aksi lainnya
                              </button>
                              {openActionMenu === i.id && (
                                <>
                                  <button
                                    type="button"
                                    aria-label={`Tutup menu aksi untuk ${i.title}`}
                                    onClick={() => setOpenActionMenu(null)}
                                    className="fixed inset-0 z-10 cursor-pointer bg-transparent"
                                  />
                                  <div
                                    id={`listing-actions-${i.id}`}
                                    className="absolute right-0 bottom-full z-20 mb-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
                                  >
                                    <button
                                      onClick={() => { setAutobumpConfirm({ item: i }); setOpenActionMenu(null); }}
                                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                      <span className="inline-flex items-center gap-1.5"><Icon.RefreshCcw className="h-3.5 w-3.5" />Auto-Bump</span> <span className="text-xs text-gray-400">(Rp 15rb/7hr)</span>
                                    </button>
                                    <button
                                      onClick={() => { openFeatured(i); setOpenActionMenu(null); }}
                                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                      <span className="inline-flex items-center gap-1.5"><Icon.Star className="h-3.5 w-3.5" />Featured</span> <span className="text-xs text-gray-400">(Rp 5rb/hari)</span>
                                    </button>
                                    <button
                                      onClick={() => { openUpdateStock(i); setOpenActionMenu(null); }}
                                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                      <span className="inline-flex items-center gap-1.5"><Icon.Box className="h-3.5 w-3.5" />Update Stok</span>
                                    </button>
                                    <button
                                      onClick={() => { setSponsoredModal(i); setOpenActionMenu(null); }}
                                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                      <span className="inline-flex items-center gap-1.5"><Icon.Megaphone className="h-3.5 w-3.5" />Sponsor</span> <span className="text-xs text-gray-400">(Rp 7rb/hari)</span>
                                    </button>
                                    <Link
                                      href={`/edit/${i.id}`}
                                      onClick={() => setOpenActionMenu(null)}
                                      className="block px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                      <span className="inline-flex items-center gap-1.5"><Icon.Edit2 className="h-3.5 w-3.5" />Edit Barang</span>
                                    </Link>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                )}
              </div>

              {soldItems.length > 0 && (
                <div>
                  <h2 className="section-heading">Riwayat Terjual</h2>
                  <div className="mt-3 space-y-2">
                    {soldItems.map((i) => (
                      <div key={i.id} className="card p-3 text-sm dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-medium dark:text-white">{i.title}</span>
                          <span className="shrink-0 text-gray-500 text-xs">
                            {rupiah(i.sold_price || i.price)}
                          </span>
                        </div>
                        {i.pending_sold_fee_order_id ? (
                          <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl">
                            <p className="text-sm font-bold text-rose-700 dark:text-rose-400 mb-1">
                              Tagihan Komisi Belum Lunas
                            </p>
                            <p className="text-xs text-rose-600 dark:text-rose-500 mb-2">
                              Bayar <strong>{rupiah(i.pending_sold_fee_amount)}</strong> agar akun tidak diblokir dari jual barang baru.
                            </p>
                            <button
                              onClick={async () => {
                                try {
                                  setBusy(true);
                                  const res = await fetch("/api/payments/resume", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ listing_id: i.id, seller_wa: wa, type: "sold_fee" }),
                                  });
                                  const data = await res.json();
                                  if (!res.ok) throw new Error(data.error);
                                  if (data.paymentUrl) {
                                    setActiveQrisUrl(data.paymentUrl);
                                    setActiveQrisFee(data.amount || i.pending_sold_fee_amount || 0);
                                    setActiveQrisOrderId(data.orderId || "");
                                  } else toast.error("Gagal mendapatkan link pembayaran.");
                                } catch (e) { toast.error(e.message); }
                                finally { setBusy(false); }
                              }}
                              className="btn-primary py-1.5 px-3 text-xs bg-rose-600 hover:bg-rose-700 border-rose-600"
                            >
                              <span className="inline-flex items-center gap-1.5">
                                <Icon.CreditCard className="h-3.5 w-3.5" />
                                Bayar Tagihan (QRIS + AI)
                              </span>
                            </button>
                          </div>
                        ) : (
                          <p className="inline-flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400"><Icon.Check className="h-3.5 w-3.5" /> Komisi lunas · {rupiah(i.sold_fee || 0)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Barang tidak aktif */}
              {otherItems.length > 0 && (
                <div className="space-y-3 mt-6">
                  <h2 className="section-heading text-slate-600 dark:text-slate-300">Barang Tidak Aktif (Kedaluwarsa / Ditangguhkan)</h2>
                  <div className="space-y-3">
                    {otherItems.map((i) => (
                      <div
                        key={i.id}
                        className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center justify-between dark:border-slate-800 opacity-60 hover:opacity-100 transition-opacity"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-slate-950">
                            {i.image_url && (
                              <Image src={i.image_url} alt={i.title || "Foto produk"} width={48} height={48} loading="lazy" data-zoom data-zoom-alt={i.title || "Foto produk"} className="h-full w-full object-cover" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <StatusBadge tone={statusBadge(i.status)}>{i.status}</StatusBadge>
                              <span className="badge bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400">{i.category}</span>
                            </div>
                            <p className="font-semibold text-sm mt-0.5 dark:text-white">{i.title}</p>
                            <p className="text-xs text-gray-400">{rupiah(i.price)}</p>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                          {i.status === "expired" && (
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                                <Icon.Clock3 className="h-3.5 w-3.5" />
                                Masa aktif habis
                              </span>
                              <button
                                onClick={() => setRenewConfirm({ item: i })}
                                className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1 w-fit"
                                aria-label={`Perpanjang masa tayang barang ${i.title}`}
                              >
                                <Icon.RefreshCcw className="h-3.5 w-3.5" /> Perpanjang Masa Tayang
                              </button>
                              <p className="text-[10px] text-gray-400 max-w-[180px]">
                                Tampilkan kembali barang ini
                              </p>
                            </div>
                          )}
                          {i.status === "suspended" && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-500">
                              <Icon.AlertCircle className="h-3.5 w-3.5" />
                              Ditangguhkan admin
                            </span>
                          )}
                          <button
                            onClick={() => deleteListing(i.id, i.title)}
                            className="btn-outline text-xs py-1 px-2.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 mt-1 w-fit"
                          >
                            <Icon.Trash2 className="mr-1 inline h-3.5 w-3.5" /> Hapus
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ) : activeTab === "dicari" ? (
            <section className="space-y-5">
              <header className="flex flex-col gap-3 border-b border-emerald-950/10 pb-4 dark:border-white/10 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Kebutuhanmu</p>
                  <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                    Barang yang sedang dicari
                  </h2>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                    Kelola permintaan dan tandai kebutuhan yang sudah terpenuhi.
                  </p>
                </div>
                <Link
                  href="/dicari"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#134e35] px-4 text-sm font-bold text-white transition-colors hover:bg-[#0a2e1f] active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                >
                  Pasang kebutuhan
                </Link>
              </header>
              {wantedItems.length === 0 ? (
                <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-emerald-950/20 bg-white px-5 py-10 text-center dark:border-white/15 dark:bg-slate-900">
                  <div>
                    <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                      <Icon.Search className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <h3 className="mt-3 text-lg font-extrabold text-slate-950 dark:text-white">Belum ada kebutuhan</h3>
                    <p className="mt-1 max-w-md text-sm leading-6 text-slate-700 dark:text-slate-300">
                      Buat postingan agar penjual dapat melihat barang yang sedang kamu cari.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {wantedItems.map((wi) => (
                    <article
                      key={wi.id}
                      className="card flex min-w-0 flex-col gap-4 rounded-2xl p-4 dark:border-slate-800 sm:p-5"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-md px-2 py-1 text-xs font-bold ${wi.status === "active" ? "bg-lime-100 text-emerald-950 dark:bg-lime-950/50 dark:text-lime-200" : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"}`}>
                            {wi.status}
                          </span>
                          <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-950 dark:bg-emerald-950 dark:text-emerald-200">{wi.category}</span>
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                            <Icon.MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            {wi.campus}
                          </span>
                        </div>
                        <h3 className="mt-3 break-words text-base font-extrabold text-slate-950 dark:text-white">{wi.title}</h3>
                        <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                          Budget: {wi.budget > 0 ? rupiah(wi.budget) : "Nego"}
                        </p>
                        <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">
                          Area: {wi.area || "Sekitar Kampus"}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-3 dark:border-slate-700 sm:flex sm:flex-wrap">
                        {wi.status === "active" && (
                          <button
                            type="button"
                            onClick={() => resolveWanted(wi.id)}
                            className="btn-primary min-h-11 justify-center rounded-lg bg-[#134e35] px-3 text-xs hover:bg-[#0a2e1f]"
                          >
                            <Icon.Check className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" /> Tandai terpenuhi
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteWanted(wi.id)}
                          className="btn-outline min-h-11 justify-center rounded-lg px-3 text-xs text-rose-800 hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/20"
                        >
                          <Icon.X className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" /> Hapus
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : activeTab === "statistik" ? (
            <SellerAnalyticsView
              analytics={analytics}
              loading={analyticsLoading}
              onRefresh={() => loadAnalytics()}
              onOpenBumpModal={(item) => bump(item)}
              onOpenBagikanModal={(item) => setBagikan(item)}
            />
          ) : activeTab === "profil" ? (
            <div className="space-y-6">
              {/* Tanpa prop identitas: panel memuat profilnya sendiri dari
                  /api/profil, yang menentukan "siapa ini" dari sesi. Mengoper
                  `wa` dari state peramban berarti identitas ikut berpindah
                  tangan setiap kali state-nya salah. */}
              <UnifiedProfilePanel
                onProfileUpdated={(p) => {
                  if (p) {
                    setSellerProfile((prev) => ({
                      ...prev, ...p, photo_url: p.avatar_url || prev?.photo_url || "",
                    }));
                  }
                  load(wa);
                }}
              />
            </div>
          ) : null}
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
                className="absolute -right-2 -top-2 text-gray-400 hover:text-gray-600 text-lg p-1"
              >
                <Icon.X className="h-5 w-5" />
              </button>
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center justify-center gap-2">
                <Icon.Camera className="h-5 w-5 text-primary" />
                QRIS Pembayaran Manual
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                Lakukan pembayaran manual dengan scan QRIS berikut:
              </p>
              
              <div className="mt-4 bg-white p-3 rounded-2xl inline-block border border-gray-100 shadow-sm mx-auto">
                <Image 
                  src="/qris.png" 
                  alt="QRIS Kampus Kita"
                  width={400}
                  height={400}
                  data-zoom
                  data-zoom-alt="QRIS Kampus Kita"
                  className="max-h-[240px] object-contain"
                />
              </div>

              <div className="mt-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800">
                <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wider font-semibold">Nominal Transfer</p>
                <p className="text-2xl font-black text-primary dark:text-white mt-0.5">
                  {rupiah(qrisModalItem.payment_type === "sold_fee" ? qrisModalItem.pending_sold_fee_amount : (qrisModalItem.pending_amount || (qrisModalItem.type === "poster" ? 10000 : 5000)))}
                </p>
              </div>

              <p className="mt-4 text-xs text-gray-500 dark:text-slate-400 text-left leading-relaxed bg-accent/5 p-3 rounded-xl border border-accent/20">
                Setelah transfer, klik tombol di bawah untuk mengirimkan bukti transfer ke admin.
              </p>

              <div className="mt-5 space-y-2">
                <a
                  href={`https://wa.me/${cfg?.contact?.marketplaceWa || "62895429126232"}?text=${encodeURIComponent(
                    qrisModalItem.payment_type === "sold_fee"
                      ? `Halo Admin, saya sudah melunasi Komisi Terjual sebesar ${rupiah(qrisModalItem.pending_sold_fee_amount)} untuk produk "${qrisModalItem.title}".\n\nDetail Barang:\n- Penjual: ${qrisModalItem.seller_name}\n- WA: ${qrisModalItem.seller_wa}\n\nTolong disetujui agar barang diturunkan:\n${typeof window !== "undefined" ? window.location.origin : ""}/admin/finance?orderId=${qrisModalItem.pending_sold_fee_order_id || ""}`
                      : `Halo Admin, saya sudah membayar biaya pemasangan barang sebesar ${rupiah(qrisModalItem.pending_amount || (qrisModalItem.type === "poster" ? 10000 : 5000))} untuk produk "${qrisModalItem.title}".\n\nDetail Barang:\n- Penjual: ${qrisModalItem.seller_name}\n- WA: ${qrisModalItem.seller_wa}\n\nTolong disetujui di link ini ya:\n${typeof window !== "undefined" ? window.location.origin : ""}/admin/finance?orderId=${qrisModalItem.pending_order_id || ""}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-wa w-full text-center py-3 text-sm font-bold shadow-md hover:shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <Icon.MessageCircle className="h-4 w-4" />
                  Konfirmasi via WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => setQrisModalItem(null)}
                  className="btn-outline w-full text-center py-2.5 text-xs text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
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

function Stat({ label, value, icon }) {
  return (
    <div className="card-shell rounded-2xl p-4 shadow-xs transition-colors hover:border-emerald-300 dark:hover:border-emerald-800">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{label}</p>
        {icon && <span className="text-base opacity-80 text-primary dark:text-emerald-400">{icon}</span>}
      </div>
      <p className="mt-1.5 text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</p>
    </div>
  );
}

function pathAsli() {
  if (typeof window === "undefined") return "/dashboard";
  return window.location.pathname + (window.location.search || "");
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Memuat…</div>}>
      <DashboardInner />
    </Suspense>
  );
}
