"use client";
import { useState, useEffect } from "react";
import { useApi, apiPost } from "./api";
import { Alert, Kartu } from "./ui";

// Sapaan otomatis dan dua nomor darurat. Keduanya berlaku langsung tanpa restart
// bot, dan sebelumnya cuma bisa diubah dari dashboard bot — padahal yang menjaga
// situs ini membuka panel situs lebih sering.
export function TabSapaan() {
  const { data, loading, error, refetch } = useApi("settings");
  const [teks, setTeks] = useState("");
  const [owner, setOwner] = useState("");
  const [cadangan, setCadangan] = useState("");
  const [msg, setMsg] = useState(null);
  const [simpan, setSimpan] = useState(false);

  // Kotak isian diisi ulang setiap kali data dari bot berubah — termasuk setelah
  // "Kembalikan bawaan", supaya yang terlihat di layar selalu yang benar-benar dipakai bot.
  useEffect(() => {
    if (!data) return;
    setTeks(data.greeting || "");
    setOwner(data.ownerNumber || "");
    setCadangan(data.backupAdmin || "");
  }, [data]);

  async function simpanSapaan() {
    setSimpan(true);
    const r = await apiPost("settings/greeting", { text: teks });
    setMsg(r.ok ? { ok: true, text: "✅ Sapaan disimpan — langsung berlaku." } : { ok: false, text: `❌ ${r.error || "Gagal menyimpan."}` });
    setSimpan(false);
    refetch();
  }

  async function resetSapaan() {
    if (!confirm("Kembalikan sapaan ke teks bawaan bot?")) return;
    setSimpan(true);
    const r = await apiPost("settings/greeting/reset");
    setMsg(r.ok ? { ok: true, text: "✅ Sapaan dikembalikan ke bawaan." } : { ok: false, text: `❌ ${r.error || "Gagal reset."}` });
    setSimpan(false);
    refetch();
  }

  async function simpanNomor() {
    setSimpan(true);
    const r = await apiPost("settings/nomor", { owner, cadangan });
    setMsg(r.ok ? { ok: true, text: "✅ Nomor disimpan." } : { ok: false, text: `❌ ${r.error || "Gagal menyimpan nomor."}` });
    setSimpan(false);
    refetch();
  }

  const kataMin = (data?.adminCallWords || ["min"]).map(w => `"${w}"`).join(" / ");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold dark:text-white">Sapaan & Nomor Penting</h2>
        <button onClick={refetch} className="btn-outline text-xs">🔄 Muat ulang</button>
      </div>

      {loading && !data && <p className="text-sm text-gray-400">Memuat...</p>}
      {error && <Alert ok={false} msg={`⚠️ ${error}`} />}
      <Alert ok={msg?.ok} msg={msg?.text} />

      <Kartu judul="💬 Teks sapaan otomatis">
        <p className="mb-3 text-xs text-gray-400">
          Dikirim ke pesan tanpa titik (sekali per kontak) dan setiap kali seseorang mengetik {kataMin}.
          Perubahan langsung berlaku, tanpa restart bot.
        </p>
        <textarea rows={16} value={teks} onChange={e => setTeks(e.target.value)}
          className="input w-full font-mono text-sm" placeholder="Memuat…" />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-gray-400">
            {teks.length} karakter{data?.max ? ` / ${data.max}` : ""} · {data?.isCustom ? "kustom" : "bawaan"}
          </span>
          <div className="flex gap-2">
            <button onClick={resetSapaan} disabled={simpan} className="btn-outline text-xs disabled:opacity-50">Kembalikan bawaan</button>
            <button onClick={simpanSapaan} disabled={simpan || !teks.trim()} className="btn-primary text-xs disabled:opacity-50">
              {simpan ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
        </div>
      </Kartu>

      <Kartu judul="📞 Nomor penting">
        <p className="mb-4 text-xs text-gray-400">
          Dua nomor untuk keadaan bot bermasalah. Berlaku langsung, tanpa restart bot.
          Format bebas — <b>0812…</b> atau <b>62812…</b> sama saja.
        </p>

        <label className="label">Nomor alarm — dikabari lewat WA setiap kali bot sempat padam</label>
        <input type="text" value={owner} onChange={e => setOwner(e.target.value)}
          placeholder="Contoh: 62812…" className="input mb-1 w-full font-mono" />
        <p className="mb-4 text-[11px] text-gray-400">
          {data?.ownerFromEnv
            ? "Nilai ini datang dari pengaturan server (env), belum pernah disimpan di sini."
            : "Disimpan di bot."}
        </p>

        <label className="label">Nomor admin cadangan — dipajang situs selama bot padam</label>
        <input type="text" value={cadangan} onChange={e => setCadangan(e.target.value)}
          placeholder="Contoh: 62812…" className="input mb-1 w-full font-mono" />
        <p className="mb-4 text-[11px] text-gray-400">
          Dipegang manusia, bukan bot. Kosongkan kalau belum ada — situs akan tetap memakai nomor utama.
        </p>

        <div className="flex justify-end">
          <button onClick={simpanNomor} disabled={simpan} className="btn-primary text-xs disabled:opacity-50">
            {simpan ? "Menyimpan…" : "Simpan nomor"}
          </button>
        </div>
      </Kartu>
    </div>
  );
}
