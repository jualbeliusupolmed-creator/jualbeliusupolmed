"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BlogEditor({ initialBlog }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: initialBlog?.title || "",
    slug: initialBlog?.slug || "",
    content_markdown: initialBlog?.content_markdown || "",
    image_url: initialBlog?.image_url || "",
    status: initialBlog?.status || "draft",
    author: initialBlog?.author || "Admin",
  });

  async function handleSave(e) {
    e.preventDefault();
    if (!form.title || !form.content_markdown) return alert("Judul & Konten wajib diisi");
    
    setBusy(true);
    try {
      const res = await fetch("/api/admin/blogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: initialBlog?.id, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      router.push("/admin/blogs");
      router.refresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  function autoSlug(val) {
    return val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold dark:text-white">
          {initialBlog ? "Edit Artikel" : "Tulis Artikel Baru"}
        </h1>
        <button onClick={() => router.push("/admin/blogs")} className="btn-outline">
          Kembali
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="label">Judul</label>
            <input 
              className="input" 
              value={form.title} 
              onChange={(e) => {
                const title = e.target.value;
                setForm(prev => ({ 
                  ...prev, 
                  title, 
                  slug: initialBlog ? prev.slug : autoSlug(title) 
                }));
              }}
              required 
            />
          </div>
          <div>
            <label className="label">Slug (URL)</label>
            <input 
              className="input" 
              value={form.slug} 
              onChange={(e) => setForm({ ...form, slug: autoSlug(e.target.value) })}
              required 
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="label">URL Gambar Sampul (Opsional)</label>
            <input 
              className="input" 
              value={form.image_url} 
              onChange={(e) => setForm({ ...form, image_url: e.target.value })} 
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="label">Status</label>
            <select 
              className="input" 
              value={form.status} 
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label">Konten (Markdown)</label>
          <textarea 
            className="input min-h-[400px] font-mono text-sm leading-relaxed" 
            value={form.content_markdown} 
            onChange={(e) => setForm({ ...form, content_markdown: e.target.value })}
            placeholder="Gunakan format Markdown (# Heading, **Bold**, dll)"
            required
          />
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.push("/admin/blogs")} className="btn-outline">Batal</button>
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? "Menyimpan..." : "Simpan Artikel"}
          </button>
        </div>
      </form>
    </div>
  );
}
