"use client";

import { useCallback, useEffect, useState } from "react";

/*
 * Antrean yang tersimpan DI DALAM bot (outbox.json), bukan di wa_outbox.
 *
 * Kenapa ada dua daftar di satu halaman: keduanya berisi pesan yang belum
 * sampai, tapi berhenti di tempat yang berbeda.
 *
 *   wa_outbox (bawahnya) → situs GAGAL menitipkan pesannya ke bot: VPS mati,
 *   nginx tumbang. Situs tahu, karena permintaannya sendiri yang ditolak.
 *
 *   outbox.json (di sini) → bot HIDUP tapi WhatsApp-nya putus. Bot menerima
 *   pesannya, menyimpannya, dan menjawab "ok" dengan jujur. Situs tidak punya
 *   alasan untuk menampung apa pun, jadi wa_outbox tetap KOSONG.
 *
 * Sebelum ini panel cuma memperlihatkan yang pertama — dan yang kedua justru
 * keadaan yang lebih sering terjadi. 21 Agustus 2026 enam notifikasi iklan
 * "Cimory" duduk di sini sementara panel memajang "semua sudah sampai".
 */

const proxy = (endpoint) => `/api/admin/baileys?endpoint=${encodeURIComponent(endpoint)}&_t=${Date.now()}`;

export function AntreanBot() {
  const [data, setData] = useState(null);
  const [galat, setGalat] = useState(null);
  const [muat, setMuat] = useState(true);
  const [sibuk, setSibuk] = useState(null);

  const ambil = useCallback(async () => {
    setMuat(true);
    try {
      const r = await fetch(proxy("antrean/lokal"), { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 404) {
          setGalat("Fitur antrean lokal belum aktif di bot WhatsApp (perlu sinkronisasi & restart bot di VPS).");
        } else if (r.status === 503 || r.status === 502) {
          setGalat(j.error || "Bot WhatsApp sedang tidak terhubung / server VPS offline.");
        } else {
          setGalat(j.error || `Koneksi bot merespons HTTP ${r.status}`);
        }
        setData(null);
      } else {
        setGalat(null);
        setData(j);
      }
    } catch (e) {
      setGalat(`Tidak dapat menghubungi Bot WhatsApp: ${e.message}`);
    } finally {
      setMuat(false);
    }
  }, []);

  useEffect(() => { ambil(); }, [ambil]);

  async function aksi(badan, tanda) {
    setSibuk(tanda);
    try {
      const r = await fetch(proxy("antrean/lokal"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(badan),
      });
      const j = await r.json();
      if (!r.ok) setGalat(j.error || `HTTP ${r.status}`);
      await ambil();
    } catch (e) {
      setGalat(e.message);
    } finally {
      setSibuk(null);
    }
  }

  const sisaUmur = (kedaluwarsa) => {
    if (!kedaluwarsa) return "";
    const ms = kedaluwarsa - Date.now();
    if (ms <= 0) return "kedaluwarsa";
    const jam = Math.floor(ms / 3600000);
    if (jam >= 24) return `sisa ${Math.floor(jam / 24)} hari`;
    if (jam >= 1) return `sisa ${jam} jam`;
    return `sisa ${Math.max(1, Math.round(ms / 60000))} menit`;
  };

  const jumlah = data?.tertunda || 0;
  const dibuang = data?.dibuang || [];

  return (
    <section className="g-card">
      <div className="g-card-head">
        <div className="min-w-0">
          <h2 className="g-card-title">Antrean di dalam bot</h2>
          <p className="g-card-desc">
            Pesan yang sudah diterima bot tapi belum bisa dikirim karena WhatsApp-nya putus.
            Berangkat <b>otomatis</b> begitu tersambung — tidak perlu ditekan.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span className={`g-badge${jumlah ? " is-warn" : " is-ok"}`}>{jumlah} menunggu</span>
          <button onClick={ambil} disabled={muat} className="g-btn g-btn-sm g-btn-text">
            {muat ? "Memuat…" : "Muat ulang"}
          </button>
        </div>
      </div>

      <div className="g-card-pad">
        {galat ? <div className="g-notice is-bad mb-4">{galat}</div> : null}

        {data && !data.siap ? (
          <div className="g-notice is-warn mb-4">
            <div>
              <b>{data.sebab || "WhatsApp belum tersambung."}</b>
              <p className="mt-1">Pesan di bawah tetap tersimpan di server bot dan berangkat sendiri begitu tersambung.</p>
            </div>
          </div>
        ) : null}

        {data && data.siap && jumlah > 0 ? (
          <div className="g-notice mb-4">WhatsApp tersambung — antrean sedang berjalan sendiri.</div>
        ) : null}

        {data && jumlah === 0 && !galat ? (
          <p className="text-sm" style={{ color: "var(--g-ink-soft)" }}>
            Tidak ada pesan yang menunggu di bot.
          </p>
        ) : null}

        <div className="space-y-3">
          {(data?.items || []).map((it) => (
            <div key={it.id} className="g-card g-card-pad">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-medium">{it.jid}</span>
                <span className={`g-badge${it.grup ? " is-info" : ""}`}>{it.grup ? "grup" : "pribadi"}</span>
                {it.url ? <span className="g-badge">bergambar</span> : null}
                {it.percobaan ? <span className="g-badge is-warn">{it.percobaan}× dicoba</span> : null}
                <span className="ml-auto text-xs" style={{ color: "var(--g-ink-faint)" }}>
                  {it.ts ? new Date(it.ts).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                  {" · "}
                  {sisaUmur(it.kedaluwarsa)}
                </span>
              </div>
              <pre className="g-pre">{it.message}</pre>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                {(() => {
                  const cleanPhone = String(it.jid || "").replace(/@s\.whatsapp\.net|@g\.us/g, "").replace(/\D/g, "");
                  const waPhone = cleanPhone.startsWith("0") ? "62" + cleanPhone.slice(1) : cleanPhone;
                  if (!waPhone || waPhone.length < 5 || it.grup) return <span />;
                  const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(it.message || "")}`;
                  return (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="g-btn g-btn-sm"
                      style={{ background: "#16a34a", color: "#fff" }}
                      title="Buka WhatsApp untuk kirim manual"
                    >
                      Chat WA Manual ↗
                    </a>
                  );
                })()}

                <button
                  onClick={() => aksi({ hapus: it.id }, it.id)}
                  disabled={sibuk !== null}
                  className="g-btn g-btn-sm g-btn-danger"
                >
                  {sibuk === it.id ? "Menghapus…" : "Hapus"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/*
          Bukan antrean: pesan yang sudah TIDAK akan berangkat sendiri karena
          kedaluwarsa (72 jam) atau gagal tiga kali berturut-turut. Dulu
          pembuangan itu cuma mendarat di log server, jadi pesan yang benar-benar
          hilang tidak meninggalkan jejak yang bisa dilihat siapa pun.
        */}
        {dibuang.length > 0 && (
          <div className="mt-6 border-t pt-5" style={{ borderColor: "var(--g-divider)" }}>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="g-card-title">Dibuang bot ({data?.dibuangTotal || dibuang.length})</h3>
              <button
                onClick={() => aksi({ bersihkan_catatan: true }, "bersih")}
                disabled={sibuk !== null}
                className="g-btn g-btn-sm g-btn-text"
              >
                Bersihkan catatan
              </button>
            </div>
            <p className="g-card-desc mb-3">
              Kedaluwarsa setelah menunggu 72 jam, atau gagal tiga kali berturut-turut.
              Catatan disimpan 14 hari. <b>Kirim ulang</b> memasukkannya kembali sebagai pesan baru —
              periksa dulu apakah isinya masih pantas dikirim.
            </p>
            <div className="space-y-3">
              {dibuang.map((d) => (
                <div key={d.id} className="g-card g-card-pad">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-medium">{d.jid}</span>
                    <span className="g-badge is-bad">dibuang</span>
                    <span className="ml-auto text-xs" style={{ color: "var(--g-ink-faint)" }}>
                      {d.dibuangAt ? new Date(d.dibuangAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                    </span>
                  </div>
                  <pre className="g-pre">{d.message}</pre>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="flex-1 text-xs" style={{ color: "var(--g-red)" }}>{d.sebab}</span>
                    <button
                      onClick={() => aksi({ ulang: d.id }, d.id)}
                      disabled={sibuk !== null}
                      className="g-btn g-btn-sm g-btn-outlined"
                    >
                      {sibuk === d.id ? "Memproses…" : "Kirim ulang"}
                    </button>
                    <button
                      onClick={() => aksi({ hapus_catatan: d.id }, d.id)}
                      disabled={sibuk !== null}
                      className="g-btn g-btn-sm g-btn-text"
                    >
                      Lupakan
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
