"use client";
import { useState } from "react";
import { useApi, apiPost } from "./api";
import { Alert, Kartu } from "./ui";

// Broadcast dengan pagarnya ikut dibawa dari dashboard bot: daftar tujuan datang
// dari /broadcast/targets, dan itu HANYA nomor yang pernah menghubungi bot duluan.
// Bot menolak jid di luar daftar itu, jadi panel ini tidak menyediakan isian bebas —
// yang berisiko diblokir WhatsApp adalah nomor bot itu sendiri.
export function TabBroadcast() {
  const { data, loading, error, refetch } = useApi("broadcast/targets");
  const [dipilih, setDipilih] = useState([]);
  const [pesan, setPesan] = useState("");
  const [cari, setCari] = useState("");
  const [mengirim, setMengirim] = useState(false);
  const [msg, setMsg] = useState(null);

  const targets = data?.targets || [];
  const max = data?.max || 50;
  const terlihat = targets.filter(t =>
    !cari || (t.name || "").toLowerCase().includes(cari.toLowerCase()) || t.jid.includes(cari));

  function toggle(jid) {
    setDipilih(d => d.includes(jid) ? d.filter(x => x !== jid) : [...d, jid]);
  }

  async function kirim() {
    if (!pesan.trim()) { setMsg({ ok: false, text: "⚠️ Isi pesannya dulu." }); return; }
    if (!dipilih.length) { setMsg({ ok: false, text: "⚠️ Pilih minimal satu tujuan." }); return; }
    if (!confirm(`Kirim broadcast ke ${dipilih.length} kontak?`)) return;
    setMengirim(true);
    const r = await apiPost("broadcast", { message: pesan, jids: dipilih });
    if (r.ok) {
      setMsg({ ok: true, text: `✅ ${r.queued} tujuan masuk antrean kirim${r.rejected?.length ? `, ${r.rejected.length} ditolak` : ""}.` });
      setPesan("");
      setDipilih([]);
    } else {
      setMsg({ ok: false, text: `❌ ${r.error || "Gagal mengirim."}` });
    }
    setMengirim(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold dark:text-white">Broadcast</h2>
        <button onClick={refetch} className="btn-outline text-xs">🔄 Muat ulang</button>
      </div>

      {loading && !data && <p className="text-sm text-gray-400">Memuat...</p>}
      {error && <Alert ok={false} msg={`⚠️ ${error}`} />}
      <Alert ok={msg?.ok} msg={msg?.text} />

      <Kartu judul="📣 Kirim ke kontak yang pernah chat">
        <p className="mb-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          Daftar ini <b>hanya</b> berisi nomor yang pernah mengirim pesan ke bot — mereka menghubungi duluan.
          Nomor dari buku kontak dan anggota grup sengaja tidak bisa dipilih: mengirim pesan borongan ke orang
          yang tidak pernah menghubungi kita itu spam, dan yang berisiko diblokir WhatsApp adalah nomor bot ini
          sendiri. Batas <b>{max}</b> tujuan sekali kirim, dijeda otomatis antar kontak.
        </p>

        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-gray-400">{targets.length} tujuan tersedia · {dipilih.length} dipilih</span>
          <div className="flex gap-2">
            <button onClick={() => setDipilih(terlihat.slice(0, max).map(t => t.jid))} className="btn-outline text-xs">
              Pilih semua (maks {max})
            </button>
            <button onClick={() => setDipilih([])} className="btn-outline text-xs">Kosongkan</button>
          </div>
        </div>

        <input type="text" value={cari} onChange={e => setCari(e.target.value)}
          placeholder="Cari nama / nomor…" className="input mb-2 w-full" />

        <div className="mb-3 max-h-72 overflow-y-auto rounded-lg border border-gray-200 dark:border-slate-800">
          {terlihat.length === 0 && <p className="p-3 text-xs text-gray-400">Belum ada kontak yang pernah chat bot.</p>}
          {terlihat.map(t => (
            <label key={t.jid} className="flex cursor-pointer items-center gap-2 border-b border-gray-100 p-2 text-sm last:border-0 hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
              <input type="checkbox" checked={dipilih.includes(t.jid)} onChange={() => toggle(t.jid)} />
              <span className="flex-1 truncate dark:text-white">
                {t.name || t.jid.split("@")[0]}
                <span className="ml-2 font-mono text-[11px] text-gray-400">{t.jid.split("@")[0]}</span>
              </span>
              {t.lastTime ? <span className="text-[11px] text-gray-400">{new Date(t.lastTime).toLocaleDateString("id-ID")}</span> : null}
            </label>
          ))}
        </div>

        <textarea rows={5} value={pesan} onChange={e => setPesan(e.target.value)}
          placeholder="Isi pesan broadcast…" className="input w-full text-sm" />

        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {dipilih.length > max ? `⚠️ ${dipilih.length} melebihi batas ${max}` : `${dipilih.length} dipilih`}
          </span>
          <button onClick={kirim} disabled={mengirim || !dipilih.length || dipilih.length > max}
            className="btn-primary text-xs disabled:opacity-50">
            {mengirim ? "Mengirim…" : "Kirim broadcast"}
          </button>
        </div>
      </Kartu>
    </div>
  );
}
