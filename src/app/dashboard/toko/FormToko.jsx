"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AKSEN, BATAS, normalisasiSlug, SLUG_MIN } from "@/lib/toko";

const KOSONG = {
  store_name: "", tagline: "", bio: "", store_area: "", store_hours: "",
  store_instagram: "", store_gmaps: "", store_announcement: "", store_accent: "emerald",
  store_open: true, logo_url: "", banner_url: "", slug: "",
};

export default function FormToko({ onTersimpan }) {
  const router = useRouter();
  const [memuat, setMemuat] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);
  const [form, setForm] = useState(KOSONG);
  const [slugAwal, setSlugAwal] = useState("");
  const [cekSlug, setCekSlug] = useState({ status: "diam", pesan: "" });
  const [mengunggah, setMengunggah] = useState("");
  const waktuCek = useRef(null);

  const ubah = (kunci) => (e) => {
    const nilai = e?.target?.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [kunci]: nilai }));
  };

  useEffect(() => {
    let batal = false;
    (async () => {
      try {
        const res = await fetch("/api/toko");
        if (res.status === 401) { router.replace("/dashboard/login"); return; }
        const data = await res.json();
        if (batal) return;
        const t = data.toko || {};
        setForm({
          ...KOSONG,
          ...Object.fromEntries(Object.keys(KOSONG).map((k) => [k, t[k] ?? KOSONG[k]])),
          // Toko yang belum pernah diisi tetap butuh nama supaya tombol simpan
          // tidak langsung menolak: pakai nama penjual sebagai titik mulai.
          store_name: t.store_name || t.name || "",
          store_open: t.store_open !== false,
        });
        setSlugAwal(t.slug || "");
      } catch {
        toast.error("Gagal memuat data toko.");
      } finally {
        if (!batal) setMemuat(false);
      }
    })();
    return () => { batal = true; };
  }, [router]);

  // Ketersediaan alamat diperiksa sambil mengetik, tapi ditunda 500 ms:
  // memanggil server tiap ketukan huruf membuat jawabannya balapan satu sama
  // lain, dan yang terakhir tiba belum tentu milik huruf yang terakhir diketik.
  const periksaKetersediaan = useCallback((nilai) => {
    clearTimeout(waktuCek.current);
    const bersih = normalisasiSlug(nilai);
    if (!bersih || bersih === slugAwal) { setCekSlug({ status: "diam", pesan: "" }); return; }
    if (bersih.length < SLUG_MIN) {
      setCekSlug({ status: "buruk", pesan: `Minimal ${SLUG_MIN} huruf.` });
      return;
    }
    setCekSlug({ status: "memeriksa", pesan: "Memeriksa…" });
    waktuCek.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/toko/cek-slug?slug=${encodeURIComponent(bersih)}`);
        if (res.status === 401) { router.replace("/dashboard/login"); return; }
        const d = await res.json();
        setCekSlug(d.tersedia
          ? { status: "baik", pesan: "Alamat ini bisa dipakai." }
          : { status: "buruk", pesan: d.alasan || "Tidak bisa dipakai." });
      } catch {
        setCekSlug({ status: "diam", pesan: "" });
      }
    }, 500);
  }, [slugAwal, router]);

  const ubahSlug = (e) => {
    const nilai = e.target.value;
    setForm((f) => ({ ...f, slug: nilai }));
    periksaKetersediaan(nilai);
  };

  async function unggah(e, kunci) {
    const berkas = e.target.files?.[0];
    if (!berkas) return;
    setMengunggah(kunci);
    try {
      const fd = new FormData();
      fd.append("file", berkas);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Gagal mengunggah");
      setForm((f) => ({ ...f, [kunci]: d.url }));
      toast.success("Gambar terunggah.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setMengunggah("");
      e.target.value = "";
    }
  }

  async function simpan(e) {
    e.preventDefault();
    if (cekSlug.status === "buruk") { toast.error(cekSlug.pesan); return; }
    setMenyimpan(true);
    try {
      const res = await fetch("/api/toko", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, slug: normalisasiSlug(form.slug) || null }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Gagal menyimpan");
      setSlugAwal(d.toko?.slug || "");
      setForm((f) => ({ ...f, slug: d.toko?.slug || "" }));
      setCekSlug({ status: "diam", pesan: "" });
      toast.success("Toko tersimpan.");
      onTersimpan?.(d.toko || null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setMenyimpan(false);
    }
  }

  if (memuat) {
    return <div className="p-8 text-center text-sm text-gray-500">Memuat toko…</div>;
  }

  const slugPratinjau = normalisasiSlug(form.slug);
  const alamatPenuh = slugPratinjau
    ? `jualbeliusupolmed.web.id/toko/${slugPratinjau}`
    : "belum diatur";

  return (
    <div className="pb-4">
      <form onSubmit={simpan} className="space-y-5">
        <Bagian judul="Identitas">
          <Isian label="Nama toko" wajib>
            <input
              value={form.store_name} onChange={ubah("store_name")}
              maxLength={BATAS.store_name} required placeholder="Warung Ridho"
              className="input" />
          </Isian>

          <Isian label="Alamat toko" petunjuk="Ini yang kamu bagikan ke pembeli. Boleh diubah, tapi tautan lama akan mati dan toko perlu disetujui admin lagi.">
            <div className="flex items-center gap-1 rounded-xl border border-gray-200 px-3 dark:border-slate-700">
              <span className="shrink-0 text-xs text-gray-400">/toko/</span>
              <input
                value={form.slug} onChange={ubahSlug}
                placeholder="warung-ridho"
                className="w-full bg-transparent py-2.5 text-sm outline-none" />
            </div>
            <p className={`mt-1 text-xs ${
              cekSlug.status === "baik" ? "text-emerald-600"
                : cekSlug.status === "buruk" ? "text-rose-600" : "text-gray-500"
            }`}>
              {cekSlug.pesan || alamatPenuh}
            </p>
          </Isian>

          <Isian label="Tagline" petunjuk="Satu kalimat pendek di bawah nama toko.">
            <input
              value={form.tagline} onChange={ubah("tagline")}
              maxLength={BATAS.tagline} placeholder="Kopi & camilan anak kos, antar sampai kamar"
              className="input" />
          </Isian>
        </Bagian>

        <Bagian judul="Tampilan">
          <div className="grid grid-cols-2 gap-3">
            <Gambar label="Logo" nilai={form.logo_url} sibuk={mengunggah === "logo_url"}
              onPilih={(e) => unggah(e, "logo_url")}
              onHapus={() => setForm((f) => ({ ...f, logo_url: "" }))} bulat />
            <Gambar label="Sampul" nilai={form.banner_url} sibuk={mengunggah === "banner_url"}
              onPilih={(e) => unggah(e, "banner_url")}
              onHapus={() => setForm((f) => ({ ...f, banner_url: "" }))} />
          </div>

          <Isian label="Warna toko">
            <div className="flex flex-wrap gap-2">
              {Object.entries(AKSEN).map(([kunci, w]) => (
                <button
                  key={kunci} type="button"
                  onClick={() => setForm((f) => ({ ...f, store_accent: kunci }))}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
                    form.store_accent === kunci
                      ? "border-gray-900 dark:border-white"
                      : "border-gray-200 dark:border-slate-700"
                  }`}
                >
                  <span className="h-4 w-4 rounded-full" style={{ background: w.utama }} />
                  {w.nama}
                </button>
              ))}
            </div>
          </Isian>
        </Bagian>

        <Bagian judul="Informasi">
          <Isian label="Area" petunjuk="Contoh: Padang Bulan, dekat pintu 4 USU">
            <input value={form.store_area} onChange={ubah("store_area")}
              maxLength={BATAS.store_area} className="input" />
          </Isian>
          <Isian label="Jam buka" petunjuk="Ditulis bebas, contoh: Setiap hari 09.00–21.00">
            <input value={form.store_hours} onChange={ubah("store_hours")}
              maxLength={BATAS.store_hours} className="input" />
          </Isian>
          <Isian label="Instagram" petunjuk="Boleh tempel tautan penuh, nanti dirapikan sendiri.">
            <input value={form.store_instagram} onChange={ubah("store_instagram")}
              maxLength={BATAS.store_instagram} placeholder="tokoridho" className="input" />
          </Isian>
          <Isian label="Titik Google Maps" petunjuk="Tautan dari aplikasi Google Maps (contoh: https://maps.app.goo.gl/...)">
            <input value={form.store_gmaps} onChange={ubah("store_gmaps")}
              maxLength={BATAS.store_gmaps} placeholder="https://maps.app.goo.gl/..." className="input" />
          </Isian>
          <Isian label="Pengumuman" petunjuk="Muncul di kotak menyala di halaman toko. Kosongkan kalau tidak perlu.">
            <textarea value={form.store_announcement} onChange={ubah("store_announcement")}
              maxLength={BATAS.store_announcement} rows={2}
              placeholder="Libur tanggal 17, pesanan diproses lagi tanggal 18"
              className="input" />
          </Isian>
          <Isian label="Tentang toko">
            <textarea value={form.bio} onChange={ubah("bio")}
              maxLength={BATAS.bio} rows={4} className="input" />
          </Isian>

          <label className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-slate-700">
            <input type="checkbox" checked={form.store_open} onChange={ubah("store_open")}
              className="h-4 w-4" />
            <span>
              <span className="font-semibold">Toko sedang buka</span>
              <span className="block text-xs text-gray-500 dark:text-slate-400">
                Kalau dimatikan, pengunjung tetap bisa melihat barangmu tapi tahu kamu sedang tutup.
              </span>
            </span>
          </label>
        </Bagian>

        <div className="fixed bottom-[80px] left-4 right-4 z-40 md:hidden flex justify-center pointer-events-none animate-fade-in-up">
          <div className="pointer-events-auto w-full max-w-sm rounded-full bg-white/90 p-2 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-xl border border-gray-100 dark:bg-slate-900/90 dark:border-slate-800 dark:shadow-black/50">
            <button type="submit" disabled={menyimpan}
              className="btn-primary w-full rounded-full py-3 text-[15px] font-semibold disabled:opacity-60 shadow-lg shadow-black/10 dark:shadow-black/40">
              {menyimpan ? "Menyimpan…" : "Simpan toko"}
            </button>
          </div>
        </div>
        
        {/* Desktop Sticky Footer */}
        <div className="hidden md:block sticky bottom-0 -mx-4 mt-8 border-t border-gray-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 z-40">
          <button type="submit" disabled={menyimpan}
            className="btn-primary w-full max-w-md mx-auto block rounded-xl py-3 text-sm font-semibold disabled:opacity-60">
            {menyimpan ? "Menyimpan…" : "Simpan toko"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Bagian({ judul, children }) {
  return (
    <section className="card space-y-4 p-4">
      <h2 className="text-sm font-bold text-gray-500 dark:text-slate-400">{judul}</h2>
      {children}
    </section>
  );
}

function Isian({ label, petunjuk, wajib, children }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold">
        {label} {wajib && <span className="text-rose-500">*</span>}
      </label>
      {children}
      {petunjuk && <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{petunjuk}</p>}
    </div>
  );
}

function Gambar({ label, nilai, sibuk, onPilih, onHapus, bulat }) {
  return (
    <div>
      <div className="mb-1 text-sm font-semibold">{label}</div>
      <div className={`flex h-24 items-center justify-center overflow-hidden border border-dashed border-gray-300 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/40 transition-colors hover:border-gray-400 hover:bg-gray-100 dark:hover:border-slate-500 dark:hover:bg-slate-800 ${bulat ? "rounded-full aspect-square h-20 w-20 mx-auto" : "rounded-2xl"}`}>
        {nilai ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={nilai} alt={label} className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs text-gray-400 font-medium">Belum ada</span>
        )}
      </div>
      <div className="mt-1 flex gap-2">
        <label className="btn-outline flex-1 cursor-pointer rounded-lg py-1.5 text-center text-xs">
          {sibuk ? "Mengunggah…" : "Pilih"}
          <input type="file" accept="image/*" onChange={onPilih} className="hidden" disabled={sibuk} />
        </label>
        {nilai && (
          <button type="button" onClick={onHapus}
            className="btn-outline rounded-lg px-2 py-1.5 text-xs">Hapus</button>
        )}
      </div>
    </div>
  );
}
