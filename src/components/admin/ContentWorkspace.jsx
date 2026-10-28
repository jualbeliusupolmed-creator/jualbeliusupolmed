"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, Check, CircleAlert, FilePlus2, LoaderCircle, Pencil, RefreshCw, X } from "lucide-react";

const EMPTY = { title: "", slug: "", excerpt: "", imageUrl: "", contentMarkdown: "", status: "draft" };
const STATUS = { menunggu: "Menunggu review", published: "Terbit", draft: "Draf", ditolak: "Ditolak" };

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Permintaan gagal.");
  return body;
}

function makeSlug(value) {
  return String(value || "").normalize("NFKD").toLowerCase().replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function ContentWorkspace({ canReview = false, canManage = false, superadmin = false }) {
  const [status, setStatus] = useState("all");
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [rejectId, setRejectId] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await requestJson("/api/admin/content?status=" + status, { cache: "no-store" });
      setItems(data.items || []);
    } catch (cause) { setError(cause.message); }
    finally { setLoading(false); }
  }, [status]);
  useEffect(() => { load(); }, [load]);

  function startNew() {
    setEditingId("");
    setForm(EMPTY);
    setShowEditor(true);
    setError("");
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({ title: item.title || "", slug: item.slug || "", excerpt: item.excerpt || "", imageUrl: item.image_url || "", contentMarkdown: item.content_markdown || "", status: item.status || "draft" });
    setShowEditor(true);
    setError("");
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    const payload = { ...form, slug: makeSlug(form.slug || form.title) };
    try {
      if (editingId) {
        await requestJson("/api/admin/content", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, id: editingId, action: "update" }) });
        setNotice(superadmin ? "Artikel diperbarui." : "Artikel diperbarui dan kembali menjadi draf untuk ditinjau.");
      } else {
        await requestJson("/api/admin/content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        setNotice("Draf artikel dibuat.");
      }
      setShowEditor(false);
      setEditingId("");
      setForm(EMPTY);
      await load();
    } catch (cause) { setError(cause.message); }
    finally { setSaving(false); }
  }

  async function review(item, action) {
    if (action === "reject" && !rejectReason.trim()) { setError("Tuliskan alasan penolakan terlebih dahulu."); return; }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await requestJson("/api/admin/content", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, action, reason: rejectReason }) });
      setNotice(action === "approve" ? "Artikel diterbitkan." : "Artikel ditolak dan alasannya dicatat.");
      setRejectId("");
      setRejectReason("");
      await load();
    } catch (cause) { setError(cause.message); }
    finally { setSaving(false); }
  }

  return <div className="space-y-5">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-2xl font-black tracking-tight">Konten</h2><p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">Artikel dan proses review. Owner hanya melihat artikel penulis di kampus yang menjadi cakupannya.</p></div><div className="flex gap-2"><button onClick={load} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 hover:border-emerald-300 hover:text-emerald-800"><RefreshCw className="h-3.5 w-3.5" />Segarkan</button>{superadmin ? <button onClick={startNew} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-emerald-800 px-4 text-xs font-extrabold text-white hover:bg-emerald-900"><FilePlus2 className="h-3.5 w-3.5" />Artikel baru</button> : null}</div></header>
    {notice ? <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">{notice}</div> : null}
    {error ? <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800"><CircleAlert className="h-4 w-4 shrink-0" />{error}</div> : null}
    {showEditor ? <form onSubmit={save} className="space-y-4 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-extrabold text-emerald-800">{editingId ? "Sunting artikel" : "Artikel baru"}</p><p className="mt-1 text-[11px] text-slate-500">Isi artikel menggunakan Markdown. Tautan gambar harus HTTPS.</p></div><button type="button" onClick={() => setShowEditor(false)} aria-label="Tutup editor" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></div><div className="grid gap-3 md:grid-cols-2"><label className="text-xs font-bold text-slate-700">Judul<input required maxLength={180} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value, slug: editingId ? current.slug : makeSlug(event.target.value) }))} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-600" /></label><label className="text-xs font-bold text-slate-700">Slug<input required maxLength={180} value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: makeSlug(event.target.value) }))} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-600" /></label><label className="text-xs font-bold text-slate-700 md:col-span-2">Ringkasan<input maxLength={500} value={form.excerpt} onChange={(event) => setForm((current) => ({ ...current, excerpt: event.target.value }))} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-600" /></label><label className="text-xs font-bold text-slate-700 md:col-span-2">URL gambar<input type="url" value={form.imageUrl} onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))} placeholder="https://..." className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-600" /></label><label className="text-xs font-bold text-slate-700 md:col-span-2">Isi artikel<textarea required rows={14} maxLength={100000} value={form.contentMarkdown} onChange={(event) => setForm((current) => ({ ...current, contentMarkdown: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-200 p-3 font-mono text-xs leading-relaxed outline-none focus:border-emerald-600" /></label>{superadmin && editingId ? <label className="text-xs font-bold text-slate-700">Status saat disimpan<select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3"><option value="draft">Draf</option><option value="published">Terbit</option></select></label> : null}</div><div className="flex flex-wrap items-center gap-2"><button disabled={saving} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-emerald-800 px-4 text-xs font-extrabold text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{editingId ? "Simpan perubahan" : "Simpan draf"}</button><button type="button" onClick={() => setShowEditor(false)} className="min-h-10 rounded-full border border-slate-200 px-4 text-xs font-bold text-slate-600">Batal</button></div></form> : null}
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white"><div className="flex flex-wrap gap-1 border-b border-slate-100 p-3">{[["all", "Semua"], ["menunggu", "Menunggu"], ["published", "Terbit"], ["draft", "Draf"], ["ditolak", "Ditolak"]].map(([key, label]) => <button key={key} onClick={() => setStatus(key)} aria-pressed={status === key} className={`min-h-8 rounded-full px-3 text-[11px] font-extrabold ${status === key ? "bg-emerald-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{label}</button>)}</div>
      {loading && !items.length ? <div className="grid min-h-48 place-items-center text-slate-400"><LoaderCircle className="h-5 w-5 animate-spin" /></div> : items.length ? <div className="divide-y divide-slate-100">{items.map((item) => <article key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:px-5"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><BookOpen className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-extrabold">{item.title}</h3><span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${item.status === "published" ? "bg-emerald-50 text-emerald-800" : item.status === "menunggu" ? "bg-amber-50 text-amber-800" : item.status === "ditolak" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"}`}>{STATUS[item.status] || item.status}</span></div><p className="mt-1 text-[11px] text-slate-500">{item.author || "Admin"}{item.campus ? " · " + item.campus : ""} · {item.created_at ? new Date(item.created_at).toLocaleDateString("id-ID") : "—"}</p>{item.excerpt ? <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600">{item.excerpt}</p> : null}{item.status === "ditolak" && item.reject_note ? <p className="mt-2 text-xs text-rose-700">Alasan: {item.reject_note}</p> : null}
        {rejectId === item.id ? <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input autoFocus value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} maxLength={300} placeholder="Alasan penolakan" className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-rose-400" /><button disabled={saving} onClick={() => review(item, "reject")} className="min-h-9 rounded-full bg-rose-700 px-3 text-[11px] font-extrabold text-white disabled:opacity-50">Tolak artikel</button><button onClick={() => setRejectId("")} className="min-h-9 rounded-full border border-slate-200 px-3 text-[11px] font-bold text-slate-600">Batal</button></div> : null}</div>
        <div className="flex flex-wrap gap-2 sm:justify-end">{canManage ? <button onClick={() => startEdit(item)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-slate-200 px-3 text-[11px] font-bold text-slate-600 hover:border-emerald-300 hover:text-emerald-800"><Pencil className="h-3.5 w-3.5" />Sunting</button> : null}{canReview && item.status !== "published" ? <button disabled={saving} onClick={() => review(item, "approve")} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-emerald-800 px-3 text-[11px] font-extrabold text-white disabled:opacity-50"><Check className="h-3.5 w-3.5" />Terbitkan</button> : null}{canReview && item.status !== "published" && rejectId !== item.id ? <button onClick={() => { setRejectId(item.id); setRejectReason(""); }} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-rose-200 px-3 text-[11px] font-extrabold text-rose-700 hover:bg-rose-50">Tolak</button> : null}</div></article>)}</div> : <div className="grid min-h-48 place-items-center px-5 text-center"><div><BookOpen className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-3 text-sm font-extrabold text-slate-600">Belum ada artikel di filter ini</p><p className="mt-1 text-xs text-slate-400">Konten baru akan muncul di sini.</p></div></div>}
    </section>
  </div>;
}
