"use client";
import { useApi } from "./api";
import { Alert, Kartu } from "./ui";

// Angka-angka ini sudah lama dikumpulkan bot dan ditampilkan di dashboard-nya,
// tapi tidak pernah sampai ke panel situs. Sumbernya satu: GET /stats.
const LABEL = {
  masuk: "Pesan masuk", keluar: "Pesan keluar", sapaan: "Sapaan terkirim",
  panggil_min: 'Panggil "min"', didiamkan: "Didiamkan (chat admin)",
  sesi_bot: "Sesi bot dibuka", perintah_polos: "Perintah tanpa titik",
  balas_manual: "Balasan manual admin", broadcast: "Broadcast terkirim",
  webhook_ok: "Webhook sukses", webhook_gagal: "Webhook gagal",
  kirim_gagal: "Gagal kirim (dibuang)", putus_koneksi: "Putus koneksi",
};

function Tabel({ data, keys }) {
  const rows = keys.filter(k => data[k] !== undefined);
  if (!rows.length) return <p className="text-xs text-gray-400">Belum ada data.</p>;
  return (
    <div>
      {rows.map(k => (
        <div key={k} className="flex justify-between border-b border-gray-100 py-1.5 text-sm last:border-0 dark:border-slate-800">
          <span className="text-gray-500 dark:text-slate-400">{LABEL[k] || k}</span>
          <span className="font-semibold dark:text-white">{data[k]}</span>
        </div>
      ))}
    </div>
  );
}

export function TabStatistik() {
  const { data, loading, error, refetch } = useApi("stats");
  const total = data?.total || {};

  // Hari kosong tetap digambar supaya jeda tanpa aktivitas terlihat, bukan hilang.
  // Zona waktunya digeser +7 jam agar "hari" di grafik sama dengan hari yang dipakai
  // bot saat mencatat — kalau tidak, batang hari ini bisa jatuh ke kolom kemarin.
  const hari = [];
  for (let i = 13; i >= 0; i--) {
    hari.push(new Date(Date.now() + 7 * 3600 * 1000 - i * 86400000).toISOString().slice(0, 10));
  }
  const nilai = hari.map(h => data?.daily?.[h]?.masuk || 0);
  const maks = Math.max(1, ...nilai);
  const polosKeys = Object.keys(total).filter(k => k.startsWith("polos_")).sort((a, b) => total[b] - total[a]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold dark:text-white">Statistik Bot</h2>
        <button onClick={refetch} className="btn-outline text-xs">🔄 Refresh</button>
      </div>

      {loading && !data && <p className="text-sm text-gray-400">Memuat...</p>}
      {error && <Alert ok={false} msg={`⚠️ ${error}`} />}

      {data && (
        <>
          <Kartu judul="📊 Pesan masuk 14 hari terakhir">
            <div className="flex h-40 items-end gap-1 overflow-x-auto">
              {hari.map((h, i) => (
                <div key={h} title={`${h}: ${nilai[i]} pesan masuk`} className="flex min-w-[24px] flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-[10px] text-gray-400">{nilai[i] || ""}</span>
                  <div className="w-full rounded-t bg-emerald-400 dark:bg-emerald-500"
                       style={{ height: `${Math.round((nilai[i] / maks) * 100)}%`, minHeight: nilai[i] ? "3px" : "1px" }} />
                  <span className="text-[10px] text-gray-400">{h.slice(8)}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-gray-400">
              Arsip: {data.archive?.messages || 0} pesan (batas {data.archive?.cap || 0}). Data sejak {data.since || "–"}.
            </p>
          </Kartu>

          <div className="grid gap-4 sm:grid-cols-2">
            <Kartu judul="🚪 Gerbang titik">
              <Tabel data={total} keys={["masuk", "keluar", "sapaan", "panggil_min", "sesi_bot", "didiamkan", "balas_manual", "broadcast"]} />
            </Kartu>

            <Kartu judul="⚠️ Perintah tanpa titik">
              <p className="mb-3 text-xs text-gray-400">
                Pesan polos yang isinya kata perintah — ini yang saat ini tidak membuka alur bot.
              </p>
              {polosKeys.length ? (
                <div>
                  {polosKeys.map(k => (
                    <div key={k} className="flex justify-between border-b border-gray-100 py-1.5 text-sm dark:border-slate-800">
                      <span className="text-gray-500 dark:text-slate-400">&quot;{k.replace("polos_", "")}&quot; tanpa titik</span>
                      <span className="font-semibold dark:text-white">{total[k]}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1.5 text-sm">
                    <span className="font-bold dark:text-white">Total</span>
                    <span className="font-bold dark:text-white">{total.perintah_polos || 0}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400">Belum ada. Angka mulai terkumpul sejak fitur ini dipasang.</p>
              )}
            </Kartu>

            <Kartu judul="🔌 Webhook & pengiriman" className="sm:col-span-2">
              <Tabel data={total} keys={["webhook_ok", "webhook_gagal", "kirim_gagal", "putus_koneksi"]} />
            </Kartu>
          </div>
        </>
      )}
    </div>
  );
}
