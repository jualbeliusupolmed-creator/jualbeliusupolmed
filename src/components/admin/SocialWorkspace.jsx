"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { TabInstagram } from "@/components/admin/TabInstagram";
import InstagramMenfessAnalytics from "@/components/admin/InstagramMenfessAnalytics";
import { Icon } from "@/components/Icons";
import { HelpCircle, CheckCircle, ExternalLink, ShieldCheck, Sparkles, X, Filter, Search, BarChart3 } from "lucide-react";

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
  const [madingAccountId, setMadingAccountId] = useState(null);
  const [canSelectMadingAccount, setCanSelectMadingAccount] = useState(false);
  const [settingMadingAccountId, setSettingMadingAccountId] = useState(null);

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
  const [formAccessToken, setFormAccessToken] = useState("");
  const [provincesList, setProvincesList] = useState([]);
  const [universitiesList, setUniversitiesList] = useState([]);
  const [resolvingChannel, setResolvingChannel] = useState(false);

  // Central Distribution Manager state
  const [distJobs, setDistJobs] = useState([]);
  const [loadingDist, setLoadingDist] = useState(false);
  const [distStatusFilter, setDistStatusFilter] = useState("all");
  const [processingScheduled, setProcessingScheduled] = useState(false);
  const [subQueueTab, setSubQueueTab] = useState("omnichannel"); // 'omnichannel' | 'legacy_media'

  // Testing connection state
  const [testingId, setTestingId] = useState(null);
  const [isPending, startTransition] = useTransition();

  // Wilayah & Filter state
  const [accountScopeFilter, setAccountScopeFilter] = useState("all"); // 'all' | 'province' | 'university'
  const [accountProvinceFilter, setAccountProvinceFilter] = useState("all");
  const [searchAccountQuery, setSearchAccountQuery] = useState("");
  const [showMetaGuideModal, setShowMetaGuideModal] = useState(false);
  const [connectingInstagramId, setConnectingInstagramId] = useState(null);

  const filteredDisplayAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      if (accountScopeFilter !== "all" && acc.scope_type !== accountScopeFilter) return false;
      if (accountProvinceFilter !== "all") {
        const accProv = acc.province_id || acc.universities?.province_id;
        if (accProv !== accountProvinceFilter) return false;
      }
      if (searchAccountQuery.trim()) {
        const q = searchAccountQuery.trim().toLowerCase();
        const handleMatch = String(acc.handle || "").toLowerCase().includes(q);
        const univCodeMatch = String(acc.universities?.code || "").toLowerCase().includes(q);
        const univNameMatch = String(acc.universities?.name || "").toLowerCase().includes(q);
        const provNameMatch = String(acc.provinces?.name || "").toLowerCase().includes(q);
        if (!handleMatch && !univCodeMatch && !univNameMatch && !provNameMatch) return false;
      }
      return true;
    });
  }, [accounts, accountScopeFilter, accountProvinceFilter, searchAccountQuery]);

  useEffect(() => {
    fetchAccounts();
    fetchProvincesAndUniversities();
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const result = url.searchParams.get("instagram_oauth");
    if (!result) return;
    const messages = {
      success: ["Akun Instagram berhasil dihubungkan melalui OAuth.", "success"],
      cancelled: ["Proses OAuth Instagram dibatalkan.", "error"],
      state_error: ["Sesi OAuth tidak valid atau kedaluwarsa. Mulai ulang proses hubungkan akun.", "error"],
      session_error: ["Sesi admin berubah. Masuk kembali lalu hubungkan akun.", "error"],
      scope_error: ["Akun sosial tidak ditemukan atau di luar cakupan admin.", "error"],
      account_error: ["Akun Instagram yang diotorisasi tidak cocok dengan respons Meta.", "error"],
      exchange_error: ["Meta gagal menyelesaikan OAuth. Periksa konfigurasi aplikasi dan izin Instagram.", "error"],
      save_error: ["Instagram terotorisasi, tetapi kredensial gagal disimpan. Coba hubungkan ulang.", "error"],
      webhook_error: ["Instagram terhubung, tetapi langganan webhook DM gagal. Periksa callback dan field messages di Meta, lalu hubungkan ulang.", "error"],
    };
    const [message, type] = messages[result] || ["Proses OAuth Instagram gagal.", "error"];
    if (type === "success") toast.success(message);
    else toast.error(message);
    url.searchParams.delete("instagram_oauth");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (activeTab === "inbox") {
      fetchDmLogs();
    } else if (activeTab === "whatsapp") {
      fetchWhatsAppChannels();
    } else if (activeTab === "queue") {
      fetchDistributionJobs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, actionFilter, distStatusFilter]);

  const fetchAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const res = await fetch("/api/admin/social/accounts");
      const json = await res.json();
      if (json.ok) {
        setAccounts(json.accounts || []);
        setStats(json.stats || {});
        setMadingAccountId(json.madingAccountId || null);
        setCanSelectMadingAccount(json.canSelectMadingAccount === true);
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

  const fetchDistributionJobs = async () => {
    setLoadingDist(true);
    try {
      const q = distStatusFilter !== "all" ? `?status=${distStatusFilter}` : "";
      const res = await fetch(`/api/admin/distribution${q}`);
      const json = await res.json();
      if (json.ok) {
        setDistJobs(json.jobs || []);
      } else {
        toast.error(json.error || "Gagal memuat antrean distribusi.");
      }
    } catch {
      toast.error("Gagal terhubung ke server.");
    } finally {
      setLoadingDist(false);
    }
  };

  const handleRetryDistribution = async (distributionId) => {
    try {
      const res = await fetch("/api/admin/distribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry_job", distributionId }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success("Job berhasil dikirim ulang.");
        fetchDistributionJobs();
      } else {
        toast.error(json.error || "Gagal mengirim ulang job.");
      }
    } catch {
      toast.error("Gagal terhubung ke server.");
    }
  };

  const handleCancelDistribution = async (distributionId) => {
    try {
      const res = await fetch("/api/admin/distribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel_job", distributionId }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(json.message || "Jadwal berhasil dibatalkan.");
        fetchDistributionJobs();
      } else {
        toast.error(json.error || "Gagal membatalkan jadwal.");
      }
    } catch {
      toast.error("Gagal terhubung ke server.");
    }
  };

  const handleProcessScheduledJobs = async () => {
    setProcessingScheduled(true);
    try {
      const res = await fetch("/api/admin/distribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "process_scheduled" }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(`Berhasil memproses ${json.processed || 0} pekerjaan terjadwal.`);
        fetchDistributionJobs();
      } else {
        toast.error(json.error || "Gagal memproses antrean terjadwal.");
      }
    } catch {
      toast.error("Gagal terhubung ke server.");
    } finally {
      setProcessingScheduled(false);
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

  const handleSetMadingAccount = async (account) => {
    setSettingMadingAccountId(account.id);
    try {
      const res = await fetch("/api/admin/social/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_mading_account", accountId: account.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Gagal memilih akun Mading.");
      setMadingAccountId(account.id);
      toast.success(`@${account.handle} dipilih sebagai akun publikasi Mading.`);
    } catch (error) {
      toast.error(error.message || "Gagal memilih akun Mading.");
    } finally {
      setSettingMadingAccountId(null);
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
          provinceId: formScopeType === "province" ? formProvinceId : null,
          universityId: formScopeType === "university" ? formUniversityId : null,
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
          accountId: broadcastModalTarget.id,
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
    setFormAccessToken("");
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
    setFormAccessToken("");
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
          action: formProvider.startsWith("whatsapp") ? "upsert_channel" : "upsert_account",
          id: editingAccount?.id,
          provider: formProvider,
          provinceId: formScopeType === "province" ? formProvinceId : null,
          universityId: formScopeType === "university" ? formUniversityId : null,
          handle: formHandle.trim(),
          externalAccountId: formExternalId.trim() || null,
        };
        if (formProvider === "instagram" && formAccessToken.trim()) payload.accessToken = formAccessToken.trim();

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
          toast.success(json.message || "Akun / Kanal sosial berhasil disimpan.");
          setFormAccessToken("");
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

      {/* Navigation Tabs */}
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
          onClick={() => setActiveTab("menfess-analytics")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === "menfess-analytics"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
          }`}
        >
          <BarChart3 className="h-4 w-4" aria-hidden="true" />
          Analitik Menfess
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Central Distribution Manager (Omnichannel)
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

          {/* Bar Filter Wilayah & Panduan Integrasi Meta */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari handle / univ / provinsi..."
                  value={searchAccountQuery}
                  onChange={(e) => setSearchAccountQuery(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>
              <select
                value={accountScopeFilter}
                onChange={(e) => setAccountScopeFilter(e.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
              >
                <option value="all">Semua Cakupan</option>
                <option value="province">Tingkat Provinsi</option>
                <option value="university">Tingkat Kampus</option>
              </select>
              <select
                value={accountProvinceFilter}
                onChange={(e) => setAccountProvinceFilter(e.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
              >
                <option value="all">Semua Provinsi</option>
                {provincesList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {(searchAccountQuery || accountScopeFilter !== "all" || accountProvinceFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchAccountQuery("");
                    setAccountScopeFilter("all");
                    setAccountProvinceFilter("all");
                  }}
                  className="h-9 rounded-xl px-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50"
                >
                  Reset
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowMetaGuideModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 border border-pink-200 px-3.5 py-2 text-xs font-extrabold text-pink-700 transition hover:bg-pink-100/50 shadow-xs"
            >
              <Icon.Instagram className="h-4 w-4 text-pink-600" />
              Panduan Setup Meta Graph API
            </button>
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
          ) : filteredDisplayAccounts.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center">
              <Filter className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-bold text-slate-700">Tidak ada akun yang sesuai dengan filter pencarian.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchAccountQuery("");
                  setAccountScopeFilter("all");
                  setAccountProvinceFilter("all");
                }}
                className="mt-3 rounded-full bg-slate-100 px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200"
              >
                Tampilkan Semua Akun
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filteredDisplayAccounts.map((acc) => {
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
                        {isIg && (
                          <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-slate-500">
                            <span>Akses publikasi</span>
                            <span className={acc.has_access_token ? "font-bold text-emerald-700" : "font-bold text-amber-700"}>
                              {acc.has_access_token ? "Token tersimpan" : "Perlu setup"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
                      {isIg ? (
                        <>
                          {canSelectMadingAccount && (
                            <button
                              onClick={() => handleSetMadingAccount(acc)}
                              disabled={!acc.has_access_token || settingMadingAccountId === acc.id}
                              className={`flex-1 rounded-xl px-3 py-2 text-center text-xs font-bold transition disabled:opacity-50 ${
                                madingAccountId === acc.id
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-violet-50 text-violet-700 hover:bg-violet-100"
                              }`}
                            >
                              {settingMadingAccountId === acc.id
                                ? "Menyimpan..."
                                : madingAccountId === acc.id ? "Akun Mading Terpilih" : "Jadikan Akun Mading"}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setConnectingInstagramId(acc.id);
                              window.location.assign(`/api/admin/social/instagram/oauth/start?accountId=${encodeURIComponent(acc.id)}`);
                            }}
                            disabled={connectingInstagramId === acc.id}
                            className="flex-1 rounded-xl bg-pink-600 px-3 py-2 text-center text-xs font-bold text-white transition hover:bg-pink-700 disabled:opacity-50"
                          >
                            {connectingInstagramId === acc.id ? "Membuka Instagram..." : "Hubungkan / Perbarui OAuth"}
                          </button>
                          <button
                            onClick={() => handleTestConnection(acc)}
                            disabled={testingId === acc.id}
                            className="flex-1 rounded-xl bg-slate-100 px-3 py-2 text-center text-xs font-bold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
                          >
                            {testingId === acc.id ? "Memeriksa..." : "Uji Koneksi"}
                          </button>
                        </>
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

          {/* Sub Filters & Filter Wilayah WhatsApp */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
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

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={accountProvinceFilter}
                onChange={(e) => setAccountProvinceFilter(e.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
              >
                <option value="all">Semua Provinsi</option>
                {provincesList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {accountProvinceFilter !== "all" && (
                <button
                  type="button"
                  onClick={() => setAccountProvinceFilter("all")}
                  className="h-9 rounded-xl px-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Channels Grid */}
          {loadingWa ? (
            <div className="flex h-48 items-center justify-center rounded-3xl border border-slate-200 bg-white">
              <span className="text-sm font-semibold text-slate-400 animate-pulse">Memuat saluran WhatsApp...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {waAccounts
                .filter((a) => {
                  if (waFilter !== "all" && a.provider !== waFilter) return false;
                  if (accountProvinceFilter !== "all") {
                    const accProv = a.province_id || a.universities?.province_id;
                    if (accProv !== accountProvinceFilter) return false;
                  }
                  if (searchAccountQuery.trim()) {
                    const q = searchAccountQuery.trim().toLowerCase();
                    const handleMatch = String(a.handle || "").toLowerCase().includes(q);
                    const liveNameMatch = String(a.liveName || "").toLowerCase().includes(q);
                    const univCodeMatch = String(a.universities?.code || "").toLowerCase().includes(q);
                    const univNameMatch = String(a.universities?.name || "").toLowerCase().includes(q);
                    const provNameMatch = String(a.provinces?.name || "").toLowerCase().includes(q);
                    if (!handleMatch && !liveNameMatch && !univCodeMatch && !univNameMatch && !provNameMatch) return false;
                  }
                  return true;
                })
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

      {activeTab === "menfess-analytics" && <InstagramMenfessAnalytics />}

      {/* Tab 4: Central Distribution Manager (Omnichannel Dispatcher) */}
      {activeTab === "queue" && (
        <div className="space-y-6">
          {/* Sub-tab switcher */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex gap-2">
              <button
                onClick={() => setSubQueueTab("omnichannel")}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                  subQueueTab === "omnichannel"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Omnichannel Dispatcher ({distJobs.length})
              </button>
              <button
                onClick={() => setSubQueueTab("legacy_media")}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                  subQueueTab === "legacy_media"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Antrean Generator Media IG Feed & Story
              </button>
            </div>

            {subQueueTab === "omnichannel" && (
              <button
                onClick={handleProcessScheduledJobs}
                disabled={processingScheduled}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
              >
                <svg className={`h-3.5 w-3.5 ${processingScheduled ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{processingScheduled ? "Memproses..." : "Eksekusi Antrean Terjadwal"}</span>
              </button>
            )}
          </div>

          {subQueueTab === "legacy_media" ? (
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <TabInstagram />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Ringkasan Status Omnichannel */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500">Total Distribusi</span>
                  <p className="mt-1 text-2xl font-black text-slate-900">{distJobs.length}</p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 shadow-sm">
                  <span className="text-xs font-semibold text-emerald-700">Berhasil Terbit</span>
                  <p className="mt-1 text-2xl font-black text-emerald-800">
                    {distJobs.filter((j) => j.status === "published").length}
                  </p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5 shadow-sm">
                  <span className="text-xs font-semibold text-blue-700">Terjadwal (Scheduled)</span>
                  <p className="mt-1 text-2xl font-black text-blue-800">
                    {distJobs.filter((j) => j.status === "scheduled").length}
                  </p>
                </div>
                <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-5 shadow-sm">
                  <span className="text-xs font-semibold text-rose-700">Gagal / Butuh Retry</span>
                  <p className="mt-1 text-2xl font-black text-rose-800">
                    {distJobs.filter((j) => j.status === "failed").length}
                  </p>
                </div>
              </div>

              {/* Filter Status */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  {[
                    { id: "all", label: "Semua Status" },
                    { id: "scheduled", label: "Terjadwal" },
                    { id: "published", label: "Terbit" },
                    { id: "failed", label: "Gagal" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setDistStatusFilter(f.id)}
                      className={`rounded-xl px-3 py-1.5 transition ${
                        distStatusFilter === f.id
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={fetchDistributionJobs}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Segarkan
                </button>
              </div>

              {/* Daftar Pekerjaan Distribusi Omnichannel */}
              <div className="rounded-3xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
                {loadingDist ? (
                  <div className="grid min-h-64 place-items-center text-slate-400">
                    <p className="text-xs font-medium">Memuat log antrean distribusi...</p>
                  </div>
                ) : distJobs.length === 0 ? (
                  <div className="grid min-h-56 place-items-center px-6 text-center">
                    <div>
                      <p className="text-sm font-bold text-slate-700">Belum ada aktivitas distribusi</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Buka tab Marketplace/Moderasi untuk menyetujui produk dan mendistribusikannya secara omnichannel.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {distJobs.map((job) => {
                      const getChannelBadge = (type) => {
                        switch (type) {
                          case "website":
                            return <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">🌐 Website</span>;
                          case "instagram_university":
                            return <span className="rounded-lg bg-pink-50 px-2 py-0.5 text-[11px] font-bold text-pink-700">📸 IG Kampus</span>;
                          case "instagram_province":
                            return <span className="rounded-lg bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-purple-700">📸 IG Provinsi</span>;
                          case "whatsapp_channel_university":
                            return <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">📢 WA Chan Kampus</span>;
                          case "whatsapp_channel_province":
                            return <span className="rounded-lg bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-teal-700">📢 WA Chan Prov</span>;
                          case "whatsapp_group_community":
                            return <span className="rounded-lg bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-700">👥 WA Group</span>;
                          default:
                            return <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">{type}</span>;
                        }
                      };

                      const getStatusPill = (status) => {
                        switch (status) {
                          case "published":
                            return <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">✓ Terbit</span>;
                          case "scheduled":
                            return <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">🕒 Terjadwal</span>;
                          case "publishing":
                            return <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 animate-pulse">⚙️ Menerbitkan</span>;
                          case "failed":
                            return <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700">✕ Gagal</span>;
                          default:
                            return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">{status}</span>;
                        }
                      };

                      return (
                        <div key={job.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:px-6 hover:bg-slate-50 transition">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100 border border-slate-200">
                              {job.listings?.image_url ? (
                                <img src={job.listings.image_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="grid h-full w-full place-items-center text-[10px] font-bold text-slate-400">Foto</div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="truncate text-xs font-extrabold text-slate-900">
                                  {job.listings?.title || "Produk #" + job.listing_id.slice(0, 8)}
                                </h4>
                                {getChannelBadge(job.channel_type)}
                                {getStatusPill(job.status)}
                              </div>
                              <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                                Target: <span className="font-mono text-slate-700">{job.target_destination || "Sistem"}</span> · {job.listings?.campus || "Nasional"}
                              </p>
                              {job.last_error && (
                                <p className="mt-1 text-[11px] font-medium text-rose-600">
                                  ⚠️ {job.last_error} (Percobaan: {job.attempts}/{job.max_attempts})
                                </p>
                              )}
                              <p className="mt-0.5 text-[10px] text-slate-400">
                                {job.scheduled_at ? `Jadwal: ${new Date(job.scheduled_at).toLocaleString("id-ID")}` : `Dibuat: ${formatRelativeTime(job.created_at)}`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            {job.status === "failed" && (
                              <button
                                onClick={() => handleRetryDistribution(job.id)}
                                className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100 transition"
                              >
                                Kirim Ulang
                              </button>
                            )}
                            {job.status === "scheduled" && (
                              <button
                                onClick={() => handleCancelDistribution(job.id)}
                                className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                              >
                                Batalkan
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
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
                  placeholder={formProvider === "instagram" ? "Meta Instagram Business Account ID" : "contoh: 1203633...@newsletter atau 120363...@g.us"}
                  value={formExternalId}
                  onChange={(e) => setFormExternalId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-slate-800"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  {formProvider === "instagram"
                    ? "ID numerik yang dipakai Meta Graph API untuk akun profesional ini."
                    : formProvider === "whatsapp_channel"
                    ? "JID @newsletter untuk pengiriman pengumuman katalog."
                    : formProvider === "whatsapp_group"
                    ? "JID @g.us untuk pengiriman bursa komunitas."
                    : "ID akun eksternal / nomor bot."}
                </p>
              </div>

              {formProvider === "instagram" && (
                <div className="rounded-2xl border border-pink-100 bg-pink-50/60 p-4">
                  <label htmlFor="instagram-account-token" className="block font-bold text-slate-800">
                    Token Meta untuk akun ini
                  </label>
                  <input
                    id="instagram-account-token"
                    type="password"
                    autoComplete="new-password"
                    value={formAccessToken}
                    onChange={(event) => setFormAccessToken(event.target.value)}
                    placeholder={editingAccount?.has_access_token ? "Token sudah tersimpan; isi hanya untuk mengganti" : "Tempel access token Meta"}
                    className="mt-1.5 w-full rounded-xl border border-pink-200 bg-white px-3 py-2.5 font-mono text-xs outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10"
                  />
                  <p className="mt-2 leading-relaxed text-slate-600">
                    Token diuji terhadap ID akun, lalu disimpan terenkripsi di server. Token tidak ditampilkan lagi setelah disimpan.
                    Buat access token dengan izin Instagram Basic dan Content Publishing di Meta Developers.
                  </p>
                </div>
              )}

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
      {/* Modal Panduan Setup Meta Graph API */}
      {showMetaGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-pink-100 text-pink-700">
                  <Icon.Instagram className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Integrasi Meta Instagram Graph API
                  </h3>
                  <p className="text-xs font-semibold text-slate-500">
                    Pengaturan Akun Resmi per-Wilayah & per-Kampus
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMetaGuideModal(false)}
                className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 space-y-6 text-xs text-slate-700 leading-relaxed">
              {/* Step 1 */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-900 text-[10px] text-white">1</span>
                  Konfigurasi Webhook Meta Developer
                </div>
                <p className="text-slate-600">
                  Daftarkan endpoint webhook di dasbor aplikasi Meta Developers Anda:
                </p>
                <div className="rounded-xl bg-slate-900 p-3 font-mono text-[11px] text-emerald-400 space-y-1">
                  <div><span className="text-slate-400">Callback URL:</span> https://www.kampuskita.my.id/api/webhook/instagram</div>
                  <div><span className="text-slate-400">Verify Token:</span> (Lihat INSTAGRAM_WEBHOOK_VERIFY_TOKEN di .env)</div>
                  <div><span className="text-slate-400">Subscription:</span> messages, messaging_postbacks</div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-900 text-[10px] text-white">2</span>
                  Penghubungan Akun Bisnis & Facebook Page
                </div>
                <p className="text-slate-600">
                  Pastikan akun Instagram yang didaftarkan (misal <span className="font-mono font-bold text-pink-700">@jualbelidikampus.ui</span>) merupakan <strong>Akun Profesional / Bisnis</strong> yang terhubung ke satu Facebook Page resmi wilayah terkait.
                </p>
              </div>

              {/* Step 3 */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-900 text-[10px] text-white">3</span>
                  Pendaftaran Identifier di Panel Admin
                </div>
                <p className="text-slate-600">
                  Buka tombol <strong>Sunting</strong> pada kartu akun di bawah, lalu masukkan <strong>Instagram Business Account ID</strong> (angka 17 digit) ke kolom <em>Identifier / External ID</em>.
                </p>
                <p className="text-slate-500 text-[11px]">
                  💡 <strong>Otomasi Multi-Kampus:</strong> Saat pesan DM masuk dari pengguna, router inbound sistem secara otomatis membaca akun tujuan dan mengaitkan listing ke universitas yang bersangkutan tanpa salah wilayah.
                </p>
              </div>
            </div>

            <div className="mt-8 flex justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowMetaGuideModal(false)}
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
