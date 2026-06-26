"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function BergabungDistributorPage({ params }) {
  const { token } = params;
  const [state, setState] = useState("loading"); // loading | ready | confirming | done | error
  const [info, setInfo] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch(`/api/distributor/invite/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setErrorMsg(d.error); setState("error"); }
        else { setInfo(d); setState("ready"); }
      })
      .catch(() => { setErrorMsg("Gagal memuat info undangan."); setState("error"); });
  }, [token]);

  async function handleConfirm() {
    setState("confirming");
    const res = await fetch(`/api/distributor/invite/${token}`, { method: "POST" });
    const d = await res.json();
    if (d.ok) setState("done");
    else { setErrorMsg(d.error || "Terjadi kesalahan"); setState("error"); }
  }

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <div className="text-5xl mb-4">❌</div>
        <h1 className="text-xl font-bold text-red-600 mb-2">Undangan Tidak Valid</h1>
        <p className="text-gray-500 mb-6">{errorMsg}</p>
        <Link href="/" className="btn-primary">Kembali ke Beranda</Link>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <div className="text-6xl mb-4">🎊</div>
        <h1 className="text-2xl font-extrabold text-emerald-600 mb-3">Selamat Bergabung!</h1>
        <p className="text-gray-600 dark:text-slate-300 mb-2">
          Badge <span className="font-bold text-orange-600">DISTRIBUTOR</span> sudah aktif di profil Anda.
        </p>
        <p className="text-sm text-gray-400 mb-6">Konfirmasi juga sudah dikirim via WhatsApp.</p>
        <Link href="/pasang-iklan" className="btn-primary">Mulai Pasang Iklan Gratis</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 text-white text-3xl shadow-lg mb-4">
          🏪
        </div>
        <h1 className="text-2xl font-extrabold">Bergabung Sebagai Distributor</h1>
        {info?.name && (
          <p className="text-gray-500 mt-1">Halo, <span className="font-semibold text-gray-700 dark:text-slate-200">{info.name}</span>!</p>
        )}
      </div>

      {/* Panduan */}
      <div className="card p-6 mb-6 space-y-4">
        <h2 className="font-bold text-lg">Apa itu Distributor?</h2>
        <p className="text-sm text-gray-600 dark:text-slate-300">
          Distributor adalah mitra resmi marketplace yang mendapat akses khusus untuk berjualan dengan mudah dan efisien.
        </p>

        <div className="space-y-3">
          <div className="flex gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 font-bold text-sm">✓</span>
            <div>
              <p className="font-semibold text-sm">Posting Iklan GRATIS</p>
              <p className="text-xs text-gray-400">Tidak perlu bayar biaya iklan, apapun mode yang diatur admin.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center text-orange-600 font-bold text-sm">₿</span>
            <div>
              <p className="font-semibold text-sm">Fee Bagi Hasil Transparan</p>
              <p className="text-xs text-gray-400">Setiap iklan otomatis menampilkan info fee bagi hasil sesuai kategori dan harga barang.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 font-bold text-sm">🏷</span>
            <div>
              <p className="font-semibold text-sm">Badge Distributor Eksklusif</p>
              <p className="text-xs text-gray-400">Profil Anda akan menampilkan badge khusus yang menandai status distributor resmi.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 font-bold text-sm">📢</span>
            <div>
              <p className="font-semibold text-sm">Digest Harian Otomatis</p>
              <p className="text-xs text-gray-400">Semua iklan distributor dikumpulkan & disebarkan ke grup setiap hari pukul 13.00.</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 p-4 text-sm">
          <p className="font-semibold text-orange-700 dark:text-orange-400 mb-1">Struktur Fee Bagi Hasil</p>
          <ul className="space-y-1 text-xs text-orange-600 dark:text-orange-400">
            <li>• Laptop Entry/Bekas (Rp 2–5 Juta): Flat <strong>Rp 125.000</strong>/unit</li>
            <li>• Laptop Mid-Tier (Rp 6–10 Juta): <strong>6,5%</strong> dari harga</li>
            <li>• Laptop Premium/Gaming (&gt;Rp 12 Juta): <strong>5%</strong> dari harga</li>
          </ul>
          <p className="mt-2 text-[11px] text-gray-400">Fee dapat disesuaikan oleh admin sesuai kesepakatan.</p>
        </div>
      </div>

      {/* Tombol Konfirmasi */}
      <button
        onClick={handleConfirm}
        disabled={state === "confirming"}
        className="btn-primary w-full py-3 text-base font-bold disabled:opacity-60"
      >
        {state === "confirming" ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            Memproses...
          </span>
        ) : (
          "✅ Konfirmasi Bergabung Sebagai Distributor"
        )}
      </button>
      <p className="text-center text-xs text-gray-400 mt-3">
        Dengan mengklik konfirmasi, Anda menyetujui ketentuan bermitra sebagai Distributor.
      </p>
    </div>
  );
}
