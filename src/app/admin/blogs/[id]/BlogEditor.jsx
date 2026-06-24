"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";

function autoSlug(val) {
  return val
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function BlogEditor({ initialBlog }) {
  const router = useRouter();
  const [busy, setBusy]         = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview]   = useState(false);
  const [form, setForm] = useState({
    title:            initialBlog?.title            || "",
    slug:             initialBlog?.slug             || "",
    excerpt:          initialBlog?.excerpt          || "",
    keywords:         initialBlog?.keywords         || "",
    content_markdown: initialBlog?.content_markdown || "",
    image_url:        initialBlog?.image_url        || "",
    status:           initialBlog?.status           || "draft",
    author:           initialBlog?.author           || "Admin",
  });

  function set(key, val) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.content_markdown.trim()) {
      return alert("Judul & Konten wajib diisi");
    }
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

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return alert("Ukuran gambar maksimal 5MB");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("bucket", "blog-images");
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload gagal");
      set("image_url", data.url);
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  }

  const charCount = form.content_markdown.length;
  const wordCount = form.content_markdown.trim() ? form.content_markdown.trim().split(/\s+/).length : 0;
  const readMins  = Math.max(1, Math.round(wordCount / 200));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold dark:text-white">
          {initialBlog ? "Edit Artikel" : "Tulis Artikel Baru"}
        </h1>
        <div className="flex gap-2">
          <button type="button" onClick={() => setPreview(!preview)} className={`btn-outline text-sm ${preview ? "bg-primary/10 border-primary/50" : ""}`}>
            {preview ? "✏️ Editor" : "👁 Preview"}
          </button>
          <button onClick={() => router.push("/admin/blogs")} className="btn-outline text-sm">
            Kembali
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Judul + Slug */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Judul Artikel *</label>
            <input
              className="input"
              value={form.title}
              onChange={(e) => {
                const title = e.target.value;
                setForm((prev) => ({ ...prev, title, slug: initialBlog ? prev.slug : autoSlug(title) }));
              }}
              required
              placeholder="Judul menarik untuk artikel…"
            />
          </div>
          <div>
            <label className="label">Slug (URL)</label>
            <input
              className="input font-mono text-sm"
              value={form.slug}
              onChange={(e) => set("slug", autoSlug(e.target.value))}
              required
              placeholder="judul-artikel-slug"
            />
          </div>
        </div>

        {/* Excerpt */}
        <div>
          <label className="label flex justify-between">
            <span>Ringkasan / Excerpt <span className="font-normal text-gray-400">(untuk SEO meta description)</span></span>
            <span className="font-normal text-gray-400 text-xs">{form.excerpt.length}/160</span>
          </label>
          <textarea
            className="input resize-none"
            rows={2}
            value={form.excerpt}
            maxLength={160}
            onChange={(e) => set("excerpt", e.target.value)}
            placeholder="Ringkasan singkat artikel (akan muncul di hasil Google dan preview link)…"
          />
        </div>

        {/* Keywords */}
        <div>
          <label className="label">Tag / Keywords <span className="font-normal text-gray-400">(pisahkan dengan koma)</span></label>
          <input
            className="input"
            value={form.keywords}
            onChange={(e) => set("keywords", e.target.value)}
            placeholder="tips jual beli, mahasiswa USU, barang bekas Medan"
          />
          {form.keywords && (
            <div className="mt-2 flex flex-wrap gap-1">
              {form.keywords.split(",").filter(t => t.trim()).map((tag) => (
                <span key={tag.trim()} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{tag.trim()}</span>
              ))}
            </div>
          )}
        </div>

        {/* Author + Status */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-1">
            <label className="label">Penulis</label>
            <input className="input" value={form.author} onChange={(e) => set("author", e.target.value)} placeholder="Nama penulis" />
          </div>
          <div className="md:col-span-1">
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="draft">📝 Draft</option>
              <option value="published">✅ Published</option>
            </select>
          </div>
        </div>

        {/* Gambar Sampul */}
        <div>
          <label className="label">Gambar Sampul</label>
          <div className="flex flex-wrap gap-2">
            <input
              className="input flex-1 min-w-[200px]"
              value={form.image_url}
              onChange={(e) => set("image_url", e.target.value)}
              placeholder="https://… atau upload file di bawah"
            />
            <label className={`btn-outline cursor-pointer text-sm whitespace-nowrap ${uploading ? "opacity-50" : ""}`}>
              {uploading ? "Mengupload…" : "Upload Gambar"}
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
            </label>
          </div>
          {form.image_url && (
            <div className="mt-3 relative h-40 w-full overflow-hidden rounded-xl bg-gray-100 dark:bg-slate-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.image_url} alt="cover preview" className="h-full w-full object-cover" />
              <button type="button" onClick={() => set("image_url", "")} className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white hover:bg-black/80">✕</button>
            </div>
          )}
        </div>

        {/* Editor / Preview split */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="label mb-0">Konten (Markdown) *</label>
            <span className="text-xs text-gray-400">{wordCount} kata · {readMins} menit baca</span>
          </div>
          {preview ? (
            <div className="min-h-[400px] rounded-xl border border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <div className="prose prose-lg dark:prose-invert prose-primary max-w-none">
                <ReactMarkdown>{form.content_markdown || "*Belum ada konten…*"}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <textarea
              className="input min-h-[400px] font-mono text-sm leading-relaxed"
              value={form.content_markdown}
              onChange={(e) => set("content_markdown", e.target.value)}
              placeholder={`# Judul Artikel\n\nTulis konten di sini menggunakan Markdown...\n\n## Sub-judul\n\n**Bold**, *italic*, [link](url), ![gambar](url)\n\n- Poin 1\n- Poin 2`}
              required
            />
          )}
          <p className="mt-1 text-xs text-gray-400">
            Mendukung format Markdown: # Heading, **bold**, *italic*, [link](url), ![img](url)
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-gray-200 pt-5 dark:border-slate-800">
          <div className="text-xs text-gray-400">
            {charCount > 0 ? `${charCount} karakter` : ""}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => router.push("/admin/blogs")} className="btn-outline">Batal</button>
            <button
              type="button"
              disabled={busy}
              onClick={() => { set("status", "draft"); setTimeout(() => document.querySelector("form").requestSubmit(), 0); }}
              className="btn-outline"
            >
              Simpan Draft
            </button>
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? "Menyimpan…" : form.status === "published" ? "Publish" : "Simpan"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
