"use client";
import { useState, useCallback, useEffect } from "react";
import { useApi, apiPost } from "./api";
import { StatusDot, Alert, KV, Kartu } from "./ui";
import { KartuTaut } from "./KartuTaut";

// Status perangkat kedua. Sengaja tidak lewat useApi: kalau bot kedua mati atau
// belum dikonfigurasi, bot utama menjawab 502/503 — dan justru DI DALAM body itulah
// keterangan yang paling dibutuhkan (`adaBot2`, `hidup`). useApi membuang body
// non-2xx dan hanya menyisakan pesan error, jadi kartunya tidak bisa membedakan
// "bot kedua belum dipasang" dari "bot kedua sedang mati".
function usePerangkat2() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/baileys?endpoint=perangkat2/status&_t=${Date.now()}`);
      setData(await res.json().catch(() => ({})));
    } catch (e) {
      setData({ error: e.message, hidup: false });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);
  return { data, loading, refetch };
}

export function TabStatus() {
  const { data, loading, error, refetch } = useApi("status");
  const { data: data2, refetch: refetch2 } = usePerangkat2();
  const [restarting, setRestarting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [membukaKunci, setMembukaKunci] = useState(false);
  const [msg, setMsg] = useState(null);

  const segarkan = useCallback(() => { refetch(); refetch2(); }, [refetch, refetch2]);

  // Selama masih ada perangkat yang belum tertaut, keadaan di halaman ini berubah
  // sendiri di sisi bot (QR muncul, pairing berhasil). Tanpa polling, orang yang
  // baru saja scan tetap melihat layar "belum terhubung" sampai menekan Refresh.
  const adaYangBelumTertaut = (data && !data.connected) || (data2 && data2.adaBot2 !== false && !data2.connected);
  useEffect(() => {
    if (!adaYangBelumTertaut) return;
    const t = setInterval(segarkan, 15000);
    return () => clearInterval(t);
  }, [adaYangBelumTertaut, segarkan]);

  async function handleRestart() {
    if (!confirm("Restart bot sekarang?")) return;
    setRestarting(true);
    await apiPost("restart");
    setTimeout(() => { setRestarting(false); segarkan(); }, 4000);
  }

  // Sesi terkunci bukan sekadar "terputus": bot menahan sesinya dengan sengaja
  // dan tidak akan menampilkan QR sampai ada yang memutuskan. Tanpa tombol ini,
  // satu-satunya jalan keluar ada di server — persis yang sudah tidak berlaku
  // sejak dashboard bot punya /sesi/buka-kunci.
  async function handleBukaKunci() {
    if (!confirm("Buka kunci sesi? Sesi lama dibuang dan bot minta scan QR baru.")) return;
    setMembukaKunci(true);
    const r = await apiPost("sesi/buka-kunci");
    setMsg(r.ok ? { ok: true, text: `${r.message || "Kunci dibuka. Bot restart dan akan menampilkan QR."}` }
                : { ok: false, text: `${r.error || "Gagal membuka kunci."}` });
    setTimeout(() => { setMembukaKunci(false); segarkan(); }, 6000);
  }

  async function handleReset() {
    if (!confirm("HAPUS SESI WA? Bot akan logout dan minta scan QR ulang.")) return;
    setResetting(true);
    const r = await apiPost("reset");
    setMsg(r.ok ? { ok: true, text: "Sesi dihapus. Bot restart, scan QR baru." } : { ok: false, text: "Gagal reset." });
    setTimeout(() => { setResetting(false); segarkan(); }, 4000);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold dark:text-white">Status Koneksi Bot</h2>
        <button onClick={segarkan} className="btn-outline text-xs">Refresh</button>
      </div>

      {/* Hanya saat layar masih kosong. Halaman ini menyegarkan diri tiap 15 detik,
          dan "Memuat..." yang berkedip tiap 15 detik cuma bikin resah. */}
      {loading && !data && <p className="text-sm text-gray-400">Memuat...</p>}
      {error && <Alert ok={false} msg={error} />}
      <Alert ok={msg?.ok} msg={msg?.text} />

      {data?.sesiTerkunci && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm dark:border-rose-800 dark:bg-rose-900/20">
          <p className="font-bold text-rose-700 dark:text-rose-400"> Sesi terkunci</p>
          <p className="mt-1 text-xs text-rose-700/90 dark:text-rose-300/90">
            WhatsApp menolak sesi ini berulang kali. Sesi TIDAK dihapus — bot mencoba lagi tiap{" "}
            {data.kunciRetryMenit || 10} menit dengan sesi yang sama. Cek dulu daftar perangkat tertaut di HP:
            kalau bot masih terdaftar, biarkan saja. Buka kunci hanya kalau bot sudah tidak ada di daftar itu —
            sesi lama akan dibuang.
          </p>
          <button onClick={handleBukaKunci} disabled={membukaKunci}
            className="mt-3 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
            {membukaKunci ? "Membuka..." : "Buka kunci & scan QR baru"}
          </button>
        </div>
      )}

      {/* Dua perangkat, dua kartu. Yang kedua menghilang sendiri kalau bot kedua
          memang belum dikonfigurasi di server (BOT2_TOKEN kosong). */}
      {data && <KartuTaut perangkat={1} status={data} onRefresh={segarkan} />}
      {data2 && data2.adaBot2 !== false && <KartuTaut perangkat={2} status={data2} onRefresh={segarkan} />}

      {/* Empat kartu ringkasan, isinya sama dengan panel Ringkasan di dashboard bot.
          Semuanya datang dari /status yang memang sudah diambil halaman ini — jadi
          tidak ada permintaan tambahan, cuma angka yang selama ini dibuang. */}
      {data && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Kartu judul="ℹ Informasi Bot">
            <div className="mb-2 flex items-center gap-2">
              <StatusDot on={data.connected} />
              <span className="font-mono text-lg font-bold dark:text-white">{data.phone ? `+${data.phone}` : "–"}</span>
            </div>
            <KV k="Status" v={data.connected ? "Terhubung" : "Terputus"} />
            <KV k="Uptime" v={data.uptime ? `${Math.floor(data.uptime / 3600)}j ${Math.floor((data.uptime % 3600) / 60)}m ${data.uptime % 60}d` : "–"} />
            <KV k="Terhubung sejak" v={data.connectedAt ? new Date(data.connectedAt).toLocaleString("id-ID") : "–"} />
            <KV k="Webhook" v={<span className="break-all font-mono text-[11px] font-normal">{data.webhookUrl || "–"}</span>} />
          </Kartu>

          <Kartu judul=" Antrean & Kesehatan">
            <div className="mb-1 text-2xl font-black dark:text-white">{data.queueLength ?? 0}</div>
            <p className="mb-3 text-xs text-gray-400">Pesan menunggu dikirim</p>
            <KV k="Putus koneksi (sejak start)" v={data.outageCount ?? 0} />
            <KV k="Putus terakhir" v={data.lastOutage
              ? `${Math.round(data.lastOutage.ms / 60000)} mnt (${new Date(data.lastOutage.endedAt).toLocaleString("id-ID")})`
              : "–"} />
            <KV k="Percobaan reconnect" v={data.reconnectAttempts ?? 0} />
            <KV k="Padam sejak" v={data.offlineSince ? new Date(data.offlineSince).toLocaleString("id-ID") : "–"} />
            <KV k="Restart darurat" v={`${data.offlineEscalations ?? 0}× (ambang ${data.escalationThresholdMinutes ?? "–"} mnt)`} />
          </Kartu>

          <Kartu judul=" Hari Ini">
            <KV k="Pesan masuk" v={data.today?.masuk || 0} />
            <KV k="Pesan keluar" v={data.today?.keluar || 0} />
            <KV k="Sapaan terkirim" v={data.today?.sapaan || 0} />
            <KV k={'Panggil "min"'} v={data.today?.panggil_min || 0} />
            <KV k="Didiamkan (chat admin)" v={data.today?.didiamkan || 0} />
            <KV k="Sesi bot dibuka" v={data.today?.sesi_bot || 0} />
          </Kartu>

          <Kartu judul=" Data">
            <KV k="Chat tersimpan" v={data.chatCount ?? 0} />
            <KV k="Pesan diarsipkan" v={data.archiveCount ?? 0} />
            <KV k="Sapaan kustom" v={data.greetingCustom ? "Ya" : "Bawaan"} />
            <KV k="Sesi terakhir hilang" v={data.sessionLostAt ? new Date(data.sessionLostAt).toLocaleString("id-ID") : "–"} />
            {data2 && data2.adaBot2 !== false && (
              <KV k="Perangkat 2" v={data2.hidup === false ? "Tidak berjalan "
                : data2.connected ? `Terhubung${data2.phone ? ` (+${data2.phone})` : ""}` : "Terputus"} />
            )}
          </Kartu>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        <button onClick={handleRestart} disabled={restarting} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
          {restarting ? "Restarting..." : "Restart Bot"}
        </button>
        <button onClick={handleReset} disabled={resetting} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
          {resetting ? "Mereset..." : "Reset Sesi (Logout WA)"}
        </button>
      </div>
      <p className="text-xs text-gray-400">
        Tombol Restart & Reset di atas hanya mengenai perangkat 1. Perangkat 2 diurus dari server.
      </p>
    </div>
  );
}
