"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/Icons";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";
import { AKSEN, statusToko } from "@/lib/toko";
import { normalizeTemanIntent } from "@/lib/temanIntents";

/*
 * Satu pintu untuk profil.
 *
 * Sebelum ini, "profil" disunting dari empat formulir yang tidak saling kenal:
 * panel ini (biodata), /dashboard/toko, formulir pendaftaran organisasi, dan
 * modal foto Cari Teman. Keempatnya menulis ke tabel yang sama, masing-masing
 * dengan aturannya sendiri.
 *
 * Yang membedakan pemakai sekarang bukan pintunya, melainkan LAPISAN yang
 * menyala untuknya — dan lapisan itu datang dari server (`profil.peran`), bukan
 * ditebak di sini. Punya toko → seksi Toko muncul. Akun organisasi → seksi
 * Organisasi muncul, dan kolom yang tidak masuk akal untuk sebuah lembaga
 * (angkatan, tujuan berkenalan) tidak ditawarkan sama sekali.
 *
 * Formulir ini tidak menjaga batas itu sendirian: server menyaring ulang setiap
 * field lewat `saringIsian()`. Menyembunyikan input hanya soal kerapian; yang
 * benar-benar menghalangi ada di lib/profil.js.
 */

const INTENTS = [
  { id: "Teman Santai", label: "Teman Santai", icon: Icon.Coffee },
  { id: "Belajar Bareng", label: "Belajar Bareng", icon: Icon.BookOpen },
  { id: "Teman Olahraga", label: "Teman Olahraga", icon: Icon.Dumbbell },
  { id: "Teman Event / Konser", label: "Teman Event / Konser", icon: Icon.Ticket },
  { id: "Ngobrol Seru", label: "Ngobrol Seru", icon: Icon.MessageCircle },
  { id: "Cari Relasi Karir", label: "Cari Relasi Karir", icon: Icon.Briefcase },
];

const FACULTIES_USU = [
  "Kedokteran", "Hukum", "Pertanian", "Teknik", "Ekonomi & Bisnis",
  "Kedokteran Gigi", "Ilmu Budaya", "MIPA", "ISIP", "Kesehatan Masyarakat",
  "Farmasi", "Psikologi", "Keperawatan", "Fasilkom-TI", "Kehutanan", "Vokasi", "Umum",
];

const FACULTIES_POLMED = [
  "Teknik Mesin", "Teknik Sipil", "Teknik Elektro", "Akuntansi",
  "Administrasi Niaga", "Teknik Komputer & Informatika", "Umum",
];

const KATEGORI_UKM = [
  { id: "bem_hima", label: "BEM & Himpunan" },
  { id: "olahraga", label: "Olahraga" },
  { id: "seni_budaya", label: "Seni & Budaya" },
  { id: "riset_teknologi", label: "Riset & Teknologi" },
  { id: "keagamaan", label: "Kerohanian" },
  { id: "media_pers", label: "Pers & Media" },
  { id: "sosial_lingkungan", label: "Sosial & Lingkungan" },
];

// Satu jalur unggah untuk foto profil, logo, dan sampul. Dipampatkan di
// peramban lebih dulu: foto kamera ponsel rutin 4–8 MB, dan mengunggahnya utuh
// lewat kuota mahasiswa adalah cara paling cepat membuat orang menyerah di
// tengah jalan.
async function unggahGambar(berkas, { maks = 0.4, sisi = 900 } = {}) {
  const kecil = await imageCompression(berkas, { maxSizeMB: maks, maxWidthOrHeight: sisi, useWebWorker: true });
  const fd = new FormData();
  fd.append("file", kecil, berkas.name);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok || !data.url) throw new Error(data.error || "Gagal mengunggah gambar");
  return data.url;
}

function GambarToko({ label, nilai, ubah, bulat = false }) {
  const rujuk = useRef(null);
  const [sibuk, setSibuk] = useState(false);
  async function pilih(e) {
    const berkas = e.target.files?.[0];
    if (!berkas) return;
    try {
      setSibuk(true);
      ubah(await unggahGambar(berkas, bulat ? {} : { maks: 0.6, sisi: 1600 }));
      toast.success(label + " siap. Jangan lupa Simpan.");
    } catch (err) {
      toast.error(err.message || "Gagal mengunggah " + label.toLowerCase());
    } finally {
      setSibuk(false);
      if (rujuk.current) rujuk.current.value = "";
    }
  }
  return (
    <div className="flex-1 space-y-1.5">
      <p className="text-[13px] text-[#1d1d1f] dark:text-white">{label}</p>
      <div onClick={() => rujuk.current?.click()}
        className={`relative cursor-pointer overflow-hidden bg-black/[0.05] transition-all hover:opacity-80 dark:bg-white/[0.1] ${bulat ? "h-16 w-16 rounded-full" : "h-16 w-full rounded-lg"}`}>
        {nilai
          ? <Image src={nilai} alt={label} fill className="object-cover" />
          : <div className="flex h-full w-full items-center justify-center text-[11px] text-gray-400">{sibuk ? "…" : "Pilih"}</div>}
      </div>
      <input ref={rujuk} type="file" accept="image/*" className="hidden" onChange={pilih} />
    </div>
  );
}

/*
 * Status pengajuan toko.
 *
 * Ini yang selama ini tidak pernah tampil: `store_status` dibuang oleh cadangan
 * di /api/toko yang selalu aktif, jadi penjual tidak pernah tahu tokonya sedang
 * menunggu, ditolak, atau kenapa. Sekarang kolomnya ada dan statusnya terbaca.
 */
function StatusToko({ profil }) {
  const [mengajukan, setMengajukan] = useState(false);
  const [status, setStatus] = useState(statusToko(profil));
  const siap = Boolean(profil?.slug && profil?.store_name);

  const rupa = {
    draf:     { warna: "text-gray-500 dark:text-slate-400", teks: "Belum diajukan" },
    menunggu: { warna: "text-amber-600 dark:text-amber-400", teks: "Menunggu ditinjau admin" },
    aktif:    { warna: "text-emerald-600 dark:text-emerald-400", teks: "Aktif — tokomu tayang" },
    ditolak:  { warna: "text-red-600 dark:text-red-400", teks: "Ditolak" },
  }[status] || { warna: "text-gray-500", teks: status };

  async function ajukan() {
    try {
      setMengajukan(true);
      const res = await fetch("/api/toko/ajukan", { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Gagal mengajukan");
      setStatus("menunggu");
      toast.success("Toko diajukan. Admin akan meninjaunya.");
    } catch (e) {
      toast.error(e.message || "Gagal mengajukan");
    } finally {
      setMengajukan(false);
    }
  }

  return (
    <Kartu judul="Status toko" catatan="Toko hanya tayang di alamatnya setelah ditinjau admin.">
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className={`text-[15px] font-semibold ${rupa.warna}`}>{rupa.teks}</p>
          {status === "ditolak" && profil.store_reject_note && (
            <p className="text-[11px] leading-relaxed text-red-600 dark:text-red-400">
              Alasannya: “{profil.store_reject_note}”. Perbaiki dulu, lalu ajukan lagi.
            </p>
          )}
          {!siap && (
            <p className="text-[11px] text-gray-400 dark:text-slate-500">
              Isi nama toko dan alamatnya dulu, simpan, baru bisa diajukan.
            </p>
          )}
          {profil?.slug && status === "aktif" && (
            <Link href={`/toko/${profil.slug}`} target="_blank" className="text-[11px] font-semibold text-primary underline">
              Lihat halaman tokomu →
            </Link>
          )}
        </div>
        {status !== "menunggu" && status !== "aktif" && (
          <button type="button" onClick={ajukan} disabled={mengajukan || !siap}
            className="shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-bold text-white transition-all hover:brightness-105 active:scale-95 disabled:opacity-50">
            {mengajukan ? "Mengajukan…" : "Ajukan toko"}
          </button>
        )}
      </div>
    </Kartu>
  );
}

// ── Potongan tampilan bersama ────────────────────────────────────────────────
function Kartu({ judul, catatan, children }) {
  return (
    <section className="space-y-2">
      <div className="px-1">
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-[#86868b] dark:text-slate-400">{judul}</h3>
        {catatan && <p className="mt-0.5 text-[11px] leading-relaxed text-gray-400 dark:text-slate-500">{catatan}</p>}
      </div>
      <div className="overflow-hidden rounded-[12px] border border-black/[0.05] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)] dark:border-white/[0.08] dark:bg-[#1c1c1e]">
        {children}
      </div>
    </section>
  );
}

function Baris({ label, children }) {
  return (
    <div className="flex items-center gap-3 border-b border-black/[0.05] px-4 py-3 last:border-b-0 dark:border-white/[0.08]">
      <label className="w-1/3 shrink-0 text-[15px] text-[#1d1d1f] dark:text-white">{label}</label>
      {children}
    </div>
  );
}

const gayaInput =
  "flex-1 min-w-0 bg-transparent text-[15px] text-[#86868b] text-right outline-none dark:text-slate-400 placeholder:text-gray-300 dark:placeholder:text-gray-600";

function Teks({ nilai, ubah, ...sisa }) {
  return <input type="text" value={nilai ?? ""} onChange={(e) => ubah(e.target.value)} className={gayaInput} {...sisa} />;
}

function Pilih({ nilai, ubah, opsi }) {
  return (
    <select value={nilai ?? ""} onChange={(e) => ubah(e.target.value)} className={gayaInput}>
      {opsi.map((o) => (
        <option key={o.id ?? o} value={o.id ?? o}>{o.label ?? o}</option>
      ))}
    </select>
  );
}

export default function UnifiedProfilePanel({ onProfileUpdated }) {
  const [profil, setProfil] = useState(null);
  const [f, setF] = useState(null);
  const [memuat, setMemuat] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);
  const [memampatkan, setMemampatkan] = useState(false);
  const [bukaToko, setBukaToko] = useState(false);
  const [daftarOrg, setDaftarOrg] = useState(false);
  const inputFoto = useRef(null);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const setTeman = (k, v) => setF((p) => ({ ...p, teman: { ...p.teman, [k]: v } }));

  useEffect(() => {
    let hidup = true;
    (async () => {
      try {
        // Tanpa `?wa=` dan tanpa header identitas: sesi yang menentukan siapa
        // ini. Endpoint profil yang menerima nomor dari peramban selalu berakhir
        // dipakai membaca profil orang lain — itu yang terjadi di /api/teman/profiles.
        const res = await fetch("/api/profil", { cache: "no-store" });
        const data = await res.json();
        if (!hidup) return;
        if (!res.ok || !data.ok) throw new Error(data.error || "Gagal memuat profil");
        setProfil(data.profil);
        setF({
          avatar_url: data.profil.avatar_url || "",
          name: data.profil.name || "",
          anonymous_name: data.profil.anonymous_name || "",
          bio: data.profil.bio || "",
          campus: data.profil.campus || "USU",
          faculty: data.profil.faculty || "Umum",
          store_name: data.profil.store_name || "",
          tagline: data.profil.tagline || "",
          store_area: data.profil.store_area || "",
          store_hours: data.profil.store_hours || "",
          store_instagram: data.profil.store_instagram || "",
          store_gmaps: data.profil.store_gmaps || "",
          store_announcement: data.profil.store_announcement || "",
          store_accent: data.profil.store_accent || "emerald",
          store_open: data.profil.store_open !== false,
          slug: data.profil.slug || "",
          logo_url: data.profil.logo_url || "",
          banner_url: data.profil.banner_url || "",
          ukm_name: data.profil.ukm_name || "",
          ukm_category: data.profil.ukm_category || "bem_hima",
          ukm_instagram: data.profil.ukm_instagram || "",
          teman: {
            aktif: Boolean(data.profil.teman?.is_active),
            ada: Boolean(data.profil.teman),
            batch: data.profil.teman?.batch || "2024",
            intent: normalizeTemanIntent(data.profil.teman?.intent || INTENTS[0].id),
            instagram: data.profil.teman?.instagram || "",
          },
        });
      } catch (e) {
        toast.error(e.message || "Gagal memuat profil");
      } finally {
        if (hidup) setMemuat(false);
      }
    })();
    return () => { hidup = false; };
  }, []);

  async function unggahFoto(e) {
    const berkas = e.target.files?.[0];
    if (!berkas) return;
    try {
      setMemampatkan(true);
      set("avatar_url", await unggahGambar(berkas));
      toast.success("Foto siap. Jangan lupa Simpan.");
    } catch (err) {
      toast.error(err.message || "Gagal mengunggah foto");
    } finally {
      setMemampatkan(false);
      if (inputFoto.current) inputFoto.current.value = "";
    }
  }

  async function simpan(e) {
    e.preventDefault();
    if (!f.name.trim()) return toast.error("Nama wajib diisi");
    if ((peran.toko || bukaToko) && !f.store_name.trim()) return toast.error("Nama toko wajib diisi");
    if ((peran.organisasi || daftarOrg) && !f.ukm_name.trim()) return toast.error("Nama organisasi wajib diisi");

    try {
      setMenyimpan(true);
      const res = await fetch("/api/profil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const data = await res.json();
      // Galatnya diperiksa. Versi lama menelan kegagalan sinkronisasi lalu tetap
      // menampilkan tanda centang — profil tidak pernah tersimpan dan tidak ada
      // yang tahu.
      if (!res.ok || !data.ok) throw new Error(data.error || "Gagal menyimpan profil");

      setProfil(data.profil);
      onProfileUpdated?.(data.profil);
      toast.success("Profil tersimpan dan tersebar ke semua fitur.");
    } catch (err) {
      toast.error(err.message || "Gagal menyimpan profil");
    } finally {
      setMenyimpan(false);
    }
  }

  if (memuat || !f) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 rounded-[22px] border border-black/[0.06] bg-white dark:border-white/[0.08] dark:bg-[#1c1c1e]" />
        <div className="h-96 rounded-[22px] border border-black/[0.06] bg-white dark:border-white/[0.08] dark:bg-[#1c1c1e]" />
      </div>
    );
  }

  const peran = profil.peran;
  const fakultas = f.campus === "Polmed" || f.campus === "POLMED" ? FACULTIES_POLMED : FACULTIES_USU;
  // Sebuah lembaga tidak punya angkatan dan tidak sedang mencari teman nongkrong.
  const tawarkanCariTeman = !peran.organisasi && !daftarOrg;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-black/[0.06] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)] dark:border-white/[0.08] dark:bg-[#1c1c1e]">
        <div className="bg-gradient-to-r from-primary/[0.08] via-white to-emerald-500/[0.06] px-5 py-4 dark:from-primary/15 dark:via-[#1c1c1e] dark:to-emerald-500/10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-primary shadow-sm ring-1 ring-black/[0.05] dark:bg-white/[0.08] dark:ring-white/[0.08]">
                <Icon.Sparkles className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-black tracking-tight text-[#1d1d1f] dark:text-white">Profil Satu Pintu</h2>
                  {peran.organisasi && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <Icon.Landmark className="h-3.5 w-3.5" />
                      {profil.ukm_verified ? "Organisasi Terverifikasi" : "Organisasi Kampus"}
                    </span>
                  )}
                  {peran.toko && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-bold text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                      <Icon.ShoppingBag className="h-3.5 w-3.5" />
                      Punya Toko
                    </span>
                  )}
                </div>
                <p className="max-w-2xl text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                  Satu kali isi, tersebar ke <strong>Marketplace</strong>, <strong>Pusat Obrolan</strong>,{" "}
                  <strong>Menfess Kampus</strong>
                  {peran.toko && <>, <strong>halaman toko</strong></>}
                  {peran.organisasi && <>, <strong>direktori organisasi</strong></>}
                  {tawarkanCariTeman && <>, dan <strong>Cari Teman</strong></>}.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {peran.organisasi && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-white/80 px-3 py-1.5 text-xs font-bold text-primary shadow-sm dark:border-white/[0.08] dark:bg-white/[0.05]">
                  <Icon.Landmark className="h-4 w-4" />
                  Portal Organisasi
                </span>
              )}
              {peran.toko && profil.slug && (
                <Link href={`/toko/${profil.slug}`} target="_blank" className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:brightness-105 active:scale-95">
                  <Icon.Store className="h-4 w-4" />
                  <span>Lihat Toko</span>
                  <Icon.ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={simpan} className="space-y-6">
        <div className="flex flex-col items-center justify-center space-y-3 pb-2">
          <div onClick={() => inputFoto.current?.click()} className="relative h-24 w-24 cursor-pointer overflow-hidden rounded-full bg-black/[0.05] ring-4 ring-white shadow-lg transition-all hover:opacity-80 dark:bg-white/[0.1] dark:ring-[#1c1c1e]">
            {f.avatar_url
              ? <Image src={f.avatar_url} alt="Foto profil" fill className="object-cover" />
              : <div className="flex h-full w-full items-center justify-center text-slate-500 dark:text-slate-300">{peran.organisasi ? <Icon.Landmark className="h-10 w-10" /> : <Icon.User className="h-10 w-10" />}</div>}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-[11px] font-bold text-white opacity-0 transition-opacity hover:opacity-100">Edit</div>
          </div>
          <button type="button" onClick={() => inputFoto.current?.click()} disabled={memampatkan} className="text-[15px] font-medium text-primary transition-colors hover:text-primary/80">
            {memampatkan ? "Menyiapkan..." : f.avatar_url ? "Ganti Foto" : "Tambah Foto"}
          </button>
          <input ref={inputFoto} type="file" accept="image/*" className="hidden" onChange={unggahFoto} />
        </div>

        <Kartu judul="Identitas" catatan="Dipakai di kartu iklan, obrolan, dan mading.">
          <Baris label={peran.organisasi ? "Nama pengurus" : "Nama"}>
            <Teks nilai={f.name} ubah={(v) => set("name", v)} required placeholder="Nama lengkap" />
          </Baris>
          <Baris label="Nama anonim">
            <Teks nilai={f.anonymous_name} ubah={(v) => set("anonymous_name", v)} placeholder="Dipakai di Menfess" />
          </Baris>
          <Baris label="Kampus">
            <Pilih nilai={f.campus} ubah={(v) => { set("campus", v); set("faculty", "Umum"); }} opsi={["USU", "POLMED"]} />
          </Baris>
          <Baris label="Fakultas">
            <Pilih nilai={f.faculty} ubah={(v) => set("faculty", v)} opsi={fakultas} />
          </Baris>
          <div className="px-4 py-3">
            <label className="mb-1.5 block text-[15px] text-[#1d1d1f] dark:text-white">Bio</label>
            <textarea rows={3} value={f.bio} onChange={(e) => set("bio", e.target.value)} placeholder="Ceritakan singkat tentangmu" className="w-full resize-none rounded-lg bg-black/[0.03] p-3 text-[15px] outline-none dark:bg-white/[0.06] dark:text-slate-300" />
          </div>
        </Kartu>

        {(peran.organisasi || daftarOrg) && (
          <Kartu judul="Organisasi" catatan="Tampil di direktori /organisasi dan pada setiap oprec yang kamu buka.">
            <Baris label="Nama organisasi">
              <Teks nilai={f.ukm_name} ubah={(v) => set("ukm_name", v)} placeholder="mis. BEM Fasilkom-TI USU" />
            </Baris>
            <Baris label="Kategori">
              <Pilih nilai={f.ukm_category} ubah={(v) => set("ukm_category", v)} opsi={KATEGORI_UKM} />
            </Baris>
            <Baris label="Instagram">
              <Teks nilai={f.ukm_instagram} ubah={(v) => set("ukm_instagram", v)} placeholder="tanpa @" />
            </Baris>
            <div className="px-4 py-3 text-[11px] leading-relaxed text-gray-400 dark:text-slate-500">
              {/* Centang resmi sengaja tidak bisa disentuh dari sini. Ia diberikan
                  kode undangan saat mendaftar atau oleh admin — kalau formulir
                  pemiliknya sendiri bisa menyalakannya, lencananya berhenti
                  berarti apa pun. */}
              Status verifikasi:{" "}
              <strong className={profil.ukm_verified ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                {profil.ukm_verified ? "Terverifikasi " : "Belum terverifikasi"}
              </strong>
              . Centang resmi hanya diberikan lewat kode undangan atau oleh admin, bukan dari halaman ini.
            </div>
          </Kartu>
        )}

        {(peran.toko || bukaToko) && (
          <>
            <Kartu judul="Toko" catatan="Yang dibaca pembeli di halaman tokomu.">
              <Baris label="Nama toko">
                <Teks nilai={f.store_name} ubah={(v) => set("store_name", v)} placeholder="Nama yang dibaca pembeli" />
              </Baris>
              <Baris label="Alamat">
                <div className="flex flex-1 items-center justify-end gap-1 text-[15px] text-[#86868b] dark:text-slate-400">
                  <span className="shrink-0 text-gray-400">/toko/</span>
                  <input type="text" value={f.slug} onChange={(e) => set("slug", e.target.value)} placeholder="warung-ridho" className="w-full min-w-0 bg-transparent text-right outline-none placeholder:text-gray-300 dark:placeholder:text-gray-600" />
                </div>
              </Baris>
              <Baris label="Tagline">
                <Teks nilai={f.tagline} ubah={(v) => set("tagline", v)} placeholder="Satu kalimat: kamu jualan apa" />
              </Baris>
              <Baris label="Area COD">
                <Teks nilai={f.store_area} ubah={(v) => set("store_area", v)} placeholder="mis. Padang Bulan, USU" />
              </Baris>
              <Baris label="Jam buka">
                <Teks nilai={f.store_hours} ubah={(v) => set("store_hours", v)} placeholder="mis. 09.00–21.00" />
              </Baris>
              <Baris label="Instagram toko">
                <Teks nilai={f.store_instagram} ubah={(v) => set("store_instagram", v)} placeholder="tanpa @" />
              </Baris>
              <Baris label="Google Maps">
                <Teks nilai={f.store_gmaps} ubah={(v) => set("store_gmaps", v)} placeholder="tautan Google Maps" />
              </Baris>
              <Baris label="Toko buka">
                <div className="flex flex-1 justify-end">
                  <input type="checkbox" checked={f.store_open} onChange={(e) => set("store_open", e.target.checked)} className="h-5 w-5 accent-primary" />
                </div>
              </Baris>
              <div className="px-4 py-3">
                <label className="mb-1.5 block text-[15px] text-[#1d1d1f] dark:text-white">Pengumuman</label>
                <textarea rows={2} value={f.store_announcement} onChange={(e) => set("store_announcement", e.target.value)} placeholder="mis. Libur Lebaran 3 hari" className="w-full resize-none rounded-lg bg-black/[0.03] p-3 text-[15px] outline-none dark:bg-white/[0.06] dark:text-slate-300" />
              </div>
            </Kartu>

            <Kartu judul="Tampilan toko" catatan="Logo, sampul, dan warna halaman tokomu.">
              <div className="flex items-center gap-4 border-b border-black/[0.05] px-4 py-4 dark:border-white/[0.08]">
                <GambarToko label="Logo" nilai={f.logo_url} ubah={(v) => set("logo_url", v)} bulat />
                <GambarToko label="Sampul" nilai={f.banner_url} ubah={(v) => set("banner_url", v)} />
              </div>
              <div className="px-4 py-3">
                <label className="mb-2 block text-[15px] text-[#1d1d1f] dark:text-white">Warna</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(AKSEN).map(([kunci, a]) => (
                    <button key={kunci} type="button" onClick={() => set("store_accent", kunci)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${f.store_accent === kunci ? "ring-2 ring-offset-1 dark:ring-offset-[#1c1c1e]" : "opacity-70 hover:opacity-100"}`}
                      style={{ background: a.muda, color: a.teks, ringColor: a.utama }}>
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: a.utama }} />
                      {a.nama}
                    </button>
                  ))}
                </div>
              </div>
            </Kartu>

            {peran.toko && <StatusToko profil={profil} />}
          </>
        )}

        {!peran.toko && !bukaToko && (
          <Kartu judul="Toko" catatan="Halaman toko sendiri dengan alamat yang bisa kamu sebar ke pembeli.">
            {/* Dulu satu-satunya jalan adalah menemukan sendiri /dashboard/toko —
                tidak ditawarkan dari mana pun, jadi fiturnya cuma ketemu kalau
                ada yang memberitahu. Sekarang tidak perlu pindah halaman:
                menekan ini membuka isiannya di tempat. */}
            <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[13px] leading-relaxed text-gray-500 dark:text-slate-400">
                Belum punya toko. Kalau kamu berjualan rutin, halaman toko membuat semua
                iklanmu berkumpul di satu alamat yang bisa disebar.
              </p>
              <button type="button" onClick={() => setBukaToko(true)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-black/[0.08] px-4 py-2 text-center text-xs font-bold text-[#1d1d1f] transition-all hover:bg-black/[0.03] active:scale-95 dark:border-white/[0.12] dark:text-white dark:hover:bg-white/[0.06]">
                <Icon.Store className="h-4 w-4" />
                Buka Toko
              </button>
            </div>
          </Kartu>
        )}

        {!peran.organisasi && !daftarOrg && (
          <Kartu judul="Organisasi" catatan="Untuk BEM, himpunan, UKM, komunitas, dan pers kampus.">
            <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[13px] leading-relaxed text-gray-500 dark:text-slate-400">
                Mengurus sebuah organisasi kampus? Daftarkan di sini supaya muncul di
                direktori dan bisa membuka oprec atas namanya.
              </p>
              <button type="button" onClick={() => setDaftarOrg(true)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-black/[0.08] px-4 py-2 text-center text-xs font-bold text-[#1d1d1f] transition-all hover:bg-black/[0.03] active:scale-95 dark:border-white/[0.12] dark:text-white dark:hover:bg-white/[0.06]">
                <Icon.Landmark className="h-4 w-4" />
                Daftarkan Organisasi
              </button>
            </div>
          </Kartu>
        )}

        {peran.tanpaNomor && (
          <p className="px-1 text-[11px] leading-relaxed text-amber-600 dark:text-amber-400">
            {/* Akun yang mendaftar lewat email tidak punya nomor — dan pengenal
                internalnya bukan nomor telepon, jadi tidak ada yang bisa dihubungi. */}
            Akunmu terdaftar lewat email, jadi belum punya nomor WhatsApp. Notifikasi WhatsApp
            dan tombol “chat penjual” tidak akan aktif sampai nomornya ditambahkan.
          </p>
        )}

        <div className="flex justify-end gap-3 pb-2">
          <button type="submit" disabled={menyimpan} className="rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-xs transition-all hover:brightness-105 active:scale-95 disabled:opacity-60">
            {menyimpan ? "Menyimpan..." : "Simpan Profil"}
          </button>
        </div>
      </form>
    </div>
  );
}
