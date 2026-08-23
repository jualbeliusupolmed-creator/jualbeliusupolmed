"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { rupiah } from "@/lib/fees";
import { buildSlug } from "@/lib/slug";
import { namaToko } from "@/lib/toko";
import BagikanIklan from "@/components/BagikanIklan";
import FormToko from "./FormToko";

/*
 * "Toko saya" — pusat kelola toko, dipisah dari /dashboard.
 *
 * Kenapa dipisah: keduanya menjawab pertanyaan yang berbeda.
 *
 *   /dashboard      → "bagaimana keadaan JUALANKU?" — iklan, tawaran masuk,
 *                     tagihan, referral, statistik.
 *   /dashboard/toko → "bagaimana keadaan TOKOKU?" — izinnya, tampilannya,
 *                     etalasenya, dan cara menyebarkannya.
 *
 * Sebelum ini halaman ini cuma formulir panjang, jadi "toko" terasa seperti
 * satu setelan di dalam dasbor, bukan tempat sendiri. Padahal sejak toko
 * berarti iklan gratis, ia justru pintu masuk penjual ke seluruh marketplace.
 */

const TAB = [
  { key: "ringkasan", label: "Ringkasan", ikon: "🏠" },
  { key: "langganan", label: "Paket Langganan", ikon: "💎" },
  { key: "produk", label: "Produk", ikon: "📦" },
  { key: "tampilan", label: "Tampilan", ikon: "🎨" },
  { key: "promosi", label: "Promosi", ikon: "📣" },
];

const DASAR = "https://www.jualbeliusupolmed.web.id";

export default function TokoSaya() {
  const router = useRouter();
  const [tab, setTab] = useState("ringkasan");
  const [data, setData] = useState(null);
  const [memuat, setMemuat] = useState(true);
  const [mengajukan, setMengajukan] = useState(false);
  const [ajuan, setAjuan] = useState(null);       // hasil /api/toko/ajukan
  const [bagikan, setBagikan] = useState(null);   // produk yang dibuka lembar bagikannya

  const muat = useCallback(async () => {
    try {
      const res = await fetch("/api/toko/ringkasan", { cache: "no-store" });
      if (res.status === 401) { router.replace("/dashboard/login"); return; }
      const j = await res.json();
      setData(j);
    } catch {
      toast.error("Gagal memuat data toko.");
    } finally {
      setMemuat(false);
    }
  }, [router]);

  useEffect(() => { muat(); }, [muat]);

  const toko = data?.toko || {};
  const status = data?.status || "draf";
  const st = data?.statistik || { aktif: 0, terjual: 0, pending: 0, views: 0, ulasan: 0, rata: 0 };
  const produk = data?.produk || [];
  const nama = namaToko(toko);
  const alamat = toko.slug ? `${DASAR}/toko/${toko.slug}` : null;

  // Kelengkapan toko. Bukan hiasan: tiap baris yang belum tercentang adalah
  // alasan nyata kenapa halaman toko terlihat kosong bagi pengunjung.
  const checklist = useMemo(() => ([
    { ok: !!toko.store_name, judul: "Nama toko", petunjuk: "Yang dibaca pembeli paling pertama." },
    { ok: !!toko.slug, judul: "Alamat toko", petunjuk: "Tautan yang kamu sebar ke pembeli." },
    { ok: !!toko.logo_url, judul: "Logo", petunjuk: "Tanpa logo, yang tampil cuma dua huruf." },
    { ok: !!toko.banner_url, judul: "Sampul", petunjuk: "Bagian paling atas halaman tokomu." },
    { ok: !!toko.tagline, judul: "Tagline", petunjuk: "Satu kalimat: kamu jualan apa." },
    { ok: !!toko.store_area, judul: "Area COD", petunjuk: "Pembeli perlu tahu ketemuan di mana." },
    { ok: !!toko.store_hours, judul: "Jam buka", petunjuk: "Supaya tidak dichat jam 3 pagi." },
    { ok: st.aktif > 0, judul: "Minimal satu barang", petunjuk: "Toko tanpa isi tidak bisa dibelanjakan." },
  ]), [toko, st.aktif]);

  const selesai = checklist.filter((c) => c.ok).length;
  const persen = Math.round((selesai / checklist.length) * 100);

  async function ajukan() {
    setMengajukan(true);
    try {
      const res = await fetch("/api/toko/ajukan", { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Gagal mengajukan");
      setAjuan(j);
      await muat();
      // Tautan WhatsApp dibuka LANGSUNG dari penekanan tombol ini supaya tidak
      // diblokir peramban sebagai pop-up. Kalau nomor admin belum diatur,
      // teksnya tetap disediakan untuk disalin.
      if (j.waLink) window.open(j.waLink, "_blank", "noopener");
      else toast.info("Nomor admin belum diatur — salin pesannya di bawah lalu kirim manual.");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setMengajukan(false);
    }
  }

  function salin(teks, kabar = "Tersalin.") {
    try {
      navigator.clipboard?.writeText(teks);
      toast.success(kabar);
    } catch {
      toast.error("Gagal menyalin.");
    }
  }

  if (memuat) {
    return <div className="p-10 text-center text-sm text-gray-500">Memuat toko…</div>;
  }

  const nadaStatus =
    status === "aktif" ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-900/60"
    : status === "menunggu" ? "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-900/60"
    : status === "ditolak" ? "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-900/60"
    : "bg-gray-50 text-gray-700 border-gray-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700";

  return (
    <div className="mx-auto max-w-3xl px-4 py-5 pb-24">
      {bagikan && <BagikanIklan listing={bagikan} onClose={() => setBagikan(null)} />}

      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold tracking-tight">Toko saya</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Halaman tokomu, izinnya, dan barang yang tampil di dalamnya.
          </p>
        </div>
        <Link href="/dashboard" className="btn-outline shrink-0 rounded-xl px-3 py-2 text-xs">
          ← Dashboard
        </Link>
      </div>

      {/* ── Status izin: hal pertama yang perlu diketahui penjual ───────── */}
      <div className={`mb-4 rounded-2xl border p-4 ${nadaStatus}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold">
            {status === "aktif" && "✅ Toko aktif"}
            {status === "menunggu" && "⏳ Menunggu persetujuan admin"}
            {status === "ditolak" && "⚠️ Pengajuan ditolak"}
            {status === "draf" && "📝 Belum diajukan"}
          </p>
          {status === "aktif" && alamat && (
            <a href={`/toko/${toko.slug}`} target="_blank" rel="noreferrer" className="text-xs font-semibold underline">
              Lihat halaman toko ↗
            </a>
          )}
        </div>

        <p className="mt-1 text-sm">
          {status === "aktif" && "Halaman tokomu bisa dibuka siapa saja, dan semua iklan yang kamu pasang tayang gratis."}
          {status === "menunggu" && "Permintaanmu sudah tercatat. Admin akan meninjau dan mengaktifkan tokomu. Kalau sudah lama, kirim ulang pesannya lewat tombol di bawah."}
          {status === "ditolak" && (toko.store_reject_note
            ? `Alasannya: “${toko.store_reject_note}”. Perbaiki dulu di tab Tampilan, lalu ajukan lagi.`
            : "Perbaiki dulu isian tokomu di tab Tampilan, lalu ajukan lagi.")}
          {status === "draf" && "Toko perlu disetujui admin sebelum tayang. Lengkapi dulu nama dan alamat toko, lalu tekan tombol di bawah — pesannya sudah kami siapkan, kamu tinggal kirim."}
        </p>

        {status !== "aktif" && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={ajukan}
              disabled={mengajukan || !toko.slug || !toko.store_name}
              className="btn-primary rounded-xl px-4 py-2 text-xs disabled:opacity-50"
            >
              {mengajukan ? "Menyiapkan…" : status === "menunggu" ? "Kirim ulang ke WA admin" : "Minta persetujuan admin"}
            </button>
            {(!toko.slug || !toko.store_name) && (
              <button onClick={() => setTab("tampilan")} className="btn-outline rounded-xl px-4 py-2 text-xs">
                Lengkapi nama & alamat dulu
              </button>
            )}
          </div>
        )}

        {/* Pesan yang dikirim ditampilkan apa adanya — termasuk tautan aktivasi
            untuk admin. Kalau WhatsApp gagal terbuka (peramban dalam aplikasi,
            pop-up diblokir), penjual masih bisa menyalinnya. */}
        {ajuan?.pesan && status !== "aktif" && (
          <div className="mt-3 rounded-xl bg-white/70 p-3 dark:bg-slate-900/50">
            <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">Pesan untuk admin</p>
            <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed">
{ajuan.pesan}
            </pre>
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={() => salin(ajuan.pesan, "Pesan tersalin.")} className="btn-outline rounded-lg px-3 py-1.5 text-xs">
                Salin pesan
              </button>
              {ajuan.waLink && (
                <a href={ajuan.waLink} target="_blank" rel="noreferrer" className="btn-outline rounded-lg px-3 py-1.5 text-xs">
                  Buka WhatsApp admin
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Tab ─────────────────────────────────────────────────────────── */}
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-2xl bg-gray-100 p-1 dark:bg-slate-800/60 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TAB.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
              tab === t.key
                ? "bg-white shadow-sm dark:bg-slate-900 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-slate-400"
            }`}
          >
            <span aria-hidden>{t.ikon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Ringkasan ───────────────────────────────────────────────────── */}
      {tab === "ringkasan" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kartu nilai={st.aktif} label="Barang aktif" />
            <Kartu nilai={st.terjual} label="Terjual" />
            <Kartu nilai={st.views} label="Dilihat" />
            <Kartu nilai={st.ulasan ? `${st.rata.toFixed(1)}★` : "–"} label={st.ulasan ? `${st.ulasan} ulasan` : "Belum ada ulasan"} />
          </div>

          {alamat && (
            <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="text-xs text-gray-500 dark:text-slate-400">Alamat tokomu</div>
                <div className="truncate text-sm font-semibold">{alamat.replace(/^https?:\/\//, "")}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => salin(alamat, "Tautan toko tersalin.")} className="btn-outline rounded-xl px-3 py-2 text-xs">
                  Salin
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Mampir ke toko saya ya 🙏\n${nama}\n${alamat}`)}`}
                  target="_blank" rel="noreferrer"
                  className="btn-outline rounded-xl px-3 py-2 text-xs"
                >
                  Bagikan
                </a>
                <Link href={`/toko/${toko.slug}`} target="_blank" className="btn-outline rounded-xl px-3 py-2 text-xs">
                  Lihat
                </Link>
              </div>
            </div>
          )}

          <div className="card p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-bold">Kelengkapan toko</h2>
              <span className="text-sm font-extrabold tabular-nums">{persen}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${persen}%` }}
              />
            </div>
            <ul className="mt-3 divide-y divide-gray-100 dark:divide-slate-800">
              {checklist.map((c) => (
                <li key={c.judul} className="flex items-start gap-2.5 py-2">
                  <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${c.ok ? "bg-emerald-500" : "bg-gray-300 dark:bg-slate-700"}`}>
                    {c.ok ? "✓" : ""}
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-sm ${c.ok ? "text-gray-400 line-through dark:text-slate-600" : "font-semibold"}`}>
                      {c.judul}
                    </span>
                    {!c.ok && <span className="block text-xs text-gray-500 dark:text-slate-400">{c.petunjuk}</span>}
                  </span>
                </li>
              ))}
            </ul>
            {persen < 100 && (
              <button onClick={() => setTab("tampilan")} className="btn-primary mt-3 w-full rounded-xl py-2.5 text-xs">
                Lengkapi sekarang
              </button>
            )}
          </div>

          {data?.ulasan?.length > 0 && (
            <div className="card p-4">
              <h2 className="text-sm font-bold">Ulasan terbaru</h2>
              <div className="mt-2 space-y-3">
                {data.ulasan.map((u, i) => (
                  <div key={i} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0 dark:border-slate-800">
                    <p className="text-sm text-amber-500">
                      {"★".repeat(Math.max(1, Math.round(u.rating || 0)))}
                      <span className="text-gray-300 dark:text-slate-700">{"★".repeat(Math.max(0, 5 - Math.round(u.rating || 0)))}</span>
                    </p>
                    {u.comment && <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">“{u.comment}”</p>}
                    <p className="mt-0.5 text-xs text-gray-400">{u.buyer_name || "Pembeli"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Paket Langganan Toko Fisik ─────────────────────────────── */}
      {tab === "langganan" && (
        <div className="space-y-4">
          <div className="card p-5 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-slate-900 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🏪</span>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Program Toko Mitra Fisik</h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Khusus pemilik tempat / toko fisik di sekitar kampus USU & POLMED. Dengan paket langganan aktif, tokomu mendapat etalase digital resmi dan bebas pasang iklan sepuasnya tanpa biaya tayang per postingan.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {/* Paket 1 Bulan */}
            <div className="card p-4 flex flex-col justify-between border-slate-200 dark:border-slate-800 relative">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Bulanan</span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">Paket 1 Bulan</h3>
                <p className="text-lg font-black text-primary mt-2">Rp 25.000 <span className="text-[11px] font-normal text-slate-400">/bln</span></p>
                <ul className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <li className="flex items-center gap-1.5">✓ Iklan tanpa batas</li>
                  <li className="flex items-center gap-1.5">✓ Lencana Toko Mitra</li>
                  <li className="flex items-center gap-1.5">✓ Link custom etalase</li>
                </ul>
              </div>
              <button 
                onClick={() => {
                  const pesan = `Halo Admin, saya ingin berlangganan Paket Toko Mitra 1 Bulan (Rp 25.000) untuk toko *${nama}* (${alamat || ""}).`;
                  window.open(`https://wa.me/6282274151745?text=${encodeURIComponent(pesan)}`, '_blank');
                }}
                className="btn-outline mt-4 w-full rounded-xl py-2 text-xs font-bold"
              >
                Pilih 1 Bulan
              </button>
            </div>

            {/* Paket 6 Bulan */}
            <div className="card p-4 flex flex-col justify-between border-primary bg-primary/5 relative shadow-md">
              <div className="absolute -top-2.5 right-3 bg-primary text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Populer (Hemat 20%)
              </div>
              <div>
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Semesteran</span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">Paket 6 Bulan</h3>
                <p className="text-lg font-black text-primary mt-2">Rp 120.000 <span className="text-[11px] font-normal text-slate-400">/6 bln</span></p>
                <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Hemat Rp 30.000</p>
                <ul className="mt-3 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-1.5">✓ Semua fitur 1 bulan</li>
                  <li className="flex items-center gap-1.5">✓ Prioritas pencarian</li>
                  <li className="flex items-center gap-1.5">✓ Auto-share grup WA</li>
                </ul>
              </div>
              <button 
                onClick={() => {
                  const pesan = `Halo Admin, saya ingin berlangganan Paket Toko Mitra 6 Bulan (Rp 120.000) untuk toko *${nama}* (${alamat || ""}).`;
                  window.open(`https://wa.me/6282274151745?text=${encodeURIComponent(pesan)}`, '_blank');
                }}
                className="btn-primary mt-4 w-full rounded-xl py-2 text-xs font-bold"
              >
                Pilih 6 Bulan ⭐
              </button>
            </div>

            {/* Paket 12 Bulan */}
            <div className="card p-4 flex flex-col justify-between border-amber-300 bg-amber-50/40 dark:bg-amber-950/20 relative">
              <div className="absolute -top-2.5 right-3 bg-amber-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Paling Hemat
              </div>
              <div>
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Tahunan</span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">Paket 1 Tahun</h3>
                <p className="text-lg font-black text-amber-600 mt-2">Rp 200.000 <span className="text-[11px] font-normal text-slate-400">/thn</span></p>
                <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold mt-0.5">Hemat Rp 100.000</p>
                <ul className="mt-3 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-1.5">✓ Semua fitur 6 bulan</li>
                  <li className="flex items-center gap-1.5">✓ Banner khusus di Beranda</li>
                  <li className="flex items-center gap-1.5">✓ Lencana Verified Gold</li>
                </ul>
              </div>
              <button 
                onClick={() => {
                  const pesan = `Halo Admin, saya ingin berlangganan Paket Toko Mitra 1 Tahun (Rp 200.000) untuk toko *${nama}* (${alamat || ""}).`;
                  window.open(`https://wa.me/6282274151745?text=${encodeURIComponent(pesan)}`, '_blank');
                }}
                className="btn-outline mt-4 w-full rounded-xl py-2 text-xs font-bold border-amber-400 text-amber-800 hover:bg-amber-100 dark:text-amber-300"
              >
                Pilih 1 Tahun 👑
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Produk ──────────────────────────────────────────────────────── */}
      {tab === "produk" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {st.aktif} aktif · {st.pending} menunggu bayar · {st.terjual} terjual
            </p>
            <Link href="/jual" className="btn-primary rounded-xl px-4 py-2 text-xs">+ Tambah barang</Link>
          </div>

          {produk.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-sm font-semibold">Belum ada barang di tokomu.</p>
              <p className="mx-auto mt-1 max-w-xs text-xs text-gray-500 dark:text-slate-400">
                Tokomu sudah punya alamat — sekarang isinya. Barang pertama biasanya yang paling
                lama dipikirkan; pasang saja dulu, bisa diedit kapan pun.
              </p>
              <Link href="/jual" className="btn-primary mt-4 inline-block rounded-xl px-5 py-2.5 text-xs">
                Pasang barang pertama
              </Link>
            </div>
          ) : (
            produk.map((l) => (
              <div key={l.id} className="card flex gap-3 p-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-slate-800">
                  {l.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{l.title}</p>
                    <StatusPil s={l.status} />
                  </div>
                  <p className="text-sm font-bold" style={{ color: "var(--primary)" }}>{rupiah(l.price)}</p>
                  <p className="text-xs text-gray-400">
                    {l.category} · {l.views || 0}× dilihat · stok {l.stock ?? 1}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button onClick={() => setBagikan(l)} className="btn-outline rounded-lg px-2.5 py-1 text-[11px]">
                      📤 Bagikan
                    </button>
                    <Link href={`/edit/${l.id}`} className="btn-outline rounded-lg px-2.5 py-1 text-[11px]">
                      ✏️ Edit
                    </Link>
                    <Link
                      href={`/produk/${buildSlug(l.title, l.id)}`}
                      target="_blank"
                      className="btn-outline rounded-lg px-2.5 py-1 text-[11px]"
                    >
                      👁 Lihat
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Tampilan ────────────────────────────────────────────────────── */}
      {tab === "tampilan" && (
        <FormToko
          onTersimpan={() => {
            muat();
            // Toko yang sudah aktif tidak perlu diajukan ulang; yang belum,
            // tombolnya tetap menunggu di tab Ringkasan.
            if (status !== "aktif") setTab("ringkasan");
          }}
        />
      )}

      {/* ── Promosi ─────────────────────────────────────────────────────── */}
      {tab === "promosi" && (
        <div className="space-y-4">
          {!alamat ? (
            <div className="card p-6 text-center text-sm text-gray-500 dark:text-slate-400">
              Atur alamat tokomu dulu di tab Tampilan — tanpa alamat, tidak ada yang bisa dibagikan.
            </div>
          ) : (
            <>
              <div className="card p-4">
                <h2 className="text-sm font-bold">Sebarkan tokomu</h2>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
                  Toko yang bagus tetap sepi kalau alamatnya tidak pernah keluar dari halaman ini.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Mampir ke toko saya ya 🙏\n*${nama}*\n${toko.tagline || ""}\n${alamat}`)}`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 text-left transition hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    <span className="text-xl">👥</span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">Kirim ke grup WA</span>
                      <span className="block text-xs text-gray-500 dark:text-slate-400">Pilih grupnya, teks sudah terisi</span>
                    </span>
                  </a>
                  <button
                    onClick={() => salin(alamat, "Tautan toko tersalin.")}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 text-left transition hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    <span className="text-xl">🔗</span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">Salin tautan toko</span>
                      <span className="block truncate text-xs text-gray-500 dark:text-slate-400">{alamat.replace(/^https?:\/\//, "")}</span>
                    </span>
                  </button>
                </div>
              </div>

              <div className="card p-4">
                <h2 className="text-sm font-bold">Pengumuman toko</h2>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
                  Muncul sebagai kotak menyala di halaman tokomu. Cocok untuk libur, promo, atau
                  aturan COD.
                </p>
                <p className="mt-2 rounded-xl bg-gray-50 p-3 text-sm dark:bg-slate-800/60">
                  {toko.store_announcement || <span className="text-gray-400">Belum ada pengumuman.</span>}
                </p>
                <button onClick={() => setTab("tampilan")} className="btn-outline mt-2 rounded-xl px-4 py-2 text-xs">
                  Ubah pengumuman
                </button>
              </div>

              <div className="card p-4">
                <h2 className="text-sm font-bold">Cara toko cepat ramai</h2>
                <ol className="mt-2 space-y-2.5">
                  {[
                    ["Pasang minimal 5 barang", "Toko dengan satu barang jarang dibuka dua kali."],
                    ["Foto terang, latar polos", "Foto adalah satu-satunya hal yang dilihat sebelum harga."],
                    ["Bagikan tiap barang baru", "Tombol Bagikan di tab Produk mengirim ke grup dalam dua ketukan."],
                    ["Balas cepat", "Pembeli di sini biasanya menawar ke tiga penjual sekaligus."],
                  ].map(([judul, isi], i) => (
                    <li key={judul} className="flex gap-3">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-900 text-[10px] font-bold text-white dark:bg-slate-200 dark:text-slate-900">
                        {i + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{judul}</span>
                        <span className="block text-xs text-gray-500 dark:text-slate-400">{isi}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Kartu({ nilai, label }) {
  return (
    <div className="card p-3">
      <p className="text-lg font-extrabold tabular-nums leading-none dark:text-white">{nilai}</p>
      <p className="mt-1 text-[11px] leading-tight text-gray-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

function StatusPil({ s }) {
  const peta = {
    active: ["Aktif", "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"],
    pending: ["Menunggu", "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"],
    sold: ["Terjual", "bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-slate-300"],
    expired: ["Kedaluwarsa", "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"],
    suspended: ["Disuspend", "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"],
  };
  const [label, kelas] = peta[s] || [s, "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300"];
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${kelas}`}>{label}</span>;
}
