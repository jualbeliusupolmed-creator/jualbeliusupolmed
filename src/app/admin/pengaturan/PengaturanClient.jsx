"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icons";
import { PageHeader } from "@/components/admin/ui";

function Card({ title, children, className = "" }) {
  return (
    <div className={`g-card g-card-pad ${className}`}>
      {title && <h2 className="text-sm font-bold uppercase tracking-wider mb-4 text-gray-800 dark:text-gray-200">{title}</h2>}
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-xs font-semibold mb-1" style={{ color: "var(--g-ink-soft)" }}>{label}</span>
      {children}
    </label>
  );
}

function detectMode(p) {
  const ad = Number(p.adBarang || 0);
  const bump = Number(p.bump || 0);
  const featured = Number(p.featuredPerDay || 0);
  const adPoster = Number(p.adPoster || 0);
  const hasSold = (p.soldTiers || []).some(t => t.pct > 0 || t.flat > 0);
  const hasAdCost = ad > 0 || (p.adTiers || []).some(t => t.pct > 0 || (t.flat > 0 && t.upto != null));
  if (ad === 0 && bump === 0 && featured === 0 && adPoster === 0 && !hasSold)
    return { key: "gratis_semua", label: " Gratis Semua", bg: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" };
  if (ad === 0 && hasSold && !hasAdCost)
    return { key: "jual_dulu", label: " Jual Dulu (Komisi)", bg: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" };
  if (ad === 0 && !hasSold && (bump > 0 || featured > 0))
    return { key: "freemium", label: " Freemium (Upsell)", bg: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" };
  if (hasAdCost || ad > 0)
    return { key: "sewa_lapak", label: " Sewa Lapak", bg: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" };
  return { key: "custom", label: " Custom", bg: "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300" };
}

export default function PengaturanClient({ initialSettings = {} }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  async function action(body, okMsg) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Aksi gagal");
      if (data.warning) setToast({ type: "err", msg: data.warning });
      else setToast({ type: "ok", msg: okMsg || "Berhasil" });
      router.refresh();
      return true;
    } catch (e) {
      setToast({ type: "err", msg: e.message });
      return false;
    } finally {
      setBusy(false);
    }
  }

  const [pricing, setPricing] = useState(initialSettings.pricing || {});
  const [contact, setContact] = useState(initialSettings.contact || {});
  const [site, setSite] = useState(initialSettings.site || {});
  const [adminCfg, setAdminCfg] = useState(initialSettings.admin || {});
  const [metaCfg, setMetaCfg] = useState(initialSettings.meta || {});
  const [botCfg, setBotCfg] = useState(initialSettings.bot || {});
  const [messages, setMessages] = useState(initialSettings.messages || {});
  const [areas, setAreas] = useState((initialSettings.areas || []).join("\n"));
  const [popupAd, setPopupAd] = useState(initialSettings.popupAd || { enabled: false, title: "", imageUrl: "", targetUrl: "", buttonText: "Lihat Selengkapnya" });
  const [aiCfg, setAiCfg] = useState(initialSettings.ai_config || { model: "gemini-2.0-flash", memory: "", personality: "" });
  const [botKeywords, setBotKeywords] = useState(initialSettings.bot_keywords || { enabled: true, greeting_enabled: false, greeting: "", triggers: "", min_price_digits: 4 });
  const [ukmInviteCode, setUkmInviteCode] = useState(initialSettings.ukmInviteCode || "KAMPUS_USU_POLMED_2026");
  const [autoExpire, setAutoExpire] = useState(!!initialSettings.autoExpire);
  const [madingCfg, setMadingCfg] = useState(initialSettings.mading || { requireLogin: true });

  const [kadaluarsa, setKadaluarsa] = useState(null);
  const [memuatKadaluarsa, setMemuatKadaluarsa] = useState(false);
  const [galatKadaluarsa, setGalatKadaluarsa] = useState("");
  const [bisaBatal, setBisaBatal] = useState(false);

  async function lihatKadaluarsa() {
    setMemuatKadaluarsa(true);
    setGalatKadaluarsa("");
    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "peek_expired" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat");
      setKadaluarsa(data);
    } catch (e) {
      setGalatKadaluarsa(e.message || "Gagal memuat");
    } finally {
      setMemuatKadaluarsa(false);
    }
  }

  const [saved, setSaved] = useState("");
  const [showPriceConfirm, setShowPriceConfirm] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const match = (k) => !searchQuery || k.toLowerCase().includes(searchQuery.toLowerCase());

  function flash(k) { setSaved(k); setTimeout(() => setSaved(""), 2000); }
  const numP = (k) => (e) => setPricing({ ...pricing, [k]: Math.max(0, Number(e.target.value) || 0) });
  const tiers = pricing.soldTiers || [];
  const setTiers = (t) => setPricing({ ...pricing, soldTiers: t });
  const adTiers = pricing.adTiers || [];
  const setAdTiers = (t) => setPricing({ ...pricing, adTiers: t });

  async function handleFileUpload(e, type) {
    const file = e.target.files?.[0];
    if (!file) return;

    const isLogo = type === "logo";
    if (isLogo) setUploadingLogo(true);
    else setUploadingFavicon(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("bucket", `site-${type}`);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload gagal");

      const updatedSite = { ...site, [isLogo ? "logoUrl" : "faviconUrl"]: data.url };
      setSite(updatedSite);

      await action({ action: "save_settings", key: "site", value: updatedSite }, `${isLogo ? "Logo" : "Favicon"} berhasil diperbarui`);
    } catch (err) {
      alert(`Gagal mengunggah ${type}: ` + err.message);
    } finally {
      if (isLogo) setUploadingLogo(false);
      else setUploadingFavicon(false);
    }
  }

  const applyTemplate = (mode) => {
    let p = { ...pricing };
    if (mode === "sewa_lapak") {
      p.adTiers = [
        { upto: 50000, flat: 2000 },
        { upto: 100000, flat: 3000 },
        { upto: 500000, flat: 5000 },
        { upto: 1000000, flat: 7000 },
        { upto: null, pct: 1 },
      ];
      p.soldTiers = [];
      p.bump = 1000;
      p.featuredPerDay = 5000;
      p.adBarang = 2000;
    } else if (mode === "jual_dulu") {
      p.adTiers = [{ upto: null, flat: 0 }];
      p.soldTiers = [
        { upto: 50000, flat: 0 },
        { upto: 100000, pct: 10 },
        { upto: null, pct: 5 },
      ];
      p.bump = 1000;
      p.featuredPerDay = 5000;
      p.adBarang = 0;
    } else if (mode === "freemium") {
      p.adTiers = [{ upto: null, flat: 0 }];
      p.soldTiers = [];
      p.bump = 2000;
      p.featuredPerDay = 5000;
      p.adBarang = 0;
    } else if (mode === "gratis_semua") {
      p.adTiers = [{ upto: null, flat: 0 }];
      p.soldTiers = [];
      p.bump = 0;
      p.featuredPerDay = 0;
      p.adBarang = 0;
      p.adPoster = 0;
      p.renewalFee = 0;
    }
    setPricing(p);
  };

  return (
    <div>
      {toast && <div className={`g-toast${toast.type === "err" ? " is-bad" : ""}`}>{toast.msg}</div>}
      <PageHeader title="Pengaturan Sistem" />

      <div className="space-y-6">
        {/* PENCARIAN PENGATURAN */}
        <div className="relative mb-6 bg-[var(--g-bg)]/80">
          <div className="relative max-w-2xl">
            <input
              type="text"
              placeholder="Cari sub-pengaturan (contoh: meta, harga, bot, admin, wa)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="g-field w-full pl-11"
            />
            <svg className="absolute left-3.5 top-3 h-5 w-5" style={{ color: "var(--g-ink-faint)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
        </div>

        {/* Iklan yang tenggatnya lewat. */}
        <Card title="Iklan Kadaluarsa">
          <p className="text-sm" style={{ color: "var(--g-ink-soft)" }}>
            Iklan yang sudah lewat masa tayang tapi masih berstatus aktif. Menurunkannya
            membuat statusnya jadi <code>expired</code> — penjual bisa memperpanjang dari
            dashboard masing-masing.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button onClick={lihatKadaluarsa} disabled={memuatKadaluarsa} className="g-btn g-btn-outlined">
              {memuatKadaluarsa ? "Memeriksa…" : "Periksa"}
            </button>
            {kadaluarsa?.jumlah > 0 && (
              <button
                className="g-btn g-btn-primary"
                onClick={async () => {
                  const yakin = window.confirm(
                    `${kadaluarsa.jumlah} iklan akan berubah jadi "expired" dan hilang dari pencarian.\n\nPenjualnya bisa memperpanjang sendiri dari dashboard.\n\nLanjutkan?`
                  );
                  if (!yakin) return;
                  const ok = await action({ action: "expire_now" }, "Iklan kadaluarsa diturunkan");
                  if (ok) { setKadaluarsa(null); setBisaBatal(true); }
                }}
              >
                Turunkan {kadaluarsa.jumlah} iklan
              </button>
            )}
          </div>

          {bisaBatal && (
            <div className="mt-3 rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
              <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                Salah tekan? Pembatalan mengembalikan status iklannya saja — tenggatnya
                tidak diubah dan tidak ada pengumuman apa pun yang dikirim.
              </p>
              <button
                className="g-btn g-btn-outlined mt-2 text-xs"
                onClick={async () => {
                  const ok = await action({ action: "unexpire_now" }, "Penurunan dibatalkan");
                  if (ok) { setBisaBatal(false); setKadaluarsa(null); }
                }}
              >
                Batalkan penurunan terakhir
              </button>
            </div>
          )}

          {galatKadaluarsa && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">{galatKadaluarsa}</p>
          )}

          {kadaluarsa && (
            <div className="mt-4">
              {kadaluarsa.jumlah === 0 ? (
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  Tidak ada iklan yang menunggak.
                </p>
              ) : (
                <>
                  <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                    {kadaluarsa.jumlah} iklan sudah lewat masa tayang.
                  </p>
                  <ul className="mt-2 space-y-1 text-xs" style={{ color: "var(--g-ink-soft)" }}>
                    {kadaluarsa.iklan.map((l) => (
                      <li key={l.id} className="flex justify-between gap-3 border-b border-black/[0.04] py-1 dark:border-white/[0.06]">
                        <span className="truncate">{l.title} — {l.seller_name || "?"}</span>
                        <span className="shrink-0 tabular-nums">lewat {l.hari} hari</span>
                      </li>
                    ))}
                  </ul>
                  {kadaluarsa.jumlah > kadaluarsa.iklan.length && (
                    <p className="mt-1 text-xs" style={{ color: "var(--g-ink-faint)" }}>
                      …dan {kadaluarsa.jumlah - kadaluarsa.iklan.length} lainnya.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          <label className="mt-5 flex items-start gap-3 border-t border-black/[0.05] pt-4 dark:border-white/[0.08]">
            <input
              type="checkbox"
              className="mt-0.5 h-5 w-5 accent-primary"
              checked={!!autoExpire}
              onChange={(e) => {
                setAutoExpire(e.target.checked);
                action(
                  { action: "save_settings", key: "autoExpire", value: e.target.checked },
                  e.target.checked ? "Penurunan otomatis DINYALAKAN" : "Penurunan otomatis dimatikan"
                );
              }}
            />
            <span className="text-sm text-gray-600 dark:text-slate-300">
              <strong>Turunkan otomatis setiap hari.</strong>{" "}
              <span className="text-gray-500 dark:text-slate-400">
                Cron harian akan menurunkannya sendiri. Sebaiknya dinyalakan setelah
                tunggakan di atas diberesi — kalau tidak, semuanya turun sekaligus pada
                cron berikutnya tanpa kamu melihat dulu apa yang hilang.
              </span>
            </span>
          </label>
        </Card>

        <Card title="Alur Pembayaran">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Penjual membayar lewat <strong>QRIS statis</strong>, lalu mengunggah foto struknya.
            Struk itu diperiksa AI di <code>/api/payments/verify-receipt</code>; kalau cocok,
            pembayaran ditandai lunas dan iklannya aktif. Yang tidak cocok masuk ke
            <strong> Approve Payment</strong> untuk diperiksa manusia.
          </p>
          <p className="mt-3 text-xs text-gray-400 dark:text-slate-500">
            Belum ada callback penyedia pembayaran (QRIS dinamis) yang terpasang, jadi tidak ada
            mode lain yang bisa dipilih di sini.
          </p>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* HARGA & BIAYA */}
          <Card title="Harga & Biaya" className={match("harga biaya tarif sewa lapak jual dulu freemium gratis iklan bump sundul featured komisi laku tier batas limit dicari free") ? "" : "hidden"}>
            <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-900/20">
              <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">Template Monetisasi Cepat</p>
                {(() => {
                  const m = detectMode(pricing); return (
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${m.bg}`}>
                      Mode aktif: {m.label}
                    </span>
                  );
                })()}
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => { applyTemplate("sewa_lapak"); setShowPriceConfirm(false); }} className={`g-btn g-btn-sm g-btn-outlined whitespace-normal h-auto py-1.5 text-center leading-tight text-[10px] sm:text-xs flex-1 min-w-[140px] ${detectMode(pricing).key === "sewa_lapak" ? "ring-2 ring-amber-400" : ""}`}>1. Sewa Lapak (Bayar Iklan)</button>
                <button onClick={() => { applyTemplate("jual_dulu"); setShowPriceConfirm(false); }} className={`g-btn g-btn-sm g-btn-outlined whitespace-normal h-auto py-1.5 text-center leading-tight text-[10px] sm:text-xs flex-1 min-w-[140px] ${detectMode(pricing).key === "jual_dulu" ? "ring-2 ring-blue-400" : ""}`}>2. Jual Dulu (Komisi Laku)</button>
                <button onClick={() => { applyTemplate("freemium"); setShowPriceConfirm(false); }} className={`g-btn g-btn-sm g-btn-outlined whitespace-normal h-auto py-1.5 text-center leading-tight text-[10px] sm:text-xs flex-1 min-w-[140px] ${detectMode(pricing).key === "freemium" ? "ring-2 ring-purple-400" : ""}`}>3. Freemium (Hanya Upsell)</button>
                <button onClick={() => { applyTemplate("gratis_semua"); setShowPriceConfirm(false); }} className={`g-btn g-btn-sm whitespace-normal h-auto py-1.5 text-center leading-tight text-[10px] sm:text-xs flex-1 min-w-[140px] ${detectMode(pricing).key === "gratis_semua" ? "ring-2 ring-green-400" : ""}`} style={{ background: "var(--g-green-soft)", color: "var(--g-green)" }}>4. Gratis Semua</button>
              </div>
              <p className="mt-2 text-[10px] text-gray-500">Klik tombol di atas untuk mengisi otomatis tarif di bawah ini, lalu klik Simpan Harga.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Iklan barang"><input type="number" className="g-field" value={pricing.adBarang ?? ""} onChange={numP("adBarang")} /></Field>
              <Field label="Iklan poster"><input type="number" className="g-field" value={pricing.adPoster ?? ""} onChange={numP("adPoster")} /></Field>
              <Field label="Bump / sundul"><input type="number" className="g-field" value={pricing.bump ?? ""} onChange={numP("bump")} /></Field>
              <Field label="Featured / hari"><input type="number" className="g-field" value={pricing.featuredPerDay ?? ""} onChange={numP("featuredPerDay")} /></Field>
              <Field label="Featured maks / hari"><input type="number" className="g-field" value={pricing.featuredMaxPerDay ?? ""} onChange={numP("featuredMaxPerDay")} /></Field>
              <Field label="Durasi Iklan (hari)">
                <input
                  type="number"
                  min="1"
                  max="365"
                  className="g-field"
                  value={pricing.listingDays ?? 14}
                  onChange={numP("listingDays")}
                />
                <p className="mt-1 text-xs text-gray-400">Iklan aktif selama berapa hari setelah pembayaran. Default: 14 hari.</p>
              </Field>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tier biaya iklan (berdasarkan harga barang)</p>
              <button onClick={() => setAdTiers([...adTiers, { upto: null, flat: 5000 }])} className="text-xs text-blue-600 hover:underline">+ Tambah tier</button>
            </div>
            <div className="mt-2 space-y-2">
              {adTiers.map((t, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs">
                  <input type="number" className="g-field w-24" placeholder="< batas Rp" value={t.upto ?? ""} onChange={(e) => { const c = [...adTiers]; c[i] = { ...t, upto: e.target.value === "" ? null : Number(e.target.value) }; setAdTiers(c); }} />
                  <input type="number" className="g-field w-20" placeholder="flat Rp" value={t.flat ?? ""} onChange={(e) => { const c = [...adTiers]; c[i] = { ...t, flat: e.target.value === "" ? undefined : Number(e.target.value) }; setAdTiers(c); }} />
                  <input type="number" className="g-field w-16" placeholder="%" value={t.pct ?? ""} onChange={(e) => { const c = [...adTiers]; c[i] = { ...t, pct: e.target.value === "" ? undefined : Number(e.target.value) }; setAdTiers(c); }} />
                  <button onClick={() => setAdTiers(adTiers.filter((_, j) => j !== i))} className="g-icon-btn text-rose-600" aria-label="Hapus tingkat"><Icon.X className="h-4 w-4" /></button>
                </div>
              ))}
              <p className="text-[11px] text-gray-400">Biaya pasang iklan sesuai harga barang. Kosongkan batas untuk tier akhir. Isi flat (Rp) atau % dari harga.</p>
            </div>
            <hr className="my-3 border-gray-100 dark:border-slate-800" />
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Fee setelah terjual</p>
              <button onClick={() => setTiers([...tiers, { upto: null, pct: 5 }])} className="text-xs text-blue-600 hover:underline">+ Tambah tier</button>
            </div>
            <div className="mt-2 space-y-2">
              {tiers.map((t, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs">
                  <input type="number" className="g-field w-24" placeholder="< batas" value={t.upto ?? ""} onChange={(e) => { const c = [...tiers]; c[i] = { ...t, upto: e.target.value === "" ? null : Number(e.target.value) }; setTiers(c); }} />
                  <input type="number" className="g-field w-20" placeholder="flat Rp" value={t.flat ?? ""} onChange={(e) => { const c = [...tiers]; c[i] = { ...t, flat: e.target.value === "" ? undefined : Number(e.target.value) }; setTiers(c); }} />
                  <input type="number" className="g-field w-16" placeholder="%" value={t.pct ?? ""} onChange={(e) => { const c = [...tiers]; c[i] = { ...t, pct: e.target.value === "" ? undefined : Number(e.target.value) }; setTiers(c); }} />
                  <button onClick={() => setTiers(tiers.filter((_, j) => j !== i))} className="g-icon-btn text-rose-600" aria-label="Hapus tingkat"><Icon.X className="h-4 w-4" /></button>
                </div>
              ))}
              <p className="text-[11px] text-gray-400">Kosongkan "&lt; batas" untuk tier teratas. Isi flat atau %.</p>
            </div>
            <Field label="Limit DICARI gratis per user">
              <input type="number" min="1" className="g-field" value={pricing.dicariFreeLimt ?? 3} onChange={(e) => setPricing({ ...pricing, dicariFreeLimt: Math.max(1, Number(e.target.value) || 3) })} />
              <p className="mt-1 text-xs text-gray-400">Berapa kali user bisa post DICARI gratis. Default: 3.</p>
            </Field>
            {!showPriceConfirm ? (
              <button
                onClick={() => setShowPriceConfirm(true)}
                className="g-btn g-btn-primary mt-4 w-full"
              >
                {saved === "pricing" ? " Tersimpan" : "Simpan Harga"}
              </button>
            ) : (
              <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <p className="mb-3 text-sm font-medium dark:text-white">Kirim pemberitahuan perubahan harga ke grup WA?</p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={async () => {
                      await action({ action: "save_settings", key: "pricing", value: pricing }, "Harga disimpan");
                      flash("pricing"); setShowPriceConfirm(false);
                    }}
                    className="g-btn g-btn-outlined flex-1 text-sm"
                  >
                    Simpan Saja
                  </button>
                  <button
                    onClick={async () => {
                      await action({ action: "save_settings", key: "pricing", value: pricing }, "Harga disimpan");
                      flash("pricing");
                      await action({ action: "notify_group_pricing", pricing }, "Notifikasi harga dikirim ke grup");
                      setShowPriceConfirm(false);
                    }}
                    className="g-btn g-btn-primary flex-1 text-sm"
                  >
                    Simpan + Kirim ke Grup WA
                  </button>
                  <button
                    onClick={() => setShowPriceConfirm(false)}
                    className="w-full text-xs text-gray-400 hover:text-gray-600 mt-1"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}
          </Card>

          {/* KONTAK DUKUNGAN */}
          <Card title="Kontak & Dukungan" className={match("kontak dukungan wa whatsapp email cs admin customer service") ? "" : "hidden"}>
            <div className="space-y-3">
              <Field label="Nomor WA Marketplace"><input className="g-field" value={contact.marketplaceWa ?? ""} onChange={(e) => setContact({ ...contact, marketplaceWa: e.target.value })} /></Field>
              <Field label="Link Grup WhatsApp"><input className="g-field" value={contact.waGroupLink ?? ""} onChange={(e) => setContact({ ...contact, waGroupLink: e.target.value })} /></Field>
              <Field label="Email Dukungan"><input type="email" className="g-field" value={contact.supportEmail ?? ""} onChange={(e) => setContact({ ...contact, supportEmail: e.target.value })} /></Field>
              <Field label="Nomor Telepon Dukungan"><input className="g-field" value={contact.supportPhone ?? ""} onChange={(e) => setContact({ ...contact, supportPhone: e.target.value })} /></Field>
              <Field label="Alamat Kantor/Dukungan"><textarea className="g-field min-h-16 w-full" value={contact.supportAddress ?? ""} onChange={(e) => setContact({ ...contact, supportAddress: e.target.value })} /></Field>
            </div>
            <button onClick={() => { action({ action: "save_settings", key: "contact", value: contact }, "Kontak disimpan"); flash("contact"); }} className="g-btn g-btn-primary mt-4 w-full">{saved === "contact" ? " Tersimpan" : "Simpan Kontak"}</button>
          </Card>

          {/* BRANDING & IDENTITAS VISUAL */}
          <Card title="Identitas Visual (Logo & Favicon)" className={match("identitas visual logo favicon icon gambar web situs") ? "" : "hidden"}>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Logo Web</label>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-slate-800 dark:bg-slate-900 flex items-center justify-center">
                    {site.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={site.logoUrl} alt="Logo Preview" className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-[10px] text-gray-400 text-center font-medium">Default SVG</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, "logo")} disabled={uploadingLogo} className="hidden" id="logo-upload-input" />
                    <label htmlFor="logo-upload-input" className="g-btn g-btn-outlined text-xs inline-block cursor-pointer px-4 py-2">
                      {uploadingLogo ? "Mengunggah..." : "Unggah Logo Baru"}
                    </label>
                    {site.logoUrl && (
                      <button onClick={() => { const u = { ...site, logoUrl: "" }; setSite(u); action({ action: "save_settings", key: "site", value: u }, "Logo dikembalikan ke default"); }} className="text-xs text-rose-600 block mt-1 hover:underline">
                        Reset ke Default
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <hr className="border-gray-100 dark:border-slate-800" />

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Favicon Web</label>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 p-2 dark:border-slate-800 dark:bg-slate-900 flex items-center justify-center">
                    {site.faviconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={site.faviconUrl} alt="Favicon Preview" className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-[10px] text-gray-400 text-center font-medium">Default</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, "favicon")} disabled={uploadingFavicon} className="hidden" id="favicon-upload-input" />
                    <label htmlFor="favicon-upload-input" className="g-btn g-btn-outlined text-xs inline-block cursor-pointer px-4 py-2">
                      {uploadingFavicon ? "Mengunggah..." : "Unggah Favicon Baru"}
                    </label>
                    {site.faviconUrl && (
                      <button onClick={() => { const u = { ...site, faviconUrl: "" }; setSite(u); action({ action: "save_settings", key: "site", value: u }, "Favicon dikembalikan ke default"); }} className="text-xs text-rose-600 block mt-1 hover:underline">
                        Reset ke Default
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* TATA LETAK BERANDA */}
          <Card title="Tata Letak Beranda" className={match("tata letak layout beranda home ucapan welcome teks sambutan hero populer banner") ? "" : "hidden"}>
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Geser urutan atau hapus seksi yang tidak ingin ditampilkan. Tersedia: hero, featured, main.
              </p>
              <div className="flex gap-2">
                {(site.layoutOrder || ["hero", "featured", "main"]).map((key, i) => (
                  <span key={i} className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 text-sm dark:bg-slate-800 dark:text-slate-200">
                    {key}
                    <button onClick={() => {
                      const newLayout = [...(site.layoutOrder || ["hero", "featured", "main"])];
                      newLayout.splice(i, 1);
                      setSite({ ...site, layoutOrder: newLayout });
                    }} className="text-rose-500 font-bold hover:text-rose-700" aria-label="Hapus bagian"><Icon.X className="h-4 w-4" /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <select id="addLayout" className="g-field text-sm">
                  <option value="hero">hero (Banner)</option>
                  <option value="featured">featured (Iklan Unggulan)</option>
                  <option value="main">main (Daftar Iklan)</option>
                </select>
                <button onClick={() => {
                  const val = document.getElementById("addLayout").value;
                  const newLayout = [...(site.layoutOrder || ["hero", "featured", "main"])];
                  if (!newLayout.includes(val)) newLayout.push(val);
                  setSite({ ...site, layoutOrder: newLayout });
                }} className="g-btn g-btn-outlined text-sm">Tambah Seksi</button>
              </div>
            </div>
            <button onClick={() => { action({ action: "save_settings", key: "site", value: site }, "Tata Letak disimpan"); flash("layout"); }} className="g-btn g-btn-primary mt-4 w-full sm:w-auto sm:px-10">{saved === "layout" ? " Tersimpan" : "Simpan Tata Letak"}</button>
          </Card>

          {/* MADING & MENFESS */}
          <Card title="Fitur Mading & Menfess" className={match("mading menfess login anonim posting kirim") ? "" : "hidden"}>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">Kewajiban Login Buat Menfess</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {madingCfg.requireLogin !== false
                      ? "Aktif (ON): Mahasiswa wajib login akun WhatsApp sebelum memposting menfess."
                      : "Nonaktif (OFF): Bebas tanpa login (pengunjung bisa langsung mengirimkan menfess anonim)."}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...madingCfg, requireLogin: !madingCfg.requireLogin };
                      setMadingCfg(updated);
                      action(
                        { action: "save_settings", key: "mading", value: updated },
                        updated.requireLogin !== false ? "Kewajiban login menfess diaktifkan" : "Kewajiban login menfess dimatikan"
                      );
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      madingCfg.requireLogin !== false ? "bg-primary" : "bg-gray-300 dark:bg-slate-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        madingCfg.requireLogin !== false ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <span className={`text-xs font-bold w-10 text-center ${madingCfg.requireLogin !== false ? "text-primary" : "text-gray-500"}`}>
                    {madingCfg.requireLogin !== false ? "ON" : "OFF"}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* TEKS & SEO SITUS */}
          <Card title="Teks & SEO Situs" className={`lg:col-span-2 ${match("teks seo situs nama domain url base footer rules disclaimer kebijakan privasi metadata") ? "" : "hidden"}`}>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Tampilan Website</label>
                  <div className="space-y-3">
                    <Field label="Judul Banner Beranda"><input className="g-field w-full" value={site.heroTitle ?? ""} onChange={(e) => setSite({ ...site, heroTitle: e.target.value })} /></Field>
                    <Field label="Subjudul Banner"><textarea className="g-field w-full min-h-16" value={site.heroSubtitle ?? ""} onChange={(e) => setSite({ ...site, heroSubtitle: e.target.value })} /></Field>
                    <Field label="Tagline Footer"><input className="g-field w-full" value={site.footerTagline ?? ""} onChange={(e) => setSite({ ...site, footerTagline: e.target.value })} /></Field>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Metadata SEO</label>
                  <div className="space-y-3">
                    <Field label="Meta Title (Judul Browser)"><input className="g-field w-full" value={site.metaTitle ?? ""} onChange={(e) => setSite({ ...site, metaTitle: e.target.value })} /></Field>
                    <Field label="Meta Description"><textarea className="g-field w-full min-h-16" value={site.metaDescription ?? ""} onChange={(e) => setSite({ ...site, metaDescription: e.target.value })} /></Field>
                    <Field label="Meta Keywords (Pisahkan dengan koma)"><textarea className="g-field w-full min-h-16" value={site.metaKeywords ?? ""} onChange={(e) => setSite({ ...site, metaKeywords: e.target.value })} /></Field>
                  </div>
                </div>
              </div>
            </div>
            <button onClick={() => { action({ action: "save_settings", key: "site", value: site }, "Teks & SEO disimpan"); flash("site"); }} className="g-btn g-btn-primary mt-4 w-full sm:w-auto sm:px-10">{saved === "site" ? " Tersimpan" : "Simpan Teks & SEO"}</button>
          </Card>

          {/* KONFIGURASI ADMIN & WA */}
          <Card title="Konfigurasi Admin & WhatsApp" className={match("konfigurasi admin whatsapp nomor hp wa superadmin super") ? "" : "hidden"}>
            <div className="space-y-3">
              <Field label="Nomor WA Admin (Superadmin)">
                <input className="g-field font-mono w-full" value={adminCfg.adminWa ?? ""} onChange={(e) => setAdminCfg({ ...adminCfg, adminWa: e.target.value })} placeholder="628xxxxxxxxxx" />
                <p className="mt-1 text-xs text-gray-400">Nomor yang menerima notifikasi iklan baru, pembayaran, dll.</p>
              </Field>
              <Field label="JID Grup WA Utama (Broadcast Iklan)">
                <input className="g-field font-mono w-full" value={adminCfg.groupJid ?? ""} onChange={(e) => setAdminCfg({ ...adminCfg, groupJid: e.target.value })} placeholder="628xxx@g.us" />
                <p className="mt-1 text-xs text-gray-400">Format: 628xxx-timestamp@g.us. Dapat dicopy dari tab Grup di WhatsApp Bot.</p>
              </Field>
              <Field label="Grup WA Tambahan (pisah koma)">
                <textarea className="g-field w-full min-h-16 font-mono text-xs" value={adminCfg.extraGroups ?? ""} onChange={(e) => setAdminCfg({ ...adminCfg, extraGroups: e.target.value })} placeholder="628xxx@g.us,628yyy@g.us" />
              </Field>
              <Field label="URL / Link Gambar QRIS">
                <input className="g-field w-full" value={adminCfg.qrisUrl ?? ""} onChange={(e) => setAdminCfg({ ...adminCfg, qrisUrl: e.target.value })} placeholder="https://..." />
                <p className="mt-1 text-xs text-gray-400">URL gambar QRIS yang dikirim ke user saat checkout. Kosongkan untuk pakai default env.</p>
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!adminCfg.fonnteFirst} onChange={(e) => setAdminCfg({ ...adminCfg, fonnteFirst: e.target.checked })} className="h-4 w-4 rounded" />
                <span className="dark:text-slate-200">Gunakan Fonnte sebagai gateway utama (bukan Baileys)</span>
              </label>
            </div>
            <button onClick={() => { action({ action: "save_settings", key: "admin", value: adminCfg }, "Konfigurasi Admin disimpan"); flash("admin"); }} className="g-btn g-btn-primary mt-4 w-full">{saved === "admin" ? " Tersimpan" : "Simpan Konfigurasi Admin"}</button>
          </Card>

          {/* KONFIGURASI BOT */}
          <Card title="Konfigurasi Bot WhatsApp" className={match("konfigurasi bot whatsapp token fonnte api baileys provider sender key") ? "" : "hidden"}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Expiry Konteks Percakapan (menit)">
                <input type="number" min="5" className="g-field w-full" value={botCfg.contextExpiryMinutes ?? 30} onChange={(e) => setBotCfg({ ...botCfg, contextExpiryMinutes: Number(e.target.value) || 30 })} />
              </Field>
              <Field label="Maks Riwayat Konteks">
                <input type="number" min="1" max="20" className="g-field w-full" value={botCfg.contextMaxHistory ?? 5} onChange={(e) => setBotCfg({ ...botCfg, contextMaxHistory: Number(e.target.value) || 5 })} />
              </Field>
              <Field label="Expiry OTP (menit)">
                <input type="number" min="1" className="g-field w-full" value={botCfg.otpExpiryMinutes ?? 10} onChange={(e) => setBotCfg({ ...botCfg, otpExpiryMinutes: Number(e.target.value) || 10 })} />
              </Field>
              <Field label="Maks Percobaan OTP">
                <input type="number" min="1" max="10" className="g-field w-full" value={botCfg.otpMaxAttempts ?? 3} onChange={(e) => setBotCfg({ ...botCfg, otpMaxAttempts: Number(e.target.value) || 3 })} />
              </Field>
            </div>
            <Field label="Webhook URL Bot (untuk kirim notif ke bot)">
              <input className="g-field w-full font-mono" value={botCfg.webhookUrl ?? ""} onChange={(e) => setBotCfg({ ...botCfg, webhookUrl: e.target.value })} placeholder="https://bot.jualbeliusupolmed.web.id/webhook" />
              <p className="mt-1 text-xs text-gray-400">URL endpoint bot untuk trigger notifikasi langsung. Opsional.</p>
            </Field>
            <button onClick={() => { action({ action: "save_settings", key: "bot", value: botCfg }, "Konfigurasi Bot disimpan"); flash("bot"); }} className="g-btn g-btn-primary mt-4 w-full">{saved === "bot" ? " Tersimpan" : "Simpan Konfigurasi Bot"}</button>
          </Card>

          {/* KONFIGURASI META (IG & FB) */}
          <Card title="Konfigurasi Meta (Instagram)" className={match("konfigurasi meta instagram ig facebook fb token access page id media graph api post") ? "" : "hidden"}>
            <div className="space-y-3">
              <Field label="Meta Page Access Token (Never Expire)">
                <input type="password" className="g-field w-full font-mono text-sm" value={metaCfg.accessToken ?? ""} onChange={(e) => setMetaCfg({ ...metaCfg, accessToken: e.target.value })} placeholder="EAAI..." />
                <p className="mt-1 text-xs text-gray-400">Pastikan token memiliki izin: pages_manage_posts, instagram_basic, instagram_content_publish.</p>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Facebook Page ID">
                  <input className="g-field w-full font-mono" value={metaCfg.fbPageId ?? ""} onChange={(e) => setMetaCfg({ ...metaCfg, fbPageId: e.target.value })} placeholder="123456789" />
                </Field>
                <Field label="Instagram User ID">
                  <input className="g-field w-full font-mono" value={metaCfg.igUserId ?? ""} onChange={(e) => setMetaCfg({ ...metaCfg, igUserId: e.target.value })} placeholder="178414..." />
                </Field>
              </div>
            </div>
            <button onClick={() => { action({ action: "save_settings", key: "meta", value: metaCfg }, "Konfigurasi Meta disimpan"); flash("meta"); }} className="g-btn g-btn-primary mt-4 w-full">{saved === "meta" ? " Tersimpan" : "Simpan Konfigurasi Meta"}</button>
          </Card>

          {/* TEMPLATE PESAN BOT */}
          <Card title="Template Pesan Bot WhatsApp" className={`lg:col-span-2 ${match("template pesan bot whatsapp balasan admin dicari wanted notif pesan") ? "" : "hidden"}`}>
            <p className="mb-3 text-xs text-gray-400">Gunakan <code className="rounded bg-gray-100 px-1 dark:bg-slate-800">{"{{title}}"}</code>, <code className="rounded bg-gray-100 px-1 dark:bg-slate-800">{"{{url}}"}</code>, <code className="rounded bg-gray-100 px-1 dark:bg-slate-800">{"{{price}}"}</code>, <code className="rounded bg-gray-100 px-1 dark:bg-slate-800">{"{{seller}}"}</code> sebagai variabel.</p>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Pengingat H-3 (iklan hampir berakhir)">
                <textarea className="g-field w-full min-h-24 text-sm" value={messages.reminderH3 ?? ""} onChange={(e) => setMessages({ ...messages, reminderH3: e.target.value })} />
              </Field>
              <Field label="Pengingat H-1 (iklan mau berakhir besok)">
                <textarea className="g-field w-full min-h-24 text-sm" value={messages.reminderH1 ?? ""} onChange={(e) => setMessages({ ...messages, reminderH1: e.target.value })} />
              </Field>
              <Field label="Instruksi Pembayaran QRIS">
                <textarea className="g-field w-full min-h-20 text-sm" value={messages.qrisInstruction ?? ""} onChange={(e) => setMessages({ ...messages, qrisInstruction: e.target.value })} />
              </Field>
              <Field label="Notif Iklan Aktif (ke penjual)">
                <textarea className="g-field w-full min-h-20 text-sm" value={messages.listingActive ?? ""} onChange={(e) => setMessages({ ...messages, listingActive: e.target.value })} />
              </Field>
              <Field label="Notif Iklan Baru (ke grup)">
                <textarea className="g-field w-full min-h-20 text-sm" value={messages.notifNewListing ?? ""} onChange={(e) => setMessages({ ...messages, notifNewListing: e.target.value })} />
              </Field>
            </div>
            <button onClick={() => { action({ action: "save_settings", key: "messages", value: messages }, "Template pesan disimpan"); flash("messages"); }} className="g-btn g-btn-primary mt-4 w-full sm:w-auto sm:px-10">{saved === "messages" ? " Tersimpan" : "Simpan Template Pesan"}</button>
          </Card>

          {/* AREA POPULER */}
          <Card title="Daftar Area / Wilayah Populer" className={match("daftar area wilayah populer lokasi cod kampus") ? "" : "hidden"}>
            <p className="mb-2 text-xs text-gray-400">Satu area per baris. Digunakan sebagai pilihan area di form iklan.</p>
            <textarea
              className="g-field w-full min-h-48 font-mono text-sm"
              value={areas}
              onChange={(e) => setAreas(e.target.value)}
              placeholder={"Medan Baru\nMedan Selayang\nKampus USU\n..."}
            />
            <button
              onClick={() => {
                const list = areas.split("\n").map(s => s.trim()).filter(Boolean);
                action({ action: "save_settings", key: "areas", value: list }, "Daftar area disimpan");
                flash("areas");
              }}
              className="g-btn g-btn-primary mt-4 w-full"
            >{saved === "areas" ? " Tersimpan" : "Simpan Daftar Area"}</button>
          </Card>

          {/* KONTAK & INFO MARKETPLACE */}
          <Card title="Kontak & Info Marketplace" className={match("kontak info whatsapp wa grup link email telepon alamat marketplace support") ? "" : "hidden"}>
            <div className="space-y-3">
              <Field label="Nomor WA Marketplace (untuk chat ke penjual)">
                <input className="g-field w-full font-mono" value={contact.marketplaceWa ?? ""} onChange={(e) => setContact({ ...contact, marketplaceWa: e.target.value })} placeholder="628xxxxx" />
                <p className="mt-1 text-xs text-gray-400">Nomor ini dipakai sebagai pengirim pesan/notifikasi ke penjual dan pembeli.</p>
              </Field>
              <Field label="Link Grup WhatsApp">
                <input className="g-field w-full" value={contact.waGroupLink ?? ""} onChange={(e) => setContact({ ...contact, waGroupLink: e.target.value })} placeholder="https://chat.whatsapp.com/..." />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Email Support">
                  <input type="email" className="g-field w-full" value={contact.supportEmail ?? ""} onChange={(e) => setContact({ ...contact, supportEmail: e.target.value })} placeholder="admin@domain.com" />
                </Field>
                <Field label="Telepon Support">
                  <input className="g-field w-full" value={contact.supportPhone ?? ""} onChange={(e) => setContact({ ...contact, supportPhone: e.target.value })} placeholder="+62 8xx-xxxx" />
                </Field>
              </div>
              <Field label="Alamat Fisik (tampil di footer)">
                <input className="g-field w-full" value={contact.supportAddress ?? ""} onChange={(e) => setContact({ ...contact, supportAddress: e.target.value })} placeholder="Jl. Dr. T. Mansur No. 9, Medan" />
              </Field>
            </div>
            <button onClick={() => { action({ action: "save_settings", key: "contact", value: contact }, "Kontak disimpan"); flash("contact"); }} className="g-btn g-btn-primary mt-4 w-full sm:w-auto sm:px-10">{saved === "contact" ? " Tersimpan" : "Simpan Kontak"}</button>
          </Card>

          {/* KONFIGURASI BOT KEYWORDS */}
          <Card title="Bot WhatsApp — Keyword & Greeting" className={`lg:col-span-2 ${match("bot keyword greeting sapaan trigger pesan selamat datang menu kata kunci harga minimum") ? "" : "hidden"}`}>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" className="h-4 w-4 rounded" checked={!!botKeywords.enabled} onChange={(e) => setBotKeywords({ ...botKeywords, enabled: e.target.checked })} />
                  <span className="dark:text-slate-200">Bot keywords aktif</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" className="h-4 w-4 rounded" checked={!!botKeywords.greeting_enabled} onChange={(e) => setBotKeywords({ ...botKeywords, greeting_enabled: e.target.checked })} />
                  <span className="dark:text-slate-200">Kirim pesan sapaan otomatis</span>
                </label>
              </div>
              <Field label="Kata Kunci Trigger Bot (pisah koma)">
                <input className="g-field w-full font-mono text-sm" value={botKeywords.triggers ?? ""} onChange={(e) => setBotKeywords({ ...botKeywords, triggers: e.target.value })} placeholder="jual,wts,cari,beli,admin" />
                <p className="mt-1 text-xs text-gray-400">Pesan yang mengandung kata ini akan ditangani bot secara otomatis.</p>
              </Field>
              <Field label="Min. Digit Harga (cegah harga asal-asalan)">
                <input type="number" min="1" max="10" className="g-field w-32" value={botKeywords.min_price_digits ?? 4} onChange={(e) => setBotKeywords({ ...botKeywords, min_price_digits: Number(e.target.value) || 4 })} />
                <p className="mt-1 text-xs text-gray-400">Contoh: 4 digit = harga minimal Rp 1.000.</p>
              </Field>
              <Field label="Pesan Sapaan (jika diaktifkan)">
                <textarea className="g-field w-full min-h-40 text-sm font-mono" value={botKeywords.greeting ?? ""} onChange={(e) => setBotKeywords({ ...botKeywords, greeting: e.target.value })} placeholder="Halo! Ketik .MENU untuk melihat perintah..." />
                <p className="mt-1 text-xs text-gray-400">Mendukung format WhatsApp: *tebal*, _miring_. Gunakan \n untuk baris baru.</p>
              </Field>
            </div>
            <button onClick={() => { action({ action: "save_settings", key: "bot_keywords", value: botKeywords }, "Konfigurasi Bot Keywords disimpan"); flash("bot_keywords"); }} className="g-btn g-btn-primary mt-4 w-full sm:w-auto sm:px-10">{saved === "bot_keywords" ? " Tersimpan" : "Simpan Bot Keywords"}</button>
          </Card>

          {/* KONFIGURASI AI */}
          <Card title="Konfigurasi AI Marketplace" className={`lg:col-span-2 ${match("ai kecerdasan buatan model gemini gpt kepribadian personality memory memori instruksi") ? "" : "hidden"}`}>
            <p className="mb-4 text-xs text-gray-500 dark:text-slate-400">
              AI digunakan untuk verifikasi struk pembayaran, menjawab pertanyaan di bot, dan berbagai otomasi cerdas di marketplace.
            </p>
            <div className="space-y-4">
              <Field label="Model AI">
                <select className="g-field w-full" value={aiCfg.model ?? "gemini-2.0-flash"} onChange={(e) => setAiCfg({ ...aiCfg, model: e.target.value })}>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash (Cepat, Hemat)</option>
                  <option value="gemini-2.0-flash-thinking-exp">Gemini 2.0 Flash Thinking (Analitik)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (Akurat, Lebih Lambat)</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                </select>
              </Field>
              <Field label="Kepribadian AI (Personality / System Prompt)">
                <textarea
                  className="g-field w-full min-h-28 text-sm"
                  value={aiCfg.personality ?? ""}
                  onChange={(e) => setAiCfg({ ...aiCfg, personality: e.target.value })}
                  placeholder="Kamu adalah asisten marketplace yang profesional tapi santai..."
                />
                <p className="mt-1 text-xs text-gray-400">Instruksi persona yang selalu disertakan di tiap percakapan AI.</p>
              </Field>
              <Field label="Memori Konteks Marketplace (pengetahuan tentang toko)">
                <textarea
                  className="g-field w-full min-h-28 text-sm"
                  value={aiCfg.memory ?? ""}
                  onChange={(e) => setAiCfg({ ...aiCfg, memory: e.target.value })}
                  placeholder="Pasar target adalah mahasiswa USU dan Polmed. Pembayaran via QRIS atau COD..."
                />
                <p className="mt-1 text-xs text-gray-400">Fakta tentang marketplace yang diinjeksikan ke konteks AI (kategori, area, harga, dll).</p>
              </Field>
            </div>
            <button onClick={() => { action({ action: "save_settings", key: "ai_config", value: aiCfg }, "Konfigurasi AI disimpan"); flash("ai_config"); }} className="g-btn g-btn-primary mt-4 w-full sm:w-auto sm:px-10">{saved === "ai_config" ? " Tersimpan" : "Simpan Konfigurasi AI"}</button>
          </Card>

          {/* POPUP IKLAN SPONSOR / EVENT KAMPUS */}
          <Card title="Popup Iklan Sponsor / Event Kampus" className={match("popup iklan sponsor event kampus promo banner modal harian") ? "" : "hidden"}>
            <p className="mb-4 text-xs text-gray-500 dark:text-slate-400">
              Popup ini muncul otomatis <strong>1× per 24 jam</strong> saat pengguna membuka situs. Berguna untuk promo sponsor, event kampus, atau pengumuman penting.
            </p>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={!!popupAd.enabled}
                    onChange={(e) => setPopupAd({ ...popupAd, enabled: e.target.checked })}
                  />
                  <div className={`block w-12 h-6 rounded-full transition-colors ${popupAd.enabled ? "bg-primary" : "bg-gray-300 dark:bg-slate-600"}`} />
                  <div className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${popupAd.enabled ? "translate-x-6" : ""}`} />
                </div>
                <span className="text-sm font-medium dark:text-slate-200">
                  {popupAd.enabled ? "Popup Aktif" : "Popup Nonaktif"}
                </span>
              </label>

              <Field label="Judul Promo / Pengumuman">
                <input
                  className="g-field w-full"
                  value={popupAd.title ?? ""}
                  onChange={(e) => setPopupAd({ ...popupAd, title: e.target.value })}
                  placeholder="Contoh: Event Bazaar USU 2025 "
                />
              </Field>

              <Field label="URL Gambar Banner (Rasio 16:9 disarankan)">
                <input
                  className="g-field w-full"
                  type="url"
                  value={popupAd.imageUrl ?? ""}
                  onChange={(e) => setPopupAd({ ...popupAd, imageUrl: e.target.value })}
                  placeholder="https://..."
                />
                {popupAd.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={popupAd.imageUrl} alt="Preview" className="mt-2 w-full max-w-xs rounded-lg border border-gray-200 dark:border-slate-700 object-cover" />
                )}
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Link Tujuan (klik banner/tombol)">
                  <input
                    className="g-field w-full"
                    type="url"
                    value={popupAd.targetUrl ?? ""}
                    onChange={(e) => setPopupAd({ ...popupAd, targetUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </Field>
                <Field label="Teks Tombol CTA">
                  <input
                    className="g-field w-full"
                    value={popupAd.buttonText ?? ""}
                    onChange={(e) => setPopupAd({ ...popupAd, buttonText: e.target.value })}
                    placeholder="Lihat Selengkapnya"
                  />
                </Field>
              </div>
            </div>
            <button
              onClick={() => {
                action({ action: "save_settings", key: "popupAd", value: popupAd }, "Pengaturan Popup Ads disimpan");
                flash("popupAd");
              }}
              className="g-btn g-btn-primary mt-4 w-full sm:w-auto sm:px-10"
            >
              {saved === "popupAd" ? " Tersimpan" : "Simpan Pengaturan Popup"}
            </button>
          </Card>

          {/* AKUN RESMI ORGANISASI & UKM KAMPUS */}
          <Card title="Akun Resmi UKM & Organisasi Kampus" className={`lg:col-span-2 ${match("organisasi ukm hima bem komunitas kampus resmi private invite pendaftaran link") ? "" : "hidden"}`}>
            <p className="mb-4 text-xs text-gray-500 dark:text-slate-400">
              Kelola kode undangan dan tautan pendaftaran private untuk pengurus BEM, HIMA, dan UKM di USU & POLMED agar mendapatkan lencana resmi terverifikasi.
            </p>

            <div className="space-y-4">
              <Field label="Kode Undangan Pendaftaran Private">
                <input
                  className="g-input w-full font-mono text-sm uppercase"
                  value={ukmInviteCode}
                  onChange={(e) => setUkmInviteCode(e.target.value.toUpperCase())}
                  placeholder="KAMPUS_USU_POLMED_2026"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Kode ini otomatis memverifikasi akun organisasi saat mendaftar lewat formulir private.
                </p>
              </Field>

              {/* Link Private Generator */}
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">
                  Tautan Pendaftaran Private (Bagikan ke Pengurus UKM)
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={typeof window !== "undefined" ? `${window.location.origin}/organisasi/daftar?invite=${ukmInviteCode}` : `/organisasi/daftar?invite=${ukmInviteCode}`}
                    className="g-input w-full font-mono text-xs select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}/organisasi/daftar?invite=${ukmInviteCode}`;
                      navigator.clipboard.writeText(url);
                      setToast({ type: "ok", msg: "Tautan pendaftaran disalin!" });
                    }}
                    className="g-btn g-btn-primary shrink-0 text-xs py-2 px-3"
                  >
                    Salin Tautan
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-slate-400">
                  Pengurus yang mendaftar melalui tautan ini akan langsung mendapatkan badge <strong className="inline-flex items-center gap-1"><Icon.Landmark className="h-3.5 w-3.5" /> Resmi Terverifikasi</strong>.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                action({ action: "save_settings", key: "ukmInviteCode", value: ukmInviteCode }, "Kode undangan organisasi disimpan");
                flash("ukmInviteCode");
              }}
              className="g-btn g-btn-primary mt-4 w-full sm:w-auto sm:px-10"
            >
              {saved === "ukmInviteCode" ? " Tersimpan" : "Simpan Kode Undangan"}
            </button>
        </Card>
      </div>
    </div>
  </div>
  );
}
