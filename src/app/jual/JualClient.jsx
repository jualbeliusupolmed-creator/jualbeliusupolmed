"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/Icons";
import { adFeeFrom, rupiah } from "@/lib/fees";
import { uploadMedia } from "@/lib/upload";
import MediaUploader from "@/components/MediaUploader";
import { CATEGORIES, formatWa, parseWaInput } from "@/lib/constants";
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
  area: "",
  condition: "used",
  rental_period: "harian",
  specs: {},
};

function getCategoryFeeLabel(category, pricing, isFreeMode, sellerIsDistributor, sellerPunyaToko) {
  if (isFreeMode || sellerIsDistributor || sellerPunyaToko) return "GRATIS";
  const fee = adFeeFrom(pricing, "barang", 0);
  return fee > 0 ? `Rp ${fee.toLocaleString("id-ID")}` : "GRATIS";
}

export default function JualPage() {
  const router = useRouter();
  const [form, setForm] = useState(() => ({ ...INITIAL_FORM, specs: {} }));
  const [media, setMedia] = useState([]);
  const [busy, setBusy] = useState(false);
  const [fileError, setFileError] = useState("");
  const [msg, setMsg] = useState("");
  const [createdListing, setCreatedListing] = useState(null);
  const [createdOrderId, setCreatedOrderId] = useState("");
  const [showQRISModal, setShowQRISModal] = useState(false);
  const [qrisUrl, setQrisUrl] = useState("");
  const [qrisFinalAmount, setQrisFinalAmount] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authIntent, setAuthIntent] = useState(null);
  const [draftReady, setDraftReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState("");
  const [hasRecoveredDraft, setHasRecoveredDraft] = useState(false);
  const [showCampusWarning, setShowCampusWarning] = useState(false);

  const [cfg, setCfg] = useState(null);
  const [sellerIsDistributor, setSellerIsDistributor] = useState(false);
  const [sellerPunyaToko, setSellerPunyaToko] = useState(false);

  const { wa: sesiWa, nama: sesiNama, siap: sesiSiap, profil, segarkan: segarkanSesi, tunggu: tungguSesi } = useSesi();

  // Auto-format WA input as user types
  const handleWaChange = useCallback((e) => {
    const raw = e.target.value;
    const formatted = parseWaInput(raw);
    setForm((f) => ({ ...f, seller_wa: formatted }));
  }, []);

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
          setHasRecoveredDraft(true);
          setDraftStatus("Draft tersimpan berhasil dipulihkan.");
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
        const hasDraftContent = Object.keys(INITIAL_FORM).some(
          (key) => JSON.stringify(draftForm[key]) !== JSON.stringify(INITIAL_FORM[key])
        );

        if (hasDraftContent) {
          localStorage.setItem(
            DRAFT_KEY,
            JSON.stringify({ form: draftForm, savedAt: new Date().toISOString() })
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
  }, [draftReady, form]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!sesiSiap) return;
      const savedWa = sesiWa || "";
      const savedName = sesiNama || "";
      if (savedWa || savedName) {
        setForm((f) => ({
          ...f,
          seller_wa: f.seller_wa || savedWa,
          seller_name: f.seller_name || savedName,
        }));
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

  // Check campus requirement
  useEffect(() => {
    const hasCampus = profil?.campus || (typeof window !== "undefined" ? localStorage.getItem("preferred_campus") : "");
    setShowCampusWarning(!hasCampus || hasCampus === "Semua");
  }, [profil]);

  const cats = cfg?.categories?.length ? cfg.categories : CATEGORIES;
  const adFeeFor = (type, price = 0) => adFeeFrom(cfg?.pricing, type, price);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const specConfig = getListingSpecConfig(form.category);
  const specPreview = useMemo(() => formatListingSpecs(form.category, form.specs), [form.category, form.specs]);
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
    const formatted = formatWa(form.seller_wa);
    if (!formatted && !sesiWa) {
      toast.error("Masukkan nomor WhatsApp yang valid (contoh: 081234567890).");
      return false;
    }
    return true;
  }

  function clearSavedDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
      setHasRecoveredDraft(false);
      setDraftStatus("");
    } catch {
      // Abaikan jika localStorage tidak tersedia
    }
  }

  function handleCategoryChange(e) {
    const nextCategory = e.target.value;
    setForm((current) => ({
      ...current,
      category: nextCategory,
      specs: {},
    }));
  }

  function handleSpecChange(fieldKey) {
    return (e) => {
      const value = e.target.value;
      setForm((current) => ({
        ...current,
        specs: {
          ...current.specs,
          [fieldKey]: value,
        },
      }));
    };
  }

  function applyCategoryTemplate() {
    const template = buildListingDescriptionTemplate(form.category);
    if (!template) {
      toast.info(`Kategori ${form.category} belum memiliki template bawaan.`);
      return;
    }

    setForm((current) => {
      const existing = current.description.trim();
      const nextDescription = existing ? `${existing}\n\n${template}` : template;
      return { ...current, description: nextDescription };
    });
    toast.success(`Template ${form.category} berhasil disisipkan ke deskripsi.`);
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    setMsg("");
    setFileError("");

    // Blokir submit jika kampus acuan belum dipilih. Banner peringatan
    // saja tidak cukup — user bisa mengabaikannya dan tetap submit,
    // lalu server mengembalikan 409. Tombol dinonaktifkan + toast
    // memberitahu ke mana harus pergi.
    if (showCampusWarning) {
      toast.error("Pilih kampus di Profil terlebih dahulu sebelum memasang iklan.", { duration: 5000 });
      return;
    }

    if (!validateListingDetails()) return;

    // Auto-multiply price < 1000 — tawarkan pilihan, bukan paksa.
    // User kadang memang maksud ongkir Rp 50 atau biaya kecil; tanpa
    // opsi Cancel, angka yang dijanjikan dan yang dikasih tidak sama.
    const numPrice = Number(form.price);
    if (form.type !== "gratis" && form.category !== "Hibah" && numPrice > 0 && numPrice < 1000) {
      const correctedPrice = numPrice * 1000;
      const ok = confirm(
        `Harga tertera Rp ${numPrice.toLocaleString("id-ID")}. Apakah maksud kamu Rp ${(correctedPrice).toLocaleString("id-ID")}? Klik OK untuk menyesuaikan otomatis, atau Cancel jika memang Rp ${numPrice}.`
      );
      if (ok) {
        setForm((f) => ({ ...f, price: String(correctedPrice) }));
        form.price = String(correctedPrice);
      }
    }

    const waSesi = sesiSiap ? sesiWa : await tungguSesi();

    if (!waSesi) {
      setAuthIntent("submit");
      setShowAuthModal(true);
      return;
    }

    const targetWa = formatWa(form.seller_wa) || waSesi;
    await processListing(targetWa);
  }

  async function processListing(formattedWa) {
    setBusy(true);
    try {
      const images = await uploadMedia(media);
      const image_url = images[0] || null;
      const effectiveCampus = profil?.campus || (typeof window !== "undefined" ? localStorage.getItem("preferred_campus") : "") || "USU";
      const effectiveUnivId = profil?.home_university_id || (typeof window !== "undefined" ? localStorage.getItem("preferred_university_id") : "") || "usu";
      const effectiveArea = form.area?.trim() || (effectiveCampus && effectiveCampus !== "Semua" ? `Sekitar Kampus ${effectiveCampus}` : "Sekitar Kampus");

      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          campus: effectiveCampus,
          home_university_id: effectiveUnivId,
          area: effectiveArea,
          seller_wa: formattedWa,
          image_url,
          images,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        // Fix #6: Specific error messages
        const errorMsg = data.error || "Gagal membuat listing";
        if (errorMsg.includes("universitas") || errorMsg.includes("kampus") || errorMsg.includes("provinsi")) {
          toast.error("Pilih kampus di Profil terlebih dahulu", { duration: 5000 });
          setShowCampusWarning(true);
        } else if (errorMsg.includes("session") || errorMsg.includes("login")) {
          toast.error("Sesi berakhir, silakan login lagi");
          setShowAuthModal(true);
        } else {
          throw new Error(errorMsg);
        }
        return;
      }

      clearSavedDraft();
      localStorage.setItem("seller_wa", formattedWa);
      localStorage.setItem("seller_name", form.seller_name);

      // Fix #4: Redirect to /produk/{slug} after successful posting
      const productSlug = buildSlug(data.listing?.title || form.title, data.listing?.id);
      const goToProduct = (data.listing?.id) ? `/produk/${productSlug}` : `/dashboard?wa=${encodeURIComponent(sesiWa || formattedWa)}`;

      if (data.pending_review || data.listing?.status === "pending") {
        toast.success(data.message || "Iklan dikirim dan sedang menunggu peninjauan. Pantau statusnya di Dashboard.");
        router.push(`/dashboard?wa=${encodeURIComponent(sesiWa || formattedWa)}`);
        return;
      }

      if (data.isDistributor) {
        const feeInfo = data.distributorFee > 0 ? ` Fee bagi hasil: ${rupiah(data.distributorFee)}` : "";
        toast.success(`Barang berhasil ditayangkan! (Gratis via Distributor)${feeInfo}`);
        router.push(goToProduct);
        return;
      }

      if (data.punyaToko) {
        toast.success("Barang langsung ditayangkan — gratis karena kamu punya toko!");
        router.push(goToProduct);
        return;
      }

      if (data.isPro || data.isFreeMode || gratis) {
        toast.success("Barang berhasil ditayangkan! (100% Gratis - Pasar Bebas)");
        router.push(goToProduct);
        return;
      }

      if (data.paymentUrl) {
        setQrisUrl(data.paymentUrl);
        setQrisFinalAmount(data.finalAmount || null);
        setCreatedOrderId(data.orderId || data.paymentId || "");
        setCreatedListing(data.listing || null);
        setShowQRISModal(true);
      } else {
        toast.warning("Iklan diterima, tetapi informasi pembayaran belum tersedia. Periksa statusnya di Dashboard atau hubungi Bantuan.");
        router.push(`/dashboard?wa=${encodeURIComponent(sesiWa || formattedWa)}`);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Gagal membuat listing");
      setMsg(err.message || "Gagal membuat listing");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-app py-8">
      {/* Header */}
      <header className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Jual Barang
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Pasang iklan sekali jalan langsung tayang.
            </p>
          </div>
          {sesiWa && (
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Akun Aktif: {sesiNama || sesiWa}</span>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
          <p aria-live="polite" className="text-xs text-slate-500 dark:text-slate-400">
            {draftReady ? draftStatus || "Draft tersimpan otomatis di browser ini." : "Menyiapkan draft…"}
          </p>
          {draftReady && hasRecoveredDraft && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">✓ Draft dipulihkan</span>
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
                    setHasRecoveredDraft(false);
                    setDraftStatus("Draft sebelumnya dibersihkan.");
                  } catch (error) {
                    console.error("Gagal menghapus draft iklan:", error);
                  }
                }}
                className="text-xs font-semibold text-slate-500 underline hover:text-slate-800 dark:hover:text-white active:opacity-70"
              >
                Hapus draft
              </button>
            </div>
          )}
        </div>

        {/* Fix #2: Campus warning banner */}
        {showCampusWarning && (
          <div className="mt-3 p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
            <div className="flex items-center gap-2">
              <Icon.AlertTriangle className="h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">Kampus belum dipilih</p>
                <p className="text-xs mt-0.5">Iklan tidak bisa dipasang tanpa kampus acuan. Isi di <Link href="/dashboard?tab=profil" className="underline hover:opacity-80">Profil → Pilih Kampus</Link>.</p>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Single-Flow Form */}
      <form onSubmit={handleSubmit} className="mx-auto mt-6 grid max-w-6xl gap-6 lg:grid-cols-3">
        {/* Left Column: Unified Form Fields */}
        <div className="space-y-5 lg:col-span-2">
          {/* Card 1: Foto Barang */}
          <section className="card p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-bold text-slate-900 dark:text-white">
                Foto Barang <span className="font-normal text-slate-400 text-xs">(opsional, disarankan)</span>
              </label>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                Maksimal 5 Foto
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Foto pertama otomatis menjadi sampul kartu produk.
            </p>
            <MediaUploader
              media={media}
              setMedia={setMedia}
              max={5}
              error={fileError}
              setError={setFileError}
            />
          </section>

          {/* Card 2: Detail Barang */}
          <section className="card p-5 grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="form-type" className="label">Jenis Jual Barang</label>
              <select
                id="form-type"
                className="input focus:ring-4 focus:ring-accent/10 focus:border-accent"
                value={form.type}
                onChange={set("type")}
              >
                <option value="barang">Barang ({rupiah(adFeeFor("barang", form.price))})</option>
                <option value="sewa">Sewa ({rupiah(adFeeFor("barang", form.price))})</option>
                <option value="poster">Poster ({rupiah(adFeeFor("poster"))})</option>
              </select>
            </div>

            {form.type === "sewa" ? (
              <div>
                <label htmlFor="form-rental-period" className="label">Periode Sewa</label>
                <select
                  id="form-rental-period"
                  className="input focus:ring-4 focus:ring-accent/10 focus:border-accent"
                  value={form.rental_period}
                  onChange={set("rental_period")}
                >
                  <option value="harian">Per Hari</option>
                  <option value="mingguan">Per Minggu</option>
                  <option value="bulanan">Per Bulan</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="label">Kondisi Barang</label>
                <div className="flex gap-2 bg-slate-50 dark:bg-slate-800/50 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, condition: "used" }))}
                    className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                      form.condition === "used"
                        ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                    }`}
                  >
                    Bekas
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, condition: "new" }))}
                    className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                      form.condition === "new"
                        ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                    }`}
                  >
                    <span className="inline-flex items-center justify-center gap-1">
                      <Icon.Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Baru
                    </span>
                  </button>
                </div>
              </div>
            )}

            <div className="sm:col-span-2">
              <label htmlFor="form-category" className="label">Kategori</label>
              <select
                id="form-category"
                className="input focus:ring-4 focus:ring-accent/10 focus:border-accent"
                value={form.category}
                onChange={handleCategoryChange}
              >
                {cats.map((c) => (
                  <option key={c.slug} value={c.name}>
                    {c.name} {(() => {
                      const feeLabel = getCategoryFeeLabel(c.name, cfg?.pricing, isFreeMode, sellerIsDistributor, sellerPunyaToko);
                      return feeLabel === "GRATIS" ? "✓ GRATIS" : feeLabel;
                    })()}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400">
                Jangkauan tayang otomatis menjangkau seluruh kampus se-provinsimu.
              </p>
            </div>

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

            <div className="sm:col-span-2 flex items-center justify-between rounded-2xl border border-dashed border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 px-4 py-3 text-sm">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Template deskripsi kategori</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Format praktis untuk rincian cepat barang.
                </p>
              </div>
              <button
                type="button"
                onClick={applyCategoryTemplate}
                className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-xs hover:bg-emerald-50 dark:bg-slate-900 dark:text-emerald-300 active:opacity-75"
              >
                Isi Template
              </button>
            </div>
          </section>

          {/* Card 3: Harga & Stok */}
          <section className="card p-5 grid gap-5 sm:grid-cols-2">
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
              <label htmlFor="form-price" className="floating-label">
                {form.type === "sewa" ? `Harga Sewa (Rp) / ${form.rental_period || "hari"}` : "Harga (Rp)"}
              </label>
            </div>

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

            {/* Auto-corrected price notice (Fix #1) */}
            {form.price && Number(form.price) > 0 && Number(form.price) < 1000 && (
              <div className="sm:col-span-2 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-3.5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                <Icon.Sparkles className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" />
                <span>Harga otomatis disesuaikan ke <strong>Rp {(Number(form.price) * 1000).toLocaleString("id-ID")}</strong></span>
              </div>
            )}
          </section>

          {/* Card 4: Titik Temu COD & Kontak Penjual */}
          <section className="card p-5 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2 floating-group">
              <input
                id="form-area"
                className="floating-input peer"
                value={form.area}
                onChange={set("area")}
                placeholder=" "
              />
              <label htmlFor="form-area" className="floating-label">
                Lokasi Titik Temu COD (Opsional)
              </label>
              <p className="mt-1 text-[11px] text-slate-400">
                Contoh: Gerbang Utama, Perpustakaan, atau kosongkan jika fleksibel sekitar kampus.
              </p>
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

            {/* Fix #7: WA input with format preview */}
            <div className="floating-group">
              <input
                id="form-seller-wa"
                type="tel"
                inputMode="tel"
                className="floating-input peer"
                value={form.seller_wa}
                onChange={handleWaChange}
                placeholder=" "
                required
                maxLength={15}
              />
              <label htmlFor="form-seller-wa" className="floating-label">Nomor WhatsApp Kontak</label>
              <p className="mt-1 text-[11px] text-slate-400">
                Format: 0812-3456-7890 atau 6281234567890 (otomatis diformat)
              </p>
            </div>
          </section>

          {/* Card 5: Spesifikasi Tambahan (Jika Kategori Memiliki Spesifikasi) */}
          {specConfig?.fields?.length > 0 && (
            <section className="card p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Spesifikasi Tambahan ({form.category})
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Boleh dikosongkan jika tidak ada detail spesifik.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  Opsional
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
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
                    <p className="mt-1 px-1 text-[11px] text-slate-400">{field.placeholder}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Mobile Bottom CTA Area */}
          <div className="lg:hidden space-y-3 pt-2">
            <button
              type="submit"
              disabled={busy || !!fileError || showCampusWarning}
              className="btn-primary w-full min-h-12 text-base font-bold shadow-md disabled:cursor-not-allowed disabled:opacity-50 active:opacity-85"
            >
              {busy
                ? "Memproses…"
                : showCampusWarning
                ? "Pilih Kampus Dulu"
                : gratis
                ? "Tayangkan Iklan Sekarang"
                : `Bayar & Tayangkan (${rupiah(totalBiaya)})`}
            </button>
            <p className="text-center text-xs text-slate-500 dark:text-slate-400">
              Dengan menayangkan iklan, kamu menyetujui{" "}
              <Link href="/syarat-ketentuan" className="font-semibold underline">Ketentuan</Link> &{" "}
              <Link href="/kebijakan-privasi" className="font-semibold underline">Privasi</Link>.
            </p>
            {msg && <p className="text-center text-sm text-rose-600">{msg}</p>}
          </div>
        </div>

        {/* Right Column: Sticky Live Preview & Action Sidebar */}
        <aside className="space-y-5 lg:sticky lg:top-20">
          {/* Live Preview Card */}
          <div className="card p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Icon.Eye className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                Pratinjau Kartu Produk
              </span>
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                Live Preview
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-slate-800/40 p-3 flex flex-col gap-2.5">
              <div className="relative aspect-4/3 w-full rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700">
                {media[0]?.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={media[0].preview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1.5">
                    <Icon.Camera className="w-7 h-7 opacity-40" aria-hidden="true" />
                    <span className="text-[11px] font-medium">Belum ada foto</span>
                  </div>
                )}
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 text-[10px] font-bold text-slate-800 dark:text-slate-200 shadow-xs">
                  {form.category || "Kategori"}
                </span>
              </div>

              <div>
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                  {form.title.trim() || "Nama / Judul Barang Kamu"}
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-sm sm:text-base font-extrabold text-emerald-700 dark:text-emerald-400">
                    {form.price ? rupiah(Number(form.price)) : "Rp 0"}
                  </span>
                  {form.type === "sewa" && (
                    <span className="text-[10px] text-teal-600 font-medium">
                      /{form.rental_period || "hari"}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[10.5px] text-slate-500">
                  <Icon.MapPin className="w-3 h-3 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                  <span className="truncate">
                    {form.area.trim() || "Sekitar Kampus"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing & Publish Summary */}
          <div className="card p-5 space-y-4 shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Ringkasan Biaya</h3>
            <dl className="space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Tipe Iklan</dt>
                <dd className="font-semibold capitalize text-slate-800 dark:text-slate-200">{form.type}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Biaya Tayang</dt>
                <dd className="font-bold text-slate-900 dark:text-white">
                  {gratis ? "Rp 0 (GRATIS)" : rupiah(totalBiaya)}
                </dd>
              </div>
              <div className="my-2 border-t border-slate-100 dark:border-slate-800" />
              <div className="flex justify-between text-base">
                <dt className="font-bold text-slate-900 dark:text-white">Total Bayar</dt>
                <dd className="font-black text-emerald-700 dark:text-emerald-400">
                  {rupiah(totalBiaya)}
                </dd>
              </div>
            </dl>

            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3 text-xs text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
              {gratis
                ? "Iklan langsung aktif dan tayang seketika di marketplace tanpa menunggu persetujuan admin."
                : "Selesaikan pembayaran QRIS agar iklanmu langsung aktif di katalog."}
            </div>

            <button
              type="submit"
              disabled={busy || !!fileError || showCampusWarning}
              className="btn-primary w-full min-h-12 text-sm font-bold shadow-md disabled:cursor-not-allowed disabled:opacity-50 active:opacity-85"
            >
              {busy
                ? "Memproses…"
                : showCampusWarning
                ? "Pilih Kampus Dulu"
                : gratis
                ? "Tayangkan Iklan Sekarang"
                : `Bayar & Tayangkan (${rupiah(totalBiaya)})`}
            </button>

            <p className="text-center text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              Dengan menayangkan iklan, kamu menyetujui{" "}
              <Link href="/syarat-ketentuan" className="font-semibold underline">Ketentuan Komunitas</Link> &{" "}
              <Link href="/kebijakan-privasi" className="font-semibold underline">Privasi</Link>. Calon pembeli akan menghubungimu via WhatsApp.
            </p>

            {msg && <p className="text-center text-xs text-rose-600">{msg}</p>}
          </div>
        </aside>
      </form>

      {/* Modal QRIS */}
      {showQRISModal && createdListing && qrisUrl && (
        <QRISModal
          qrisUrl={qrisUrl}
          fee={qrisFinalAmount ?? fee}
          transactionId={createdOrderId}
          onClose={() => {
            setShowQRISModal(false);
            const waParam = encodeURIComponent(sesiWa || form.seller_wa || "");
            router.push(`/dashboard?pending=1&wa=${waParam}`);
          }}
          onSuccess={() => {
            setShowQRISModal(false);
            const waParam = encodeURIComponent(sesiWa || form.seller_wa || "");
            router.push(`/dashboard?paid=1&wa=${waParam}`);
          }}
        />
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
          if (formatWa(form.seller_wa) !== verifiedNumber) {
            setForm((f) => ({ ...f, seller_wa: verifiedNumber }));
          }
          segarkanSesi();
          const intent = authIntent;
          setAuthIntent(null);
          if (intent === "submit") {
            processListing(verifiedNumber);
          }
        }}
      />
    </div>
  );
}