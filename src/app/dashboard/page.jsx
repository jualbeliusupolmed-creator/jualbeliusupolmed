"use client";

import { useEffect, useState, Suspense } from "react";
import Script from "next/script";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { rupiah, soldFee } from "@/lib/fees";
import ConfirmModal from "@/components/ConfirmModal";
import InputModal from "@/components/InputModal";

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

function DashboardInner() {
  const params = useSearchParams();
  const [wa, setWa] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  // Modal state
  const [soldModal, setSoldModal] = useState(null);      // item yang mau di-mark sold
  const [soldPriceModal, setSoldPriceModal] = useState(null); // setelah input harga
  const [stockModal, setStockModal] = useState(null);    // item yang mau update stok
  const [featuredModal, setFeaturedModal] = useState(null); // item featured (input hari)
  const [featuredConfirm, setFeaturedConfirm] = useState(null); // konfirmasi bayar featured

  useEffect(() => {
    const urlWa = params.get("wa");
    const saved = localStorage.getItem("seller_wa");
    const waToLoad = urlWa || saved;
    if (waToLoad) {
      setWa(waToLoad);
      load(waToLoad);
      if (urlWa) {
        localStorage.setItem("seller_wa", urlWa);
      }
    }
    if (params.get("paid")) setNote("✅ Pembayaran sukses! Iklan tayang sebentar lagi.");
    if (params.get("pending")) setNote("⏳ Pembayaran pending. Selesaikan ya.");
    if (params.get("edited")) setNote("✅ Iklan berhasil diperbarui!");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  async function load(num) {
    const n = (num ?? wa).trim();
    if (!n) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/listings?seller_wa=${encodeURIComponent(n)}`);
      const data = await res.json();
      setItems(data.listings || []);
      setLoaded(true);
      localStorage.setItem("seller_wa", n);
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
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Iklan aktif" value={active.length} />
            <Stat label="Terjual" value={soldItems.length} />
            <Stat label="Total iklan" value={items.length} />
            <Stat label="Fee dibayar" value={rupiah(totalFee)} />
          </div>

          <h2 className="mt-8 text-lg font-bold">Iklan Aktif</h2>
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
                  className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center"
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                    {i.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={i.image_url} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`badge ${statusBadge(i.status)}`}>{i.status}</span>
                      <span className="badge bg-primary/10 text-primary">{i.category}</span>
                    </div>
                    <p className="mt-1 truncate font-semibold">{i.title}</p>
                    <p className="text-sm text-gray-500">
                      {rupiah(i.price)} · stok {i.stock}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => bump(i)} className="btn-outline text-xs">
                      ⬆️ Sundul 1k
                    </button>
                    <button onClick={() => openFeatured(i)} className="btn-outline text-xs">
                      ⭐ Featured
                    </button>
                    <button onClick={() => openUpdateStock(i)} className="btn-outline text-xs">
                      📦 Stok
                    </button>
                    <Link
                      href={`/edit/${i.id}`}
                      className="btn-outline text-xs"
                    >
                      ✏️ Edit
                    </Link>
                    <button onClick={() => openMarkSold(i)} className="btn-primary text-xs">
                      ✅ Mark Sold
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {soldItems.length > 0 && (
            <>
              <h2 className="mt-8 text-lg font-bold">Riwayat Terjual</h2>
              <div className="mt-3 space-y-2">
                {soldItems.map((i) => (
                  <div
                    key={i.id}
                    className="card flex items-center justify-between p-3 text-sm"
                  >
                    <span className="truncate font-medium">{i.title}</span>
                    <span className="text-gray-500">
                      {rupiah(i.sold_price || i.price)} · fee {rupiah(i.sold_fee || 0)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
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
