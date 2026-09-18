"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/admin/ui";

function CategoryRow({ c, action }) {
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ name: c.name, icon: c.icon || "Box", sort_order: c.sort_order ?? 0 });
  
  if (edit) {
    return (
      <div className="g-card flex flex-wrap items-center gap-2 p-3">
        <input className="g-input w-16 text-center" value={f.icon} onChange={(e) => setF({ ...f, icon: e.target.value })} title="Ikon" />
        <input className="g-input flex-1 min-w-[150px]" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} title="Nama Kategori" />
        <input type="number" className="g-input w-20" value={f.sort_order} onChange={(e) => setF({ ...f, sort_order: e.target.value })} title="Urutan" />
        <div className="flex gap-1.5 ml-auto">
          <button onClick={() => { action({ action: "category_upsert", id: c.id, slug: c.slug, ...f }, "Kategori disimpan"); setEdit(false); }} className="g-btn g-btn-sm" style={{ background: "var(--g-green-soft)", color: "var(--g-green)" }}>Simpan</button>
          <button onClick={() => setEdit(false)} className="g-btn g-btn-sm g-btn-outlined">Batal</button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="g-card flex items-center justify-between p-3 text-sm">
      <span className="flex items-center gap-3">
        <span className="text-xl w-6 text-center">{c.icon}</span>
        <span className="font-medium dark:text-white">{c.name}</span>
        <span className="text-xs" style={{ color: "var(--g-ink-faint)" }}>/{c.slug} · Urutan: {c.sort_order ?? 0}</span>
      </span>
      <div className="flex gap-2">
        <button onClick={() => setEdit(true)} className="g-btn g-btn-sm g-btn-outlined">Edit</button>
        {c.id && (
          <button onClick={() => { if(window.confirm(`Hapus kategori "${c.name}"?`)) action({ action: "category_delete", id: c.id }, "Dihapus") }} className="g-btn g-btn-sm g-btn-danger">
            Hapus
          </button>
        )}
      </div>
    </div>
  );
}

export default function KategoriClient({ initialCategories = [] }) {
  const router = useRouter();
  
  const [form, setForm] = useState({ name: "", icon: "Box", sort_order: "" });
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
      <PageHeader title="Kategori" />

      <div className="max-w-3xl">
        <div className="g-card p-4 mb-6" style={{ background: "var(--g-surface-2)" }}>
          <h3 className="text-sm font-bold mb-3 text-gray-700 dark:text-gray-300">Tambah Kategori Baru</h3>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--g-ink-soft)" }}>Nama Kategori</label>
              <input className="g-input w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Cth: Otomotif" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--g-ink-soft)" }}>Ikon (Emoji)</label>
              <input className="g-input w-20 text-center" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--g-ink-soft)" }}>Urutan</label>
              <input type="number" className="g-input w-24" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} placeholder="0" />
            </div>
            <button 
              onClick={() => { 
                if (!form.name.trim()) return; 
                action({ action: "category_upsert", ...form }, "Kategori ditambah"); 
                setForm({ name: "", icon: "Box", sort_order: "" }); 
              }} 
              disabled={busy}
              className="g-btn g-btn-primary mb-[2px]"
            >
              Tambah
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {initialCategories.length === 0 && (
            <div className="g-empty" style={{ border: 0 }}>
              <p className="g-empty-title">Tidak ada kategori.</p>
            </div>
          )}
          {initialCategories.map((c) => <CategoryRow key={c.id || c.slug} c={c} action={action} />)}
        </div>
      </div>
    </div>
  );
}
