"use client";
import { Icon } from "@/components/Icons";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import OprecDaftarModal from "@/components/oprec/OprecDaftarModal";
import BuatOprecModal from "@/components/oprec/BuatOprecModal";
import { toast } from "sonner";

export default function OprecClient({ initialOprecs = [] }) {
  const [oprecs, setOprecs] = useState(initialOprecs);
  const [loading, setLoading] = useState(initialOprecs.length === 0);
  const [selectedCampus, setSelectedCampus] = useState("Semua");
  const [activeDaftarModal, setActiveDaftarModal] = useState(null);
  const [showBuatModal, setShowBuatModal] = useState(false);

  // Dibuka dari tombol "Buat" di dock bawah: /rute?tulis=1 langsung
  // membuka form, jadi pengguna tidak perlu mencari tombolnya di halaman.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tulis") === "1") {
      setShowBuatModal(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const loadOprecs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCampus !== "Semua") params.set("campus", selectedCampus);

      const res = await fetch(`/api/oprec?${params.toString()}`);
      const data = await res.json();
      setOprecs(data.oprecs || []);
    } catch (err) {
      console.error("Gagal memuat oprec:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCampus]);

  useEffect(() => {
    loadOprecs();
  }, [loadOprecs]);

  function getDaysLeft(deadline) {
    if (!deadline) return "Buka";
    const diff = new Date(deadline) - new Date();
    if (diff <= 0) return "Ditutup";
    const days = Math.ceil(diff / 864e5);
    return `Sisa ${days} hari lagi`;
  }

  function handleShare(oprec) {
    const text = ` *[OPEN RECRUITMENT]*\n\n *${oprec.ukm_name}* (${oprec.campus})\n*${oprec.title}*\n\n⏳ Batas Pendaftaran: ${new Date(oprec.deadline).toLocaleDateString("id-ID")}\n\n Daftar langsung di website:\n${window.location.origin}/oprec`;
    if (navigator.share) {
      navigator.share({ title: oprec.title, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Tautan & info Oprec berhasil disalin!");
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0b0b0f] pb-[calc(6.5rem+env(safe-area-inset-bottom))] font-sans selection:bg-primary/20">
      {/* HEADER SECTION */}
      <div className="bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.08] py-8 sm:py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Icon.ClipboardList className="h-4 w-4" /><span>Portal Oprec & Kepanitiaan Kampus</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                Pusat Open Recruitment Mahasiswa
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 max-w-2xl">
                Temukan peluang kepanitiaan acara kampus, staf BEM & Himpunan, serta pendaftaran anggota baru UKM di Universitas Sumatera Utara & Politeknik Negeri Medan.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowBuatModal(true)}
                className="btn-primary py-2.5 px-4 text-xs font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                <span>+ Buka Oprec Baru</span>
              </button>
              <Link
                href="/organisasi"
                className="btn-outline py-2.5 px-3.5 text-xs font-semibold"
              >
                <span>Direktori UKM</span>
              </Link>
            </div>
          </div>

          {/* CAMPUS SELECTOR */}
          <div className="mt-6 flex items-center gap-2">
            {["Semua", "USU", "POLMED"].map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCampus(c)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                  selectedCampus === c
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-50"
                }`}
              >
                {c === "Semua" ? "Semua Kampus" : `Kampus ${c}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* OPREC CARDS LIST */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 rounded-3xl bg-gray-200/70 dark:bg-slate-800/60" />
            ))}
          </div>
        ) : oprecs.length === 0 ? (
          <div className="card p-12 text-center max-w-md mx-auto space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-3xl text-primary">
              <Icon.ClipboardList className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Belum Ada Oprec Aktif
              </h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                Jadilah pengurus pertama yang membuka pendaftaran kepanitiaan di sini!
              </p>
            </div>
            <button onClick={() => setShowBuatModal(true)} className="btn-primary inline-flex text-xs py-2 px-4">
              <span>+ Buat Formulir Oprec</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {oprecs.map((op) => {
              const daysLeft = getDaysLeft(op.deadline);
              // Contoh etalase (lihat SAMPLE_OPREC di /api/oprec): tak ada
              // panitia di baliknya, jadi tombolnya tidak boleh mengundang.
              const contoh = op.is_demo === true;
              const isClosed = daysLeft === "Ditutup" || contoh;

              return (
                <div
                  key={op.id}
                  className="card p-5 sm:p-6 flex flex-col justify-between border border-black/[0.04] dark:border-white/[0.06] hover:shadow-xl transition-all space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header: Org info & Countdown badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            {contoh ? "" : " "}{op.ukm_name}
                          </span>
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary dark:text-emerald-400">
                            {op.campus}
                          </span>
                          {contoh && (
                            <span
                              title="Contoh tampilan — belum ada oprec yang dibuka"
                              className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500 dark:bg-slate-800 dark:text-slate-400 border border-gray-200 dark:border-slate-700"
                            >
                              Contoh
                            </span>
                          )}
                        </div>
                        <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mt-1.5 leading-snug">
                          {op.title}
                        </h2>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold shrink-0 ${
                          isClosed
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                        }`}
                      >
                        ⏳ {daysLeft}
                      </span>
                    </div>

                    {/* Description */}
                    {op.description && (
                      <p className="text-xs text-gray-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {op.description}
                      </p>
                    )}

                    {/* Divisions Pills */}
                    {op.divisions && op.divisions.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                          Divisi yang Dibuka:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {op.divisions.map((div, i) => (
                            <span
                              key={i}
                              className="rounded-lg bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700 dark:bg-slate-800 dark:text-slate-300"
                            >
                              {div}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Bottom Bar */}
                  <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => handleShare(op)}
                      className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5"
                      title="Bagikan Oprec ke WhatsApp"
                    >
                      <Icon.Share className="h-4 w-4" /><span>Bagikan</span>
                    </button>

                    <button
                      type="button"
                      disabled={isClosed}
                      onClick={() => setActiveDaftarModal(op)}
                      className={`btn-primary text-xs py-2 px-5 font-bold shadow-md flex items-center gap-1.5 ${
                        isClosed ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <span>
                        <Icon.PencilSquare className="h-4 w-4" /> {contoh ? "Segera Hadir" : isClosed ? "Pendaftaran Ditutup" : "Daftar Sekarang"}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DAFTAR OPREC */}
      {activeDaftarModal && (
        <OprecDaftarModal
          oprec={activeDaftarModal}
          onClose={() => setActiveDaftarModal(null)}
          onSubmitted={loadOprecs}
        />
      )}

      {/* MODAL BUAT OPREC */}
      {showBuatModal && (
        <BuatOprecModal
          onClose={() => setShowBuatModal(false)}
          onCreated={loadOprecs}
        />
      )}
    </div>
  );
}
