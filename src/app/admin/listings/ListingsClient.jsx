"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { rupiah } from "@/lib/fees";
import { downloadCSV } from "@/lib/csv";
import { buildSlug } from "@/lib/slug";
import { PageHeader } from "@/components/admin/ui";
import { useBasisAdmin } from "@/components/admin/basis";

const LISTING_FILTERS = [
  { key: "all", label: "Semua" },
  { key: "pending", label: "Pending" },
  { key: "active", label: "Aktif" },
  { key: "deletion_pending", label: "Minta hapus" },
  { key: "sold", label: "Terjual" },
  { key: "expired", label: "Kedaluwarsa" },
  { key: "suspended", label: "Suspended" },
];

function StatusBadge({ s }) {
  const map = {
    pending: { color: "text-amber-700", bg: "bg-amber-100", label: "Pending" },
    active: { color: "text-green-700", bg: "bg-green-100", label: "Aktif" },
    deletion_pending: { color: "text-rose-700", bg: "bg-rose-100", label: "Minta hapus" },
    sold: { color: "text-blue-700", bg: "bg-blue-100", label: "Terjual" },
    expired: { color: "text-gray-700", bg: "bg-gray-200", label: "Kedaluwarsa" },
    suspended: { color: "text-rose-700", bg: "bg-rose-100", label: "Suspended" },
  };
  const d = map[s] || { color: "text-gray-700", bg: "bg-gray-100", label: s };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${d.bg} ${d.color}`}>
      {d.label}
    </span>
  );
}

function MenuAksi({ items }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="g-icon-btn h-8 w-8" aria-label="Aksi">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/></svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800" onMouseLeave={() => setOpen(false)}>
          {items.map((it, i) => (
            it.href ? (
              <a key={i} href={it.href} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700">{it.label}</a>
            ) : (
              <button key={i} onClick={() => { setOpen(false); it.onClick?.(); }} className={`block w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${it.tone === 'bad' ? 'text-rose-600' : 'text-slate-700 dark:text-slate-200'}`}>
                {it.label}
              </button>
            )
          ))}
        </div>
      )}
    </div>
  );
}

export default function ListingsClient({ initialListings = [] }) {
  const basis = useBasisAdmin();
  const router = useRouter();
  
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  const [selected, setSelected] = useState(() => new Set());
  const [kirimSibuk, setKirimSibuk] = useState(null);
  
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const filteredListings = useMemo(() => {
    return initialListings.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (q) {
        const sq = q.toLowerCase();
        return (
          l.title?.toLowerCase().includes(sq) ||
          l.seller_name?.toLowerCase().includes(sq) ||
          l.seller_wa?.toLowerCase().includes(sq)
        );
      }
      return true;
    });
  }, [initialListings, statusFilter, q]);

  useEffect(() => {
    setCurrentPage(1);
  }, [q, statusFilter]);

  const totalPages = Math.ceil(filteredListings.length / itemsPerPage);
  
  const paginatedListings = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredListings.slice(start, start + itemsPerPage);
  }, [filteredListings, currentPage]);

  const allVisibleSelected = paginatedListings.length > 0 && paginatedListings.every((l) => selected.has(l.id));

  function toggleSel(id) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleSelAll() {
    if (allVisibleSelected) {
      const next = new Set(selected);
      paginatedListings.forEach((l) => next.delete(l.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      paginatedListings.forEach((l) => next.add(l.id));
      setSelected(next);
    }
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

  async function bulk(act, name) {
    if (!window.confirm(`${name} ${selected.size} iklan terpilih?`)) return;
    const arr = Array.from(selected);
    let done = 0;
    for (const id of arr) {
      const ok = await action({ action: act, id }, null);
      if (ok) {
        done++;
        const next = new Set(selected);
        next.delete(id);
        setSelected(next);
      }
    }
    setToast({ type: "ok", msg: `${done} iklan berhasil di-${act}.` });
    setSelected(new Set());
  }

  async function kirimViaBot(l) {
    if (!window.confirm(`Kirim lewat bot ke grup WA, admin, dan penjual (${l.seller_wa || "tanpa nomor"}). Lanjutkan?`)) return;
    setKirimSibuk(l.id);
    try {
      const res = await fetch("/api/admin/notify-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: l.id, mode: "bot" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal mengirim");
      setToast({ type: data.ok ? "ok" : "err", msg: data.ringkas || "Terkirim" });
    } catch (e) {
      setToast({ type: "err", msg: e.message });
    } finally {
      setKirimSibuk(null);
    }
  }

  return (
    <div>
      {toast && <div className={`g-toast${toast.type === "err" ? " is-bad" : ""}`}>{toast.msg}</div>}
      <PageHeader title="Daftar Iklan" />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="g-searchbar" style={{ height: 40, maxWidth: 360 }}>
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 21l-4.3-4.3M11 18a7 7 0 100-14 7 7 0 000 14z" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari judul, penjual, atau nomor WA…"
            aria-label="Cari listing"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {LISTING_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatusFilter(f.key)}
              className={`g-chip${statusFilter === f.key ? " is-on" : ""}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={() =>
            downloadCSV("listing.csv", filteredListings.map((l) => ({
              id: l.id, judul: l.title, kategori: l.category, tipe: l.type, harga: l.price,
              stok: l.stock, status: l.status, featured: l.featured, views: l.views || 0,
              kampus: l.campus, penjual: l.seller_name, wa: l.seller_wa, dibuat: l.created_at,
            })))
          }
          className="g-btn g-btn-outlined ml-auto"
        >
          Export CSV
        </button>
      </div>

      {selected.size > 0 && (
        <div className="g-selectbar">
          <span>{selected.size} dipilih</span>
          <button onClick={() => bulk("activate", "Aktifkan")} className="g-btn g-btn-sm g-btn-text">Aktifkan</button>
          <button onClick={() => bulk("suspend", "Suspend")} className="g-btn g-btn-sm g-btn-text">Suspend</button>
          <button onClick={() => bulk("delete", "Hapus")} className="g-btn g-btn-sm g-btn-danger">Hapus</button>
          <button onClick={() => setSelected(new Set())} className="g-btn g-btn-sm g-btn-text ml-auto">Batal pilih</button>
        </div>
      )}

      <p className="mb-2 text-xs" style={{ color: "var(--g-ink-soft)" }}>{filteredListings.length} listing</p>

      <div className="g-table-wrap">
        <table className="g-table min-w-[860px]">
          <thead>
            <tr>
              <th style={{ width: 44 }}><input type="checkbox" checked={allVisibleSelected} onChange={toggleSelAll} aria-label="Pilih semua" /></th>
              <th>Barang</th>
              <th>Penjual</th>
              <th>Harga</th>
              <th>Status</th>
              <th>Views</th>
              <th>Kirim WA</th>
              <th style={{ width: 56 }}></th>
            </tr>
          </thead>
          <tbody>
            {paginatedListings.map((l) => (
              <tr key={l.id}>
                <td><input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleSel(l.id)} aria-label={`Pilih ${l.title}`} /></td>
                <td>
                  <div className="flex items-center gap-3">
                    {l.image_url ? (
                      <img src={l.image_url} alt="" className="h-10 w-10 shrink-0 rounded object-cover" style={{ background: "var(--g-surface-2)" }} loading="lazy" />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded" style={{ background: "var(--g-surface-2)", color: "var(--g-ink-faint)" }}>
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                    )}
                    <div className="min-w-0 max-w-[240px]">
                      <a href={`${basis}/listings/${buildSlug(l.title, l.id)}`} className="block truncate font-medium hover:underline" title={l.title}>
                        {l.title}
                      </a>
                      <p className="truncate text-xs" style={{ color: "var(--g-ink-soft)" }}>{l.category}{l.featured ? " · ⭐" : ""}</p>
                    </div>
                  </div>
                </td>
                <td className="g-td-soft">
                  {l.seller_name}
                  <br />
                  <span className="text-xs">{l.seller_wa}</span>
                </td>
                <td className="whitespace-nowrap">{rupiah(l.price)}</td>
                <td><StatusBadge s={l.status} /></td>
                <td className="g-td-soft">{l.views || 0}</td>
                <td>
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => kirimViaBot(l)} disabled={kirimSibuk === l.id} className="g-btn g-btn-sm g-btn-outlined text-[10px] text-emerald-600 dark:text-emerald-400" title="Bot mengirim ke grup, admin, dan penjual">
                      {kirimSibuk === l.id ? "Mengirim…" : "Kirim Bot"}
                    </button>
                  </div>
                </td>
                <td>
                  <MenuAksi items={[
                    { label: "Edit", href: `${basis}/listings/${buildSlug(l.title, l.id)}` },
                    ...(l.status === "deletion_pending"
                      ? [
                          { label: "Setujui penghapusan", tone: "bad", onClick: () => { if(window.confirm("Setujui?")) action({ action: "delete", id: l.id }, "Dihapus") } },
                          { label: "Tolak — aktifkan lagi", onClick: () => action({ action: "activate", id: l.id }, "Diaktifkan") },
                        ]
                      : [
                          ...(l.status !== "active" ? [{ label: "Aktifkan", onClick: () => action({ action: "activate", id: l.id }, "Diaktifkan") }] : []),
                          ...(l.status !== "suspended" ? [{ label: "Suspend", onClick: () => action({ action: "suspend", id: l.id }, "Disuspend") }] : []),
                          l.featured
                            ? { label: "Lepas Featured", onClick: () => action({ action: "unfeature", id: l.id }, "Featured dilepas") }
                            : { label: "Featured 7 hari", onClick: () => action({ action: "feature", id: l.id, days: 7 }, "Featured 7 hari") },
                          { label: "Hapus listing", tone: "bad", onClick: () => { if(window.confirm("Hapus?")) action({ action: "delete", id: l.id }, "Dihapus") } },
                        ]),
                    { label: "Blacklist penjual", tone: "bad", onClick: () => { if(window.confirm(`Blokir ${l.seller_wa}?`)) action({ action: "blacklist", wa: l.seller_wa }, "Diblacklist") } },
                  ]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredListings.length === 0 && (
          <div className="g-empty" style={{ border: 0 }}>
            <p className="g-empty-title">Tidak ada listing yang cocok</p>
            <p className="g-empty-desc">Coba ganti kata kunci atau saringan statusnya.</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-4">
          <p className="text-xs text-gray-500">
            Halaman {currentPage} dari {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="g-btn g-btn-sm g-btn-outlined"
            >
              Sebelumnya
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="g-btn g-btn-sm g-btn-outlined"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
