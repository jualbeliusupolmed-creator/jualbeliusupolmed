"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

/*
 * Panel "tulis artikel" di dasbor penjual.
 *
 * Dua jalur, dan bedanya harus terlihat SEBELUM tombol ditekan, bukan sesudah:
 *
 *   berbadge    → tulisan langsung terbit
 *   tanpa badge → tulisan masuk antrean admin dulu
 *
 * Yang paling mudah bikin orang kaget adalah menyunting artikel yang sudah
 * tayang: bagi penulis tanpa badge, suntingan mengembalikannya ke antrean, dan
 * artikelnya turun dari /blog sampai disetujui lagi. Itu memang aturannya —
 * jadi peringatannya dipasang di tombolnya, bukan di halaman bantuan.
 */

const NADA = {
  published: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  menunggu: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  ditolak: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  draft: "bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-slate-300",
};
const LABEL = { published: "Terbit", menunggu: "Menunggu review", ditolak: "Ditolak", draft: "Draf" };
const JELAS = {
  published: "Tayang di /blog dan bisa dibaca siapa saja.",
  menunggu: "Sudah masuk antrean admin. Belum tampil di halaman blog.",
  ditolak: "Perbaiki sesuai catatan admin, lalu kirim lagi.",
  draft: "Belum dikirim. Cuma kamu yang bisa melihatnya.",
};

const KOSONG = { id: null, title: "", content_markdown: "", excerpt: "", keywords: "", image_url: "", status: "draft" };

export default function BlogPenulisPanel() {
  const [muat, setMuat] = useState(true);
  const [berbadge, setBerbadge] = useState(false);
  const [artikel, setArtikel] = useState([]);
  const [form, setForm] = useState(null);      // null = tidak sedang menulis
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

  useEffect(() => { ambil(); }, []);

  const isiCukup = (form?.content_markdown || "").trim().length >= 200 && (form?.title || "").trim().length >= 5;
  const menyuntingYangTerbit = form?.id && form?.status === "published";

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
      setForm(null);
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

  if (muat) return <div className="py-16 text-center text-sm text-gray-400">Memuat artikel…</div>;

  if (galat) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-900/20 dark:text-rose-300">
        {galat}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Status penulis — jalur mana yang berlaku untuk orang ini */}
      <div className={`rounded-xl border p-4 ${berbadge
        ? "border-indigo-200 bg-indigo-50/60 dark:border-indigo-900/60 dark:bg-indigo-900/10"
        : "border-gray-200 bg-gray-50 dark:border-slate-800 dark:bg-slate-900/50"}`}>
        <div className="flex items-start gap-3">
          <span className="text-2xl">{berbadge ? "✍️" : "📝"}</span>
          <div>
            <p className="font-bold dark:text-white">
              {berbadge ? "Kamu penulis berbadge" : "Tulisanmu ditinjau admin dulu"}
            </p>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
              {berbadge
                ? "Artikel yang kamu kirim langsung terbit di halaman blog, tanpa antre. Dipercaya bukan berarti bebas — tulisan yang menyesatkan atau menyalin punya orang tetap bisa diturunkan admin."
                : "Setiap artikel yang kamu kirim masuk antrean admin dulu, dan baru tampil di halaman blog setelah disetujui. Kalau admin memberimu badge penulis, tulisanmu terbit langsung."}
            </p>
          </div>
        </div>
      </div>

      {/* Formulir */}
      {form ? (
        <div className="card p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold dark:text-white">{form.id ? "Sunting artikel" : "Artikel baru"}</h3>
            <button onClick={() => setForm(null)} className="text-sm text-gray-400 hover:text-gray-700 dark:hover:text-white">Tutup</button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300">Judul</label>
              <input
                className="input mt-1 w-full"
                value={form.title}
                maxLength={120}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Mis. Cara Memilih Kos Dekat Pintu 1 USU"
              />
              <p className="mt-1 text-[11px] text-gray-400">{form.title.length}/120</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300">
                Isi artikel <span className="font-normal text-gray-400">— boleh pakai Markdown (## judul, **tebal**, - daftar)</span>
              </label>
              <textarea
                className="input mt-1 w-full font-mono text-sm"
                rows={14}
                maxLength={20000}
                value={form.content_markdown}
                onChange={(e) => setForm({ ...form, content_markdown: e.target.value })}
                placeholder={"## Kenapa lokasi menentukan harga\n\nTulis pengalamanmu sendiri di sini…"}
              />
              <p className={`mt-1 text-[11px] ${form.content_markdown.trim().length < 200 ? "text-amber-600" : "text-gray-400"}`}>
                {form.content_markdown.length.toLocaleString("id-ID")}/20.000 · minimal 200 huruf untuk bisa dikirim
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300">Ringkasan <span className="font-normal text-gray-400">(opsional)</span></label>
                <input
                  className="input mt-1 w-full"
                  maxLength={220}
                  value={form.excerpt}
                  onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                  placeholder="Dibuat otomatis kalau dikosongkan"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300">Kata kunci <span className="font-normal text-gray-400">(pisahkan koma)</span></label>
                <input
                  className="input mt-1 w-full"
                  maxLength={200}
                  value={form.keywords}
                  onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                  placeholder="kos usu, tips mahasiswa"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300">Alamat gambar sampul <span className="font-normal text-gray-400">(opsional)</span></label>
              <input
                className="input mt-1 w-full"
                maxLength={500}
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://…"
              />
            </div>
          </div>

          {menyuntingYangTerbit && !berbadge && (
            <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
              <b>Perhatikan:</b> artikel ini sudah tayang. Karena kamu belum punya badge penulis,
              menyimpan perubahannya akan mengembalikannya ke antrean admin — dan ia turun dari
              halaman blog sampai disetujui lagi.
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => simpan("simpan")} disabled={sibuk || !form.title.trim()} className="btn-outline text-sm disabled:opacity-50">
              Simpan draf
            </button>
            <button onClick={() => simpan("kirim")} disabled={sibuk || !isiCukup} className="btn-primary text-sm disabled:opacity-50">
              {berbadge ? "Terbitkan sekarang" : "Kirim untuk ditinjau"}
            </button>
            {!isiCukup && (
              <span className="self-center text-[11px] text-gray-400">Judul minimal 5 huruf dan isi minimal 200 huruf.</span>
            )}
          </div>
        </div>
      ) : (
        <button onClick={() => setForm({ ...KOSONG })} className="btn-primary text-sm">✍️ Tulis artikel baru</button>
      )}

      {/* Daftar artikel sendiri */}
      <div>
        <h3 className="mb-2 text-sm font-bold dark:text-white">Artikelmu ({artikel.length})</h3>
        {artikel.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-400 dark:border-slate-700">
            Belum ada artikel. Tulisan pertamamu bisa tentang apa saja yang kamu tahu betul —
            barang bekas apa yang layak dibeli, cara menawar yang sopan, atau kos di sekitar kampus.
          </div>
        ) : (
          <ul className="space-y-2">
            {artikel.map((a) => (
              <li key={a.id} className="rounded-xl border border-gray-200 p-3 dark:border-slate-800">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold dark:text-white">{a.title}</p>
                    <p className="mt-0.5 text-[11px] text-gray-400">
                      {new Date(a.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  <span className={`badge ${NADA[a.status] || NADA.draft}`}>{LABEL[a.status] || a.status}</span>
                </div>

                <p className="mt-1.5 text-xs text-gray-500 dark:text-slate-400">{JELAS[a.status]}</p>

                {a.status === "ditolak" && a.reject_note && (
                  <p className="mt-1.5 rounded-lg bg-rose-50 p-2 text-xs text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">
                    Catatan admin: {a.reject_note}
                  </p>
                )}

                <div className="mt-2 flex flex-wrap gap-3 text-xs">
                  <button
                    onClick={() => setForm({
                      id: a.id,
                      title: a.title || "",
                      content_markdown: a.content_markdown || "",
                      excerpt: a.excerpt || "",
                      keywords: a.keywords || "",
                      image_url: a.image_url || "",
                      status: a.status,
                    })}
                    className="font-semibold text-primary hover:underline"
                  >
                    Sunting
                  </button>
                  {a.url && (
                    <a href={a.url} target="_blank" rel="noreferrer" className="text-gray-500 hover:underline dark:text-slate-400">
                      Lihat di blog
                    </a>
                  )}
                  <button onClick={() => hapus(a)} className="text-rose-600 hover:underline">Hapus</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
