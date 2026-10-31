"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/Icons";
import CampusSelect from "@/components/CampusSelect";
import Image from "next/image";
import { adFeeFrom, rupiah } from "@/lib/fees";
import { uploadMedia } from "@/lib/upload";
import MediaUploader from "@/components/MediaUploader";
import { CATEGORIES, MARKETPLACE_WA, formatWa } from "@/lib/constants";
import { buildSlug } from "@/lib/slug";
import {
  buildListingDescriptionTemplate,
  formatListingSpecs,
  getListingSpecConfig,
} from "@/lib/listingSpecs";
import { toast } from "sonner";
import OTPModal from "@/components/OTPModal";
import QRISModal from "@/components/QRISModal";
import { useSesi } from "@/components/SesiProvider";

const DRAFT_KEY = "jual_listing_draft";
const INITIAL_FORM = {
  seller_name: "",
  seller_wa: "",
  title: "",
  description: "",
  price: "",
  stock: 1,
  category: CATEGORIES[0].name,
  type: "barang",
  campus: "Semua",
  area: "",
  condition: "used",
  rental_period: "harian",
  specs: {},
};
const LISTING_STEPS = [
  { id: 1, title: "Foto", description: "Foto utama" },
  { id: 2, title: "Detail", description: "Informasi barang" },
  { id: 3, title: "Periksa", description: "Biaya & persetujuan" },
];

export default function JualPage() {
  const router = useRouter();
  const [form, setForm] = useState(() => ({ ...INITIAL_FORM, specs: {} }));
  const [media, setMedia] = useState([]);
  const [busy, setBusy] = useState(false);
  const [fileError, setFileError] = useState("");
  const [msg, setMsg] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("manual");
  const [createdListing, setCreatedListing] = useState(null);
  const [createdOrderId, setCreatedOrderId] = useState("");
  const [showQRISModal, setShowQRISModal] = useState(false);
  const [qrisUrl, setQrisUrl] = useState("");
  const [qrisFinalAmount, setQrisFinalAmount] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [agreedPdp, setAgreedPdp] = useState(false);
  const [step, setStep] = useState(1);
  const [authIntent, setAuthIntent] = useState(null);
  const [draftReady, setDraftReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState("");
  const [hasRecoveredDraft, setHasRecoveredDraft] = useState(false);

  const [cfg, setCfg] = useState(null);
  const [sellerIsDistributor, setSellerIsDistributor] = useState(false);
  // Penjual yang sudah punya halaman toko memasang iklan gratis. Diketahui
  // SEBELUM tombol ditekan: layar yang menagih Rp 5.000 lalu server yang
  // menayangkan gratis membuat orang berhenti percaya pada angka berikutnya.
  const [sellerPunyaToko, setSellerPunyaToko] = useState(false);

  // Identitas datang dari sesi bersama, bukan dibaca sendiri dari
  // localStorage. Bedanya terasa pada peranti baru: kukinya sah, cermin
  // localStorage-nya kosong, dan pembacaan langsung akan menyimpulkan
  // "belum masuk" untuk orang yang jelas-jelas sudah masuk.
  //
  // `siap` menahannya sampai server menjawab — mengisi formulir dengan
  // tebakan lalu menimpanya sedetik kemudian membuat kolom yang sedang
  // diketik berkedip.
  const { wa: sesiWa, nama: sesiNama, siap: sesiSiap, segarkan: segarkanSesi, tunggu: tungguSesi } = useSesi();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft?.form && typeof draft.form === "object") {
          setForm((current) => ({
            ...current,
            ...draft.form,
            seller_name: current.seller_name,
            seller_wa: current.seller_wa,
            specs: { ...current.specs, ...(draft.form.specs || {}) },
          }));
          if (LISTING_STEPS.some((item) => item.id === draft.step)) {
            setStep(draft.step);
          }
          setHasRecoveredDraft(true);
          setDraftStatus("Draft ditemukan dan dipulihkan dari browser ini.");
        }
      }
    } catch (error) {
      console.error("Gagal memulihkan draft iklan:", error);
      setDraftStatus("Draft sebelumnya tidak bisa dibaca. Kamu tetap bisa membuat iklan baru.");
    } finally {
      setDraftReady(true);
    }
  }, []);

  useEffect(() => {
    if (!draftReady) return undefined;
    const timeout = window.setTimeout(() => {
      try {
        const draftForm = { ...form, seller_name: "", seller_wa: "" };
        const hasDraftContent =
          step !== 1 ||
          Object.keys(INITIAL_FORM).some(
            (key) => JSON.stringify(draftForm[key]) !== JSON.stringify(INITIAL_FORM[key])
          );
        if (hasDraftContent) {
          localStorage.setItem(
            DRAFT_KEY,
            JSON.stringify({ step, form: draftForm, savedAt: new Date().toISOString() })
          );
          setDraftStatus("Draft tersimpan otomatis di browser ini.");
        } else {
          localStorage.removeItem(DRAFT_KEY);
        }
      } catch (error) {
        console.error("Gagal menyimpan draft iklan:", error);
        setDraftStatus("Draft tidak bisa disimpan. Jangan tutup halaman sebelum selesai.");
      }
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [draftReady, form, step]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!sesiSiap) return;
      const savedWa = sesiWa || "";
      const savedName = sesiNama || "";
      if (savedWa || savedName) {
        setForm((f) => ({
          ...f,
          seller_wa: savedWa || f.seller_wa,
          seller_name: savedName || f.seller_name,
        }));
        // Cek status distributor dari WA tersimpan
        if (savedWa) {
          fetch(`/api/listings?seller_wa=${encodeURIComponent(savedWa)}`)
            .then((r) => r.json())
            .then((d) => {
              setSellerIsDistributor(!!d.profile?.distributor);
              setSellerPunyaToko(!!d.punyaToko);
            })
            .catch(() => {});
        }
      }
    }

    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => setCfg(d))
      .catch(() => {});
  }, [sesiSiap, sesiWa, sesiNama]);

  const cats = cfg?.categories?.length ? cfg.categories : CATEGORIES;
  // Angka yang dilihat penjual harus lahir dari setelan yang sama dengan yang
  // menagihnya di server (`adFeeFrom` di lib/settings). Dulu poster memakai
  // setelan, tapi barang memakai tabel keras di lib/fees — jadi begitu pemilik
  // mengubah tarif dari panel admin, layar dan tagihan diam-diam berbeda.
  // `?? ` bukan `|| `: tarif 0 artinya GRATIS, bukan "belum diisi".
  const adFeeFor = (type, price = 0) => adFeeFrom(cfg?.pricing, type, price);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const specConfig = getListingSpecConfig(form.category);
  const specPreview = formatListingSpecs(form.category, form.specs);
  const fee = adFeeFor(form.type, form.price);
  const isFreeMode = fee === 0 || cfg?.pricing?.freeMode !== false;
  const gratis = sellerIsDistributor || sellerPunyaToko || isFreeMode;
  const sebabGratis = sellerIsDistributor
    ? "Distributor"
    : sellerPunyaToko
    ? "punya toko"
    : "Pasar Bebas Mahasiswa";
  const totalBiaya = gratis ? 0 : fee;

  function validateListingDetails() {
    const requiredFields = [
      ["form-title", form.title, "Nama / judul barang"],
      ["form-area", form.area, "Lokasi COD"],
      ["form-price", form.price, "Harga"],
      ["form-stock", form.stock, "Stok"],
      ["form-seller-name", form.seller_name, "Nama penjual"],
      ["form-seller-wa", form.seller_wa, "Nomor WhatsApp"],
    ];
    for (const [id, value, label] of requiredFields) {
      const field = document.getElementById(id);
      if (!String(value || "").trim()) {
        if (field) field.reportValidity();
        else toast.error(`${label} wajib diisi.`);
        return false;
      }
    }
    if (Number(form.stock) < 1) {
      toast.error("Stok harus minimal 1.");
      return false;
    }
    if (!formatWa(form.seller_wa)) {
      toast.error("Masukkan nomor WhatsApp yang valid.");
      return false;
    }
    return true;
  }

  async function continueStep() {
    if (step === 1) {
      const sessionWa = sesiSiap ? sesiWa : await tungguSesi();
      if (!sessionWa) {
        setAuthIntent("start");
        setShowAuthModal(true);
        return;
      }
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (step === 2) {
      if (!validateListingDetails()) return;
      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function clearSavedDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
      setDraftReady(false);
    } catch (error) {
      console.error("Gagal menghapus draft iklan setelah diproses:", error);
    }
  }

  const handleCategoryChange = (e) => {
    const nextCategory = e.target.value;
    setForm((f) => ({ ...f, category: nextCategory, specs: {} }));
  };

  const handleSpecChange = (key) => (e) => {
    const value = e.target.value;
    setForm((f) => ({
      ...f,
      specs: {
        ...f.specs,
        [key]: value,
      },
    }));
  };

  const applyCategoryTemplate = () => {
    const template = buildListingDescriptionTemplate(form.category);
    if (form.description.trim()) {
      const shouldReplace = window.confirm("Deskripsi saat ini akan diganti dengan template kategori. Lanjutkan?");
      if (!shouldReplace) return;
    }
    setForm((f) => ({ ...f, description: template }));
  };

  function handlePreviewClick(e) {
    e.preventDefault();
    if (step !== 3) {
      void continueStep();
      return;
    }
    if (!validateListingDetails()) {
      setStep(2);
      return;
    }
    const formattedWa = formatWa(form.seller_wa);
    if (!form.seller_name || !formattedWa || !form.title || !form.price) {
      toast.error("Lengkapi nama, WA, judul, dan harga.");
      return;
    }
    const numPrice = Number(form.price);
    if (form.type !== "gratis") {
      if (numPrice <= 0) {
        toast.error("Harga tidak boleh Rp 0. Masukkan minimal Rp 1.000.");
        return;
      }
      if (numPrice < 1000) {
        const suggested = (numPrice * 1000).toLocaleString("id-ID");
        const confirmed = window.confirm(`Harga yang kamu ketik (Rp ${numPrice.toLocaleString("id-ID")}) di bawah Rp 1.000. Apakah maksud kamu Rp ${suggested}?`);
        if (confirmed) {
          setForm((f) => ({ ...f, price: String(numPrice * 1000) }));
        } else {
          return;
        }
      }
    }
    setShowPreviewModal(true);
  }

  async function submit() {
    if (!agreedPdp) {
      toast.error("Setujui pernyataan sebelum melanjutkan.");
      return;
    }
    if (!validateListingDetails()) {
      setStep(2);
      return;
    }
    const formattedWa = formatWa(form.seller_wa);
    if (!form.seller_name || !formattedWa || !form.title || !form.price) {
      toast.error("Lengkapi nama, WA, judul, dan harga.");
      return;
    }
    const numPrice = Number(form.price);
    if (form.type !== "gratis") {
      if (numPrice <= 0) {
        toast.error("Harga tidak boleh Rp 0. Masukkan minimal Rp 1.000.");
        return;
      }
      if (numPrice < 1000) {
        const suggested = (numPrice * 1000).toLocaleString("id-ID");
        const confirmed = window.confirm(`Harga yang kamu ketik (Rp ${numPrice.toLocaleString("id-ID")}) di bawah Rp 1.000. Apakah maksud kamu Rp ${suggested}?`);
        if (confirmed) {
          setForm((f) => ({ ...f, price: String(numPrice * 1000) }));
          form.price = String(numPrice * 1000);
        } else {
          return;
        }
      }
    }

    // Cek apakah pengguna sudah login dengan nomor ini.
    //
    // Dibaca dari sesi, bukan dari localStorage. Dulu localStorage yang
    // kosong — peranti baru, riwayat peramban dibersihkan, mode privat —
    // dibaca sebagai "belum masuk", jadi pengguna yang kukinya masih sah
    // 30 hari tetap dihadang modal masuk di sini. Nomor yang diketik tetap
    // harus sama dengan nomor sesinya: itu yang menghalangi seseorang
    // memasang iklan atas nama orang lain.
    // Kalau sesi belum selesai terbaca, TUNGGU — jangan pulang diam-diam.
    // Versi pertama perbaikan ini `return` begitu saja, dan akibatnya tombol
    // "Pasang iklan" yang ditekan pada detik pertama tidak melakukan apa pun,
    // tanpa satu pun pesan. Tombol yang diam lebih membingungkan daripada
    // tombol yang menolak.
    const waSesi = sesiSiap ? sesiWa : await tungguSesi();
    if (formatWa(waSesi || "") !== formattedWa) {
      setShowPreviewModal(false);
      setAuthIntent("submit");
      setShowAuthModal(true);
      return;
    }

    setShowPreviewModal(false);
    await processListing(formattedWa);
  }

  async function processListing(formattedWa) {
    setBusy(true);
    try {
      const images = await uploadMedia(media);
      const image_url = images[0] || null;
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, seller_wa: formattedWa, image_url, images }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Gagal membuat listing");

      clearSavedDraft();
      localStorage.setItem("seller_wa", formattedWa);
      localStorage.setItem("seller_name", form.seller_name);

      if (data.pending_review || data.listing?.status === "pending") {
        toast.success(
          data.message || "Iklan dikirim dan sedang menunggu peninjauan. Pantau statusnya di Dashboard."
        );
        router.push(`/dashboard?wa=${encodeURIComponent(formattedWa)}`);
        return;
      }

      if (data.isDistributor) {
        const feeInfo = data.distributorFee > 0 ? ` Fee bagi hasil: ${rupiah(data.distributorFee)}` : "";
        toast.success(`Barang berhasil ditayangkan! (Gratis via Distributor)${feeInfo}`);
        const waParam = encodeURIComponent(formattedWa);
        router.push(`/dashboard?wa=${waParam}`);
        return;
      }

      if (data.punyaToko) {
        toast.success("Barang langsung ditayangkan — gratis karena kamu punya toko! ");
        router.push(`/dashboard?wa=${encodeURIComponent(formattedWa)}`);
        return;
      }

      if (data.isPro || data.isFreeMode || gratis) {
        toast.success("Barang berhasil ditayangkan! (100% Gratis - Pasar Bebas)");
        const productSlug = buildSlug(data.listing?.title || form.title, data.listing?.id);
        if (data.listing?.id) {
          router.push(`/produk/${productSlug}`);
        } else {
          const waParam = encodeURIComponent(formattedWa);
          router.push(`/dashboard?wa=${waParam}`);
        }
        return;
      }

      // Tampilkan modal pembayaran QRIS + verifikasi struk
      if (data.paymentUrl) {
        setQrisUrl(data.paymentUrl);
        setQrisFinalAmount(data.finalAmount || null);
      } else {
        toast.warning("Iklan diterima, tetapi informasi pembayaran belum tersedia. Periksa statusnya di Dashboard atau hubungi Bantuan.");
        router.push(`/dashboard?wa=${encodeURIComponent(formattedWa)}`);
        return;
      }
      setCreatedListing(data.listing || data);
      setCreatedOrderId(data.orderId || "");
      setShowQRISModal(true);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <header className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-extrabold">{form.type === "sewa" ? "Sewakan Barang" : "Jual Barang"}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Buat iklan langkah demi langkah. Biaya tayang saat ini{" "}
          <strong className="text-slate-900 dark:text-white">{rupiah(totalBiaya)}</strong>.
          {" "}Iklan aktif setelah lolos pemeriksaan otomatis; iklan yang perlu pemeriksaan tambahan akan menunggu peninjauan.
        </p>

        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {!sesiSiap
                ? "Memeriksa status akun…"
                : sesiWa
                ? "Akun siap untuk memasang iklan"
                : "Masuk atau verifikasi WhatsApp sebelum mengisi detail"}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Nomor WhatsApp akun digunakan untuk mengelola iklan dan dihubungi calon pembeli.
            </p>
          </div>
          {!sesiWa && (
            <button
              type="button"
              onClick={() => {
                setAuthIntent("start");
                setShowAuthModal(true);
              }}
              disabled={!sesiSiap}
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full bg-emerald-800 px-5 text-xs font-bold text-white transition hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-50"
            >
              Masuk / verifikasi
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p aria-live="polite" className="text-xs text-slate-500 dark:text-slate-400">
            {draftReady ? draftStatus || "Draft akan tersimpan otomatis di browser ini." : "Menyiapkan draft…"}
            {" "}Foto, nama, dan nomor WhatsApp tidak disimpan dalam draft.
          </p>
          {draftReady && hasRecoveredDraft && (
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.removeItem(DRAFT_KEY);
                  setForm((current) => ({
                    ...INITIAL_FORM,
                    seller_name: current.seller_name,
                    seller_wa: current.seller_wa,
                    specs: {},
                  }));
                  setMedia([]);
                  setStep(1);
                  setAgreedPdp(false);
                  setHasRecoveredDraft(false);
                  setDraftStatus("Draft sebelumnya dihapus.");
                } catch (error) {
                  console.error("Gagal menghapus draft iklan:", error);
                  setDraftStatus("Draft tidak bisa dihapus dari browser ini.");
                }
              }}
              className="text-xs font-semibold text-slate-500 underline hover:text-slate-800 dark:hover:text-white"
            >
              Hapus draft
            </button>
          )}
        </div>

        <ol aria-label="Langkah membuat iklan" className="mt-5 grid grid-cols-3 gap-2">
          {LISTING_STEPS.map((item) => {
            const current = item.id === step;
            const complete = item.id < step;
            return (
              <li
                key={item.id}
                aria-current={current ? "step" : undefined}
                className={`rounded-xl border px-3 py-2 ${
                  current
                    ? "border-emerald-700 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/40"
                    : complete
                    ? "border-emerald-200 bg-white dark:border-emerald-900 dark:bg-slate-900"
                    : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${
                    current || complete ? "bg-emerald-800 text-white" : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                  }`}>
                    {complete ? <Icon.Check className="h-3.5 w-3.5" /> : item.id}
                  </span>
                  <span>
                    <span className="block text-xs font-bold text-slate-900 dark:text-white">{item.title}</span>
                    <span className="hidden text-[10px] text-slate-500 sm:block">{item.description}</span>
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </header>

      <form onSubmit={handlePreviewClick} className="mx-auto mt-5 grid max-w-6xl gap-5 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {step === 1 && (
            <div className="card p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <label className="label mb-0">Foto Barang <span className="font-normal text-slate-500">(opsional, sangat disarankan)</span></label>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">Foto membantu lebih dipercaya</span>
            </div>
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              Tambahkan foto asli yang jelas. Tanpa foto pun kamu tetap bisa lanjut. Maksimal 5 foto; foto pertama jadi sampul.
            </p>
            <MediaUploader
              media={media}
              setMedia={setMedia}
              max={5}
              error={fileError}
              setError={setFileError}
            />
          </div>
          )}

          {step === 2 && (
          <div className="card grid gap-5 p-5 sm:grid-cols-2">
            <div>
              <label htmlFor="form-type" className="label">Jenis Jual Barang</label>
              <select id="form-type" className="input focus:ring-4 focus:ring-accent/10 focus:border-accent" value={form.type} onChange={set("type")}>
                <option value="barang">Barang — {rupiah(adFeeFor("barang", form.price))}</option>
                <option value="sewa">Sewa — {rupiah(adFeeFor("barang", form.price))}</option>
                <option value="poster">Poster — {rupiah(adFeeFor("poster"))}</option>
              </select>
            </div>
            {form.type === "sewa" && (
              <div>
                <label htmlFor="form-rental-period" className="label">Periode Sewa</label>
                <select id="form-rental-period" className="input focus:ring-4 focus:ring-accent/10 focus:border-accent" value={form.rental_period} onChange={set("rental_period")}>
                  <option value="harian">Per Hari</option>
                  <option value="mingguan">Per Minggu</option>
                  <option value="bulanan">Per Bulan</option>
                </select>
              </div>
            )}
            {form.type === "barang" && (
              <div>
                <label className="label">Kondisi Barang</label>
                <div className="flex gap-2 bg-gray-50 dark:bg-slate-800/50 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, condition: "used" }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${form.condition === "used" ? "bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"}`}
                  >
                    Bekas
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, condition: "new" }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${form.condition === "new" ? "bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"}`}
                  >
                    <span className="inline-flex items-center justify-center gap-1.5"><Icon.Sparkles className="h-4 w-4" /> Baru</span>
                  </button>
                </div>
              </div>
            )}
            <div>
              <label htmlFor="form-category" className="label">Kategori</label>
              <select id="form-category" className="input focus:ring-4 focus:ring-accent/10 focus:border-accent" value={form.category} onChange={handleCategoryChange}>
                {cats.map((c) => (
                  <option key={c.slug} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="form-campus" className="label">Target Area</label>
              <CampusSelect id="form-campus" ariaLabel="Target Area" className="input focus:ring-4 focus:ring-accent/10 focus:border-accent" value={form.campus} onChange={(value) => setForm((current) => ({ ...current, campus: value }))} />
            </div>
            <div>
              <label className="label">Lokasi COD</label>
              <div className="floating-group">
                <input 
                  id="form-area"
                  className="floating-input peer" 
                  value={form.area} 
                  onChange={set("area")} 
                  placeholder=" "
                  required
                />
                <label htmlFor="form-area" className="floating-label">Lokasi COD (kota, area, atau titik temu)</label>
              </div>
            </div>
            
            {/* Floating Input Groups */}
            <div className="sm:col-span-2 floating-group">
              <input 
                id="form-title"
                className="floating-input peer" 
                value={form.title} 
                onChange={set("title")} 
                placeholder=" "
                required
              />
              <label htmlFor="form-title" className="floating-label">Nama / Judul Barang</label>
            </div>
            
            <div className="sm:col-span-2 floating-group">
              <textarea 
                id="form-description"
                className="floating-input peer min-h-24" 
                value={form.description} 
                onChange={set("description")} 
                placeholder=" " 
              />
              <label htmlFor="form-description" className="floating-label">Deskripsi Lengkap (kondisi, minus, dll)</label>
            </div>
            <div className="sm:col-span-2 flex items-center justify-between rounded-2xl border border-dashed border-primary/25 bg-primary/[0.04] px-4 py-3 text-sm">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Template deskripsi kategori</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Bikin format detail barang lebih rapi dan seragam untuk pembeli maupun bot WA.
                </p>
              </div>
              <button
                type="button"
                onClick={applyCategoryTemplate}
                className="rounded-xl border border-primary/20 bg-white px-3 py-2 text-xs font-semibold text-primary shadow-sm transition hover:border-primary/40 dark:bg-slate-900"
              >
                Isi Template
              </button>
            </div>
            
            <div className="floating-group">
              <input 
                id="form-price"
                type="text" 
                inputMode="numeric"
                className="floating-input peer" 
                value={form.price ? Number(form.price).toLocaleString("id-ID") : ""} 
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, "");
                  setForm((f) => ({ ...f, price: cleaned }));
                }} 
                placeholder=" "
                required
              />
              <label htmlFor="form-price" className="floating-label">{form.type === "sewa" ? `Harga Sewa (Rp) / ${form.rental_period || "hari"}` : "Harga (Rp)"}</label>
            </div>
            {form.price && Number(form.price) > 0 && Number(form.price) < 1000 && (
              <div className="sm:col-span-2 -mt-2 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3.5 py-2 rounded-xl border border-amber-300 dark:border-amber-700/50">
                <span>💡</span>
                <span>Maksud kamu <strong>Rp {(Number(form.price) * 1000).toLocaleString("id-ID")}</strong>?</span>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, price: String(Number(f.price) * 1000) }))}
                  className="ml-auto text-xs font-bold text-primary dark:text-emerald-400 underline hover:opacity-80"
                >
                  Terapkan Otomatis
                </button>
              </div>
            )}
            
            <div className="floating-group">
              <input 
                id="form-stock"
                type="number" 
                inputMode="numeric"
                min="1" 
                className="floating-input peer" 
                value={form.stock} 
                onChange={set("stock")} 
                placeholder=" "
                required
              />
              <label htmlFor="form-stock" className="floating-label">Stok Barang</label>
            </div>
            
            <div className="floating-group">
              <input 
                id="form-seller-name"
                className="floating-input peer" 
                value={form.seller_name} 
                onChange={set("seller_name")} 
                placeholder=" "
                required
              />
              <label htmlFor="form-seller-name" className="floating-label">Nama Penjual</label>
            </div>
            
            <div className="floating-group">
              <input 
                id="form-seller-wa"
                type="tel"
                inputMode="tel"
                className="floating-input peer" 
                value={form.seller_wa} 
                onChange={set("seller_wa")} 
                placeholder=" "
                required
              />
              <label htmlFor="form-seller-wa" className="floating-label">Nomor WhatsApp</label>
            </div>

            {specConfig?.fields?.length > 0 && (
              <div className="sm:col-span-2 rounded-3xl border border-black/[0.06] bg-black/[0.02] p-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">Spesifikasi Tambahan ({form.category}) — Opsional</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                      Khusus kategori {form.category}. Boleh dikosongkan jika tidak ada info detail.
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 shadow-sm dark:bg-slate-900 dark:text-slate-400">
                    Opsional
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {specConfig.fields.map((field) => (
                    <div key={field.key} className="floating-group">
                      <input
                        id={`spec-${field.key}`}
                        className="floating-input peer"
                        value={form.specs?.[field.key] || ""}
                        onChange={handleSpecChange(field.key)}
                        placeholder=" "
                      />
                      <label htmlFor={`spec-${field.key}`} className="floating-label">
                        {field.label}
                      </label>
                      <p className="mt-1 px-1 text-[11px] text-gray-400">{field.placeholder}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          )}

          {step === 3 && (
            <div className="card space-y-3 p-5">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Biaya dan proses tayang</h2>
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 dark:bg-emerald-950/30">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Biaya tayang</span>
                <span className="text-lg font-extrabold text-emerald-800 dark:text-emerald-300">{rupiah(totalBiaya)}</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {gratis
                  ? `Gratis untuk ${sebabGratis.toLowerCase()}. Tidak ada biaya tayang yang perlu dibayar.`
                  : "Biaya dibayar melalui QRIS sebelum iklan diproses."}
                {" "}Semua iklan diperiksa. Iklan yang lolos otomatis dapat langsung aktif; iklan yang perlu pemeriksaan tambahan akan berstatus menunggu peninjauan.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((current) => current - 1)}
                className="btn-outline min-h-11 px-5"
              >
                Kembali
              </button>
            ) : <span />}
            {step < 3 && (
              <button
                type="button"
                onClick={continueStep}
                disabled={busy || (step === 1 && !sesiSiap)}
                className="btn-primary min-h-11 px-6 disabled:cursor-wait disabled:opacity-50"
              >
                {step === 1 && !sesiWa ? "Masuk & lanjut ke detail" : "Lanjut"}
              </button>
            )}
          </div>
        </div>

        {/* Right column: step guidance or final preview and consent. */}
        {step < 3 ? (
          <aside className="space-y-4 lg:sticky lg:top-20">
            <div className="card space-y-4 p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                  {step === 1 ? <Icon.Camera className="h-5 w-5" /> : <Icon.FileText className="h-5 w-5" />}
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    {step === 1 ? "Mulai dari foto" : "Isi detail dengan jelas"}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Langkah {step} dari 3
                  </p>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {step === 1
                  ? "Foto bersifat opsional, tetapi foto asli yang terang membantu calon pembeli memahami kondisi barang."
                  : "Judul, harga, stok, area COD, nama, dan WhatsApp wajib diisi. Spesifikasi tambahan boleh dikosongkan."}
              </p>
              <p className="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
                Detail iklan tersimpan otomatis di browser ini. Foto, nama, dan nomor WhatsApp tidak ikut disimpan.
              </p>
            </div>
          </aside>
        ) : (
        <div className="space-y-4 lg:sticky lg:top-20">
          {/* Real-time Live Preview Card */}
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Icon.Eye className="w-3.5 h-3.5 text-[#047857]" />
                Pratinjau Kartu Produk
              </span>
              <span className="text-[10px] font-bold text-[#047857] bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                Live Preview
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-slate-800/40 p-3 flex flex-col gap-2.5">
              <div className="relative aspect-4/3 w-full rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700">
                {media[0]?.preview ? (
                  <img
                    src={media[0].preview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1.5">
                    <Icon.Camera className="w-7 h-7 opacity-40" />
                    <span className="text-[11px] font-medium">Belum ada foto (opsional)</span>
                  </div>
                )}
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/90 dark:bg-slate-900/90 text-[10px] font-bold text-slate-800 dark:text-slate-200 shadow-2xs backdrop-blur-xs">
                  {form.category || "Kategori"}
                </span>
              </div>

              <div>
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                  {form.title.trim() || "Nama / Judul Barang Kamu"}
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-sm sm:text-base font-extrabold text-[#047857] dark:text-emerald-400">
                    {form.price ? rupiah(Number(form.price)) : "Rp 0"}
                  </span>
                  {form.type === "sewa" && (
                    <span className="text-[10px] text-teal-600 font-medium">
                      /{form.rental_period || "hari"}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[10.5px] text-slate-500">
                  <Icon.MapPin className="w-3 h-3 text-[#047857]" />
                  <span className="truncate">
                    {form.campus === "Semua" ? "Semua Kampus" : form.campus}
                    {form.area ? ` · ${form.area}` : ""}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <h3 className="font-bold dark:text-white">Ringkasan</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-slate-400">Tipe</dt>
                <dd className="font-medium capitalize dark:text-white">{form.type}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-slate-400">Metode</dt>
                <dd className="font-medium capitalize dark:text-white">
                  {gratis ? "Bebas Biaya (100% Gratis)" : "QRIS"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-slate-400">Biaya tayang</dt>
                <dd className="font-bold text-slate-900 dark:text-white">{rupiah(totalBiaya)}</dd>
              </div>
              <div className="my-2 border-t dark:border-slate-800" />
              <div className="flex justify-between text-base">
                <dt className="font-semibold dark:text-white">Total bayar</dt>
                <dd className="font-extrabold text-primary dark:text-white">
                  {rupiah(totalBiaya)}
                </dd>
              </div>
            </dl>

            <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">
              <span className="font-semibold">Setelah dikirim:</span>{" "}
              {gratis
                ? "Iklan gratis. Iklan yang lolos pemeriksaan otomatis langsung aktif; jika perlu pemeriksaan tambahan, statusnya menunggu peninjauan."
                : "Selesaikan pembayaran QRIS. Iklan yang lolos pemeriksaan otomatis langsung aktif; jika perlu pemeriksaan tambahan, statusnya menunggu peninjauan."}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800">
              <label className="flex items-start gap-2.5 text-xs text-gray-600 dark:text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  required
                  checked={agreedPdp}
                  onChange={(e) => setAgreedPdp(e.target.checked)}
                  aria-describedby="listing-consent-help"
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary shrink-0"
                />
                <span className="leading-relaxed">
                  Saya menyatakan informasi iklan benar, barang bukan barang terlarang, dan menyetujui{" "}
                  <Link href="/syarat-ketentuan" target="_blank" className="font-semibold text-primary underline">Syarat &amp; Ketentuan</Link>
                  {" "}serta{" "}
                  <Link href="/kebijakan-privasi" target="_blank" className="font-semibold text-primary underline">Kebijakan Privasi</Link>
                  . Calon pembeli dapat menghubungimu melalui WhatsApp.
                </span>
              </label>
              <p id="listing-consent-help" className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Nomor WhatsApp akun digunakan untuk mengelola iklan dan menerima pesan calon pembeli.
              </p>
            </div>

            {!agreedPdp && <p className="text-xs text-amber-800 dark:text-amber-300">Centang persetujuan di atas setelah membaca sebelum melihat pratinjau.</p>}
            <button type="submit" disabled={busy || !!fileError || !agreedPdp} className="btn-primary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-50">
              Pratinjau Barang
            </button>
            {msg && <p className="mt-3 text-sm text-rose-600">{msg}</p>}
          </div>
        </div>
        )}
      </form>

      {/* Modal QRIS */}
      {showQRISModal && createdListing && qrisUrl && (
        <QRISModal
          qrisUrl={qrisUrl}
          fee={qrisFinalAmount ?? fee}
          transactionId={createdOrderId}
          onClose={() => {
            setShowQRISModal(false);
            const waParam = encodeURIComponent(form.seller_wa || "");
            router.push(`/dashboard?pending=1&wa=${waParam}`);
          }}
          onSuccess={() => {
            setShowQRISModal(false);
            const waParam = encodeURIComponent(form.seller_wa || "");
            router.push(`/dashboard?paid=1&wa=${waParam}`);
          }}
        />
      )}

      {/* Modal Preview */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-2xl bg-white p-6 shadow-2xl dark:bg-slate-900/95 dark:border-slate-800 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">
                Preview Barang
              </h2>
              <button 
                type="button" 
                onClick={() => setShowPreviewModal(false)}
                aria-label="Tutup preview barang"
                className="text-gray-500 hover:bg-gray-100 p-2 rounded-full dark:hover:bg-slate-800"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="inline-block h-[1em] w-[1em] shrink-0 align-[-0.125em] fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            
            <div className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden mb-6">
              {media.length > 0 ? (
                <div className="aspect-video w-full bg-gray-100 dark:bg-slate-800 relative">
                  {/* For preview, we use objectURL of the first file if available */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={media[0].preview || media[0].url} alt="Preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-video w-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                  <span className="text-gray-400">Tidak ada foto</span>
                </div>
              )}
              <div className="p-4">
                <div className="flex justify-between items-start gap-4">
                  <h3 className="font-bold text-lg dark:text-white line-clamp-2">{form.title}</h3>
                  <div className="text-xl font-black text-primary flex-shrink-0">{rupiah(form.price)}</div>
                </div>
                <div className="mt-2 text-sm text-gray-500 line-clamp-3">
                  {form.description || "Tidak ada deskripsi"}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="badge badge-primary">{form.category}</span>
                  <span className="badge badge-outline">{form.campus}</span>
                </div>
                {specPreview.length > 0 && (
                  <div className="mt-4 rounded-2xl bg-gray-50 p-3 dark:bg-slate-800/60">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-slate-400">
                      Spesifikasi
                    </p>
                    <dl className="mt-2 space-y-1.5">
                      {specPreview.map((item) => (
                        <div key={item.key} className="flex items-start justify-between gap-3 text-sm">
                          <dt className="text-gray-500 dark:text-slate-400">{item.label}</dt>
                          <dd className="text-right font-medium text-gray-900 dark:text-white">{item.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="btn-outline flex-1"
                disabled={busy}
              >
                Edit Kembali
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="btn-primary flex-1"
              >
                {busy ? "Memproses…" : gratis ? "Tayangkan Sekarang (Gratis)" : `Bayar & Tayangkan ${rupiah(fee)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Auth OTP */}
      <OTPModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          setAuthIntent(null);
        }}
        initialWa={formatWa(form.seller_wa) || ""}
        onSuccess={(verifiedWa) => {
          setShowAuthModal(false);
          const verifiedNumber = formatWa(verifiedWa || "");
          if (!verifiedNumber) {
            toast.error("Nomor WhatsApp terverifikasi tidak valid. Silakan coba lagi.");
            return;
          }
          // Auto-fill form jika WA berubah saat di modal
          if (formatWa(form.seller_wa) !== verifiedNumber) {
            setForm((f) => ({ ...f, seller_wa: verifiedNumber }));
          }
          // Sesi bersama ikut disegarkan, supaya halaman lain (dan gerbang
          // di atas) langsung tahu orang ini sudah masuk — tanpa menunggu
          // pemuatan ulang.
          segarkanSesi();
          const intent = authIntent;
          setAuthIntent(null);
          if (intent === "submit") {
            processListing(verifiedNumber);
          } else {
            setStep(2);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }}
      />
    </div>
  );
}
