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
import { cn } from "@/lib/utils";

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
            .catch(() => { });
        }
      }
    }

    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => setCfg(d))
      .catch(() => { });
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

  const descLen = (form.description || "").length;

  return (
    <div className="min-h-screen bg-[#f4faf5] lg:bg-[#ecfeee] dark:bg-[#0a1710] text-[#101f15] dark:text-[#ecfeee]">
      {/* Mobile Sticky Back Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-white/95 dark:bg-[#112218]/95 backdrop-blur-md border-b border-[#134e35]/10">
        <div className="h-14 max-w-md mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Kembali"
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#134e35] hover:bg-[#e6f8e8]"
            >
              <span className="material-symbols-outlined text-[22px]">arrow_back</span>
            </button>
            <h1 className="text-[17px] font-bold text-[#101f15] dark:text-white">Jual Barang</h1>
          </div>
          {sesiWa && (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#e6f8e8] text-[#134e35]">
              {sesiNama || "Aktif"}
            </span>
          )}
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-md lg:max-w-7xl mx-auto px-4 lg:px-6 py-4 lg:py-6 pb-28 lg:pb-16">
        {showCampusWarning && (
          <div className="mb-4 p-3.5 rounded-2xl border border-amber-300 bg-amber-50 text-amber-900 flex items-center gap-2.5 text-xs font-semibold">
            <span className="material-symbols-outlined text-[20px]">warning</span>
            <span>
              Kampus belum dipilih. Lengkapi di{" "}
              <Link href="/dashboard?tab=profil" className="underline font-bold">
                Profil → Pilih Kampus
              </Link>
              .
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT SIDEBAR (Desktop Only) */}
          <aside className="hidden lg:flex lg:col-span-3 flex-col gap-5 sticky top-24">
            <div className="bg-white dark:bg-[#112218] rounded-3xl p-5 shadow-[0_4px_20px_-4px_rgba(19,78,53,0.06)] space-y-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#404943] hover:text-[#003622]"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                Kembali
              </button>
              <div>
                <h1 className="text-[22px] font-extrabold text-[#003622] dark:text-white leading-tight">
                  Jual Barang
                </h1>
                <p className="text-xs text-[#404943] dark:text-[#99d3b2] mt-1 leading-relaxed">
                  Pasang barangmu dan jangkau pembeli di lingkungan kampus.
                </p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-[#e6f8e8] to-[#ceeb7a]/40 p-5 flex flex-col items-center justify-center text-center gap-2">
                <div className="w-12 h-12 rounded-full bg-[#003622] text-[#ceeb7a] flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-[24px]">photo_camera</span>
                </div>
                <span className="text-[10px] font-extrabold tracking-wider text-[#003622] uppercase">
                  CEPAT &amp; TERVERIFIKASI
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-[#112218] rounded-3xl p-5 shadow-[0_4px_20px_-4px_rgba(19,78,53,0.06)] space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-[#ceeb7a] text-[#161f00] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px]">lightbulb</span>
                </span>
                <h2 className="text-sm font-bold text-[#101f15] dark:text-white">Tips Jual Barang</h2>
              </div>
              <ul className="space-y-2.5 text-xs text-[#404943] dark:text-[#99d3b2]">
                {[
                  "Gunakan foto yang jelas dan asli.",
                  "Tulis deskripsi lengkap dan jujur.",
                  "Tentukan harga yang wajar.",
                  "Pilih metode transaksi yang sesuai.",
                ].map((tip) => (
                  <li key={tip} className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[16px] text-[#134e35] dark:text-[#bef264] shrink-0">
                      check_circle
                    </span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* CENTER FORM */}
          <div className="lg:col-span-6 bg-white dark:bg-[#112218] rounded-3xl p-4 sm:p-6 shadow-[0_4px_20px_-4px_rgba(19,78,53,0.06)] space-y-5">
            {/* Mobile Info Banner */}
            <div className="lg:hidden rounded-2xl bg-[#e6f8e8] p-3.5 flex items-center gap-3 border border-[#134e35]/10">
              <div className="w-9 h-9 rounded-xl bg-white text-[#134e35] flex items-center justify-center shrink-0 shadow-xs">
                <span className="material-symbols-outlined text-[20px]">deployed_code</span>
              </div>
              <div>
                <p className="text-xs font-bold text-[#134e35]">Pasang barangmu dengan mudah</p>
                <p className="text-[11px] text-[#404943]">Lengkapi data berikut, lalu terbitkan langsung.</p>
              </div>
            </div>

            <div className="hidden lg:block">
              <h2 className="text-[20px] font-extrabold text-[#101f15] dark:text-white">Form Jual Barang</h2>
              <p className="text-xs text-[#404943] dark:text-[#99d3b2] mt-0.5">
                Lengkapi informasi barangmu, lalu terbitkan langsung.
              </p>
            </div>

            {/* Foto Barang */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#101f15] dark:text-white">
                  Foto Barang <span className="text-[#ba1a1a]">*</span>{" "}
                  <span className="font-normal text-[#707972]">(maks. 5 foto)</span>
                </label>
                <span className="text-[11px] font-bold text-[#404943]">{media.length}/5 foto</span>
              </div>
              <MediaUploader
                media={media}
                setMedia={setMedia}
                max={5}
                error={fileError}
                setError={setFileError}
              />
            </div>

            {/* Nama Barang & Kategori */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="form-title" className="block text-xs font-bold text-[#101f15] dark:text-white mb-1.5">
                  Nama Barang <span className="text-[#ba1a1a]">*</span>
                </label>
                <input
                  id="form-title"
                  value={form.title}
                  onChange={set("title")}
                  required
                  placeholder="Contoh: Tas Kuliah Eiger 20L"
                  className="w-full rounded-xl bg-[#e6f8e8] dark:bg-[#183022] px-3.5 py-2.5 text-sm text-[#101f15] dark:text-white outline-none focus:ring-2 focus:ring-[#134e35]"
                />
              </div>

              <div>
                <label htmlFor="form-category" className="block text-xs font-bold text-[#101f15] dark:text-white mb-1.5">
                  Kategori <span className="text-[#ba1a1a]">*</span>
                </label>
                <select
                  id="form-category"
                  value={form.category}
                  onChange={handleCategoryChange}
                  className="w-full rounded-xl bg-[#e6f8e8] dark:bg-[#183022] px-3.5 py-2.5 text-sm text-[#101f15] dark:text-white outline-none focus:ring-2 focus:ring-[#134e35]"
                >
                  {cats.map((c) => (
                    <option key={c.slug} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Harga & Kondisi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="form-price" className="block text-xs font-bold text-[#101f15] dark:text-white mb-1.5">
                  Harga <span className="text-[#ba1a1a]">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-sm font-bold text-[#134e35]">Rp</span>
                  <input
                    id="form-price"
                    type="text"
                    inputMode="numeric"
                    required
                    value={form.price ? Number(form.price).toLocaleString("id-ID") : ""}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/\D/g, "");
                      setForm((f) => ({ ...f, price: cleaned }));
                    }}
                    placeholder="75.000"
                    className="w-full rounded-xl bg-[#e6f8e8] dark:bg-[#183022] pl-10 pr-3.5 py-2.5 text-sm font-bold text-[#101f15] dark:text-white outline-none focus:ring-2 focus:ring-[#134e35]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#101f15] dark:text-white mb-1.5">
                  Kondisi <span className="text-[#ba1a1a]">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, condition: "new" }))}
                    className={cn(
                      "py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5",
                      form.condition === "new"
                        ? "bg-[#ceeb7a] border-[#134e35] text-[#134e35]"
                        : "bg-[#e6f8e8] border-transparent text-[#404943]"
                    )}
                  >
                    <span>Baru</span>
                    {form.condition === "new" && <span className="material-symbols-outlined text-[15px]">check_circle</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, condition: "used" }))}
                    className={cn(
                      "py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5",
                      form.condition === "used"
                        ? "bg-[#ceeb7a] border-[#134e35] text-[#134e35]"
                        : "bg-[#e6f8e8] border-transparent text-[#404943]"
                    )}
                  >
                    <span>Bekas</span>
                    {form.condition === "used" && <span className="material-symbols-outlined text-[15px]">check_circle</span>}
                  </button>
                </div>
              </div>
            </div>

            {/* Deskripsi Barang */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="form-description" className="block text-xs font-bold text-[#101f15] dark:text-white">
                  Deskripsi Barang <span className="text-[#ba1a1a]">*</span>
                </label>
                <button
                  type="button"
                  onClick={applyCategoryTemplate}
                  className="text-[11px] font-bold text-[#134e35] hover:underline"
                >
                  Isi Template
                </button>
              </div>
              <textarea
                id="form-description"
                rows={4}
                maxLength={500}
                value={form.description}
                onChange={set("description")}
                placeholder="Ceritakan kondisi barang, kelengkapan, ukuran, dan alasan dijual..."
                className="w-full rounded-xl bg-[#e6f8e8] dark:bg-[#183022] p-3.5 text-sm text-[#101f15] dark:text-white outline-none focus:ring-2 focus:ring-[#134e35]"
              />
              <div className="text-right text-[11px] text-[#707972] mt-1">{descLen} / 500</div>
            </div>

            {/* Stok & Tipe */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#101f15] dark:text-white mb-1.5">
                  Stok <span className="text-[#ba1a1a]">*</span>
                </label>
                <div className="flex items-center justify-between bg-[#e6f8e8] dark:bg-[#183022] rounded-xl px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, stock: Math.max(1, Number(f.stock || 1) - 1) }))}
                    className="w-8 h-8 rounded-full bg-white text-[#134e35] font-bold flex items-center justify-center shadow-xs"
                  >
                    -
                  </button>
                  <span className="text-sm font-bold text-[#101f15] dark:text-white">{form.stock || 1}</span>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, stock: Number(f.stock || 1) + 1 }))}
                    className="w-8 h-8 rounded-full bg-white text-[#134e35] font-bold flex items-center justify-center shadow-xs"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="form-type" className="block text-xs font-bold text-[#101f15] dark:text-white mb-1.5">
                  Jenis Listing
                </label>
                <select
                  id="form-type"
                  value={form.type}
                  onChange={set("type")}
                  className="w-full rounded-xl bg-[#e6f8e8] dark:bg-[#183022] px-3.5 py-2.5 text-sm text-[#101f15] dark:text-white outline-none focus:ring-2 focus:ring-[#134e35]"
                >
                  <option value="barang">Jual Barang</option>
                  <option value="sewa">Sewa Barang</option>
                  <option value="poster">Poster / Info</option>
                </select>
              </div>
            </div>

            {/* Lokasi COD & Kontak */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="form-area" className="block text-xs font-bold text-[#101f15] dark:text-white mb-1.5">
                  Lokasi COD <span className="text-[#ba1a1a]">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-[#134e35] text-[18px]">
                    location_on
                  </span>
                  <input
                    id="form-area"
                    value={form.area}
                    onChange={set("area")}
                    placeholder="Contoh: FISIP USU, Perpustakaan, Gerbang Utama"
                    className="w-full rounded-xl bg-[#e6f8e8] dark:bg-[#183022] pl-9 pr-3.5 py-2.5 text-sm text-[#101f15] dark:text-white outline-none focus:ring-2 focus:ring-[#134e35]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="form-seller-name" className="block text-xs font-bold text-[#101f15] dark:text-white mb-1.5">
                  Nama Penjual <span className="text-[#ba1a1a]">*</span>
                </label>
                <input
                  id="form-seller-name"
                  required
                  value={form.seller_name}
                  onChange={set("seller_name")}
                  placeholder="Nama kamu"
                  className="w-full rounded-xl bg-[#e6f8e8] dark:bg-[#183022] px-3.5 py-2.5 text-sm text-[#101f15] dark:text-white outline-none focus:ring-2 focus:ring-[#134e35]"
                />
              </div>

              <div>
                <label htmlFor="form-seller-wa" className="block text-xs font-bold text-[#101f15] dark:text-white mb-1.5">
                  WhatsApp <span className="text-[#ba1a1a]">*</span>
                </label>
                <input
                  id="form-seller-wa"
                  type="tel"
                  inputMode="tel"
                  required
                  maxLength={15}
                  value={form.seller_wa}
                  onChange={handleWaChange}
                  placeholder="0812xxxxxxxx"
                  className="w-full rounded-xl bg-[#e6f8e8] dark:bg-[#183022] px-3.5 py-2.5 text-sm text-[#101f15] dark:text-white outline-none focus:ring-2 focus:ring-[#134e35]"
                />
              </div>
            </div>

            {specConfig?.fields?.length > 0 && (
              <div className="pt-2 border-t border-[#134e35]/10 space-y-3">
                <h3 className="text-xs font-bold text-[#134e35]">Spesifikasi Tambahan ({form.category})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {specConfig.fields.map((field) => (
                    <div key={field.key}>
                      <label htmlFor={`spec-${field.key}`} className="block text-[11px] font-semibold text-[#404943] mb-1">
                        {field.label}
                      </label>
                      <input
                        id={`spec-${field.key}`}
                        value={form.specs?.[field.key] || ""}
                        onChange={handleSpecChange(field.key)}
                        placeholder={field.placeholder}
                        className="w-full rounded-xl bg-[#e6f8e8] px-3 py-2 text-xs text-[#101f15] outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {msg && <p className="text-xs font-semibold text-[#ba1a1a]">{msg}</p>}

            {/* Desktop Action Buttons */}
            <div className="hidden lg:flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => toast.success("Draft tersimpan di browser")}
                className="px-5 py-2.5 rounded-full bg-[#e6f8e8] text-[#003622] text-xs font-bold hover:bg-[#dbeddd] transition-colors"
              >
                Simpan Draft
              </button>
              <button
                type="submit"
                disabled={busy || !!fileError || showCampusWarning}
                className="px-6 py-2.5 rounded-full bg-[#003622] hover:bg-[#134e35] text-white text-xs font-bold shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
                <span>{busy ? "Memproses..." : gratis ? "Terbitkan Barang" : `Bayar & Terbitkan (${rupiah(totalBiaya)})`}</span>
              </button>
            </div>
          </div>

          {/* RIGHT SIDEBAR: PRATINJAU LISTING (Desktop Only) */}
          <aside className="hidden lg:flex lg:col-span-3 flex-col gap-4 sticky top-24">
            <div className="bg-white dark:bg-[#112218] rounded-3xl p-4 shadow-[0_4px_20px_-4px_rgba(19,78,53,0.06)] space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#101f15] dark:text-white">
                <span className="material-symbols-outlined text-[18px] text-[#003622]">visibility</span>
                <span>Pratinjau Listing</span>
              </div>

              <div className="rounded-2xl overflow-hidden border border-[#134e35]/10 bg-[#f4faf5] dark:bg-[#183022]">
                <div className="relative aspect-square w-full bg-[#e6f8e8]">
                  {media[0]?.preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={media[0].preview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[#707972] gap-1">
                      <span className="material-symbols-outlined text-[32px]">image</span>
                      <span className="text-[11px]">Belum ada foto</span>
                    </div>
                  )}
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-[#ceeb7a] text-[#161f00] text-[10px] font-bold">
                    {form.condition === "new" ? "Baru" : "Preloved"}
                  </span>
                </div>
                <div className="p-3.5 space-y-1.5">
                  <h3 className="text-sm font-bold text-[#101f15] dark:text-white line-clamp-1">
                    {form.title.trim() || "Nama Barang Kamu"}
                  </h3>
                  <p className="text-lg font-extrabold text-[#003622] dark:text-[#bef264]">
                    {form.price ? rupiah(Number(form.price)) : "Rp0"}
                  </p>
                  <p className="text-[11px] text-[#404943] dark:text-[#99d3b2] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">location_on</span>
                    COD: {form.area.trim() || "Sekitar Kampus"}
                  </p>
                  <p className="text-[11px] text-[#404943] line-clamp-2 pt-1">
                    {form.description.trim() || "Deskripsi barang akan tampil di sini."}
                  </p>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#e6f8e8] text-[#003622] text-[10px] font-bold mt-1">
                    {form.category}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl bg-[#e6f8e8] p-3 text-[11px] text-[#404943] flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-[#003622] shrink-0">info</span>
                <span>Tampilan ini serupa dengan yang dilihat pembeli di beranda Kampus Kita.</span>
              </div>
            </div>
          </aside>
        </div>

        {/* Mobile Sticky Bottom Action Bar */}
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-[#112218]/95 backdrop-blur-md border-t border-[#134e35]/10 px-4 py-3 pb-safe">
          <div className="max-w-md mx-auto grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => toast.success("Draft tersimpan di browser")}
              className="py-3 rounded-full border border-[#134e35]/20 bg-white text-[#134e35] text-xs font-bold"
            >
              Simpan Draft
            </button>
            <button
              type="submit"
              disabled={busy || !!fileError || showCampusWarning}
              className="py-3 rounded-full bg-[#134e35] text-white text-xs font-bold shadow-md disabled:opacity-50"
            >
              {busy ? "Memproses..." : gratis ? "Terbitkan Barang" : `Bayar (${rupiah(totalBiaya)})`}
            </button>
          </div>
        </div>
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