"use client";
import { useState } from "react";
import { apiPost } from "./api";
import { QRDisplay } from "./ui";

// Kartu penautan satu perangkat — dipakai dua kali di tab Status.
//
// Bot ini mengurus DUA nomor: bot utama (proses wa-bot-usu) dan nomor cadangan
// (proses wa-bot-2, port sendiri, hanya mendengar di loopback). Yang kedua
// dijangkau lewat /perangkat2/* di bot utama, dengan token yang sama. Dashboard
// bawaan bot sudah menampilkan keduanya; panel ini dulu cuma tahu yang pertama,
// jadi nomor cadangan tidak pernah bisa ditautkan dari situs.
export function KartuTaut({ perangkat, status, onRefresh }) {
  const kedua = perangkat === 2;
  const qrEndpoint = kedua ? "perangkat2/qr" : "qr";
  const pairingEndpoint = kedua ? "perangkat2/pairing-code" : "pairing-code";

  const [pairingPhone, setPairingPhone] = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [meminta, setMeminta] = useState(false);
  const [membangunkan, setMembangunkan] = useState(false);
  const [msg, setMsg] = useState(null);

  async function mintaPairing() {
    if (!pairingPhone) { setMsg({ ok: false, text: "⚠️ Masukkan nomor HP terlebih dahulu." }); return; }
    setMeminta(true);
    setPairingCode("");
    try {
      const r = await apiPost(pairingEndpoint, { phone: pairingPhone });
      if (r.ok && r.code) {
        setPairingCode(r.code);
        setMsg({ ok: true, text: "✅ Kode pairing berhasil didapatkan!" });
      } else {
        setMsg({ ok: false, text: `❌ Gagal: ${r.error || "Terjadi kesalahan"}` });
      }
    } catch (e) {
      setMsg({ ok: false, text: `❌ Error: ${e.message}` });
    }
    setMeminta(false);
  }

  // Bot sengaja berhenti menampilkan QR kalau tidak ada yang memindainya. Yang
  // membangunkannya adalah TINDAKAN — tombol ini — bukan halaman yang kebetulan
  // terbuka. Permintaan /qr itu sendiri tandanya: socket baru disiapkan, lalu QR
  // muncul lewat polling biasa beberapa detik kemudian.
  async function bangunkan() {
    setMembangunkan(true);
    try { await fetch(`/api/admin/baileys?endpoint=${qrEndpoint}&_t=${Date.now()}`); } catch (_) {}
    setTimeout(() => { setMembangunkan(false); onRefresh?.(); }, 15000);
  }

  const judul = kedua ? "Perangkat 2 — nomor cadangan" : "Perangkat 1 — nomor utama";
  const mati = kedua && status?.hidup === false;
  const tampilkanQr = !!status?.hasQR;
  const menunggu = !status?.connected && !tampilkanQr && !!status?.menungguPindai;
  // Form pairing hanya berguna saat perangkat memang sedang minta ditautkan.
  // Meminta kode juga membangunkan bot yang diam, jadi ikut dibuka saat menunggu.
  const tampilkanPairing = tampilkanQr || menunggu;

  return (
    <div className={`card p-5 border-2 ${
      status?.connected ? "border-green-300 dark:border-green-700"
                        : "border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20"
    }`}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="text-sm font-bold dark:text-white">{kedua ? "📱 " : "🤖 "}{judul}</p>
        {status?.connected && status?.phone && (
          <span className="font-mono text-xs text-green-600 dark:text-green-400">+{status.phone}</span>
        )}
      </div>

      {msg && (
        <p className={`mb-3 rounded-lg p-2 text-xs ${
          msg.ok ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                 : "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
        }`}>{msg.text}</p>
      )}

      {mati && (
        <p className="text-sm text-gray-500 dark:text-slate-400">
          Bot kedua tidak berjalan. Hidupkan di server dengan <code className="rounded bg-gray-100 px-1 dark:bg-slate-800">/root/wa-bot-2/jalankan.sh</code>.
        </p>
      )}

      {!mati && status?.connected && (
        <p className="text-sm font-semibold text-green-600 dark:text-green-400">✅ Tersambung — tidak perlu scan.</p>
      )}

      {!mati && !status?.connected && (
        <div className="flex flex-col items-center justify-center gap-8 md:flex-row">
          <div className="flex flex-col items-center">
            <p className="mb-2 text-xs font-bold uppercase text-gray-500">Opsi 1: Scan QR</p>
            {tampilkanQr && <QRDisplay perangkat={perangkat} />}
            {menunggu && (
              <div className="max-w-xs space-y-2 text-center">
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Perangkat belum tertaut. QR berhenti ditampilkan karena tidak ada yang memindainya —
                  bot sengaja diam supaya tidak mengetuk WhatsApp terus-menerus.
                </p>
                <button onClick={bangunkan} disabled={membangunkan} className="btn-outline text-xs disabled:opacity-50">
                  {membangunkan ? "⏳ Menyiapkan QR…" : "Tampilkan QR"}
                </button>
                <p className="text-[11px] text-gray-400">
                  Siapkan HP dulu (WhatsApp → Perangkat tertaut), baru tekan. Tanpa ditekan,
                  bot mencoba sendiri tiap {status?.pindaiRetryMenit || 30} menit.
                </p>
              </div>
            )}
            {!tampilkanQr && !menunggu && (
              <p className="text-sm text-gray-400">⏳ Sedang menghubungkan…</p>
            )}
          </div>

          {tampilkanPairing && <div className="hidden h-32 w-px bg-amber-200 dark:bg-amber-800 md:block" />}

          {tampilkanPairing && (
            <div className="w-full max-w-xs space-y-3">
              <p className="text-center text-xs font-bold uppercase text-gray-500">Opsi 2: Nomor Telepon</p>
              <input
                type="text"
                placeholder="Contoh: 62812..."
                className="input w-full text-center font-mono"
                value={pairingPhone}
                onChange={e => setPairingPhone(e.target.value)}
                disabled={meminta || !!pairingCode}
              />
              {!pairingCode ? (
                <button onClick={mintaPairing} disabled={meminta || !pairingPhone} className="btn-primary w-full disabled:opacity-50">
                  {meminta ? "Meminta..." : "Dapatkan Kode"}
                </button>
              ) : (
                <div className="w-full space-y-2 text-center">
                  <div className="rounded-xl border-2 border-amber-400 bg-white p-3 shadow-inner dark:border-amber-500 dark:bg-slate-800">
                    <p className="text-2xl font-black tracking-[0.2em] text-gray-800 dark:text-white">{pairingCode}</p>
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Masukkan kode ini di notifikasi WhatsApp di HP {kedua ? "nomor cadangan" : "nomor utama"}.
                  </p>
                  <button onClick={() => setPairingCode("")} className="btn-outline mt-2 w-full text-xs">
                    Ulangi / Ganti Nomor
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
