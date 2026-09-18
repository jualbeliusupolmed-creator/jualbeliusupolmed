"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/admin/ui";

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

export default function RatingClient({ initialRatings = [] }) {
  const router = useRouter();
  
  const [ratingSearch, setRatingSearch] = useState("");
  const [ratingLimit, setRatingLimit] = useState(PAGE);
  
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const filteredRatings = useMemo(() => {
    return initialRatings.filter((r) =>
      !ratingSearch ||
      (r.comment || "").toLowerCase().includes(ratingSearch.toLowerCase()) ||
      (r.listings?.title || "").toLowerCase().includes(ratingSearch.toLowerCase()) ||
      (r.seller_wa || "").includes(ratingSearch)
    );
  }, [initialRatings, ratingSearch]);

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
      <PageHeader title="Rating & Ulasan" />

      <input 
        className="g-input mb-4 max-w-md w-full" 
        placeholder="Cari judul / WA / komentar…" 
        value={ratingSearch} 
        onChange={(e) => { setRatingSearch(e.target.value); setRatingLimit(PAGE); }} 
      />
      <p className="mb-2 text-xs" style={{ color: "var(--g-ink-soft)" }}>{filteredRatings.length} rating</p>

      <div className="space-y-3">
        {filteredRatings.length === 0 && (
          <div className="g-empty" style={{ border: 0 }}>
            <p className="g-empty-title">Tidak ada rating.</p>
          </div>
        )}
        
        {filteredRatings.slice(0, ratingLimit).map((r) => (
          <div key={r.id} className="g-card flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-medium text-amber-500">
                {"*".repeat(r.rating)}<span style={{ color: "var(--g-surface-3)" }}>{".".repeat(5 - r.rating)}</span> 
                <span className="text-xs ml-1" style={{ color: "var(--g-ink-faint)" }}>({r.rating}/5)</span>
              </p>
              <p className="mt-1 text-sm font-semibold">{r.listings?.title || "(listing terhapus)"}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--g-ink-soft)" }}>
                {r.buyer_name || "Anonim"} → {r.seller_wa} · {new Date(r.created_at).toLocaleDateString("id-ID")}
              </p>
              {r.comment && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed" style={{ color: "var(--g-ink-soft)" }}>"{r.comment}"</p>}
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <button 
                onClick={() => action({ action: r.hidden ? "show_rating" : "hide_rating", id: r.id }, r.hidden ? "Rating ditampilkan" : "Rating disembunyikan")} 
                className={`g-btn g-btn-sm ${r.hidden ? "g-btn-outlined" : ""}`}
                style={!r.hidden ? { background: "var(--g-yellow-soft)", color: "var(--g-yellow-dark)" } : {}}
              >
                {r.hidden ? "Tampilkan" : "Sembunyikan"}
              </button>
              <button 
                onClick={() => { if(window.confirm("Hapus rating ini?")) action({ action: "delete_rating", id: r.id }, "Dihapus") }} 
                className="g-btn g-btn-sm g-btn-danger"
              >
                Hapus
              </button>
            </div>
          </div>
        ))}
      </div>
      <LoadMore shown={Math.min(ratingLimit, filteredRatings.length)} total={filteredRatings.length} onClick={() => setRatingLimit((n) => n + PAGE)} />
    </div>
  );
}
