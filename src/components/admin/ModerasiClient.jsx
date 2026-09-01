"use client";

import { useState } from "react";
import { useAdmin } from "./AdminProvider";
import Image from "next/image";
import { Icon } from "@/components/Icons";

function rupiah(n) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}

function relTime(dateStr) {
  if (!dateStr) return "Baru saja";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}

export default function ModerasiClient({ 
  pendingListings = [], 
  openReports = [], 
  pendingProfiles = [], 
  pendingFees = [], 
  pendingFeeOffers = [] 
}) {
  const { action, confirmThen } = useAdmin();
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'listings' | 'reports' | 'profiles' | 'fee_offers' | 'fees'
  const [rejectNote, setRejectNote] = useState({});

  const total = pendingListings.length + openReports.length + pendingProfiles.length + pendingFees.length + pendingFeeOffers.length;

  if (total === 0) {
    return (
      <div className="rounded-3xl border border-slate-200/80 bg-white p-12 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center text-3xl mb-3">
          <Icon.Check className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-black text-slate-900 dark:text-white">Semua Bersih &amp; Terkendali!</h3>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
          Tidak ada iklan, laporan, atau permintaan profil yang perlu dimoderasi saat ini.
        </p>
      </div>
    );
  }

  const tabs = [
    { id: "all", label: "Semua", count: total },
    { id: "listings", label: "Iklan Pending", count: pendingListings.length, icon: "BOX" },
    { id: "reports", label: "Laporan", count: openReports.length, icon: "AlertCircle", badgeColor: "bg-rose-500 text-white" },
    { id: "profiles", label: "Ubah Profil", count: pendingProfiles.length, icon: "USR" },
    { id: "fee_offers", label: "Tawaran Biaya", count: pendingFeeOffers.length, icon: "CreditCard" },
    { id: "fees", label: "Komisi Terjual", count: pendingFees.length, icon: "PAY" },
  ].filter((t) => t.id === "all" || t.count > 0);

  return (
    <div className="space-y-6 font-sans">
      {/* FILTER PILLS */}
      <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900/90 p-1.5 rounded-2xl overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border border-slate-200/80 dark:border-slate-800">
        {tabs.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap active:scale-95 ${
                isActive
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-extrabold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {t.icon && <span>{t.icon}</span>}
              <span>{t.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                t.badgeColor || (isActive ? "bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200" : "bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400")
              }`}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 1. IKLAN PENDING */}
      {(activeTab === "all" || activeTab === "listings") && pendingListings.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Icon.Package className="h-4 w-4" /> Iklan Menunggu Persetujuan ({pendingListings.length})
            </h3>
          </div>

          <div className="grid gap-3">
            {pendingListings.map((l) => (
              <div 
                key={l.id} 
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 hover:shadow-xs transition-shadow"
              >
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 relative">
                    {l.image_url ? (
                      <img src={l.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400"><Icon.Package className="h-5 w-5" /></div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate" title={l.title}>
                      {l.title}
                    </h4>
                    <div className="flex items-center gap-2 flex-wrap mt-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{l.seller_name || "Penjual"}</span>
                      <span>•</span>
                      <a 
                        href={`https://wa.me/${l.seller_wa?.startsWith("0") ? "62" + l.seller_wa.slice(1) : l.seller_wa}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                      >
                        WA {l.seller_wa}
                      </a>
                      <span>•</span>
                      <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        {l.category}
                      </span>
                      <span>•</span>
                      <span className="font-black text-slate-900 dark:text-white">{rupiah(l.price)}</span>
                      <span>•</span>
                      <span className="text-[11px] text-slate-400">{relTime(l.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() =>
                      confirmThen({ title: `Aktifkan iklan "${l.title}"?`, confirmLabel: "Aktifkan" }, () =>
                        action({ action: "activate", id: l.id }, "Iklan berhasil diaktifkan")
                      )
                    }
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <Icon.Check className="h-4 w-4" /> Aktifkan
                  </button>
                  <button
                    onClick={() =>
                      confirmThen({ title: `Suspend iklan "${l.title}"?`, danger: true, confirmLabel: "Suspend" }, () =>
                        action({ action: "suspend", id: l.id }, "Iklan disuspend")
                      )
                    }
                    className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 text-xs font-bold active:scale-95 transition-all flex items-center gap-1"
                  >
                    <Icon.X className="h-4 w-4" /> Suspend
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 2. LAPORAN TERBUKA */}
      {(activeTab === "all" || activeTab === "reports") && openReports.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <span>Laporan</span> Masuk ({openReports.length})
            </h3>
          </div>

          <div className="grid gap-3">
            {openReports.map((r) => (
              <div 
                key={r.id} 
                className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-rose-200/80 dark:border-rose-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[11px] font-black uppercase">
                      {r.reason || "Laporan"}
                    </span>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                      {r.listings?.title || "Iklan Dihapus"}
                    </h4>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Pelapor: <strong>{r.reporter_wa || "Anonim"}</strong> • {relTime(r.created_at)}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => action({ action: "resolve_report", id: r.id }, "Laporan diselesaikan")}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold active:scale-95 transition-all"
                  >
                     Selesaikan
                  </button>
                  {r.listing_id && (
                    <button
                      onClick={() =>
                        confirmThen({ title: "Suspend iklan yang dilaporkan?", danger: true, confirmLabel: "Suspend" }, async () => {
                          await action({ action: "suspend", id: r.listing_id }, "Iklan disuspend");
                          await action({ action: "resolve_report", id: r.id }, "Laporan diselesaikan");
                        })
                      }
                      className="px-3.5 py-1.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 dark:border-rose-900 dark:bg-rose-950/40 text-xs font-bold active:scale-95 transition-all"
                    >
                       Suspend Iklan
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. PERMINTAAN PROFIL */}
      {(activeTab === "all" || activeTab === "profiles") && pendingProfiles.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Icon.User className="h-4 w-4" /> Permintaan Ubah Profil ({pendingProfiles.length})
            </h3>
          </div>

          <div className="grid gap-3">
            {pendingProfiles.map((p) => (
              <div 
                key={p.id} 
                className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 flex flex-col gap-3"
              >
                <div>
                  <p className="text-xs text-slate-400 font-semibold">
                    WA: {p.seller_wa} • Ubah {p.field === "name" ? "Nama Penjual" : "Biodata"} • {relTime(p.created_at)}
                  </p>
                  <div className="mt-1.5 flex items-center gap-3 text-sm">
                    <span className="text-slate-400 line-through">{p.current_value || "(Kosong)"}</span>
                    <span className="text-slate-400">→</span>
                    <span className="font-extrabold text-slate-900 dark:text-white bg-primary/10 text-primary px-2.5 py-0.5 rounded-lg">
                      {p.requested_value}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() =>
                      confirmThen({ title: "Setujui perubahan profil?", confirmLabel: "Setujui" }, () =>
                        action({ action: "approve_profile_change", id: p.id }, "Profil berhasil diperbarui")
                      )
                    }
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold active:scale-95 transition-all"
                  >
                     Setujui
                  </button>
                  <input
                    type="text"
                    placeholder="Alasan penolakan (opsional)"
                    value={rejectNote[p.id] || ""}
                    onChange={(e) => setRejectNote((n) => ({ ...n, [p.id]: e.target.value }))}
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none"
                  />
                  <button
                    onClick={() =>
                      confirmThen({ title: "Tolak permintaan profil?", danger: true, confirmLabel: "Tolak" }, () =>
                        action({ action: "reject_profile_change", id: p.id, note: rejectNote[p.id] || "" }, "Permintaan ditolak")
                      )
                    }
                    className="px-3.5 py-1.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 dark:border-rose-900 dark:bg-rose-950/40 text-xs font-bold active:scale-95 transition-all"
                  >
                     Tolak
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. TAWARAN BIAYA IKLAN */}
      {(activeTab === "all" || activeTab === "fee_offers") && pendingFeeOffers.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Icon.Tag className="h-4 w-4" /> Tawaran Biaya Iklan ({pendingFeeOffers.length})
            </h3>
          </div>

          <div className="grid gap-3">
            {pendingFeeOffers.map((f) => {
              const originalFee = f.payments?.[0]?.amount || 0;
              return (
                <div 
                  key={f.id} 
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{f.title}</h4>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">
                      {f.seller_name || f.seller_wa} • Kode #{f.listing_code} • {relTime(f.created_at)}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <span className="text-slate-400 line-through">{rupiah(originalFee)}</span>
                      <span>→</span>
                      <span className="font-extrabold text-primary">{rupiah(f.fee_offer)}</span>
                      {f.fee_offer === 0 && (
                        <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                          Minta Gratis
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() =>
                        confirmThen({ title: `Setujui biaya ${rupiah(f.fee_offer)}?`, confirmLabel: "Setujui" }, () =>
                          action({ action: "approve_fee_offer", id: f.id }, "Tawaran biaya disetujui")
                        )
                      }
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold active:scale-95 transition-all"
                    >
                       Setujui
                    </button>
                    <button
                      onClick={() =>
                        confirmThen({ title: "Tolak tawaran biaya?", danger: true, confirmLabel: "Tolak" }, () =>
                          action({ action: "reject_fee_offer", id: f.id, note: rejectNote[`fee_${f.id}`] || "" }, "Tawaran ditolak")
                        )
                      }
                      className="px-3.5 py-1.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 dark:border-rose-900 dark:bg-rose-950/40 text-xs font-bold active:scale-95 transition-all"
                    >
                       Tolak
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. SOLD FEE PENDING */}
      {(activeTab === "all" || activeTab === "fees") && pendingFees.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Icon.CreditCard className="h-4 w-4" /> Tagihan Komisi Terjual ({pendingFees.length})
            </h3>
          </div>

          <div className="grid gap-3">
            {pendingFees.map((f) => (
              <div 
                key={f.id} 
                className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{f.listings?.title || "Iklan Terjual"}</h4>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">
                    {f.listings?.seller_wa || "—"} • Tagihan: <strong className="text-slate-700 dark:text-slate-200">{rupiah(f.amount)}</strong> • {relTime(f.created_at)}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() =>
                      confirmThen({ title: "Tandai komisi sebagai lunas?", confirmLabel: "Lunas" }, () =>
                        action({ action: "update_payment", id: f.id, status: "paid" }, "Komisi lunas")
                      )
                    }
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold active:scale-95 transition-all"
                  >
                     Tandai Lunas
                  </button>
                  <button
                    onClick={() =>
                      confirmThen({ title: "Hapus tagihan ini?", danger: true, confirmLabel: "Hapus" }, () =>
                        action({ action: "delete_payment", id: f.id }, "Tagihan dihapus")
                      )
                    }
                    className="px-3.5 py-1.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 dark:border-rose-900 dark:bg-rose-950/40 text-xs font-bold active:scale-95 transition-all"
                  >
                     Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
