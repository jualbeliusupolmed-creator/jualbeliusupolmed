"use client";

import { useState } from "react";
import { useAdmin } from "./AdminProvider";

function rupiah(n) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}

function relTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}

function SectionHeader({ title, count, color = "gray" }) {
  const colors = {
    amber: "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300",
    rose: "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300",
    blue: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300",
    gray: "bg-gray-50 border-gray-200 text-gray-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300",
  };
  return (
    <div className={`mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 ${colors[color]}`}>
      <span className="font-semibold">{title}</span>
      <span className="ml-auto rounded-full px-2 py-0.5 text-xs font-bold bg-current/10">{count}</span>
    </div>
  );
}

function ActionBtn({ label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
        danger
          ? "bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/40 dark:text-rose-300"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      }`}
    >
      {label}
    </button>
  );
}

export default function ModerasiClient({ pendingListings, openReports, pendingProfiles, pendingFees, pendingFeeOffers = [] }) {
  const { action, confirmThen } = useAdmin();
  const [rejectNote, setRejectNote] = useState({});

  const total = pendingListings.length + openReports.length + pendingProfiles.length + pendingFees.length + pendingFeeOffers.length;

  if (total === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
        <p className="text-3xl">✅</p>
        <p className="mt-2 font-semibold text-gray-700 dark:text-slate-200">Semua bersih!</p>
        <p className="text-sm text-gray-400">Tidak ada item yang perlu dimoderasi saat ini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* IKLAN PENDING */}
      {pendingListings.length > 0 && (
        <section>
          <SectionHeader title="Iklan Menunggu Persetujuan" count={pendingListings.length} color="amber" />
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900/40">
            {pendingListings.map((l) => (
              <div key={l.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start">
                {l.image_url && (
                  <img src={l.image_url} alt={l.title} className="h-16 w-16 rounded-lg object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold dark:text-white">{l.title}</p>
                  <p className="text-xs text-gray-400">
                    {l.seller_name} · {l.seller_wa} · {l.category} · {rupiah(l.price)} · {relTime(l.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <ActionBtn label="✅ Aktifkan" onClick={() =>
                    confirmThen({ title: "Aktifkan iklan?", confirmLabel: "Aktifkan" }, () => action({ action: "activate", id: l.id }, "Iklan diaktifkan"))
                  } />
                  <ActionBtn label="⛔ Suspend" danger onClick={() =>
                    confirmThen({ title: "Suspend iklan?", danger: true, confirmLabel: "Suspend" }, () => action({ action: "suspend", id: l.id }, "Iklan disuspend"))
                  } />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* LAPORAN OPEN */}
      {openReports.length > 0 && (
        <section>
          <SectionHeader title="Laporan Belum Diselesaikan" count={openReports.length} color="rose" />
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900/40">
            {openReports.map((r) => (
              <div key={r.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold dark:text-white">{r.listings?.title || "Iklan dihapus"}</p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
                    Dilaporkan oleh: {r.reporter_wa || "—"} · {relTime(r.created_at)}
                  </p>
                  {r.reason && (
                    <p className="mt-1 rounded bg-gray-50 px-2 py-1 text-xs dark:bg-slate-800">"{r.reason}"</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <ActionBtn label="✅ Selesaikan" onClick={() =>
                    action({ action: "resolve_report", id: r.id }, "Laporan diselesaikan")
                  } />
                  {r.listing_id && (
                    <ActionBtn label="⛔ Suspend iklan" danger onClick={() =>
                      confirmThen({ title: "Suspend iklan yang dilaporkan?", danger: true, confirmLabel: "Suspend" }, async () => {
                        await action({ action: "suspend", id: r.listing_id }, "Iklan disuspend");
                        await action({ action: "resolve_report", id: r.id }, "Laporan diselesaikan");
                      })
                    } />
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* PERMINTAAN UBAH PROFIL */}
      {pendingProfiles.length > 0 && (
        <section>
          <SectionHeader title="Permintaan Ubah Profil" count={pendingProfiles.length} color="blue" />
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900/40">
            {pendingProfiles.map((p) => (
              <div key={p.id} className="flex flex-col gap-3 p-4">
                <div>
                  <p className="text-xs text-gray-400">{p.seller_wa} · Ubah {p.field === "name" ? "nama" : "bio"} · {relTime(p.created_at)}</p>
                  <div className="mt-1.5 flex items-center gap-3">
                    <span className="text-sm text-gray-400 line-through">{p.current_value || "—"}</span>
                    <span className="text-gray-400">→</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{p.requested_value}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <ActionBtn label="✅ Setujui" onClick={() =>
                    confirmThen({ title: "Setujui perubahan profil?", confirmLabel: "Setujui" }, () =>
                      action({ action: "approve_profile_change", id: p.id }, "Profil disetujui"))
                  } />
                  <input
                    type="text"
                    placeholder="Alasan penolakan (opsional)"
                    value={rejectNote[p.id] || ""}
                    onChange={(e) => setRejectNote((n) => ({ ...n, [p.id]: e.target.value }))}
                    className="min-w-0 flex-1 rounded border border-gray-200 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <ActionBtn label="❌ Tolak" danger onClick={() =>
                    confirmThen({ title: "Tolak permintaan profil?", danger: true, confirmLabel: "Tolak" }, () =>
                      action({ action: "reject_profile_change", id: p.id, note: rejectNote[p.id] || "" }, "Permintaan ditolak"))
                  } />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAWARAN BIAYA IKLAN */}
      {pendingFeeOffers.length > 0 && (
        <section>
          <SectionHeader title="Tawaran Biaya Iklan" count={pendingFeeOffers.length} color="blue" />
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900/40">
            {pendingFeeOffers.map((f) => {
              const originalFee = f.payments?.[0]?.amount || 0;
              return (
                <div key={f.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold dark:text-white">{f.title}</p>
                    <p className="text-xs text-gray-400">
                      {f.seller_name || f.seller_wa} · Kode {f.listing_code} · {relTime(f.created_at)}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-sm">
                      <span className="text-gray-400 line-through">{rupiah(originalFee)}</span>
                      <span className="text-gray-400">→</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{rupiah(f.fee_offer)}</span>
                      {f.fee_offer === 0 && <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">Minta Gratis</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <ActionBtn label="✅ Setujui" onClick={() =>
                      confirmThen({ title: `Setujui biaya ${rupiah(f.fee_offer)}?`, confirmLabel: "Setujui" }, () =>
                        action({ action: "approve_fee_offer", id: f.id }, "Tawaran biaya disetujui"))
                    } />
                    <input
                      type="text"
                      placeholder="Alasan penolakan (opsional)"
                      value={rejectNote[`fee_${f.id}`] || ""}
                      onChange={(e) => setRejectNote((n) => ({ ...n, [`fee_${f.id}`]: e.target.value }))}
                      className="min-w-0 w-40 rounded border border-gray-200 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                    <ActionBtn label="❌ Tolak" danger onClick={() =>
                      confirmThen({ title: "Tolak tawaran biaya?", danger: true, confirmLabel: "Tolak" }, () =>
                        action({ action: "reject_fee_offer", id: f.id, note: rejectNote[`fee_${f.id}`] || "" }, "Tawaran ditolak"))
                    } />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SOLD FEE PENDING */}
      {pendingFees.length > 0 && (
        <section>
          <SectionHeader title="Biaya Terjual Belum Dibayar" count={pendingFees.length} color="gray" />
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900/40">
            {pendingFees.map((f) => (
              <div key={f.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold dark:text-white">{f.listings?.title || "Iklan"}</p>
                  <p className="text-xs text-gray-400">
                    {f.listings?.seller_wa || "—"} · {rupiah(f.amount)} · {relTime(f.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <ActionBtn label="✅ Lunas" onClick={() =>
                    confirmThen({ title: "Tandai sold fee sebagai lunas?", confirmLabel: "Lunas" }, () =>
                      action({ action: "update_payment", id: f.id, status: "paid" }, "Pembayaran dikonfirmasi"))
                  } />
                  <ActionBtn label="🗑 Hapus" danger onClick={() =>
                    confirmThen({ title: "Hapus tagihan ini?", danger: true, confirmLabel: "Hapus" }, () =>
                      action({ action: "delete_payment", id: f.id }, "Tagihan dihapus"))
                  } />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
