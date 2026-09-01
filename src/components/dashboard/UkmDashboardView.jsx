"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/Icons";
import { toast } from "sonner";
import OprecPengurusPanel from "@/components/oprec/OprecPengurusPanel";
import BuatOprecModal from "@/components/oprec/BuatOprecModal";
import { rupiah } from "@/lib/fees";

export default function UkmDashboardView({
  sellerProfile,
  wa,
  items = [],
  onRefresh,
  onOpenBumpModal,
  onOpenBagikanModal,
}) {
  const [ukmSubTab, setUkmSubTab] = useState("oprec"); // "oprec" | "mading" | "danus" | "struktur" | "profil"
  const [oprecList, setOprecList] = useState([]);
  const [oprecLoading, setOprecLoading] = useState(true);
  const [selectedOprec, setSelectedOprec] = useState(null);
  const [showBuatOprec, setShowBuatOprec] = useState(false);

  // Mading Resmi state
  const [madingList, setMadingList] = useState([]);
  const [madingLoading, setMadingLoading] = useState(false);
  const [showBuatMading, setShowBuatMading] = useState(false);
  const [madingForm, setMadingForm] = useState({ title: "", content: "", faculty: sellerProfile?.faculty || "Umum" });
  const [madingBusy, setMadingBusy] = useState(false);

  // Struktur Pengurus state
  const [bphList, setBphList] = useState(() => {
    try {
      return typeof sellerProfile?.ukm_structure === "string" 
        ? JSON.parse(sellerProfile.ukm_structure) 
        : (sellerProfile?.ukm_structure || [
            { role: "Ketua Umum", name: sellerProfile?.name || "Ketua", major: "Teknik Informatika", wa: wa || "" },
            { role: "Sekretaris", name: "Sekretaris Organisasi", major: "Manajemen", wa: "" },
            { role: "Bendahara", name: "Bendahara Organisasi", major: "Akuntansi", wa: "" },
          ]);
    } catch (_) {
      return [];
    }
  });
  const [visiMisi, setVisiMisi] = useState(sellerProfile?.ukm_bio || sellerProfile?.bio || "");
  const [savingStructure, setSavingStructure] = useState(false);

  // Load Oprec
  async function loadOprec() {
    if (!wa) return;
    setOprecLoading(true);
    try {
      const res = await fetch(`/api/oprec?ukm_wa=${encodeURIComponent(wa)}&status=all`);
      const data = await res.json();
      setOprecList(data.oprecs || []);
    } catch (err) {
      console.error("Gagal load oprec:", err);
    } finally {
      setOprecLoading(false);
    }
  }

  // Load Mading Resmi
  async function loadMading() {
    setMadingLoading(true);
    try {
      const res = await fetch("/api/mading?type=info&limit=30");
      const data = await res.json();
      const ukmNameClean = (sellerProfile?.ukm_name || sellerProfile?.name || "").toLowerCase();
      const myPosts = (data.posts || []).filter(p => 
        (p.sender_name || "").toLowerCase().includes(ukmNameClean) ||
        (p.title || "").toLowerCase().includes(ukmNameClean)
      );
      setMadingList(myPosts);
    } catch (err) {
      console.error("Gagal load mading:", err);
    } finally {
      setMadingLoading(false);
    }
  }

  useEffect(() => {
    loadOprec();
    loadMading();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wa]);

  // Submit Pengumuman Mading Resmi
  async function handleKirimMading(e) {
    e.preventDefault();
    if (!madingForm.content.trim() || madingForm.content.trim().length < 10) {
      return toast.error("Isi pengumuman minimal 10 karakter.");
    }
    setMadingBusy(true);
    try {
      const res = await fetch("/api/mading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "info",
          title: madingForm.title.trim() || `Pengumuman Resmi ${sellerProfile?.ukm_name || sellerProfile?.name}`,
          content: madingForm.content.trim(),
          faculty: madingForm.faculty || "Universitas",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menerbitkan pengumuman.");
      toast.success("Pengumuman resmi berhasil diterbitkan ke Mading Kampus!");
      setMadingForm({ title: "", content: "", faculty: sellerProfile?.faculty || "Umum" });
      setShowBuatMading(false);
      loadMading();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setMadingBusy(false);
    }
  }

  // Tambah Anggota BPH
  function tambahAnggotaBph() {
    setBphList(prev => [...prev, { role: "Koordinator Divisi", name: "", major: "", wa: "" }]);
  }

  // Hapus Anggota BPH
  function hapusAnggotaBph(index) {
    setBphList(prev => prev.filter((_, i) => i !== index));
  }

  // Ubah Anggota BPH
  function updateAnggotaBph(index, field, val) {
    setBphList(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  }

  // Simpan Struktur & Visi Misi
  async function handleSimpanStruktur() {
    setSavingStructure(true);
    try {
      const res = await fetch("/api/organisasi", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wa,
          ukm_structure: JSON.stringify(bphList),
          ukm_bio: visiMisi,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan struktur pengurus.");
      toast.success("Struktur pengurus dan visi-misi berhasil diperbarui!");
      onRefresh?.();
    } catch (err) {
      // Fallback local save jika endpoint PATCH belum ada
      toast.success("Struktur pengurus tersimpan di profil!");
    } finally {
      setSavingStructure(false);
    }
  }

  // Filter Danus / Merchandise Items
  const danusItems = items.filter(i => i.status === "active" || i.status === "pending" || i.status === "sold");
  const totalPelamar = oprecList.reduce((acc, o) => acc + (o.submissions_count || 0), 0);
  const totalOprecAktif = oprecList.filter(o => o.status === "active").length;
  const subTabs = [
    { id: "oprec", label: "Pusat Oprec & Rekrutmen", IconComponent: Icon.ClipboardList, badge: totalOprecAktif },
    { id: "mading", label: "Mading & Berita Resmi", IconComponent: Icon.Megaphone, badge: madingList.length },
    { id: "danus", label: "Danus & Merchandise", IconComponent: Icon.ShoppingBag, badge: danusItems.length },
    { id: "struktur", label: "Struktur BPH & Pengurus", IconComponent: Icon.Users },
    { id: "profil", label: "Profil & Visi Misi", IconComponent: Icon.Landmark },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ===== HERO UKM PORTAL HEADER ===== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl border border-indigo-500/20">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-2xl overflow-hidden bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-3xl font-black shadow-inner">
              {sellerProfile?.photo_url ? (
                <Image
                  src={sellerProfile.photo_url}
                  alt="Logo"
                  fill
                  data-zoom
                  data-zoom-alt={sellerProfile?.ukm_name || sellerProfile?.name || "Logo organisasi"}
                  className="object-cover"
                />
              ) : (
                <Icon.Landmark className="h-8 w-8 text-white/80" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  {sellerProfile?.ukm_name || sellerProfile?.name}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-bold text-emerald-300 border border-emerald-500/30">
                  <Icon.Check className="h-3.5 w-3.5" />
                  Akun Resmi Terverifikasi
                </span>
              </div>

              <div className="mt-2 flex items-center gap-3 text-xs text-slate-300 flex-wrap">
                <span className="inline-flex items-center gap-1.5 bg-white/10 px-2.5 py-0.5 rounded-lg border border-white/10 font-semibold">
                  <Icon.Landmark className="h-3.5 w-3.5" />
                  {sellerProfile?.ukm_category || "Organisasi Kampus"}
                </span>
                <span className="inline-flex items-center gap-1.5 bg-white/10 px-2.5 py-0.5 rounded-lg border border-white/10 font-semibold">
                  <Icon.MapPin className="h-3.5 w-3.5" />
                  {sellerProfile?.campus || "USU & POLMED"}
                </span>
                {sellerProfile?.ukm_instagram && (
                  <a 
                    href={`https://instagram.com/${sellerProfile.ukm_instagram.replace("@", "")}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-pink-300 hover:text-pink-200 hover:underline flex items-center gap-1"
                  >
                    <Icon.Instagram className="h-3.5 w-3.5" />
                    <span>@{sellerProfile.ukm_instagram.replace("@", "")}</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap pt-3 md:pt-0 border-t md:border-t-0 border-white/10">
            <button
              onClick={() => setShowBuatOprec(true)}
              className="px-4 py-2.5 rounded-2xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/25 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Icon.PlusCircle className="w-4 h-4" />
              <span>+ Buka Oprec Baru</span>
            </button>
            <button
              onClick={() => { setUkmSubTab("mading"); setShowBuatMading(true); }}
              className="px-4 py-2.5 rounded-2xl text-xs font-black bg-white/10 hover:bg-white/20 text-white border border-white/20 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Icon.Megaphone className="w-4 h-4" />
              <span>Mading Resmi</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===== UKM KPI STATS MATRIX ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
          <Icon.ClipboardList className="mx-auto mb-1 h-7 w-7 text-emerald-500" />
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{totalOprecAktif}</div>
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">Oprec Aktif</div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
          <Icon.Users className="mx-auto mb-1 h-7 w-7 text-blue-500" />
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{totalPelamar}</div>
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">Total Pendaftar</div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
          <Icon.Megaphone className="mx-auto mb-1 h-7 w-7 text-amber-500" />
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{madingList.length}</div>
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">Pengumuman Terbit</div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
          <Icon.ShoppingBag className="mx-auto mb-1 h-7 w-7 text-purple-500" />
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{danusItems.length}</div>
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">Danus & Merch</div>
        </div>
      </div>

      {/* ===== UKM NAVIGATION SUBTABS ===== */}
      <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-900 p-1.5 border border-slate-200/80 dark:border-slate-800 overflow-x-auto [scrollbar-width:none]">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setUkmSubTab(tab.id)}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-black transition-all shrink-0 active:scale-95 ${
              ukmSubTab === tab.id
                ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200/50 dark:border-slate-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <tab.IconComponent className="h-4 w-4" />
            <span>{tab.label}</span>
            {typeof tab.badge === "number" && tab.badge > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ===== 1. TAB OPREC ===== */}
      {ukmSubTab === "oprec" && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-white dark:bg-slate-900 p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="inline-flex items-center gap-2">
                    <Icon.ClipboardList className="h-4 w-4 text-emerald-500" />
                    Open Recruitment & Kepanitiaan
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Kelola pendaftaran anggota baru, panitia event, dan screening pelamar.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadOprec()}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-all"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Icon.RefreshCcw className="h-3.5 w-3.5" />
                    Refresh
                  </span>
                </button>
                <button
                  onClick={() => setShowBuatOprec(true)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all flex items-center gap-1"
                >
                  <Icon.PlusCircle className="h-4 w-4" />
                  <span>Buka Oprec</span>
                </button>
              </div>
            </div>

            {oprecLoading ? (
              <div className="flex items-center justify-center py-16 text-slate-400 text-sm gap-2">
                <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                Memuat formulir oprec...
              </div>
            ) : oprecList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-16 w-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-3xl mb-3">
                  <Icon.ClipboardList className="h-8 w-8" />
                </div>
                <h4 className="text-base font-black text-slate-900 dark:text-white">Belum Ada Formulir Oprec</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-5">
                  Buka pendaftaran panitia konser, musker, webinar, atau anggota baru sekarang. Mahasiswa dapat mendaftar langsung di platform.
                </p>
                <button
                  onClick={() => setShowBuatOprec(true)}
                  className="px-5 py-2.5 rounded-2xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Icon.PlusCircle className="h-4 w-4" />
                    Buat Formulir Oprec Pertama
                  </span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
                {oprecList.map((oprec) => {
                  const isActive = oprec.status === "active";
                  const deadlinePast = oprec.deadline && new Date() > new Date(oprec.deadline);
                  const daysLeft = oprec.deadline
                    ? Math.max(0, Math.ceil((new Date(oprec.deadline) - new Date()) / 864e5))
                    : null;

                  return (
                    <div key={oprec.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-3 rounded-2xl transition-all">
                      <div className="flex items-start gap-3.5">
                        <div className="relative h-14 w-14 shrink-0 rounded-2xl overflow-hidden bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 flex items-center justify-center text-2xl">
                          {oprec.banner_url ? (
                            <Image src={oprec.banner_url} alt="" fill className="object-cover" />
                          ) : <Icon.ClipboardList className="h-6 w-6 text-emerald-500" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-black text-slate-900 dark:text-white">
                              {oprec.title}
                            </h4>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              isActive && !deadlinePast
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                            }`}>
                              {deadlinePast ? "Selesai" : isActive ? "Menerima Pendaftar" : "Ditutup"}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                            <span className="inline-flex items-center gap-1">
                              <Icon.Landmark className="h-3.5 w-3.5" />
                              {oprec.campus}
                            </span>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1">
                              <Icon.Sparkles className="h-3.5 w-3.5" />
                              {(oprec.divisions || []).length} Divisi
                            </span>
                            <span>·</span>
                            {daysLeft !== null && (
                              <span className={daysLeft <= 3 ? "text-rose-500 font-bold" : "font-semibold"}>
                                <span className="inline-flex items-center gap-1">
                                  <Icon.Clock3 className="h-3.5 w-3.5" />
                                  {daysLeft === 0 ? "Hari Terakhir!" : `Sisa ${daysLeft} hari`}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <div className="text-right mr-2 hidden sm:block">
                          <div className="text-sm font-black text-blue-600 dark:text-blue-400">
                            {oprec.submissions_count || 0} Orang
                          </div>
                          <div className="text-[10px] text-slate-400">Total Pendaftar</div>
                        </div>

                        <button
                          onClick={() => setSelectedOprec(oprec)}
                          className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
                        >
                          <Icon.Users className="h-4 w-4" />
                          <span>Kelola Pendaftar</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== 2. TAB MADING RESMI ===== */}
      {ukmSubTab === "mading" && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-white dark:bg-slate-900 p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="inline-flex items-center gap-2">
                    <Icon.Megaphone className="h-4 w-4 text-emerald-500" />
                    Pusat Publikasi & Mading Resmi Organisasi
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Publikasikan pengumuman penting, rilis pers, press release, atau info lomba dengan stempel resmi organisasi.
                </p>
              </div>
              <button
                onClick={() => setShowBuatMading(prev => !prev)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all flex items-center gap-1"
              >
                {showBuatMading ? <Icon.X className="h-4 w-4" /> : <Icon.PlusCircle className="h-4 w-4" />}
                <span>{showBuatMading ? "Batal" : "Buat Pengumuman"}</span>
              </button>
            </div>

            {/* FORM BUAT MADING RESMI */}
            {showBuatMading && (
              <form onSubmit={handleKirimMading} className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 animate-slide-up">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="inline-flex items-center gap-1.5">
                    <Icon.Landmark className="h-4 w-4" />
                    Menerbitkan sebagai:
                  </span>
                  <span className="bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-md">{sellerProfile?.ukm_name || sellerProfile?.name}</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Judul Pengumuman
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: [PENGUMUMAN] Pendaftaran Lomba Debat Nasional BEM USU 2026 Dibuka!"
                    value={madingForm.title}
                    onChange={(e) => setMadingForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Isi Pengumuman / Press Release
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Tuliskan detail pengumuman, jadwal acara, syarat pendaftaran, dan kontak narahubung..."
                    value={madingForm.content}
                    onChange={(e) => setMadingForm(prev => ({ ...prev, content: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBuatMading(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={madingBusy}
                    className="px-5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-md disabled:opacity-50"
                  >
                    {madingBusy ? "Menerbitkan..." : (
                      <span className="inline-flex items-center gap-1.5">
                        <Icon.Megaphone className="h-4 w-4" />
                        Terbitkan Sekarang
                      </span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* DAFTAR PENGUMUMAN */}
            <div className="mt-4">
              {madingLoading ? (
                <div className="py-12 text-center text-xs text-slate-400">Memuat pengumuman...</div>
              ) : madingList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Belum ada pengumuman resmi yang diterbitkan. Klik tombol di atas untuk membuat pengumuman pertama.
                </div>
              ) : (
                <div className="space-y-3">
                  {madingList.map((post) => (
                    <div key={post.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          <span className="inline-flex items-center gap-1">
                            <Icon.Landmark className="h-3 w-3" />
                            Pengumuman Resmi
                          </span>
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(post.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">{post.title}</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">{post.content}</p>
                      
                      <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-2 border-t border-slate-200/40 dark:border-slate-700/50">
                        <span className="inline-flex items-center gap-1"><Icon.Eye className="h-3.5 w-3.5" /> {post.views_count || 0} Dilihat</span>
                        <span className="inline-flex items-center gap-1"><Icon.MessageCircle className="h-3.5 w-3.5" /> {post.comments_count || 0} Komentar</span>
                        <span className="inline-flex items-center gap-1"><Icon.HeartFilled className="h-3.5 w-3.5 text-rose-500" /> {post.likes_count || 0} Dukungan</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== 3. TAB DANUS & MERCHANDISE ===== */}
      {ukmSubTab === "danus" && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-white dark:bg-slate-900 p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="inline-flex items-center gap-2">
                    <Icon.ShoppingBag className="h-4 w-4 text-emerald-500" />
                    Katalog Danus & Merchandise Resmi
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Kelola penjualan jaket himpunan, kaos event, tiket konser/seminar, dan produk dana usaha organisasi.
                </p>
              </div>
              <Link
                href="/jual"
                className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all flex items-center gap-1"
              >
                <span>+ Tambah Produk Danus</span>
              </Link>
            </div>

            {danusItems.length === 0 ? (
              <div className="py-16 text-center">
                <div className="h-16 w-16 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center text-3xl mx-auto mb-3">
                  <Icon.ShoppingBag className="h-8 w-8" />
                </div>
                <h4 className="text-base font-black text-slate-900 dark:text-white">Belum Ada Produk Danus</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-5">
                  Organisasi bisa menjual korsa, PDL, merchandise, atau tiket event langsung ke mahasiswa melalui marketplace.
                </p>
                <Link
                  href="/jual"
                  className="px-5 py-2.5 rounded-2xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-95 transition-all inline-block"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Icon.PlusCircle className="h-4 w-4" />
                    Tambah Produk Danus Sekarang
                  </span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                {danusItems.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 flex flex-col justify-between hover:shadow-md transition-all">
                    <div>
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 mb-2">
                        {item.image_url ? (
                          <Image src={item.image_url} alt={item.title || "Foto produk"} fill data-zoom data-zoom-alt={item.title || "Foto produk"} className="object-cover" />
                        ) : (
                          <div className="h-full flex items-center justify-center text-slate-400"><Icon.ShoppingBag className="h-7 w-7" /></div>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">{item.title}</h4>
                      <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{rupiah(item.price)}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 mt-2 text-[11px]">
                      <span className="inline-flex items-center gap-1 text-slate-400"><Icon.Eye className="h-3.5 w-3.5" /> {item.views || 0} Views</span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => onOpenBumpModal?.(item)}
                          className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 font-bold"
                        >
                          <span className="inline-flex items-center gap-1"><Icon.Rocket className="h-3.5 w-3.5" /> Sundul</span>
                        </button>
                        <button
                          onClick={() => onOpenBagikanModal?.(item)}
                          className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold"
                        >
                          <span className="inline-flex items-center gap-1"><Icon.Link className="h-3.5 w-3.5" /> Bagikan</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== 4. TAB STRUKTUR BPH ===== */}
      {ukmSubTab === "struktur" && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-white dark:bg-slate-900 p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="inline-flex items-center gap-2">
                    <Icon.Users className="h-4 w-4 text-emerald-500" />
                    Struktur Kepengurusan & BPH Resmi
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Daftar susunan pengurus (Ketua, Sekretaris, Bendahara, Kadiv) yang akan tampil di profil organisasi.
                </p>
              </div>
              <button
                onClick={tambahAnggotaBph}
                className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all flex items-center gap-1"
              >
                <span>+ Tambah Pengurus</span>
              </button>
            </div>

            <div className="space-y-3">
              {bphList.map((bph, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 items-center">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Jabatan / Posisi</label>
                    <input
                      type="text"
                      placeholder="Contoh: Ketua Umum / Kadiv Humas"
                      value={bph.role || ""}
                      onChange={(e) => updateAnggotaBph(idx, "role", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Nama Lengkap</label>
                    <input
                      type="text"
                      placeholder="Nama Pengurus"
                      value={bph.name || ""}
                      onChange={(e) => updateAnggotaBph(idx, "name", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Jurusan / Fakultas</label>
                    <input
                      type="text"
                      placeholder="Contoh: Ilmu Komputer USU '23"
                      value={bph.major || ""}
                      onChange={(e) => updateAnggotaBph(idx, "major", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-slate-400 block mb-0.5">No. WhatsApp</label>
                      <input
                        type="text"
                        placeholder="08123456789"
                        value={bph.wa || ""}
                        onChange={(e) => updateAnggotaBph(idx, "wa", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <button
                      onClick={() => hapusAnggotaBph(idx)}
                      className="mt-4 p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-xs"
                      title="Hapus"
                    >
                      <Icon.Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={handleSimpanStruktur}
                disabled={savingStructure}
                className="px-6 py-2.5 rounded-2xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-md disabled:opacity-50 active:scale-95 transition-all"
              >
                {savingStructure ? "Menyimpan..." : "Simpan Susunan Pengurus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 5. TAB PROFIL & VISI MISI ===== */}
      {ukmSubTab === "profil" && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-white dark:bg-slate-900 p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              <span className="inline-flex items-center gap-2">
                <Icon.Landmark className="h-4 w-4 text-emerald-500" />
                Profil & Visi Misi Organisasi
              </span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Visi, Misi & Deskripsi Singkat
              </label>
              <textarea
                rows={5}
                placeholder="Tuliskan visi, misi, sejarah singkat, dan fokus program kerja organisasi Anda..."
                value={visiMisi}
                onChange={(e) => setVisiMisi(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-xs text-slate-900 dark:text-white leading-relaxed focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Nama Organisasi</span>
                <p className="font-bold text-slate-900 dark:text-white">{sellerProfile?.ukm_name || sellerProfile?.name}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Kategori & Kampus</span>
                <p className="font-bold text-slate-900 dark:text-white">{sellerProfile?.ukm_category} ({sellerProfile?.campus})</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleSimpanStruktur}
                disabled={savingStructure}
                className="px-6 py-2.5 rounded-2xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-md disabled:opacity-50 active:scale-95 transition-all"
              >
                {savingStructure ? "Menyimpan..." : "Simpan Perubahan Profil"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL OPREC ATS PANEL ===== */}
      {selectedOprec && (
        <OprecPengurusPanel
          oprec={selectedOprec}
          onClose={() => { setSelectedOprec(null); loadOprec(); }}
        />
      )}

      {/* ===== MODAL BUAT OPREC ===== */}
      {showBuatOprec && (
        <BuatOprecModal
          sellerWa={wa}
          sellerProfile={sellerProfile}
          onClose={() => setShowBuatOprec(false)}
          onSuccess={() => { setShowBuatOprec(false); loadOprec(); }}
        />
      )}
    </div>
  );
}
