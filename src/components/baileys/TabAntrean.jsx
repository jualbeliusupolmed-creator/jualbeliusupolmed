"use client";

import { useState, useEffect, useCallback } from "react";
import { Megaphone } from "lucide-react";
import { AntreanBot } from "./AntreanBot";

/*
 * Antrean notifikasi WhatsApp yang belum sampai.
 *
 * Sebelum ini, notifikasi dari situs (iklan tayang, sundul, perpanjangan)
 * ditembakkan sekali ke bot lalu dilupakan — pemanggilnya `.catch(console.error)`
 * dan tidak di-await. Kalau bot ATAU VPS-nya mati, pesannya lenyap ke log Vercel:
 * iklannya tetap tayang, penjualnya menunggu kabar yang tidak akan datang.
 *
 * Sekarang kegagalan itu mendarat di tabel wa_outbox, dan layar ini jendelanya.
 * Halaman kembarannya ada di dashboard bot (/antrean) yang membaca data yang
 * SAMA lewat rute ini — bukan salinan yang bisa berbeda.
 */
export function TabAntrean() {
  const [items, setItems] = useState([]);
  const [tertunda, setTertunda] = useState(0);
  const [status, setStatus] = useState("tertunda");
  const [muat, setMuat] = useState(true);
  const [pesan, setPesan] = useState(null);      // { teks, buruk }
  const [sibuk, setSibuk] = useState(null);      // id baris yang sedang dikirim, atau "semua"

  const ambil = useCallback(async () => {
    setMuat(true);
    try {
      const r = await fetch(`/api/admin/outbox?status=${encodeURIComponent(status)}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) {
        setPesan({ teks: j.error || `HTTP ${r.status}`, buruk: true });
        setItems([]);
      } else {
        setPesan(null);
        setItems(j.items || []);
        setTertunda(j.tertunda || 0);
      }
    } catch (e) {
      setPesan({ teks: `Gagal memuat: ${e.message}`, buruk: true });
    } finally {
      setMuat(false);
    }
  }, [status]);

  useEffect(() => { ambil(); }, [ambil]);

  async function kirim(badan, tanda) {
    setSibuk(tanda);
    try {
      const r = await fetch("/api/admin/outbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(badan),
      });
      const j = await r.json();
      if (!r.ok) setPesan({ teks: j.error || `HTTP ${r.status}`, buruk: true });
      else if (j.dibatalkan) setPesan({ teks: "Dibatalkan.", buruk: false });
      else if (j.gagal) {
        // Sebutkan alasannya. "Gagal" tanpa sebab membuat orang menekan tombolnya
        // berulang kali pada bot yang memang belum tersambung.
        setPesan({
          teks: `${j.terkirim} terkirim, ${j.gagal} masih gagal — ${j.alasan?.join("; ") || "sebab tidak disebutkan"}`,
          buruk: true,
        });
      } else if (j.terkirim) {
        setPesan({ teks: `${j.terkirim} terkirim. Sisa ${j.sisa} tertunda.`, buruk: false });
      }
      await ambil();
    } catch (e) {
      setPesan({ teks: `Gagal: ${e.message}`, buruk: true });
    } finally {
      setSibuk(null);
    }
  }

  const tgl = (iso) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch { return iso; }
  };

  const warnaStatus = (s) =>
    s === "terkirim" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
    : s === "tertunda" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
    : "bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-gray-400";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="g-page-title flex items-center gap-2">
          <Megaphone className="h-5 w-5" /> Antrean Notifikasi
        </h2>
        <p className="g-page-desc">
          Pesan yang belum sampai ke penerimanya menunggu di salah satu dari <b>dua</b> antrean —
          dan yang menentukan antrean mana adalah di mana pesannya berhenti.
        </p>
      </div>

      {/* Antrean di dalam bot: keadaan yang paling sering terjadi (bot hidup,
          WhatsApp putus) dan dulu satu-satunya yang tidak terlihat dari sini. */}
      <AntreanBot />

      <div className="flex flex-wrap items-start justify-between gap-3 pt-2">
        <div>
          <h2 className="g-card-title">Antrean di situs</h2>
          <p className="g-card-desc max-w-2xl">
            Notifikasi yang <b>tidak berhasil dititipkan</b> ke bot sama sekali — VPS mati, nginx
            tumbang. Yang ini tidak berangkat sendiri: tekan <b>Kirim</b> setelah bot pulih.
            Baris bertanda <b>grup</b> sengaja dilewati tombol "Kirim semua" — pengumuman grup
            punya masa berlaku, jadi kirimnya satu per satu setelah melihat umurnya.
          </p>
        </div>
        <span className={`g-badge${tertunda ? " is-warn" : " is-ok"}`}>{tertunda} tertunda</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => kirim({ semua: true }, "semua")}
          disabled={sibuk !== null || !tertunda}
          className="g-btn g-btn-filled"
        >
          {sibuk === "semua" ? "Mengirim…" : "Kirim semua"}
        </button>
        <button onClick={ambil} disabled={muat} className="g-btn g-btn-outlined">
          Muat ulang
        </button>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="g-field w-auto"
        >
          <option value="tertunda">Tertunda</option>
          <option value="terkirim">Sudah terkirim</option>
          <option value="dibatalkan">Dibatalkan</option>
          <option value="semua">Semua</option>
        </select>
      </div>

      {pesan && (
        <div className={`rounded-xl border p-3 text-sm ${
          pesan.buruk
            ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-300"
            : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300"
        }`}>
          {pesan.teks}
        </div>
      )}

      {muat && <p className="text-sm text-gray-400">Memuat…</p>}

      {!muat && !items.length && !pesan && (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400 dark:border-slate-800 dark:bg-slate-900">
          Tidak ada yang tertunda. Semua notifikasi sudah sampai.
        </div>
      )}

      <div className="space-y-3">
        {items.map((it) => (
          <div key={it.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{it.target}</span>
              {it.jenis && <span className="g-badge is-info">{it.jenis}</span>}
              {/* Umur baris disebut apa adanya: yang menentukan sebuah pengumuman
                  masih pantas dikirim atau sudah basi adalah usianya, dan itu
                  tidak boleh perlu dihitung sendiri dari tanggal. */}
              {(() => {
                const jam = Math.floor((Date.now() - new Date(it.created_at).getTime()) / 3600000);
                if (!Number.isFinite(jam) || jam < 6) return null;
                return (
                  <span className={`g-badge${jam >= 24 ? " is-bad" : " is-warn"}`}>
                    {jam >= 24 ? `${Math.floor(jam / 24)} hari lalu` : `${jam} jam lalu`}
                  </span>
                );
              })()}
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${warnaStatus(it.status)}`}>
                {it.status}
              </span>
              {!!it.percobaan && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500 dark:bg-slate-800 dark:text-gray-400">
                  {it.percobaan}× dicoba
                </span>
              )}
              <span className="ml-auto text-[11px] text-gray-400">{tgl(it.created_at)}</span>
            </div>

            <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-3 text-[13px] leading-relaxed text-gray-600 dark:bg-slate-800/60 dark:text-gray-300">
{it.message}
            </pre>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {it.galat_terakhir && (
                <span className="flex-1 text-[11px] text-rose-600 dark:text-rose-400">{it.galat_terakhir}</span>
              )}
              {it.status === "tertunda" && (
                <div className="ml-auto flex flex-wrap items-center gap-1.5">
                  {/* Tombol Buka WhatsApp Manual (Bisa dikirim dari WA pribadi mana saja) */}
                  {(() => {
                    const cleanPhone = String(it.target || "").replace(/@s\.whatsapp\.net|@g\.us/g, "").replace(/\D/g, "");
                    const waPhone = cleanPhone.startsWith("0") ? "62" + cleanPhone.slice(1) : cleanPhone;
                    if (!waPhone || waPhone.length < 5) return null;
                    const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(it.message || "")}`;
                    return (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs"
                        title="Buka chat WhatsApp langsung dari browser/HP untuk kirim manual"
                      >
                        <span>💬 Chat WA Manual</span>
                        <span className="text-[10px]">↗</span>
                      </a>
                    );
                  })()}

                  {/* Tombol Tandai Sudah Terkirim Manual */}
                  <button
                    onClick={() => kirim({ manual: it.id }, it.id)}
                    disabled={sibuk !== null}
                    className="rounded-lg bg-slate-100 border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700 disabled:opacity-40"
                    title="Tandai antrean ini sebagai sudah terkirim manual agar bersih dari antrean"
                  >
                    {sibuk === it.id ? "Memproses…" : "✓ Tandai Terkirim"}
                  </button>

                  <button
                    onClick={() => kirim({ id: it.id }, it.id)}
                    disabled={sibuk !== null}
                    className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-40"
                  >
                    {sibuk === it.id ? "Mengirim…" : "Kirim Bot"}
                  </button>
                  <button
                    onClick={() => kirim({ batal: it.id }, it.id)}
                    disabled={sibuk !== null}
                    className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:border-slate-700 dark:text-gray-400 dark:hover:bg-slate-800"
                  >
                    Batalkan
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
