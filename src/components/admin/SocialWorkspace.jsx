"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { TabInstagram } from "@/components/admin/TabInstagram";

function formatRelativeTime(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "baru saja";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mnt lalu`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam lalu`;
  return `${Math.floor(diffInSeconds / 86400)} hari lalu`;
}

export default function SocialWorkspace() {
  const [activeTab, setActiveTab] = useState("accounts"); // 'accounts' | 'whatsapp' | 'inbox' | 'queue'
  const [accounts, setAccounts] = useState([]);
  const [stats, setStats] = useState({ total: 0, instagram: 0, whatsapp: 0, connected: 0 });
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // WhatsApp Multi-Channel state
  const [waAccounts, setWaAccounts] = useState([]);
  const [waStats, setWaStats] = useState({ channels: 0, business: 0, groups: 0, gatewayOnline: false });
  const [loadingWa, setLoadingWa] = useState(false);
  const [waFilter, setWaFilter] = useState("all"); // 'all' | 'channel' | 'business' | 'group'

  // DM Inbox state
  const [dmLogs, setDmLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [actionFilter, setActionFilter] = useState("all");
  const [searchLog, setSearchLog] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);

  // Modal Test Broadcast
  const [broadcastModalTarget, setBroadcastModalTarget] = useState(null);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // Modal Account Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [formProvider, setFormProvider] = useState("instagram");
  const [formScopeType, setFormScopeType] = useState("university"); // 'university' | 'province'
  const [formProvinceId, setFormProvinceId] = useState("sumatera-utara");
  const [formUniversityId, setFormUniversityId] = useState("usu");
  const [formHandle, setFormHandle] = useState("");
  const [formExternalId, setFormExternalId] = useState("");
  const [provincesList, setProvincesList] = useState([]);
  const [universitiesList, setUniversitiesList] = useState([]);
  const [resolvingChannel, setResolvingChannel] = useState(false);

  // Testing connection state
  const [testingId, setTestingId] = useState(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetchAccounts();
    fetchProvincesAndUniversities();
  }, []);

  useEffect(() => {
    if (activeTab === "inbox") {
      fetchDmLogs();
    } else if (activeTab === "whatsapp") {
      fetchWhatsAppChannels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, actionFilter]);

  const fetchAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const res = await fetch("/api/admin/social/accounts");
      const json = await res.json();
      if (json.ok) {
        setAccounts(json.accounts || []);
        setStats(json.stats || {});
      } else {
        toast.error(json.error || "Gagal memuat akun sosial.");
      }
    } catch {
      toast.error("Gagal terhubung ke server.");
    } finally {
      setLoadingAccounts(false);
    }
  };

  const fetchWhatsAppChannels = async () => {
    setLoadingWa(true);
    try {
      const res = await fetch("/api/admin/whatsapp/channels");
      const json = await res.json();
      if (json.ok) {
        setWaAccounts(json.accounts || []);
        setWaStats(json.stats || {});
      } else {
        toast.error(json.error || "Gagal memuat saluran WhatsApp.");
      }
    } catch {
      toast.error("Gagal memuat data WhatsApp.");
    } finally {
      setLoadingWa(false);
    }
  };

  const fetchProvincesAndUniversities = async () => {
    try {
      const res = await fetch("/api/admin/organization");
      const json = await res.json();
      if (json.provinces) setProvincesList(json.provinces);
      if (json.universities) setUniversitiesList(json.universities);
    } catch {
      setProvincesList([{ id: "sumatera-utara", name: "Sumatera Utara" }]);
      setUniversitiesList([
        { id: "usu", code: "USU", name: "Universitas Sumatera Utara", province_id: "sumatera-utara" },
        { id: "polmed", code: "POLMED", name: "Politeknik Negeri Medan", province_id: "sumatera-utara" },
      ]);
    }
  };

  const fetchDmLogs = async () => {
    setLoadingLogs(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter !== "all") params.set("action", actionFilter);
      if (searchLog) params.set("q", searchLog);
      const res = await fetch(`/api/admin/social/dm-logs?${params.toString()}`);
      const json = await res.json();
      if (json.ok) {
        setDmLogs(json.logs || []);
      }
    } catch {
      toast.error("Gagal memuat log DM Instagram.");
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleTestConnection = async (account) => {
    setTestingId(account.id);
    try {
      const res = await fetch("/api/admin/social/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_connection",
          accountId: account.id,
          externalAccountId: account.external_account_id,
          provider: account.provider,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(`Koneksi Meta Berhasil! Akun: @${json.account?.username || account.handle}`);
        fetchAccounts();
      } else {
        toast.error(json.error || "Uji koneksi gagal.");
      }
    } catch {
      toast.error("Gagal menghubungi Meta API.");
    } finally {
      setTestingId(null);
    }
  };

  const handleResolveChannelLink = async () => {
    if (!formHandle.includes("whatsapp.com/channel/")) {
      toast.error("Masukkan link saluran WhatsApp resmi (https://whatsapp.com/channel/...)");
      return;
    }
    setResolvingChannel(true);
    try {
      const res = await fetch("/api/admin/whatsapp/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resolve_channel_link",
          invite: formHandle.trim(),
        }),
      });
      const json = await res.json();
      if (json.ok && json.channel?.jid) {
        setFormExternalId(json.channel.jid);
        toast.success(`Saluran terverifikasi: "${json.channel.name}" (${json.channel.subscribers} subscriber)`);
      } else {
        toast.error(json.error || "Gagal memverifikasi saluran via gateway WhatsApp.");
      }
    } catch (err) {
      toast.error("Kendala jaringan saat menghubungi gateway WhatsApp.");
    } finally {
      setResolvingChannel(false);
    }
  };

  const handleSendTestBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastModalTarget) return;

    setSendingBroadcast(true);
    try {
      const res = await fetch("/api/admin/whatsapp/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_broadcast",
          targetJid: broadcastModalTarget.external_account_id || broadcastModalTarget.handle,
          provider: broadcastModalTarget.provider,
          message: broadcastMsg.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(json.message || "Pesan uji coba berhasil dikirim!");
        setBroadcastModalTarget(null);
        setBroadcastMsg("");
      } else {
        toast.error(json.error || "Gagal mengirim pesan uji coba.");
      }
    } catch (err) {
      toast.error("Terjadi galat saat mengirim pesan.");
    } finally {
      setSendingBroadcast(false);
    }
  };

  const handleOpenAddModal = (presetProvider = "instagram") => {
    setEditingAccount(null);
    setFormProvider(presetProvider);
    setFormScopeType("university");
    setFormProvinceId(provincesList[0]?.id || "sumatera-utara");
    setFormUniversityId(universitiesList[0]?.id || "usu");
    setFormHandle("");
    setFormExternalId("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (acc) => {
    setEditingAccount(acc);
    setFormProvider(acc.provider || "instagram");
    setFormScopeType(acc.scope_type || (acc.university_id ? "university" : "province"));
    setFormProvinceId(acc.province_id || provincesList[0]?.id || "sumatera-utara");
    setFormUniversityId(acc.university_id || universitiesList[0]?.id || "usu");
    setFormHandle(acc.handle || "");
    setFormExternalId(acc.external_account_id || "");
    setIsModalOpen(true);
  };

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    if (!formHandle.trim()) {
      toast.error("Handle / Tautan akun wajib diisi.");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          action: "upsert_channel",
          id: editingAccount?.id,
          provider: formProvider,
          provinceId: formScopeType === "province" ? formProvinceId : null,
          universityId: formScopeType === "university" ? formUniversityId : null,
          handle: formHandle.trim(),
          externalAccountId: formExternalId.trim() || null,
        };

        const endpoint = formProvider.startsWith("whatsapp")
          ? "/api/admin/whatsapp/channels"
          : "/api/admin/social/accounts";

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (json.ok) {
          toast.success("Akun / Kanal sosial berhasil disimpan.");
          setIsModalOpen(false);
          fetchAccounts();
          if (activeTab === "whatsapp") fetchWhatsAppChannels();
        } else {
          toast.error(json.error || "Gagal menyimpan akun.");
        }
      } catch {
        toast.error("Terjadi kendala saat menyimpan data.");
      }
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14H7l4-8 4 6-2-2-2 4z" />
              </svg>
              Social & Communication Management
            </span>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700">
              Fase 4: WhatsApp Multi-Channel
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Arsitektur Komunikasi Nasional
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Kelola kanal WhatsApp resmi (Channels, Gateway Baileys & Komunitas Grup) dan multi-account Instagram terisolasi per kampus & provinsi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenAddModal(activeTab === "whatsapp" ? "whatsapp_channel" : "instagram")}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            Hubungkan Kanal Baru
          </button>
        </div>
      </div>

      {/* Navigation Tabs (4 Pillars) */}
      <div className="flex overflow-x-auto border-b border-slate-200">
        <button
          onClick={() => setActiveTab("accounts")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === "accounts"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Semua Akun Sosmed ({stats.total || 0})
        </button>

        <button
          onClick={() => setActiveTab("whatsapp")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === "whatsapp"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
          }`}
        >
          <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
          WhatsApp Multi-Channel (3 Tier)
        </button>

        <button
          onClick={() => setActiveTab("inbox")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === "inbox"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Instagram DM Inbox & Routing
        </button>

        <button
          onClick={() => setActiveTab("queue")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === "queue"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Antrean Publikasi Konten
        </button>
      </div>

      {/* Tab 1: Akun Sosmed Gabungan */}
      {activeTab === "accounts" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">Total Akun Terdaftar</span>
              <p className="mt-1 text-2xl font-black text-slate-900">{stats.total || 0}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold text-pink-600">Instagram Multi-Account</span>
              <p className="mt-1 text-2xl font-black text-pink-700">{stats.instagram || 0}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold text-emerald-600">WhatsApp Multi-Channel</span>
              <p className="mt-1 text-2xl font-black text-emerald-700">{stats.whatsapp || 0}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold text-indigo-600">Status Aktif / Terhubung</span>
              <p className="mt-1 text-2xl font-black text-indigo-700">{stats.connected || 0}</p>
            </div>
          </div>

          {loadingAccounts ? (
            <div className="flex h-48 items-center justify-center rounded-3xl border border-slate-200 bg-white">
              <span className="text-sm font-semibold text-slate-400 animate-pulse">Memuat konfigurasi akun sosial...</span>
            </div>
          ) : accounts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <p className="text-base font-bold text-slate-800">Belum ada akun sosial yang terdaftar.</p>
              <p className="mt-1 text-sm text-slate-500">Klik "Hubungkan Kanal Baru" di atas untuk mendaftarkan akun Instagram atau WhatsApp.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {accounts.map((acc) => {
                const isIg = acc.provider === "instagram";
                const isConn = acc.status === "connected";
                const isUniv = acc.scope_type === "university";
                const scopeLabel = isUniv
                  ? `${acc.universities?.code || acc.university_id?.toUpperCase()} — ${acc.universities?.name || ""}`
                  : `Provinsi: ${acc.provinces?.name || acc.province_id}`;

                let providerBadge = { label: "Instagram Official", color: "bg-pink-50 text-pink-700 ring-pink-600/20" };
                if (acc.provider === "whatsapp_channel") {
                  providerBadge = { label: "WhatsApp Channel", color: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" };
                } else if (acc.provider === "whatsapp_group") {
                  providerBadge = { label: "WhatsApp Group", color: "bg-blue-50 text-blue-700 ring-blue-600/20" };
                } else if (acc.provider === "whatsapp_business") {
                  providerBadge = { label: "WhatsApp Gateway", color: "bg-amber-50 text-amber-700 ring-amber-600/20" };
                }

                return (
                  <div
                    key={acc.id}
                    className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm transition hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${providerBadge.color}`}>
                          {providerBadge.label}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            isConn ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${isConn ? "bg-emerald-600" : "bg-amber-600"}`} />
                          {isConn ? "Terhubung" : "Belum Aktif"}
                        </span>
                      </div>

                      <div className="mt-4">
                        <h3 className="text-lg font-black text-slate-900 break-all">
                          {isIg ? `@${acc.handle}` : acc.handle}
                        </h3>
                        <p className="mt-0.5 text-xs font-semibold text-slate-500">
                          {scopeLabel}
                        </p>
                      </div>

                      <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs">
                        <div className="flex justify-between text-slate-500">
                          <span>Identifier / JID:</span>
                          <span className="font-mono font-bold text-slate-700 truncate max-w-[180px]">
                            {acc.external_account_id || "(Belum Disetel)"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center gap-2 border-t border-slate-100 pt-4">
                      {isIg ? (
                        <button
                          onClick={() => handleTestConnection(acc)}
                          disabled={testingId === acc.id}
                          className="flex-1 rounded-xl bg-slate-100 px-3 py-2 text-center text-xs font-bold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
                        >
                          {testingId === acc.id ? "Memeriksa..." : "Uji Koneksi Meta"}
                        </button>
                      ) : (
                        <button
                          onClick={() => setBroadcastModalTarget(acc)}
                          className="flex-1 rounded-xl bg-emerald-50 px-3 py-2 text-center text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          Kirim Uji Coba
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEditModal(acc)}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                      >
                        Sunting
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: WhatsApp Multi-Channel Architecture (Pemisahan 3 Tier) */}
      {activeTab === "whatsapp" && (
        <div className="space-y-6">
          {/* Quick Metrics & Gateway Status */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">Kanal WhatsApp Aktif</span>
              <p className="mt-1 text-2xl font-black text-slate-900">{waStats.channels + waStats.groups + waStats.business}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold text-emerald-600">WhatsApp Channels (Broadcast)</span>
              <p className="mt-1 text-2xl font-black text-emerald-700">{waStats.channels}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold text-blue-600">Grup Komunitas Kampus</span>
              <p className="mt-1 text-2xl font-black text-blue-700">{waStats.groups}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Gateway Bot Baileys</span>
                <span className={`inline-flex h-2.5 w-2.5 rounded-full ${waStats.gatewayOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
              </div>
              <p className="mt-1 text-base font-black text-slate-800">
                {waStats.gatewayOnline ? "Online (Siap Kirim)" : "Offline / Standby"}
              </p>
            </div>
          </div>

          {/* Explanation 3 Tier Card */}
          <div className="rounded-3xl border border-emerald-200/80 bg-emerald-50/40 p-6 backdrop-blur-sm">
            <h3 className="text-sm font-black text-emerald-950 flex items-center gap-2">
              <svg className="h-4 w-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Standar Pemisahan Arsitektur 3 Tier WhatsApp
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-4 text-xs text-emerald-900 md:grid-cols-3">
              <div className="rounded-2xl bg-white/80 p-4 border border-emerald-100">
                <p className="font-bold text-slate-900">1. WhatsApp Channels</p>
                <p className="mt-1 text-slate-600">Siaran katalog produk dan pengumuman resmi tanpa batasan waktu interaksi pengikut (@newsletter).</p>
              </div>
              <div className="rounded-2xl bg-white/80 p-4 border border-emerald-100">
                <p className="font-bold text-slate-900">2. Gateway Bisnis & Transaksi</p>
                <p className="mt-1 text-slate-600">Pesan otomatis dua arah: OTP verifikasi nomor, notifikasi pesanan, dan konfirmasi pembayaran.</p>
              </div>
              <div className="rounded-2xl bg-white/80 p-4 border border-emerald-100">
                <p className="font-bold text-slate-900">3. Grup Komunitas Kampus</p>
                <p className="mt-1 text-slate-600">Wadah diskusi mahasiswa, fakultas, dan bursa jual beli per kampus/cabang (@g.us).</p>
              </div>
            </div>
          </div>

          {/* Sub Filters */}
          <div className="flex gap-2">
            {[
              { id: "all", label: "Semua Kanal" },
              { id: "whatsapp_channel", label: "Saluran Resmi (Channels)" },
              { id: "whatsapp_group", label: "Grup Komunitas (@g.us)" },
              { id: "whatsapp_business", label: "Gateway Bisnis / Bot" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setWaFilter(f.id)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                  waFilter === f.id
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Channels Grid */}
          {loadingWa ? (
            <div className="flex h-48 items-center justify-center rounded-3xl border border-slate-200 bg-white">
              <span className="text-sm font-semibold text-slate-400 animate-pulse">Memuat saluran WhatsApp...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {waAccounts
                .filter((a) => waFilter === "all" || a.provider === waFilter)
                .map((acc) => {
                  const isChannel = acc.provider === "whatsapp_channel";
                  const isGroup = acc.provider === "whatsapp_group";
                  const isUniv = acc.scope_type === "university";
                  const scopeLabel = isUniv
                    ? `${acc.universities?.code || acc.university_id?.toUpperCase()} — ${acc.universities?.name || ""}`
                    : `Provinsi: ${acc.provinces?.name || acc.province_id}`;

                  return (
                    <div
                      key={acc.id}
                      className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              isChannel
                                ? "bg-emerald-100 text-emerald-800"
                                : isGroup
                                ? "bg-blue-100 text-blue-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {isChannel ? "Saluran (Channel)" : isGroup ? "Grup Komunitas" : "Gateway Bot"}
                          </span>
                          {acc.subscribers !== null && (
                            <span className="text-xs font-semibold text-slate-500">
                              {acc.subscribers.toLocaleString("id-ID")} {isChannel ? "pengikut" : "anggota"}
                            </span>
                          )}
                        </div>

                        <div className="mt-4">
                          <h4 className="text-base font-black text-slate-900 break-all">
                            {acc.liveName || acc.handle}
                          </h4>
                          <p className="mt-0.5 text-xs font-semibold text-slate-500">{scopeLabel}</p>
                        </div>

                        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs">
                          <p className="font-mono text-slate-600 break-all">
                            JID: {acc.external_account_id || acc.handle}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 flex items-center gap-2 border-t border-slate-100 pt-4">
                        <button
                          onClick={() => setBroadcastModalTarget(acc)}
                          className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-center text-xs font-bold text-white transition hover:bg-emerald-700"
                        >
                          Kirim Pesan Uji Coba
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(acc)}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                        >
                          Sunting
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Instagram DM Inbox & Routing Logs */}
      {activeTab === "inbox" && (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Filter Aksi:</span>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800"
              >
                <option value="all">Semua Interaksi</option>
                <option value="published_live">Iklan Berhasil Terbit</option>
                <option value="cancelled">Dibatalkan Pengguna</option>
                <option value="feature_redirected">Pengalihan Fitur (Menfess/Cari)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Cari ID pengirim atau pesan..."
                value={searchLog}
                onChange={(e) => setSearchLog(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchDmLogs()}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 sm:w-64"
              />
              <button
                onClick={fetchDmLogs}
                className="rounded-xl bg-slate-800 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-slate-900"
              >
                Cari
              </button>
            </div>
          </div>

          {loadingLogs ? (
            <div className="flex h-48 items-center justify-center rounded-3xl border border-slate-200 bg-white">
              <span className="text-sm font-semibold text-slate-400 animate-pulse">Memuat log pesan DM...</span>
            </div>
          ) : dmLogs.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <p className="text-base font-bold text-slate-800">Belum ada interaksi DM yang tercatat.</p>
              <p className="mt-1 text-sm text-slate-500">Pesan DM masuk ke akun Instagram terhubung akan otomatis tampil di sini.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dmLogs.map((log) => {
                const targetUniv = log.universities?.code || (log.university_id ? log.university_id.toUpperCase() : null);
                const scopeTag = targetUniv ? `Kampus ${targetUniv}` : "Provinsi Sumut";

                let actionBadge = {
                  label: log.action_taken || "Interaksi Masuk",
                  className: "bg-slate-100 text-slate-700",
                };
                if (log.action_taken === "published_live") {
                  actionBadge = { label: "🎉 Iklan Terbit Live", className: "bg-emerald-100 text-emerald-800" };
                } else if (log.action_taken === "cancelled") {
                  actionBadge = { label: "❌ Batal", className: "bg-rose-100 text-rose-800" };
                } else if (log.action_taken === "feature_redirected") {
                  actionBadge = { label: "ℹ️ Pengalihan Fitur", className: "bg-blue-100 text-blue-800" };
                }

                return (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="flex cursor-pointer flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-100 text-pink-700">
                        <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900">
                            Sender: {log.sender_username || log.sender_id.slice(-6)}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                            Target: {scopeTag}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-1 text-xs text-slate-600">
                          {log.message_text || log.quick_reply_payload || "(Tanpa teks / gambar)"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${actionBadge.className}`}>
                        {actionBadge.label}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400">
                        {formatRelativeTime(log.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Antrean Publikasi Konten (Integrated) */}
      {activeTab === "queue" && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <TabInstagram />
        </div>
      )}

      {/* Modal Kirim Uji Coba Pesan WhatsApp */}
      {broadcastModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-black text-slate-900">
                Uji Coba Siaran: {broadcastModalTarget.handle}
              </h3>
              <button
                onClick={() => setBroadcastModalTarget(null)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendTestBroadcast} className="mt-4 space-y-4 text-xs">
              <div>
                <span className="font-semibold text-slate-500">Target JID:</span>
                <p className="font-mono font-bold text-emerald-800 break-all">
                  {broadcastModalTarget.external_account_id || broadcastModalTarget.handle}
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700">Isi Pesan Uji Coba</label>
                <textarea
                  rows={4}
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                  placeholder="Ketik pesan tes di sini..."
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 font-medium text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBroadcastModalTarget(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={sendingBroadcast}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {sendingBroadcast ? "Mengirim..." : "Kirim Sekarang"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail Log */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-black text-slate-900">Detail Interaksi DM Instagram</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div>
                <span className="font-semibold text-slate-500">Sender ID:</span>
                <p className="font-mono font-bold text-slate-800">{selectedLog.sender_id}</p>
              </div>

              <div>
                <span className="font-semibold text-slate-500">Akun Target Penerima:</span>
                <p className="font-mono text-slate-800">{selectedLog.recipient_account_id}</p>
              </div>

              <div>
                <span className="font-semibold text-slate-500">Cakupan Wilayah / Kampus:</span>
                <p className="font-bold text-indigo-700">
                  {selectedLog.universities?.name || selectedLog.provinces?.name || "Nasional / Umum"}
                </p>
              </div>

              <div>
                <span className="font-semibold text-slate-500">Pesan Masuk:</span>
                <div className="mt-1 rounded-2xl bg-slate-50 p-4 text-slate-800">
                  {selectedLog.message_text || selectedLog.quick_reply_payload || "-"}
                </div>
              </div>

              {selectedLog.listings && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                  <span className="font-bold text-emerald-800">Produk Terbit Live:</span>
                  <p className="mt-1 font-bold text-slate-900">{selectedLog.listings.title}</p>
                  <p className="text-xs text-slate-600">Penjual: {selectedLog.listings.seller_name}</p>
                  <Link
                    href={`/produk/${selectedLog.listings.id}`}
                    target="_blank"
                    className="mt-2 inline-block text-xs font-bold text-indigo-600 hover:underline"
                  >
                    Buka Halaman Iklan ↗
                  </Link>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Account */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-black text-slate-900">
                {editingAccount ? "Sunting Kanal Komunikasi" : "Hubungkan Kanal Baru"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700">Jenis Layanan / Kanal</label>
                <select
                  value={formProvider}
                  onChange={(e) => setFormProvider(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold text-slate-800"
                >
                  <option value="whatsapp_channel">WhatsApp Channel (Siaran Resmi / Newsletter)</option>
                  <option value="whatsapp_group">WhatsApp Group (Komunitas Kampus @g.us)</option>
                  <option value="whatsapp_business">WhatsApp Business Platform (Gateway Transaksional)</option>
                  <option value="instagram">Instagram Official</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700">Tingkat Wilayah / Scope</label>
                <div className="mt-1.5 flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="scopeType"
                      checked={formScopeType === "university"}
                      onChange={() => setFormScopeType("university")}
                    />
                    <span>Universitas / Kampus</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="scopeType"
                      checked={formScopeType === "province"}
                      onChange={() => setFormScopeType("province")}
                    />
                    <span>Tingkat Provinsi</span>
                  </label>
                </div>
              </div>

              {formScopeType === "university" ? (
                <div>
                  <label className="block font-bold text-slate-700">Pilih Universitas</label>
                  <select
                    value={formUniversityId}
                    onChange={(e) => setFormUniversityId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold text-slate-800"
                  >
                    {universitiesList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.code} — {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-slate-700">Pilih Provinsi</label>
                  <select
                    value={formProvinceId}
                    onChange={(e) => setFormProvinceId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold text-slate-800"
                  >
                    {provincesList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700">
                  {formProvider === "whatsapp_channel"
                    ? "Tautan Undangan Saluran (Invite Link)"
                    : formProvider === "whatsapp_group"
                    ? "Nama Grup / Tautan Undangan"
                    : "Username / Handle Akun"}
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="text"
                    placeholder={
                      formProvider === "whatsapp_channel"
                        ? "https://whatsapp.com/channel/..."
                        : formProvider === "whatsapp_group"
                        ? "Jual Beli USU / 120363...@g.us"
                        : "usu.menfes"
                    }
                    value={formHandle}
                    onChange={(e) => setFormHandle(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold text-slate-800"
                    required
                  />
                  {formProvider === "whatsapp_channel" && (
                    <button
                      type="button"
                      onClick={handleResolveChannelLink}
                      disabled={resolvingChannel}
                      className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {resolvingChannel ? "Membaca..." : "🔍 Deteksi JID"}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700">
                  Target JID / External Identifier
                </label>
                <input
                  type="text"
                  placeholder="contoh: 1203633...@newsletter atau 120363...@g.us"
                  value={formExternalId}
                  onChange={(e) => setFormExternalId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-slate-800"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  {formProvider === "whatsapp_channel"
                    ? "JID @newsletter untuk pengiriman pengumuman katalog."
                    : formProvider === "whatsapp_group"
                    ? "JID @g.us untuk pengiriman bursa komunitas."
                    : "ID akun eksternal / nomor bot."}
                </p>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isPending ? "Menyimpan..." : "Simpan Kanal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
