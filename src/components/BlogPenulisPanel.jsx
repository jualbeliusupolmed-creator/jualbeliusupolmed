"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

const NADA = {
  published: "bg-[#e6f8e8] text-[#134e35] dark:bg-[#134e35]/40 dark:text-[#bef264]",
  menunggu: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  ditolak: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  draft: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};
const LABEL = { published: "Terbit", menunggu: "Menunggu Review", ditolak: "Ditolak", draft: "Draft" };
const JELAS = {
  published: "Tayang di halaman berita/blog dan bisa dibaca siapa saja.",
  menunggu: "Sudah masuk antrean editor. Belum tampil di halaman publik.",
  ditolak: "Perbaiki sesuai catatan editor, lalu ajukan kembali.",
  draft: "Belum dikirim. Hanya kamu yang bisa melihatnya.",
};

const KOSONG = {
  id: null,
  title: "",
  content_markdown: "",
  excerpt: "",
  keywords: "",
  image_url: "",
  status: "draft",
};

export default function BlogPenulisPanel() {
  const [muat, setMuat] = useState(true);
  const [berbadge, setBerbadge] = useState(false);
  const [artikel, setArtikel] = useState([]);
  const [form, setForm] = useState({ ...KOSONG });
  const [activeFilter, setActiveFilter] = useState("tulis"); // tulis | draft | menunggu | published | ditolak
  const [pubMode, setPubMode] = useState("kirim"); // kirim | simpan
  const [tagInput, setTagInput] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState("");

  async function ambil() {
    setMuat(true);
    try {
      const r = await fetch("/api/blog/penulis");
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal memuat artikel");
      setBerbadge(!!d.berbadge);
      setArtikel(d.artikel || []);
      setGalat("");
    } catch (e) {
      setGalat(e.message);
    } finally {
      setMuat(false);
    }
  }

  useEffect(() => {
    ambil();
  }, []);

  const isiCukup =
    (form?.content_markdown || "").trim().length >= 200 &&
    (form?.title || "").trim().length >= 5;
  const menyuntingYangTerbit = form?.id && form?.status === "published";
  const wordCount = (form?.content_markdown || "").trim()
    ? (form?.content_markdown || "").trim().split(/\s+/).length
    : 0;

  const counts = {
    draft: artikel.filter((a) => a.status === "draft").length,
    menunggu: artikel.filter((a) => a.status === "menunggu").length,
    published: artikel.filter((a) => a.status === "published").length,
    ditolak: artikel.filter((a) => a.status === "ditolak").length,
  };

  const tagsList = (form?.keywords || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  function addTag() {
    const clean = tagInput.trim().replace(/^#/, "");
    if (!clean) return;
    const next = Array.from(new Set([...tagsList, clean])).join(", ");
    setForm((prev) => ({ ...prev, keywords: next }));
    setTagInput("");
  }

  function removeTag(tag) {
    const next = tagsList.filter((t) => t !== tag).join(", ");
    setForm((prev) => ({ ...prev, keywords: next }));
  }

  function insertMarkdown(snippet) {
    setForm((prev) => ({
      ...prev,
      content_markdown: prev.content_markdown
        ? `${prev.content_markdown}\n${snippet}`
        : snippet,
    }));
  }

  async function simpan(aksi) {
    if (!form) return;
    setSibuk(true);
    try {
      const r = await fetch("/api/blog/penulis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, aksi }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menyimpan");
      toast.success(d.pesan || "Tersimpan");
      setForm({ ...KOSONG });
      setActiveFilter(aksi === "simpan" ? "draft" : berbadge ? "published" : "menunggu");
      ambil();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSibuk(false);
    }
  }

  async function hapus(a) {
    if (!confirm(`Hapus artikel "${a.title}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setSibuk(true);
    try {
      const r = await fetch(`/api/blog/penulis?id=${encodeURIComponent(a.id)}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menghapus");
      toast.success("Artikel dihapus");
      ambil();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSibuk(false);
    }
  }

  if (muat) {
    return (
      <div className="py-16 text-center text-sm text-[#404943] dark:text-slate-400">
        Memuat Ruang Penulis…
      </div>
    );
  }

  if (galat) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-900/20 dark:text-rose-300">
        {galat}
      </div>
    );
  }

  const filteredArticles =
    activeFilter === "tulis"
      ? artikel
      : artikel.filter((a) => a.status === activeFilter);

  const renderArticleList = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-[#003622] dark:text-white">
          Daftar Artikel ({filteredArticles.length})
        </h3>
        <button
          type="button"
          onClick={() => {
            setForm({ ...KOSONG });
            setActiveFilter("tulis");
          }}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#003622] text-white text-xs font-bold"
        >
          <span className="material-symbols-outlined text-[15px]">add</span>
          Tulis Baru
        </button>
      </div>

      {filteredArticles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#c0c9c1] dark:border-white/15 bg-white dark:bg-[#112218] py-12 px-4 text-center text-xs text-[#707972] dark:text-slate-400">
          Belum ada artikel di kategori ini. Mulai tulis artikel pertamamu seputar kehidupan kampus!
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredArticles.map((a) => (
            <div
              key={a.id}
              className="rounded-2xl bg-white dark:bg-[#112218] border border-[#e2f0e6] dark:border-white/10 p-4 shadow-xs space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-sm text-[#101f15] dark:text-white">{a.title}</p>
                  <p className="text-[11px] text-[#707972]">
                    {new Date(a.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${NADA[a.status] || NADA.draft}`}>
                  {LABEL[a.status] || a.status}
                </span>
              </div>
              <p className="text-xs text-[#404943] dark:text-slate-400">{JELAS[a.status]}</p>
              {a.status === "ditolak" && a.reject_note && (
                <p className="rounded-xl bg-rose-50 dark:bg-rose-900/20 p-2.5 text-xs text-rose-700 dark:text-rose-300">
                  Catatan editor: {a.reject_note}
                </p>
              )}
              <div className="flex flex-wrap gap-3 pt-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setForm({
                      id: a.id,
                      title: a.title || "",
                      content_markdown: a.content_markdown || "",
                      excerpt: a.excerpt || "",
                      keywords: a.keywords || "",
                      image_url: a.image_url || "",
                      status: a.status,
                    });
                    setActiveFilter("tulis");
                  }}
                  className="text-[#134e35] dark:text-[#bef264] hover:underline"
                >
                  Sunting
                </button>
                {a.url && (
                  <a href={a.url} target="_blank" rel="noreferrer" className="text-[#404943] dark:text-slate-300 hover:underline">
                    Lihat di blog
                  </a>
                )}
                <button type="button" onClick={() => hapus(a)} className="text-rose-600 hover:underline">
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderEditor = () => (
    <div className="space-y-4">
      {/* Badge Status */}
      <div className="rounded-2xl bg-[#e6f8e8] dark:bg-[#134e35]/30 border border-[#ceeb7a]/60 dark:border-white/10 p-4 flex items-start gap-3">
        <span className="material-symbols-fill text-[#134e35] dark:text-[#bef264] text-[22px] shrink-0">
          {berbadge ? "verified" : "edit_note"}
        </span>
        <div>
          <p className="text-xs font-extrabold text-[#003622] dark:text-white">
            {berbadge ? "Penulis Terverifikasi (Langsung Terbit)" : "Tulisan Ditinjau Tim Editor"}
          </p>
          <p className="text-[11px] text-[#404943] dark:text-slate-300 mt-0.5 leading-relaxed">
            {berbadge
              ? "Artikel yang kamu ajukan langsung tayang di kanal Berita & Blog Kampus Kita."
              : "Setiap artikel yang diajukan akan ditinjau tim editor terlebih dahulu sebelum tayang."}
          </p>
        </div>
      </div>

      {/* Judul Berita */}
      <div className="bg-white dark:bg-[#112218] rounded-2xl border border-[#e2f0e6] dark:border-white/10 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-extrabold text-[#101f15] dark:text-white">
            Judul Berita <span className="text-rose-500">*</span>
          </label>
          <span className="text-[11px] text-[#707972]">{form.title.length}/120</span>
        </div>
        <input
          type="text"
          maxLength={120}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Tulis judul berita yang lugas dan menarik..."
          className="w-full rounded-xl bg-[#f4faf5] dark:bg-white/5 border border-[#e2f0e6] dark:border-white/10 px-3.5 py-2.5 text-sm font-semibold text-[#101f15] dark:text-white placeholder:text-[#707972] focus:outline-none focus:ring-2 focus:ring-[#134e35]"
        />
      </div>

      {/* Editor Isi Artikel */}
      <div className="bg-white dark:bg-[#112218] rounded-2xl border border-[#e2f0e6] dark:border-white/10 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-extrabold text-[#101f15] dark:text-white">
            Isi Artikel <span className="text-rose-500">*</span>
          </label>
          <span className="text-[11px] text-[#707972]">{wordCount} kata • {form.content_markdown.length}/20.000</span>
        </div>

        {/* Markdown Toolbar */}
        <div className="flex flex-wrap items-center gap-1 p-1.5 rounded-xl bg-[#f4faf5] dark:bg-white/5 border border-[#e2f0e6] dark:border-white/10">
          <button
            type="button"
            onClick={() => insertMarkdown("## Subjudul Baru")}
            className="px-2.5 py-1 rounded-lg text-xs font-bold text-[#101f15] dark:text-white hover:bg-white dark:hover:bg-white/10"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown("**teks tebal**")}
            className="px-2.5 py-1 rounded-lg text-xs font-extrabold text-[#101f15] dark:text-white hover:bg-white dark:hover:bg-white/10"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown("*teks miring*")}
            className="px-2.5 py-1 rounded-lg text-xs italic font-semibold text-[#101f15] dark:text-white hover:bg-white dark:hover:bg-white/10"
          >
            I
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown("- Poin daftar")}
            className="p-1.5 rounded-lg text-[#404943] dark:text-slate-300 hover:bg-white dark:hover:bg-white/10"
            title="Daftar"
          >
            <span className="material-symbols-outlined text-[16px]">format_list_bulleted</span>
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown("> Kutipan narasumber")}
            className="p-1.5 rounded-lg text-[#404943] dark:text-slate-300 hover:bg-white dark:hover:bg-white/10"
            title="Kutipan"
          >
            <span className="material-symbols-outlined text-[16px]">format_quote</span>
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown("[Teks Tautan](https://kampuskita.my.id)")}
            className="p-1.5 rounded-lg text-[#404943] dark:text-slate-300 hover:bg-white dark:hover:bg-white/10"
            title="Tautan"
          >
            <span className="material-symbols-outlined text-[16px]">link</span>
          </button>
        </div>

        <textarea
          rows={12}
          maxLength={20000}
          value={form.content_markdown}
          onChange={(e) => setForm({ ...form, content_markdown: e.target.value })}
          placeholder="Mulai menulis artikel di sini... Ceritakan informasi secara lengkap, jelas, dan objektif (minimal 200 karakter)."
          className="w-full rounded-xl bg-[#f4faf5] dark:bg-white/5 border border-[#e2f0e6] dark:border-white/10 p-3.5 text-sm text-[#101f15] dark:text-white placeholder:text-[#707972] focus:outline-none focus:ring-2 focus:ring-[#134e35]"
        />
        <p className={`text-[11px] font-semibold ${form.content_markdown.trim().length < 200 ? "text-amber-600" : "text-[#134e35] dark:text-[#bef264]"}`}>
          Minimal 200 karakter untuk diajukan ({Math.min(200, form.content_markdown.trim().length)}/200)
        </p>
      </div>

      {/* Gambar Utama */}
      <div className="bg-white dark:bg-[#112218] rounded-2xl border border-[#e2f0e6] dark:border-white/10 p-4 shadow-xs space-y-2.5">
        <label className="text-xs font-extrabold text-[#101f15] dark:text-white block">
          Gambar Utama <span className="text-[#707972] font-normal">(URL Sampul Opsional)</span>
        </label>
        <div className="rounded-2xl border-2 border-dashed border-[#86efac] dark:border-[#134e35] bg-[#f4faf5] dark:bg-white/5 p-5 text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-[#e6f8e8] dark:bg-[#134e35]/40 text-[#134e35] dark:text-[#bef264] mx-auto flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">image</span>
          </div>
          <p className="text-xs font-bold text-[#101f15] dark:text-white">Masukkan URL Gambar Utama</p>
          <input
            type="url"
            maxLength={500}
            value={form.image_url}
            onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            placeholder="https://..."
            className="w-full rounded-xl bg-white dark:bg-[#0a1710] border border-[#e2f0e6] dark:border-white/10 px-3 py-2 text-xs text-[#101f15] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#134e35]"
          />
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#e6f8e8] dark:bg-[#134e35]/40 text-[#134e35] dark:text-[#bef264] text-[10px] font-bold">
            Rekomendasi rasio 16:9
          </span>
        </div>
      </div>

      {menyuntingYangTerbit && !berbadge && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-3.5 text-xs text-amber-800 dark:text-amber-300">
          <b>Perhatian:</b> Artikel ini sudah tayang. Karena kamu belum punya badge penulis, menyimpan perubahannya akan mengembalikannya ke antrean editor.
        </div>
      )}
    </div>
  );

  const renderSettingsPanel = () => (
    <div className="space-y-4">
      <div className="bg-white dark:bg-[#112218] rounded-2xl border border-[#e2f0e6] dark:border-white/10 p-4 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#101f15] dark:text-white flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">tune</span>
            Pengaturan Artikel
          </h3>
          {isiCukup && (
            <span className="px-2 py-0.5 rounded-full bg-[#e6f8e8] text-[#134e35] text-[10px] font-bold">
              Lengkap
            </span>
          )}
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <label className="text-xs font-bold text-[#101f15] dark:text-white">Ringkasan / Lead</label>
            <span className="text-[11px] text-[#707972]">{form.excerpt.length}/220</span>
          </div>
          <textarea
            rows={3}
            maxLength={220}
            value={form.excerpt}
            onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
            placeholder="Tulis ringkasan singkat artikel (±20-30 kata)..."
            className="w-full rounded-xl bg-[#f4faf5] dark:bg-white/5 border border-[#e2f0e6] dark:border-white/10 p-3 text-xs text-[#101f15] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#134e35]"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-[#101f15] dark:text-white block mb-1">
            Tag <span className="text-[#707972] font-normal">(Opsional)</span>
          </label>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="# Tambah tag, contoh: PKKMB, USU..."
              className="flex-1 min-w-0 rounded-xl bg-[#f4faf5] dark:bg-white/5 border border-[#e2f0e6] dark:border-white/10 px-3 py-2 text-xs text-[#101f15] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#134e35]"
            />
            <button
              type="button"
              onClick={addTag}
              className="px-3 py-2 rounded-xl bg-[#e6f8e8] text-[#134e35] text-xs font-bold"
            >
              Tambah
            </button>
          </div>
          {tagsList.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tagsList.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#e6f8e8] dark:bg-[#134e35]/40 text-[#134e35] dark:text-[#bef264] text-[11px] font-bold"
                >
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="hover:text-rose-600">
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Opsi Publikasi */}
      <div className="bg-white dark:bg-[#112218] rounded-2xl border border-[#e2f0e6] dark:border-white/10 p-4 shadow-xs space-y-3">
        <h3 className="text-xs font-extrabold text-[#101f15] dark:text-white flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px]">publish</span>
          Opsi Publikasi
        </h3>

        <button
          type="button"
          onClick={() => setPubMode("kirim")}
          className={`w-full text-left p-3 rounded-xl border transition ${
            pubMode === "kirim"
              ? "border-[#134e35] bg-[#e6f8e8]/70 dark:bg-[#134e35]/30"
              : "border-[#e2f0e6] dark:border-white/10"
          }`}
        >
          <p className="text-xs font-extrabold text-[#003622] dark:text-white">
            {berbadge ? "Terbitkan Sekarang" : "Ajukan untuk Diterbitkan"}
          </p>
          <p className="text-[11px] text-[#404943] dark:text-slate-400 mt-0.5">
            {berbadge ? "Artikel langsung tayang di halaman blog." : "Artikel akan direviu oleh tim editor sebelum tayang."}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setPubMode("simpan")}
          className={`w-full text-left p-3 rounded-xl border transition ${
            pubMode === "simpan"
              ? "border-[#134e35] bg-[#e6f8e8]/70 dark:bg-[#134e35]/30"
              : "border-[#e2f0e6] dark:border-white/10"
          }`}
        >
          <p className="text-xs font-extrabold text-[#003622] dark:text-white">Simpan sebagai Draft</p>
          <p className="text-[11px] text-[#404943] dark:text-slate-400 mt-0.5">
            Simpan draf pribadi, lanjutkan menulis nanti.
          </p>
        </button>

        <div className="pt-1 space-y-2">
          <button
            type="button"
            onClick={() => simpan("kirim")}
            disabled={sibuk || !isiCukup}
            className="w-full py-2.5 rounded-full bg-[#003622] hover:bg-[#134e35] text-white text-xs font-extrabold flex items-center justify-center gap-1.5 disabled:opacity-40 transition"
          >
            <span className="material-symbols-outlined text-[16px]">send</span>
            {berbadge ? "Terbitkan Artikel" : "Ajukan Artikel"}
          </button>
          <button
            type="button"
            onClick={() => simpan("simpan")}
            disabled={sibuk || !form.title.trim()}
            className="w-full py-2.5 rounded-full border border-[#c0c9c1] dark:border-white/15 text-[#101f15] dark:text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 hover:bg-[#f4faf5] dark:hover:bg-white/5 transition"
          >
            <span className="material-symbols-outlined text-[16px]">save</span>
            Simpan Draft
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Mobile Filter Pills */}
      <div className="flex lg:hidden items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          type="button"
          onClick={() => setActiveFilter("tulis")}
          className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-bold flex items-center gap-1 ${
            activeFilter === "tulis"
              ? "bg-[#003622] text-white"
              : "bg-white dark:bg-white/10 text-[#404943] dark:text-slate-300 border border-[#e2f0e6] dark:border-white/10"
          }`}
        >
          <span>+ Tulis Berita</span>
        </button>
        {[
          { key: "draft", label: "Draft", count: counts.draft },
          { key: "menunggu", label: "Menunggu Review", count: counts.menunggu },
          { key: "published", label: "Terbit", count: counts.published },
          { key: "ditolak", label: "Ditolak", count: counts.ditolak },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveFilter(tab.key)}
            className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 ${
              activeFilter === tab.key
                ? "bg-[#003622] text-white"
                : "bg-white dark:bg-white/10 text-[#404943] dark:text-slate-300 border border-[#e2f0e6] dark:border-white/10"
            }`}
          >
            <span>{tab.label}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-[#ceeb7a] text-[#003622] text-[10px]">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Mobile Content */}
      <div className="lg:hidden space-y-5">
        {activeFilter === "tulis" ? (
          <>
            {renderEditor()}
            {renderSettingsPanel()}
          </>
        ) : (
          renderArticleList()
        )}
      </div>

      {/* Desktop 3-Col Layout */}
      <div className="hidden lg:grid lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar */}
        <aside className="col-span-3 space-y-4">
          <div className="bg-white dark:bg-[#112218] rounded-3xl border border-[#e2f0e6] dark:border-white/10 p-4 shadow-xs space-y-2">
            <div className="px-2 pb-2">
              <div className="w-9 h-9 rounded-xl bg-[#e6f8e8] dark:bg-[#134e35]/40 text-[#134e35] dark:text-[#bef264] flex items-center justify-center mb-2">
                <span className="material-symbols-outlined text-[20px]">edit_document</span>
              </div>
              <h2 className="font-extrabold text-sm text-[#003622] dark:text-white">Ruang Penulis</h2>
              <p className="text-[11px] text-[#707972]">Kelola dan tulis artikel untuk Berita Kampus Kita.</p>
            </div>

            {[
              { key: "tulis", label: "Tulis Berita", icon: "add", count: null },
              { key: "draft", label: "Draft", icon: "draft", count: counts.draft },
              { key: "menunggu", label: "Menunggu Reviu", icon: "schedule", count: counts.menunggu },
              { key: "published", label: "Terbit", icon: "check_circle", count: counts.published },
              { key: "ditolak", label: "Ditolak", icon: "cancel", count: counts.ditolak },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveFilter(item.key)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                  activeFilter === item.key
                    ? "bg-[#e6f8e8] dark:bg-[#134e35]/40 text-[#003622] dark:text-[#bef264]"
                    : "text-[#404943] dark:text-slate-300 hover:bg-[#f4faf5] dark:hover:bg-white/5"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[17px]">{item.icon}</span>
                  {item.label}
                </span>
                {item.count !== null && (
                  <span className="px-2 py-0.5 rounded-full bg-[#f4faf5] dark:bg-white/10 text-[10px]">
                    {item.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="bg-[#e6f8e8]/70 dark:bg-[#134e35]/20 rounded-3xl border border-[#ceeb7a]/50 dark:border-white/10 p-4 space-y-2">
            <h3 className="text-xs font-extrabold text-[#003622] dark:text-white flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-amber-500">lightbulb</span>
              Tips Menulis
            </h3>
            <ul className="space-y-1.5 text-[11px] text-[#404943] dark:text-slate-300">
              <li>✓ Gunakan judul yang jelas dan menarik.</li>
              <li>✓ Tulis dengan bahasa yang informatif (5W+1H).</li>
              <li>✓ Gunakan foto asli dan berkualitas.</li>
              <li>✓ Cantumkan sumber jika mengutip data.</li>
            </ul>
          </div>
        </aside>

        {/* Center Main */}
        <div className="col-span-6">
          {activeFilter === "tulis" ? renderEditor() : renderArticleList()}
        </div>

        {/* Right Settings */}
        <aside className="col-span-3">
          {renderSettingsPanel()}
        </aside>
      </div>
    </div>
  );
}
