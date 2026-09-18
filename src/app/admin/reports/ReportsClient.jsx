"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/admin/ui";
import { buildSlug } from "@/lib/slug";

const REPORT_LABELS = {
  penipuan: "Penipuan / scam",
  barang_terlarang: "Barang terlarang",
  spam: "Spam / iklan ganda",
  salah_kategori: "Salah kategori",
  lainnya: "Lainnya",
};
const PAGE = 25;

function LoadMore({ shown, total, onClick }) {
  if (shown >= total) return null;
  return (
    <div className="mt-4 flex justify-center">
      <button onClick={onClick} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors">
        Tampilkan Lebih Banyak ({shown} dari {total})
      </button>
    </div>
  );
}

export default function ReportsClient({ initialReports = [] }) {
  const router = useRouter();
  
  const [reportLimit, setReportLimit] = useState(PAGE);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

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
      if (data.warning) setToast({ type: "err", msg: data.warning });
      else setToast({ type: "ok", msg: okMsg || "Berhasil" });
      router.refresh();
      return true;
    } catch (e) {
      setToast({ type: "err", msg: e.message });
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {toast && <div className={`g-toast${toast.type === "err" ? " is-bad" : ""}`}>{toast.msg}</div>}
      <PageHeader title="Laporan Iklan" />

      <div className="space-y-4">
        {initialReports.length === 0 && (
          <div className="g-empty" style={{ border: 0 }}>
            <p className="g-empty-title">Tidak ada laporan.</p>
          </div>
        )}
        
        {initialReports.slice(0, reportLimit).map((r) => (
          <div key={r.id} className={`g-card p-4 transition-opacity ${r.status === "resolved" ? "opacity-60" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700">
                    {REPORT_LABELS[r.reason] || r.reason}
                  </span>
                  {r.status === "resolved" && (
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700">
                      Selesai
                    </span>
                  )}
                </div>
                <p className="font-semibold text-gray-900 dark:text-white">{r.listings?.title || "(listing terhapus)"}</p>
                <p className="mt-1 text-xs text-gray-500">
                  Penjual: {r.listings?.seller_wa || "-"} · {new Date(r.created_at).toLocaleString("id-ID")}
                </p>
                {r.detail && (
                  <div className="mt-3 rounded-lg bg-gray-50 p-3 dark:bg-slate-800/50">
                    <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-slate-300">"{r.detail}"</p>
                  </div>
                )}
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                {r.listing_id && (
                  <a href={`/produk/${buildSlug(r.listings?.title, r.listing_id)}`} target="_blank" rel="noreferrer" className="g-btn g-btn-sm g-btn-outlined">
                    Lihat Iklan
                  </a>
                )}
                {r.listing_id && (
                  <button onClick={() => { if(window.confirm("Suspend iklan ini?")) action({ action: "suspend", id: r.listing_id }, "Listing disuspend") }} className="g-btn g-btn-sm" style={{ background: "var(--g-yellow-soft)", color: "var(--g-yellow-dark)" }}>
                    Suspend Iklan
                  </button>
                )}
                {r.status !== "resolved" && (
                  <button onClick={() => { if(window.confirm("Tandai selesai?")) action({ action: "resolve_report", id: r.id }, "Ditandai selesai") }} className="g-btn g-btn-sm" style={{ background: "var(--g-green-soft)", color: "var(--g-green)" }}>
                    Selesai
                  </button>
                )}
                <button onClick={() => { if(window.confirm("Hapus laporan ini?")) action({ action: "delete_report", id: r.id }, "Dihapus") }} className="g-btn g-btn-sm g-btn-danger">
                  Hapus
                </button>
              </div>
            </div>
          </div>
        ))}
        <LoadMore shown={Math.min(reportLimit, initialReports.length)} total={initialReports.length} onClick={() => setReportLimit((n) => n + PAGE)} />
      </div>
    </div>
  );
}
