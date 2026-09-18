"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { rupiah } from "@/lib/fees";
import { PageHeader } from "@/components/admin/ui";

export default function DicariClient({ initialWanted = [] }) {
  const router = useRouter();
  
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
      <PageHeader title="Kebutuhan Dicari" />

      <div className="space-y-3">
        {initialWanted.length === 0 && (
          <div className="g-empty" style={{ border: 0 }}>
            <p className="g-empty-title">Belum ada permintaan barang.</p>
          </div>
        )}
        
        {initialWanted.map((w) => (
          <div key={w.id} className={`g-card p-4 transition-opacity ${w.status !== "active" ? "opacity-60" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-bold text-gray-900 dark:text-white text-lg">{w.title}</p>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${w.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                    {w.status}
                  </span>
                </div>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Budget {rupiah(w.budget)}</p>
                <p className="mt-1 text-xs text-gray-500">{w.category} · {w.campus}{w.area ? ` · ${w.area}` : ""}</p>
                {w.description && (
                  <div className="mt-3 rounded-lg bg-gray-50 p-3 dark:bg-slate-800/50">
                    <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-slate-300">{w.description}</p>
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-400">
                  Peminta: {w.buyer_name} · {w.buyer_wa} · {new Date(w.created_at).toLocaleDateString("id-ID")}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                <a href={`https://wa.me/${(w.buyer_wa || "").replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="g-btn g-btn-sm g-btn-wa">
                  Chat WA
                </a>
                {w.status === "active" && (
                  <button onClick={() => { if(window.confirm("Tandai selesai?")) action({ action: "resolve_wanted", id: w.id }, "Ditandai selesai") }} className="g-btn g-btn-sm" style={{ background: "var(--g-green-soft)", color: "var(--g-green)" }}>
                    Selesai
                  </button>
                )}
                <button onClick={() => { if(window.confirm("Hapus permintaan ini?")) action({ action: "delete_wanted", id: w.id }, "Dihapus") }} className="g-btn g-btn-sm g-btn-danger">
                  Hapus
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
