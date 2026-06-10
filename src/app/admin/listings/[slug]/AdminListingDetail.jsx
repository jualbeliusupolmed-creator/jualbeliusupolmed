"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { rupiah } from "@/lib/fees";
import { buildSlug } from "@/lib/slug";
import AdminListingModal from "../../AdminListingModal";
import ConfirmModal from "@/components/ConfirmModal";

const STATUS_COLORS = {
  active:    "bg-green-100 text-green-700",
  pending:   "bg-amber-100 text-amber-700",
  sold:      "bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-200",
  expired:   "bg-rose-100 text-rose-700",
  suspended: "bg-rose-100 text-rose-700",
};

function Badge({ s }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[s] || "bg-gray-100 text-gray-600"}`}>{s}</span>;
}

function Field({ label, children }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <div className="mt-0.5 text-sm font-medium dark:text-slate-200">{children}</div>
    </div>
  );
}

export default function AdminListingDetail({ listing, payments, reports, ratings, categories }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);

  function showToast(msg, type = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function confirmThen(opts, fn) {
    setConfirmState({ ...opts, onConfirm: fn });
  }

  async function action(body, okMsg) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Aksi gagal");
      showToast(okMsg || "Berhasil");
      router.refresh();
      return true;
    } catch (e) {
      showToast(e.message, "err");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const publicSlug = buildSlug(listing.title, listing.id);
  const totalRevenue = payments.filter(p => p.status === "paid").reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <>
      {editing && (
        <AdminListingModal
          listing={listing}
          categories={categories}
          onSave={action}
          onClose={() => setEditing(false)}
        />
      )}
      <ConfirmModal
        open={!!confirmState}
        title={confirmState?.title}
        message={confirmState?.message}
        danger={confirmState?.danger}
        onConfirm={() => confirmState?.onConfirm?.()}
        onClose={() => setConfirmState(null)}
      />
      {toast && (
        <div className={`fixed bottom-5 right-5 z-[60] rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.type === "err" ? "bg-rose-600" : "bg-gray-900 dark:bg-emerald-600"}`}>
          {toast.msg}
        </div>
      )}
      {busy && (
        <div className="fixed bottom-5 left-5 z-[60] rounded-lg bg-gray-900/80 px-3 py-1.5 text-xs text-white">Memproses…</div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold dark:text-white">{listing.title}</h1>
          <p className="mt-1 text-sm text-gray-400">
            ID: <span className="font-mono">{listing.id}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/produk/${publicSlug}`}
            target="_blank"
            rel="noreferrer"
            className="btn-outline text-sm"
          >
            Lihat Publik ↗
          </a>
          <button onClick={() => setEditing(true)} className="btn-primary text-sm">
            Edit Listing
          </button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        {listing.status !== "active" && (
          <button onClick={() => action({ action: "activate", id: listing.id }, "Diaktifkan")} className="rounded-lg bg-green-100 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-200">
            Aktifkan
          </button>
        )}
        {listing.status !== "suspended" && (
          <button onClick={() => action({ action: "suspend", id: listing.id }, "Disuspend")} className="rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-200">
            Suspend
          </button>
        )}
        {listing.featured ? (
          <button onClick={() => action({ action: "unfeature", id: listing.id }, "Featured dilepas")} className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300">
            Unfeature
          </button>
        ) : (
          <button onClick={() => action({ action: "feature", id: listing.id, days: 7 }, "Featured 7 hari")} className="rounded-lg bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-600 hover:bg-amber-100">
            Featured 7 Hari
          </button>
        )}
        <button onClick={() => confirmThen({ title: "Blacklist penjual", message: `Blokir ${listing.seller_wa}?`, danger: true }, () => action({ action: "blacklist", wa: listing.seller_wa }, "Diblacklist"))} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300">
          Blacklist WA
        </button>
        <button onClick={() => confirmThen({ title: "Hapus listing", message: `Hapus "${listing.title}"?`, danger: true }, async () => { const ok = await action({ action: "delete", id: listing.id }, "Dihapus"); if (ok) router.push("/admin/listings"); })} className="rounded-lg bg-rose-100 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-200">
          Hapus
        </button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* Info utama */}
        <div className="lg:col-span-2 space-y-4">
          {/* Detail card */}
          <div className="card p-5">
            <h2 className="mb-4 font-bold dark:text-white">Detail Listing</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label="Status"><Badge s={listing.status} /></Field>
              <Field label="Harga">{rupiah(listing.price)}</Field>
              <Field label="Stok">{listing.stock}</Field>
              <Field label="Kategori">{listing.category}</Field>
              <Field label="Tipe">{listing.type}</Field>
              <Field label="Kampus">{listing.campus || "—"}</Field>
              <Field label="Area">{listing.area || "—"}</Field>
              <Field label="Views">{listing.views || 0}</Field>
              <Field label="Featured">{listing.featured ? `✅ s/d ${listing.featured_until ? new Date(listing.featured_until).toLocaleDateString("id-ID") : "—"}` : "Tidak"}</Field>
              <Field label="Dibuat">{new Date(listing.created_at).toLocaleDateString("id-ID")}</Field>
              <Field label="Berakhir">{listing.expires_at ? new Date(listing.expires_at).toLocaleDateString("id-ID") : "—"}</Field>
              <Field label="Bumped">{listing.bumped_at ? new Date(listing.bumped_at).toLocaleDateString("id-ID") : "—"}</Field>
            </div>
            {listing.description && (
              <div className="mt-4 border-t pt-4 dark:border-slate-800">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Deskripsi</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600 dark:text-slate-400">{listing.description}</p>
              </div>
            )}
          </div>

          {/* Foto */}
          {(listing.images?.length || listing.image_url) && (
            <div className="card p-5">
              <h2 className="mb-3 font-bold dark:text-white">Foto</h2>
              <div className="flex flex-wrap gap-2">
                {(listing.images?.length ? listing.images : [listing.image_url]).map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <a key={i} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt={`foto-${i}`} className="h-24 w-24 rounded-lg object-cover border dark:border-slate-800" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Pembayaran */}
          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold dark:text-white">Riwayat Transaksi</h2>
              <span className="text-sm font-semibold text-green-600">Total paid: {rupiah(totalRevenue)}</span>
            </div>
            {payments.length === 0 ? (
              <p className="text-sm text-gray-400">Belum ada transaksi.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-gray-400">
                    <tr>
                      <th className="pb-2">Order ID</th>
                      <th className="pb-2">Tipe</th>
                      <th className="pb-2">Jumlah</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody className="dark:text-slate-300">
                    {payments.map(p => (
                      <tr key={p.id} className="border-t dark:border-slate-800">
                        <td className="py-2 font-mono text-xs">{p.midtrans_order_id || p.id.slice(0, 8)}</td>
                        <td className="py-2 capitalize">{p.type}</td>
                        <td className="py-2 font-medium">{rupiah(p.amount)}</td>
                        <td className="py-2"><Badge s={p.status} /></td>
                        <td className="py-2 text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString("id-ID")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Laporan */}
          {reports.length > 0 && (
            <div className="card p-5">
              <h2 className="mb-3 font-bold text-rose-600">Laporan ({reports.length})</h2>
              <div className="space-y-3">
                {reports.map(r => (
                  <div key={r.id} className={`rounded-lg border p-3 text-sm dark:border-slate-800 ${r.status === "resolved" ? "opacity-60" : "border-rose-200 bg-rose-50 dark:bg-rose-900/10"}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-rose-700 dark:text-rose-400">{r.reason}</span>
                      <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString("id-ID")}</span>
                    </div>
                    {r.detail && <p className="mt-1 text-gray-600 dark:text-slate-400">"{r.detail}"</p>}
                    {r.status !== "resolved" && (
                      <button onClick={() => action({ action: "resolve_report", id: r.id }, "Ditandai selesai")} className="mt-2 rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
                        Tandai selesai
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rating */}
          {ratings.length > 0 && (
            <div className="card p-5">
              <h2 className="mb-3 font-bold dark:text-white">Rating ({ratings.length})</h2>
              <div className="space-y-3">
                {ratings.map(r => (
                  <div key={r.id} className="rounded-lg border p-3 text-sm dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-amber-500">{"★".repeat(r.rating)}<span className="text-gray-300">{"★".repeat(5 - r.rating)}</span></span>
                      <span className="text-xs text-gray-400">{r.buyer_name || "Anonim"} · {new Date(r.created_at).toLocaleDateString("id-ID")}</span>
                    </div>
                    {r.comment && <p className="mt-1 text-gray-600 dark:text-slate-400">"{r.comment}"</p>}
                    <button onClick={() => confirmThen({ title: "Hapus rating", message: "Hapus rating ini?", danger: true }, () => action({ action: "delete_rating", id: r.id }, "Dihapus"))} className="mt-2 rounded bg-rose-100 px-2 py-0.5 text-xs text-rose-700">
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar kanan — info penjual */}
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="mb-3 font-bold dark:text-white">Penjual</h2>
            <div className="space-y-3">
              <Field label="Nama">{listing.seller_name}</Field>
              <Field label="WhatsApp">
                <a href={`https://wa.me/${listing.seller_wa}`} target="_blank" rel="noreferrer" className="text-green-600 hover:underline">
                  {listing.seller_wa}
                </a>
              </Field>
            </div>
            <div className="mt-4 flex gap-2">
              <a
                href={`/penjual/${encodeURIComponent(listing.seller_wa)}`}
                target="_blank"
                rel="noreferrer"
                className="btn-outline w-full text-center text-xs"
              >
                Profil Penjual
              </a>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="mb-3 font-bold dark:text-white">Link Publik</h2>
            <p className="break-all font-mono text-xs text-gray-500 dark:text-slate-400">
              /produk/{publicSlug}
            </p>
            <a
              href={`/produk/${publicSlug}`}
              target="_blank"
              rel="noreferrer"
              className="btn-outline mt-3 block w-full text-center text-xs"
            >
              Buka Halaman Produk ↗
            </a>
          </div>

          {listing.status === "sold" && (
            <div className="card p-5">
              <h2 className="mb-3 font-bold dark:text-white">Info Penjualan</h2>
              <Field label="Harga Jual">{rupiah(listing.sold_price || listing.price)}</Field>
              <div className="mt-2">
                <Field label="Fee Admin">{rupiah(listing.sold_fee || 0)}</Field>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
