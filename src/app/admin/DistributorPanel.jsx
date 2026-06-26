"use client";

import { useEffect, useState } from "react";
import { rupiah } from "@/lib/fees";
import { DEFAULT_FEE_RULES } from "@/lib/distributor";

function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div className={`fixed top-4 right-4 z-50 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${type === "ok" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
      {msg}
    </div>
  );
}

export default function DistributorPanel({ settings: initialSettings, categories = [] }) {
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);

  // State: daftar distributor
  const [distributors, setDistributors] = useState([]);
  const [loadingDist, setLoadingDist] = useState(true);

  // State: generate invite
  const [inviteWa, setInviteWa] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [recentInvites, setRecentInvites] = useState([]);

  // State: fee rules
  const distCfg = initialSettings?.distributor || {};
  const [autoAddPrice, setAutoAddPrice] = useState(distCfg.autoAddPrice !== false);
  const [digestEnabled, setDigestEnabled] = useState(distCfg.digestEnabled !== false);
  const [feeRules, setFeeRules] = useState(distCfg.rules ?? DEFAULT_FEE_RULES);

  // State: edit distributor categories
  const [editingCat, setEditingCat] = useState(null); // seller_wa
  const [editCatList, setEditCatList] = useState([]);

  function showToast(msg, type = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // Load distributors
  useEffect(() => {
    setLoadingDist(true);
    fetch("/api/admin/distributors")
      .then((r) => r.json())
      .then((d) => { setDistributors(d.distributors || []); })
      .catch(() => {})
      .finally(() => setLoadingDist(false));

    fetch("/api/distributor/invite")
      .then((r) => r.json())
      .then((d) => setRecentInvites(d.invites?.slice(0, 10) || []))
      .catch(() => {});
  }, []);

  async function generateInvite() {
    if (!inviteWa.trim()) return showToast("Masukkan nomor WA", "err");
    setBusy(true);
    try {
      const res = await fetch("/api/distributor/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wa: inviteWa }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setGeneratedLink(d.link);
      setInviteWa("");
      showToast("Link undangan berhasil dibuat & dikirim via WA");
      // Refresh invites
      fetch("/api/distributor/invite").then((r) => r.json()).then((d) => setRecentInvites(d.invites?.slice(0, 10) || []));
    } catch (e) {
      showToast(e.message, "err");
    } finally {
      setBusy(false);
    }
  }

  async function saveFeeSettings() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_settings",
          key: "distributor",
          value: { rules: feeRules, autoAddPrice, digestEnabled },
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      showToast("Pengaturan distributor disimpan");
    } catch (e) {
      showToast(e.message, "err");
    } finally {
      setBusy(false);
    }
  }

  async function toggleDistributor(wa, currentValue) {
    await fetch("/api/admin/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_distributor", wa, distributor: !currentValue }),
    });
    setDistributors((prev) => prev.map((d) => d.wa === wa ? { ...d, distributor: !currentValue } : d));
    showToast(!currentValue ? "Badge distributor diaktifkan" : "Badge distributor dinonaktifkan");
  }

  async function saveCategoryEdit(wa) {
    await fetch("/api/admin/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_distributor_categories", wa, categories: editCatList }),
    });
    setDistributors((prev) =>
      prev.map((d) => d.wa === wa ? { ...d, dist_categories: editCatList } : d)
    );
    setEditingCat(null);
    showToast("Kategori disimpan");
  }

  function updateRule(idx, field, val) {
    setFeeRules((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: field === "amount" || field === "minPrice" || field === "maxPrice" ? (val === "" ? null : Number(val)) : val } : r));
  }

  function addRule() {
    setFeeRules((prev) => [...prev, { id: `rule_${Date.now()}`, label: "Kategori Baru", minPrice: 0, maxPrice: null, type: "flat", amount: 100000 }]);
  }

  function removeRule(idx) {
    setFeeRules((prev) => prev.filter((_, i) => i !== idx));
  }

  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id");

  return (
    <div className="space-y-6">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* GENERATE LINK UNDANGAN */}
      <section className="card p-6">
        <h2 className="font-bold text-lg mb-1">Generator Link Undangan Distributor</h2>
        <p className="text-sm text-gray-400 mb-4">Masukkan nomor WA calon distributor → link undangan dibuat & dikirim otomatis via WA.</p>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Nomor WA (628xxx atau 08xxx)"
            value={inviteWa}
            onChange={(e) => setInviteWa(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generateInvite()}
          />
          <button onClick={generateInvite} disabled={busy} className="btn-primary px-5">
            {busy ? "..." : "Buat Link"}
          </button>
        </div>
        {generatedLink && (
          <div className="mt-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 p-3">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">Link undangan berhasil dibuat:</p>
            <div className="flex gap-2 items-center">
              <input readOnly className="input flex-1 text-xs font-mono" value={generatedLink} />
              <button
                onClick={() => { navigator.clipboard.writeText(generatedLink); showToast("Link disalin!"); }}
                className="btn-outline text-xs px-3"
              >
                Salin
              </button>
            </div>
          </div>
        )}

        {/* Riwayat invite */}
        {recentInvites.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">10 Undangan Terakhir</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-800 text-gray-400">
                    <th className="text-left pb-2">Nomor WA</th>
                    <th className="text-left pb-2">Status</th>
                    <th className="text-left pb-2">Dibuat</th>
                    <th className="text-left pb-2">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvites.map((inv) => (
                    <tr key={inv.id} className="border-b border-gray-50 dark:border-slate-900">
                      <td className="py-1.5 font-mono">{inv.wa}</td>
                      <td className="py-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${inv.status === "used" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : inv.status === "revoked" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"}`}>
                          {inv.status === "used" ? "Digunakan" : inv.status === "revoked" ? "Dicabut" : "Menunggu"}
                        </span>
                      </td>
                      <td className="py-1.5 text-gray-400">{new Date(inv.created_at).toLocaleDateString("id-ID")}</td>
                      <td className="py-1.5">
                        <button
                          onClick={() => { navigator.clipboard.writeText(`${baseUrl}/distributor/bergabung/${inv.token}`); showToast("Link disalin!"); }}
                          className="text-primary hover:underline"
                        >
                          Salin
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* DAFTAR DISTRIBUTOR */}
      <section className="card p-6">
        <h2 className="font-bold text-lg mb-1">Daftar Distributor</h2>
        <p className="text-sm text-gray-400 mb-4">Kelola badge dan kategori per distributor.</p>
        {loadingDist ? (
          <div className="text-center py-8 text-gray-400">Memuat...</div>
        ) : distributors.length === 0 ? (
          <div className="text-center py-8 text-gray-400">Belum ada distributor.</div>
        ) : (
          <div className="space-y-3">
            {distributors.map((d) => (
              <div key={d.wa} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-gray-100 dark:border-slate-800 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">{d.name || d.wa}</span>
                    {d.distributor && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 dark:bg-orange-900/40 px-2 py-0.5 text-[11px] font-bold text-orange-700 dark:text-orange-400">
                        🏪 DISTRIBUTOR
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{d.wa}</p>
                  {editingCat === d.wa ? (
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-gray-500 mb-1">Pilih kategori (bisa lebih dari satu):</p>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {categories.map((cat) => (
                          <label key={cat.name} className="flex items-center gap-1 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editCatList.includes(cat.name)}
                              onChange={(e) => {
                                if (e.target.checked) setEditCatList((p) => [...p, cat.name]);
                                else setEditCatList((p) => p.filter((c) => c !== cat.name));
                              }}
                              className="h-3 w-3"
                            />
                            <span>{cat.icon} {cat.name}</span>
                          </label>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveCategoryEdit(d.wa)} className="btn-primary text-xs px-3 py-1">Simpan</button>
                        <button onClick={() => setEditingCat(null)} className="btn-outline text-xs px-3 py-1">Batal</button>
                      </div>
                    </div>
                  ) : (
                    d.dist_categories?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {d.dist_categories.map((c) => (
                          <span key={c} className="text-[10px] bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 rounded px-1.5 py-0.5">{c}</span>
                        ))}
                      </div>
                    )
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setEditingCat(d.wa);
                      setEditCatList(d.dist_categories || []);
                    }}
                    className="btn-outline text-xs px-3 py-1"
                  >
                    Kategori
                  </button>
                  <button
                    onClick={() => toggleDistributor(d.wa, d.distributor)}
                    className={`text-xs px-3 py-1 rounded-lg font-semibold ${d.distributor ? "bg-red-100 text-red-600 hover:bg-red-200" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"}`}
                  >
                    {d.distributor ? "Cabut Badge" : "Beri Badge"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* KONFIGURASI FEE */}
      <section className="card p-6">
        <h2 className="font-bold text-lg mb-1">Konfigurasi Fee Bagi Hasil</h2>
        <p className="text-sm text-gray-400 mb-4">Atur tier fee berdasarkan range harga. Fee akan ditampilkan di setiap iklan distributor.</p>

        <div className="flex flex-wrap gap-4 mb-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={autoAddPrice} onChange={(e) => setAutoAddPrice(e.target.checked)} className="h-4 w-4 rounded" />
            <span>Otomatis tambah fee ke harga jual</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={digestEnabled} onChange={(e) => setDigestEnabled(e.target.checked)} className="h-4 w-4 rounded" />
            <span>Aktifkan digest harian (jam 13.00)</span>
          </label>
        </div>

        <div className="space-y-3">
          {feeRules.map((rule, idx) => (
            <div key={rule.id} className="rounded-xl border border-gray-100 dark:border-slate-800 p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="lg:col-span-3">
                  <label className="text-xs font-semibold text-gray-400">Label Tier</label>
                  <input className="input mt-1 w-full" value={rule.label} onChange={(e) => updateRule(idx, "label", e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400">Harga Minimum (Rp)</label>
                  <input type="number" className="input mt-1 w-full" value={rule.minPrice ?? ""} onChange={(e) => updateRule(idx, "minPrice", e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400">Harga Maksimum (Rp, kosong = tak terbatas)</label>
                  <input type="number" className="input mt-1 w-full" value={rule.maxPrice ?? ""} onChange={(e) => updateRule(idx, "maxPrice", e.target.value)} placeholder="Tak terbatas" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400">Tipe Fee</label>
                  <select className="input mt-1 w-full" value={rule.type} onChange={(e) => updateRule(idx, "type", e.target.value)}>
                    <option value="flat">Flat (Rp)</option>
                    <option value="pct">Persentase (%)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400">{rule.type === "flat" ? "Jumlah Fee (Rp)" : "Persentase (%)"}</label>
                  <input type="number" step={rule.type === "pct" ? "0.1" : "1000"} className="input mt-1 w-full" value={rule.amount ?? ""} onChange={(e) => updateRule(idx, "amount", e.target.value)} />
                </div>
                <div className="flex items-end">
                  <p className="text-sm text-gray-500">
                    Contoh harga Rp 3.000.000:{" "}
                    <strong className="text-primary">
                      {rule.type === "flat"
                        ? `Rp ${(rule.amount || 0).toLocaleString("id-ID")}`
                        : `Rp ${Math.round(3_000_000 * (rule.amount || 0) / 100).toLocaleString("id-ID")}`}
                    </strong>
                  </p>
                </div>
              </div>
              <button onClick={() => removeRule(idx)} className="mt-2 text-xs text-red-500 hover:underline">Hapus tier ini</button>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-4">
          <button onClick={addRule} className="btn-outline text-sm">+ Tambah Tier</button>
          <button onClick={saveFeeSettings} disabled={busy} className="btn-primary text-sm px-6">
            {busy ? "Menyimpan..." : "Simpan Pengaturan Fee"}
          </button>
        </div>
      </section>
    </div>
  );
}
