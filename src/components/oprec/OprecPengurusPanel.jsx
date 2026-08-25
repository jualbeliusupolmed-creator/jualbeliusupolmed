"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { formatWa } from "@/lib/constants";

const STATUS_LABEL = {
  pending: { label: "Menunggu", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  accepted: { label: "✅ Diterima", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  rejected: { label: "❌ Ditolak", cls: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
  reviewed: { label: "👀 Ditinjau", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}j lalu`;
  const d = Math.floor(h / 24);
  return `${d}h lalu`;
}

export default function OprecPengurusPanel({ oprec, onClose }) {
  const [submissions, setSubmissions] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, diterima: 0, ditolak: 0 });
  const [loading, setLoading] = useState(true);
  const [filterDiv, setFilterDiv] = useState("Semua");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState({});
  const [noteModal, setNoteModal] = useState(null); // { sub, newStatus }
  const [reviewerNote, setReviewerNote] = useState("");
  const [oprecStatus, setOprecStatus] = useState(oprec?.status || "active");

  const load = useCallback(async () => {
    if (!oprec?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/oprec/${oprec.id}?submissions=true`);
      const data = await res.json();
      if (res.ok) {
        setSubmissions(data.submissions || []);
        setStats(data.stats || { total: 0, pending: 0, diterima: 0, ditolak: 0 });
        setOprecStatus(data.oprec?.status || "active");
      }
    } catch (err) {
      toast.error("Gagal memuat data pendaftar.");
    } finally {
      setLoading(false);
    }
  }, [oprec?.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(sub, newStatus) {
    if (newStatus === "accepted" || newStatus === "rejected") {
      setNoteModal({ sub, newStatus });
      setReviewerNote("");
      return;
    }
    await doUpdate(sub.id, newStatus, "");
  }

  async function doUpdate(subId, newStatus, note) {
    setBusy((prev) => ({ ...prev, [subId]: true }));
    try {
      const res = await fetch(`/api/oprec/${oprec.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_submission_status",
          submission_id: subId,
          status: newStatus,
          reviewer_note: note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui status.");
      toast.success(`Status berhasil diubah ke "${STATUS_LABEL[newStatus]?.label || newStatus}"`);
      setNoteModal(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy((prev) => ({ ...prev, [subId]: false }));
    }
  }

  async function toggleOprecStatus() {
    const action = oprecStatus === "active" ? "close_oprec" : "reopen_oprec";
    try {
      const res = await fetch(`/api/oprec/${oprec.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOprecStatus(action === "close_oprec" ? "closed" : "active");
      toast.success(data.message);
    } catch (err) {
      toast.error(err.message);
    }
  }

  function exportCSV() {
    if (!submissions.length) return toast.error("Tidak ada data untuk diekspor.");
    const header = ["Nama", "WA", "NIM", "Kampus", "Fakultas", "Angkatan", "Divisi 1", "Divisi 2", "Status", "Alasan", "Tanggal Daftar"];
    const rows = submissions.map((s) => [
      `"${s.applicant_name || ""}"`,
      `"${s.applicant_wa || ""}"`,
      `"${s.nim || ""}"`,
      `"${s.campus || ""}"`,
      `"${s.faculty || ""}"`,
      `"${s.batch || ""}"`,
      `"${s.division_1 || ""}"`,
      `"${s.division_2 || ""}"`,
      `"${s.status || "pending"}"`,
      `"${(s.reason || "").replace(/"/g, "'")}"`,
      `"${s.created_at ? new Date(s.created_at).toLocaleDateString("id-ID") : ""}"`,
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `oprec_${oprec.title?.replace(/\s+/g, "_") || "data"}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast.success("File CSV berhasil diunduh!");
  }

  const filtered = submissions.filter((s) => {
    const matchDiv = filterDiv === "Semua" || s.division_1 === filterDiv || s.division_2 === filterDiv;
    const matchStatus = filterStatus === "Semua" || s.status === filterStatus;
    const matchSearch =
      !search ||
      s.applicant_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.nim?.toLowerCase().includes(search.toLowerCase());
    return matchDiv && matchStatus && matchSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-4xl rounded-3xl bg-white dark:bg-slate-900 border border-black/[0.07] dark:border-white/[0.08] z-10 shadow-2xl flex flex-col max-h-[95vh]">
        {/* HEADER */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100 dark:border-slate-800 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary dark:text-emerald-400">
                🏛️ Panel Pengurus UKM
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  oprecStatus === "active"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-slate-400"
                }`}
              >
                {oprecStatus === "active" ? "● Aktif" : "◉ Ditutup"}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white mt-1 truncate">
              {oprec?.title || "Formulir Oprec"}
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-slate-400">
              {oprec?.ukm_name} · Deadline:{" "}
              {oprec?.deadline ? new Date(oprec.deadline).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-400 shrink-0"
          >
            ✕
          </button>
        </div>

        {/* STATS BAR */}
        <div className="grid grid-cols-4 divide-x divide-gray-100 dark:divide-slate-800 border-b border-gray-100 dark:border-slate-800 shrink-0">
          {[
            { label: "Total", val: stats.total, color: "text-gray-900 dark:text-white" },
            { label: "Menunggu", val: stats.pending, color: "text-amber-600 dark:text-amber-400" },
            { label: "Diterima", val: stats.diterima, color: "text-emerald-600 dark:text-emerald-400" },
            { label: "Ditolak", val: stats.ditolak, color: "text-rose-600 dark:text-rose-400" },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center py-3 px-2">
              <span className={`text-lg font-black ${s.color}`}>{s.val}</span>
              <span className="text-[10px] text-gray-500 dark:text-slate-400">{s.label}</span>
            </div>
          ))}
        </div>

        {/* TOOLBAR */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-slate-800 shrink-0">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama / NIM..."
            className="input py-1.5 text-xs flex-1"
          />

          <select
            value={filterDiv}
            onChange={(e) => setFilterDiv(e.target.value)}
            className="input py-1.5 text-xs"
          >
            <option value="Semua">Semua Divisi</option>
            {(oprec?.divisions || []).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input py-1.5 text-xs"
          >
            <option value="Semua">Semua Status</option>
            <option value="pending">Menunggu</option>
            <option value="accepted">Diterima</option>
            <option value="rejected">Ditolak</option>
            <option value="reviewed">Ditinjau</option>
          </select>

          <button
            onClick={exportCSV}
            className="btn-outline py-1.5 px-3 text-xs font-bold shrink-0 flex items-center gap-1.5"
          >
            ⬇️ Export CSV
          </button>

          <button
            onClick={toggleOprecStatus}
            className={`py-1.5 px-3 text-xs font-bold shrink-0 rounded-xl border transition-all ${
              oprecStatus === "active"
                ? "border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400"
                : "border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400"
            }`}
          >
            {oprecStatus === "active" ? "🔒 Tutup Oprec" : "🔓 Buka Kembali"}
          </button>
        </div>

        {/* TABLE BODY */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">Memuat data pendaftar...</span>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400">
              <span className="text-4xl">📭</span>
              <p className="text-sm font-medium">Belum ada pendaftar{filterDiv !== "Semua" || filterStatus !== "Semua" ? " untuk filter ini" : ""}.</p>
              <p className="text-xs">Bagikan link formulir Oprec kepada calon peserta!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-slate-800/60">
              {filtered.map((sub) => (
                <div
                  key={sub.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  {/* Avatar + Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:text-emerald-400 text-sm font-black">
                      {(sub.applicant_name || "?").charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-gray-900 dark:text-white truncate">
                          {sub.applicant_name}
                        </span>
                        {sub.nim && (
                          <span className="text-[10px] font-mono text-gray-500 dark:text-slate-400">
                            NIM: {sub.nim}
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            STATUS_LABEL[sub.status]?.cls || "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {STATUS_LABEL[sub.status]?.label || sub.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        <span className="text-[11px] text-gray-500 dark:text-slate-400">
                          {sub.campus} · {sub.faculty} · {sub.batch}
                        </span>
                        <span className="text-[11px] text-primary dark:text-emerald-400 font-semibold truncate">
                          {sub.division_1}{sub.division_2 ? ` / ${sub.division_2}` : ""}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-slate-500">
                          {timeAgo(sub.created_at)}
                        </span>
                      </div>
                      {sub.reviewer_note && (
                        <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5 italic">
                          Catatan: {sub.reviewer_note}
                        </p>
                      )}
                      {sub.reason && (
                        <p className="text-[10px] text-gray-600 dark:text-slate-300 mt-0.5 line-clamp-1">
                          "{sub.reason}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 ml-12 sm:ml-0">
                    <a
                      href={`https://wa.me/${sub.applicant_wa}?text=Halo+${encodeURIComponent(sub.applicant_name || "")}%2C+kami+dari+${encodeURIComponent(oprec?.ukm_name || "UKM")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center h-7 w-7 rounded-xl bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 transition-all text-sm"
                      title="Hubungi via WhatsApp"
                    >
                      💬
                    </a>

                    {sub.portfolio_url && (
                      <a
                        href={sub.portfolio_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center h-7 w-7 rounded-xl bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-950/40 dark:text-blue-300 transition-all text-sm"
                        title="Lihat Portofolio"
                      >
                        🔗
                      </a>
                    )}

                    {sub.status !== "accepted" && (
                      <button
                        onClick={() => updateStatus(sub, "accepted")}
                        disabled={busy[sub.id]}
                        className="flex items-center gap-1 h-7 px-2 rounded-xl bg-emerald-500 text-white text-[10px] font-bold hover:bg-emerald-600 disabled:opacity-50 transition-all"
                      >
                        ✅ Terima
                      </button>
                    )}

                    {sub.status !== "rejected" && (
                      <button
                        onClick={() => updateStatus(sub, "rejected")}
                        disabled={busy[sub.id]}
                        className="flex items-center gap-1 h-7 px-2 rounded-xl bg-rose-500 text-white text-[10px] font-bold hover:bg-rose-600 disabled:opacity-50 transition-all"
                      >
                        ❌ Tolak
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-slate-800 text-[11px] text-gray-400 shrink-0">
          <span>Menampilkan {filtered.length} dari {submissions.length} pendaftar</span>
          <button onClick={load} className="text-primary dark:text-emerald-400 hover:underline font-semibold">
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* MODAL CATATAN SAAT TERIMA/TOLAK */}
      {noteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setNoteModal(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-2xl border border-black/[0.07] dark:border-white/[0.08] space-y-3 z-10">
            <h4 className="font-bold text-gray-900 dark:text-white text-sm">
              {noteModal.newStatus === "accepted" ? "✅ Konfirmasi Terima" : "❌ Konfirmasi Tolak"} Pendaftar
            </h4>
            <p className="text-xs text-gray-600 dark:text-slate-300">
              <strong>{noteModal.sub.applicant_name}</strong> untuk divisi <strong>{noteModal.sub.division_1}</strong>
            </p>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                Catatan untuk Pendaftar (Opsional)
              </label>
              <textarea
                rows={2}
                value={reviewerNote}
                onChange={(e) => setReviewerNote(e.target.value)}
                placeholder={
                  noteModal.newStatus === "accepted"
                    ? "Contoh: Selamat! Kamu diterima di Divisi Kreatif. Harap hadir rapat perdana..."
                    : "Contoh: Maaf, posisi sudah terpenuhi. Tetap semangat!"
                }
                className="input py-2 text-xs"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => doUpdate(noteModal.sub.id, noteModal.newStatus, reviewerNote)}
                disabled={busy[noteModal.sub.id]}
                className={`flex-1 py-2 text-xs font-bold text-white rounded-xl transition-all ${
                  noteModal.newStatus === "accepted"
                    ? "bg-emerald-500 hover:bg-emerald-600"
                    : "bg-rose-500 hover:bg-rose-600"
                } disabled:opacity-50`}
              >
                {busy[noteModal.sub.id] ? "Memproses..." : noteModal.newStatus === "accepted" ? "Konfirmasi Terima" : "Konfirmasi Tolak"}
              </button>
              <button
                onClick={() => setNoteModal(null)}
                className="flex-1 py-2 text-xs font-bold rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
