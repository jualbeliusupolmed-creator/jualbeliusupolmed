"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LABEL_STATUS, statusToko, namaToko } from "@/lib/toko";
import { useBasisAdmin, useModeDemo } from "@/components/admin/basis";

export default function ApproveTokoClient({ wa, profil, jumlahIklan, galat }) {
  const basis = useBasisAdmin();
  const demo = useModeDemo();
  const router = useRouter();
  const [sibuk, setSibuk] = useState("");
  const [catatan, setCatatan] = useState("");
  const [hasil, setHasil] = useState(null);
  const [pesan, setPesan] = useState(null);

  if (!profil) {
    return (
      <div className="g-card g-card-pad mx-auto max-w-lg text-center">
        <h1 className="g-page-title">Penjual tidak ditemukan</h1>
        <p className="g-page-desc mx-auto mt-2">
          Tidak ada profil dengan nomor <b>{wa || "(kosong)"}</b>.
          {galat ? <span className="mt-2 block font-mono text-xs opacity-70">{galat}</span> : null}
        </p>
        <Link href={`${basis}/toko`} className="g-btn g-btn-filled mt-5 inline-flex">Lihat semua toko</Link>
      </div>
    );
  }

  const status = hasil || statusToko(profil);
  const nama = namaToko(profil);
  const nadaStatus =
    status === "aktif" ? "is-ok" : status === "menunggu" ? "is-warn" : status === "ditolak" ? "is-bad" : "";

  async function kirim(aksi) {
    setSibuk(aksi);
    setPesan(null);
    try {
      if (demo) {
        setPesan({ buruk: true, teks: "Panel demo — persetujuan tidak dijalankan." });
        setSibuk("");
        return;
      }

      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: aksi, wa, catatan }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal memproses");
      setHasil(aksi === "toko_setujui" ? "aktif" : "ditolak");
      setPesan({
        buruk: false,
        teks: aksi === "toko_setujui"
          ? "Toko diaktifkan. Penjualnya sudah dikabari lewat WhatsApp."
          : "Pengajuan ditolak. Alasannya dikirim ke penjual lewat WhatsApp.",
      });
      router.refresh();
    } catch (e) {
      setPesan({ buruk: true, teks: e.message });
    } finally {
      setSibuk("");
    }
  }

  const Baris = ({ label, children }) => (
    <div className="flex flex-wrap items-baseline justify-between gap-3 border-b py-2.5 last:border-0" style={{ borderColor: "var(--g-divider)" }}>
      <span className="text-sm" style={{ color: "var(--g-ink-soft)" }}>{label}</span>
      <span className="min-w-0 text-right text-sm font-medium">{children}</span>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl">
      <div className="g-page-head">
        <div>
          <Link href={`${basis}/toko`} className="g-back">← Semua toko</Link>
          <h1 className="g-page-title">Aktivasi toko</h1>
          <p className="g-page-desc">
            Mengaktifkan toko bukan cuma menyalakan halamannya: sejak toko berarti iklan gratis,
            tombol di bawah juga memberi penjual ini pemasangan iklan tanpa biaya.
          </p>
        </div>
      </div>

      {pesan ? (
        <div className={`g-notice mb-4 ${pesan.buruk ? "is-bad" : "is-ok"}`}>{pesan.teks}</div>
      ) : null}

      <section className="g-card">
        <div className="g-card-head">
          <div className="min-w-0">
            <h2 className="g-card-title">{nama}</h2>
            <p className="g-card-desc">{profil.tagline || "Tanpa tagline"}</p>
          </div>
          <span className={`g-badge ${nadaStatus}`}>{LABEL_STATUS[status] || status}</span>
        </div>

        <div className="g-card-pad">
          <Baris label="Alamat toko">
            {profil.slug ? (
              <a href={`/toko/${profil.slug}`} target="_blank" rel="noreferrer" className="font-mono text-xs underline">
                /toko/{profil.slug} ↗
              </a>
            ) : (
              <span style={{ color: "var(--g-red)" }}>belum diatur</span>
            )}
          </Baris>
          <Baris label="Penjual">
            <a href={`${basis}/penjual/${String(wa).replace(/\D/g, "")}`} className="underline">{profil.name || "-"}</a>
          </Baris>
          <Baris label="WhatsApp"><span className="font-mono text-xs">{profil.wa}</span></Baris>
          <Baris label="Wilayah">{profil.store_area || "–"}</Baris>
          <Baris label="Jam buka">{profil.store_hours || "–"}</Baris>
          <Baris label="Jumlah iklan">{jumlahIklan}</Baris>
          <Baris label="Diajukan">
            {profil.store_requested_at
              ? new Date(profil.store_requested_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
              : "–"}
          </Baris>
          {profil.bio ? (
            <div className="mt-3">
              <p className="text-sm" style={{ color: "var(--g-ink-soft)" }}>Bio</p>
              <p className="mt-1 whitespace-pre-line text-sm">{profil.bio}</p>
            </div>
          ) : null}
        </div>
      </section>

      {status === "aktif" ? (
        <div className="g-notice is-ok mt-4">
          <div>
            <b>Toko ini sudah aktif.</b>
            <p className="mt-1">
              Halamannya bisa dibuka siapa saja dan semua iklan penjual ini tayang tanpa biaya.
              Untuk mencabutnya, pakai tombol di tab <Link href={`${basis}/toko`} className="underline">Toko</Link>.
            </p>
          </div>
        </div>
      ) : (
        <div className="g-card g-card-pad mt-4">
          <label className="g-stat-label" htmlFor="catatan">Alasan (dipakai kalau ditolak)</label>
          <textarea
            id="catatan"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="Mis. nama toko menyerempet merek lain, atau fotonya bukan milik sendiri."
            className="g-field mt-1.5"
          />
          <p className="mt-1 text-xs" style={{ color: "var(--g-ink-faint)" }}>
            Alasannya ikut dikirim ke penjual lewat WhatsApp. Ditolak tanpa alasan membuat orang
            mengajukan lagi hal yang sama persis.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => kirim("toko_setujui")}
              disabled={!!sibuk || !profil.slug}
              className="g-btn g-btn-filled"
            >
              {sibuk === "toko_setujui" ? "Mengaktifkan…" : "Aktifkan toko"}
            </button>
            <button
              onClick={() => kirim("toko_tolak")}
              disabled={!!sibuk}
              className="g-btn g-btn-danger"
            >
              {sibuk === "toko_tolak" ? "Menolak…" : "Tolak"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
