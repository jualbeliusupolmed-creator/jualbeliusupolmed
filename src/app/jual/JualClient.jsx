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
import { CATEGORIES, MARKETPLACE_WA, POPULAR_AREAS, formatWa } from "@/lib/constants";
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
export default function JualPage() {
  const router = useRouter();
  const [form, setForm] = useState({
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
  });
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
  const [areaOption, setAreaOption] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [agreedPdp, setAgreedPdp] = useState(true);

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

  const handleAreaOptionChange = (e) => {
    const val = e.target.value;
    setAreaOption(val);
    if (val !== "Lainnya") {
      setForm((f) => ({ ...f, area: val }));
    }
  };

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

      localStorage.setItem("seller_wa", formattedWa);
      localStorage.setItem("seller_name", form.seller_name);

      if (data.isDistributor) {
        const feeInfo = data.distributorFee > 0 ? ` Fee bagi hasil: ${rupiah(data.distributorFee)}` : "";
        toast.success(`Iklan berhasil ditayangkan! (Gratis via Distributor)${feeInfo}`);
        const waParam = encodeURIComponent(formattedWa);
        router.push(`/dashboard?wa=${waParam}`);
        return;
      }

      if (data.punyaToko) {
        toast.success("Iklan langsung tayang — gratis karena kamu punya toko! ");
        router.push(`/dashboard?wa=${encodeURIComponent(formattedWa)}`);
        return;
      }

      if (data.isPro || data.isFreeMode || gratis || !data.paymentUrl) {
        toast.success("Iklan berhasil ditayangkan! (100% Gratis - Pasar Bebas)");
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
    <div className="mx-auto max-w-4xl px-4 py-6">


      <h1 className="text-2xl font-extrabold">{form.type === "sewa" ? "Sewakan Barang" : "Jual Barang"}</h1>

      {/* Punya toko = iklan gratis. Disebut di ATAS, bukan cuma di rincian
          biaya paling bawah: yang belum punya toko masih sempat membuatnya
          sebelum mengetik apa pun. */}
      {isFreeMode ? (
        <div className="mt-3 rounded-2xl border border-emerald-300 bg-emerald-50 px-5 py-4 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 shadow-sm flex items-start gap-3">
          <Icon.Sparkles className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
          <div>
            <strong>🔥 Mode Pasar Bebas Aktif: Pasang Iklan 100% GRATIS!</strong>
            <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">
              Khusus mahasiswa USU & POLMED, pasang iklan tanpa biaya tayang dan bebas komisi penjualan. Iklanmu langsung aktif & otomatis disebarkan ke grup WA!
            </p>
          </div>
        </div>
      ) : sellerPunyaToko ? (
        <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-300 shadow-sm flex items-start gap-3">
          <Icon.Store className="h-5 w-5 shrink-0" />
          <div>
            <strong>Iklanmu gratis</strong> — kamu sudah punya toko, jadi tidak ada biaya tayang.
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-5 py-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-300 shadow-sm flex items-start gap-3">
          <Icon.Store className="h-5 w-5 shrink-0" />
          <div>
            Punya toko fisik di sekitar kampus? <strong>Daftar Toko Mitra & Berlangganan.</strong>{" "}
            <Link href="/dashboard?tab=profil" className="font-semibold underline hover:text-amber-700 dark:hover:text-amber-100 transition">Daftarkan tokomu</Link> (syarat: memiliki toko fisik & paket langganan aktif) untuk pasang iklan sepuasnya tanpa biaya tayang per barang.
          </div>
        </div>
      )}
      <p className="mt-1 text-gray-500">
        {gratis
          ? `Isi detail ${form.type === "sewa" ? "barang sewaan" : "barang"}, tekan kirim, iklan langsung tayang — tanpa biaya.`
          : `Isi detail ${form.type === "sewa" ? "barang sewaan" : "barang"}, bayar biaya tayang, iklan langsung tampil setelah pembayaran sukses.`}
      </p>

      {/* Quick Trust Indicators Banner (18.html blueprint) */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-[#047857] dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Icon.ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] text-slate-500 leading-none">Terverifikasi</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">Mahasiswa Aktif</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Icon.Clock className="w-5 h-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] text-slate-500 leading-none">Rerata Terjual</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">&lt; 36 Jam</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-[#047857] dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Icon.Sparkles className="w-5 h-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] text-slate-500 leading-none">Admin Fee</span>
            <span className="text-xs font-bold text-[#047857] dark:text-emerald-400 truncate mt-0.5">Gratis 100% (0% Komisi)</span>
          </div>
        </div>
      </div>

      <form onSubmit={handlePreviewClick} className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Upload */}
          <div className="card p-4">
            <label className="label">Foto Barang</label>
            <MediaUploader
              media={media}
              setMedia={setMedia}
              max={5}
              error={fileError}
              setError={setFileError}
            />
          </div>

          <div className="card grid gap-5 p-5 sm:grid-cols-2">
            <div>
              <label className="label">Tipe Iklan</label>
              <select className="input focus:ring-4 focus:ring-accent/10 focus:border-accent" value={form.type} onChange={set("type")}>
                <option value="barang">Barang — {rupiah(adFeeFor("barang", form.price))}</option>
                <option value="sewa">Sewa — {rupiah(adFeeFor("barang", form.price))}</option>
                <option value="poster">Poster — {rupiah(adFeeFor("poster"))}</option>
              </select>
            </div>
            {form.type === "sewa" && (
              <div>
                <label className="label">Periode Sewa</label>
                <select className="input focus:ring-4 focus:ring-accent/10 focus:border-accent" value={form.rental_period} onChange={set("rental_period")}>
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
              <label className="label">Kategori</label>
              <select className="input focus:ring-4 focus:ring-accent/10 focus:border-accent" value={form.category} onChange={handleCategoryChange}>
                {cats.map((c) => (
                  <option key={c.slug} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Target Area</label>
              <CampusSelect className="input focus:ring-4 focus:ring-accent/10 focus:border-accent" value={form.campus} onChange={(value) => setForm((current) => ({ ...current, campus: value }))} />
            </div>
            <div>
              <label className="label">Lokasi COD</label>
              <select
                className="input focus:ring-4 focus:ring-accent/10 focus:border-accent"
                value={areaOption}
                onChange={handleAreaOptionChange}
              >
                <option value="">Pilih Lokasi COD</option>
                {POPULAR_AREAS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
                <option value="Lainnya">Lainnya (Ketik Manual)</option>
              </select>
            </div>
            {areaOption === "Lainnya" && (
              <div className="floating-group mt-5">
                <input 
                  id="form-area"
                  className="floating-input peer" 
                  value={form.area} 
                  onChange={set("area")} 
                  placeholder=" "
                  required
                />
                <label htmlFor="form-area" className="floating-label">Ketik Manual Lokasi COD (misal: Fasilkom, Gedung C)</label>
              </div>
            )}
            
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
                  Bikin format iklan lebih rapi dan seragam untuk pembeli maupun bot WA.
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

          {/* Metode Pembayaran */}
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Metode & Biaya</h3>
            <div className="grid gap-3 sm:grid-cols-1">
              <div
                className={`flex flex-col text-left p-4 rounded-xl border-2 transition-all ${
                  isFreeMode || gratis
                    ? "border-emerald-500 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20"
                    : "border-primary bg-primary/5 dark:border-slate-700 dark:bg-slate-800/50"
                }`}
              >
                <span className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                  {isFreeMode || gratis ? "🎉 100% Gratis (Masa Promo Mahasiswa)" : "QRIS + verifikasi struk"}
                </span>
                <span className="text-xs text-gray-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  {isFreeMode || gratis ? (
                    <>
                      Biaya normal <span className="line-through text-gray-400">Rp 5.000</span> menjadi <strong className="text-emerald-600 dark:text-emerald-400">Rp 0</strong>. Pratinjau iklanmu, lalu klik Tayangkan. Iklan akan ditinjau tim moderasi sebelum tayang dan disebarkan ke grup WhatsApp.
                    </>
                  ) : (
                    "Scan QRIS yang muncul setelah ini, lalu unggah foto struknya di layar yang sama. Strukmu diperiksa otomatis dan iklan langsung aktif kalau cocok."
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Preview, Ringkasan, & Tips Cepat Laku (18.html blueprint) */}
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
                    <span className="text-[11px] font-medium">Unggah foto di samping</span>
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
                    {form.campus === "Semua" ? "USU • POLMED" : form.campus}
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
                <dd className="font-medium dark:text-white">
                  {gratis ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="line-through text-gray-400 text-xs">Rp 5.000</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">Gratis selama masa promo</span>
                    </span>
                  ) : (
                    rupiah(fee)
                  )}
                </dd>
              </div>
              <div className="my-2 border-t dark:border-slate-800" />
              <div className="flex justify-between text-base">
                <dt className="font-semibold dark:text-white">Total bayar</dt>
                <dd className="font-extrabold text-primary dark:text-white">
                  {gratis ? <span className="text-emerald-600 dark:text-emerald-400">Rp 0</span> : rupiah(fee)}
                </dd>
              </div>
            </dl>

            <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">
              <span className="font-semibold">🛡️ Peninjauan Iklan:</span> Iklan akan ditinjau terlebih dahulu sebelum tayang dan disebarkan ke grup WhatsApp.
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800">
              <label className="flex items-start gap-2.5 text-xs text-gray-600 dark:text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  required
                  checked={agreedPdp}
                  onChange={(e) => setAgreedPdp(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary shrink-0"
                />
                <span className="leading-relaxed">
                  Saya menyetujui{" "}
                  <Link href="/syarat-ketentuan" target="_blank" className="font-semibold text-primary underline">Syarat &amp; Ketentuan</Link>
                  {" "}serta{" "}
                  <Link href="/kebijakan-privasi" target="_blank" className="font-semibold text-primary underline">Kebijakan Privasi</Link>
                  {" "}sesuai UU PDP No. 27/2022, menyatakan barang bukan barang terlarang (bebas rokok/vape/alkohol/obat), serta menyetujui nomor WhatsApp dihubungi calon pembeli.
                </span>
              </label>
            </div>

            <button type="submit" disabled={busy || !!fileError || !agreedPdp} className="btn-primary mt-4 w-full">
              Pratinjau Iklan
            </button>
            {msg && <p className="mt-3 text-sm text-rose-600">{msg}</p>}
          </div>
          <div className="card p-4 text-sm text-gray-500 dark:text-slate-400">
            <p className="font-semibold text-gray-700 dark:text-slate-300">ℹ Transaksi Bebas Komisi 0%</p>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Semua pemasangan iklan dan hasil penjualan 100% milik penjual. Transaksi COD langsung dibayar oleh pembeli tanpa potongan fee platform.
            </p>
          </div>

          {/* Tips Cepat Laku di Kampus Kita (18.html blueprint) */}
          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/40 text-xs space-y-2">
            <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <Icon.Sparkles className="w-4 h-4 text-amber-600" />
              Tips Cepat Laku di Kampus Kita:
            </span>
            <ul className="space-y-1.5 text-amber-800/90 dark:text-amber-300/90 pl-1">
              <li>• <strong>Foto di spot kampus:</strong> Foto dekat Gazebo, Kantin, atau Perpus bikin pembeli lebih yakin.</li>
              <li>• <strong>Harga Mahasiswa:</strong> Pasang harga bersaing agar cepat dihubungi calon pembeli.</li>
              <li>• <strong>Jelaskan Kondisi Jujur:</strong> Sebutkan kelengkapan &amp; alasan jual di deskripsi.</li>
              <li>• <strong>Titik COD Aman:</strong> Sepakati COD di Pendopo USU atau Gedung Z POLMED.</li>
            </ul>
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
        onClose={() => setShowAuthModal(false)}
        initialWa={formatWa(form.seller_wa) || ""}
        onSuccess={(verifiedWa) => {
          setShowAuthModal(false);
          // Auto-fill form jika WA berubah saat di modal
          if (verifiedWa && formatWa(form.seller_wa) !== verifiedWa) {
             setForm(f => ({ ...f, seller_wa: verifiedWa }));
          }
          // Sesi bersama ikut disegarkan, supaya halaman lain (dan gerbang
          // di atas) langsung tahu orang ini sudah masuk — tanpa menunggu
          // pemuatan ulang.
          segarkanSesi();
          // Setelah berhasil auth, lanjutkan proses listing
          processListing(verifiedWa);
        }}
      />
    </div>
  );
}
