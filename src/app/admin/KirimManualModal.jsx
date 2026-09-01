"use client";

import { useEffect, useState } from "react";

/*
 * "Kirim manual" — jalan keluar ketika bot mati.
 *
 * Bot bisa mati berhari-hari (nomor dibatasi WhatsApp, sesi menunggu QR), dan
 * selama itu iklan yang sudah dibayar tetap tayang tanpa pernah diumumkan ke
 * grup maupun dikabarkan ke penjualnya. Layar ini tidak mencoba memperbaiki
 * botnya; ia cuma menyerahkan bahan yang sudah jadi — teks yang sama persis
 * dengan yang akan dikirim bot — supaya admin bisa mengirimnya dari WhatsApp
 * miliknya sendiri.
 *
 * Teksnya datang dari server (mode "teks" di /api/admin/notify-listing), BUKAN
 * disusun ulang di sini: kalau layar ini merangkai kalimatnya sendiri, ia akan
 * pelan-pelan berbeda dari yang dikirim bot, dan bedanya baru ketahuan saat
 * tidak ada yang bisa membandingkan.
 *
 * Catatan soal grup: WhatsApp tidak punya tautan "kirim ke grup ini" — JID grup
 * bukan alamat yang bisa dibuka peramban. Jadi yang disediakan adalah dua hal
 * yang benar-benar bekerja: salin teks, dan pemilih chat bawaan WhatsApp
 * (wa.me/?text=) yang membuka daftar chat dengan teks sudah terisi.
 */

function Salin({ teks, label = "Salin teks" }) {
  const [tersalin, setTersalin] = useState(false);

  async function salin() {
    try {
      await navigator.clipboard.writeText(teks);
    } catch (_) {
      // Peramban lama / halaman tanpa izin clipboard: jatuh ke cara kuno,
      // karena tombol salin yang diam saja lebih buruk daripada yang jelek.
      const ta = document.createElement("textarea");
      ta.value = teks;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (_) {}
      document.body.removeChild(ta);
    }
    setTersalin(true);
    setTimeout(() => setTersalin(false), 1800);
  }

  return (
    <button type="button" onClick={salin} className="g-btn g-btn-sm g-btn-outlined">
      {tersalin ? "Tersalin " : label}
    </button>
  );
}

function Bagian({ judul, keterangan, teks, aksi }) {
  if (!teks) return null;
  return (
    <div className="mb-5">
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="g-card-title">{judul}</h3>
        {keterangan ? <span className="g-card-desc">{keterangan}</span> : null}
      </div>
      <pre className="g-pre">{teks}</pre>
      <div className="mt-2 flex flex-wrap gap-2">
        <Salin teks={teks} />
        {aksi}
      </div>
    </div>
  );
}

export default function KirimManualModal({ listing, onClose }) {
  const [data, setData] = useState(null);
  const [galat, setGalat] = useState(null);

  useEffect(() => {
    let batal = false;
    (async () => {
      try {
        const r = await fetch("/api/admin/notify-listing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: listing.id, mode: "teks" }),
        });
        const j = await r.json();
        if (batal) return;
        if (!r.ok) setGalat(j.error || `HTTP ${r.status}`);
        else setData(j);
      } catch (e) {
        if (!batal) setGalat(e.message);
      }
    })();
    return () => { batal = true; };
  }, [listing.id]);

  useEffect(() => {
    function esc(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  return (
    <div className="g-scrim" onClick={onClose}>
      <div className="g-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="g-dialog-head">
          <h2 className="g-dialog-title">Kirim manual lewat WhatsApp</h2>
          <p className="g-dialog-desc">
            Untuk <b>{listing.title}</b>. Tidak ada satu pun pesan yang dikirim dari layar ini —
            teks di bawah disiapkan untuk dikirim dari WhatsApp kamu sendiri.
          </p>
        </div>

        <div className="g-dialog-body">
          {galat ? <div className="g-notice is-bad">{galat}</div> : null}
          {!data && !galat ? <p className="g-card-desc">Menyiapkan teks…</p> : null}

          {data ? (
            <>
              {data.gambar ? (
                <div className="g-notice mb-5">
                  <div>
                    <b>Gambar iklan tidak ikut lewat tautan.</b>
                    <p className="mt-1">
                      Tautan WhatsApp cuma bisa membawa teks. Unduh gambarnya dulu lalu lampirkan
                      sendiri di chat:{" "}
                      <a href={data.gambar} target="_blank" rel="noreferrer" className="underline">
                        buka gambar
                      </a>
                      .
                    </p>
                  </div>
                </div>
              ) : null}

              <Bagian
                judul="1. Ke grup WA"
                keterangan={data.grup.jid.length ? `${data.grup.jid.length} grup tujuan` : "grup tujuan belum di-set"}
                teks={data.grup.teks}
                aksi={
                  <>
                    <a
                      href={data.grup.tautanPilihChat}
                      target="_blank"
                      rel="noreferrer"
                      className="g-btn g-btn-sm g-btn-wa"
                    >
                      Buka WhatsApp → pilih grup
                    </a>
                    {data.grup.tautanGrup ? (
                      <a
                        href={data.grup.tautanGrup}
                        target="_blank"
                        rel="noreferrer"
                        className="g-btn g-btn-sm g-btn-text"
                      >
                        Buka grup
                      </a>
                    ) : null}
                  </>
                }
              />

              <Bagian
                judul="2. Ke penjual"
                keterangan={data.penjual.wa ? `${data.penjual.nama || "Penjual"} · ${data.penjual.wa}` : "penjual tidak punya nomor WA"}
                teks={data.penjual.teks}
                aksi={
                  data.penjual.tautan ? (
                    <a href={data.penjual.tautan} target="_blank" rel="noreferrer" className="g-btn g-btn-sm g-btn-wa">
                      Chat penjual
                    </a>
                  ) : null
                }
              />

              <Bagian
                judul="3. Ke admin (opsional)"
                keterangan={data.admin.wa || "nomor admin belum di-set"}
                teks={data.admin.teks}
                aksi={
                  data.admin.tautan ? (
                    <a href={data.admin.tautan} target="_blank" rel="noreferrer" className="g-btn g-btn-sm g-btn-outlined">
                      Chat admin
                    </a>
                  ) : null
                }
              />
            </>
          ) : null}
        </div>

        <div className="g-dialog-foot">
          <button type="button" onClick={onClose} className="g-btn g-btn-text">Tutup</button>
        </div>
      </div>
    </div>
  );
}
