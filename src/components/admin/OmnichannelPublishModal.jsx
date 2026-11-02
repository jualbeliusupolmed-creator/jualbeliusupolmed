"use client";

import { useState, useEffect } from "react";
import {
  Globe,
  Instagram,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  Calendar,
  X,
  Layers,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";

export default function OmnichannelPublishModal({
  listing,
  isOpen,
  onClose,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [matrixData, setMatrixData] = useState(null);
  const [channels, setChannels] = useState([]);
  const [distributionLogs, setDistributionLogs] = useState([]);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState("");
  const [activeTab, setActiveTab] = useState("channels"); // 'channels' | 'logs'

  useEffect(() => {
    if (isOpen && listing?.id) {
      loadDistributionData();
    }
  }, [isOpen, listing?.id]);

  const loadDistributionData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/distribution?listingId=${listing.id}`);
      const json = await res.json();
      if (json.ok) {
        setMatrixData(json.matrix);
        setDistributionLogs(json.logs || []);
        // Siapkan pilihan channel default
        const initChannels = (json.matrix?.channels || []).map((ch) => ({
          ...ch,
          selected: ch.defaultSelected,
          customCaption: ch.caption || "",
        }));
        setChannels(initChannels);
      } else {
        toast.error(json.error || "Gagal memuat target distribusi.");
      }
    } catch {
      toast.error("Gagal terhubung ke server.");
    } finally {
      setLoading(false);
    }
  };

  const toggleChannel = (idx) => {
    setChannels((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, selected: !c.selected } : c))
    );
  };

  const updateCaption = (idx, text) => {
    setChannels((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, customCaption: text } : c))
    );
  };

  const handleExecutePublish = async () => {
    const selected = channels.filter((c) => c.selected);
    if (selected.length === 0) {
      toast.error("Pilih minimal 1 kanal untuk publikasi.");
      return;
    }

    if (isScheduled && !scheduledTime) {
      toast.error("Tentukan tanggal dan jam penayangan terjadwal.");
      return;
    }

    setPublishing(true);
    try {
      const payload = {
        action: isScheduled ? "schedule_channels" : "publish_channels",
        listingId: listing.id,
        scheduledAt: isScheduled ? new Date(scheduledTime).toISOString() : null,
        channels: selected.map((c) => ({
          channelType: c.channelType,
          socialAccountId: c.socialAccountId,
          targetDestination: c.targetDestination,
          caption: c.customCaption,
          universityId: matrixData?.university?.id || null,
          provinceId: matrixData?.province?.id || null,
        })),
      };

      const res = await fetch("/api/admin/distribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.ok) {
        toast.success(json.message);
        loadDistributionData();
        setActiveTab("logs");
        if (onSuccess) onSuccess();
      } else {
        toast.error(json.error || "Gagal mempublikasikan produk.");
      }
    } catch (err) {
      toast.error("Terjadi galat: " + err.message);
    } finally {
      setPublishing(false);
    }
  };

  const handleRetryJob = async (distributionId) => {
    try {
      const res = await fetch("/api/admin/distribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry_job", distributionId }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success("Job distribusi berhasil dikirim ulang.");
        loadDistributionData();
      } else {
        toast.error(json.error || "Gagal melakukan retry.");
      }
    } catch {
      toast.error("Gagal terhubung ke server.");
    }
  };

  if (!isOpen) return null;

  const getChannelIcon = (type) => {
    if (type.includes("instagram")) return <Instagram className="h-5 w-5 text-pink-600" />;
    if (type.includes("whatsapp")) return <MessageSquare className="h-5 w-5 text-emerald-600" />;
    return <Globe className="h-5 w-5 text-blue-600" />;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "published":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> Terbit
          </span>
        );
      case "scheduled":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
            <Clock className="h-3.5 w-3.5" /> Terjadwal
          </span>
        );
      case "publishing":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 animate-pulse">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Menerbitkan...
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700">
            <AlertCircle className="h-3.5 w-3.5" /> Gagal
          </span>
        );
      default:
        return (
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-100">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Central Distribution Manager
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Penerbitan Omnichannel Produk ({matrixData?.university?.name || listing?.campus || "Nasional"})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Info Ringkas Produk */}
        <div className="flex items-center gap-4 bg-slate-50 px-6 py-3 border-b border-slate-100">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-200">
            {listing?.image_url ? (
              <img
                src={listing.image_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full w-full place-items-center text-xs font-bold text-slate-400">
                Foto
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-sm font-bold text-slate-900">
              {listing?.title}
            </h4>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
              <span className="font-semibold text-emerald-700">
                Rp {Number(listing?.price || 0).toLocaleString("id-ID")}
              </span>
              <span>·</span>
              <span>Kampus: {listing?.campus}</span>
              <span>·</span>
              <span>Kategori: {listing?.category || "Umum"}</span>
            </div>
          </div>

          {/* Tab Navigasi Modal */}
          <div className="flex rounded-lg bg-slate-200 p-0.5 text-xs font-bold">
            <button
              onClick={() => setActiveTab("channels")}
              className={`rounded-md px-3 py-1.5 transition ${
                activeTab === "channels"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Matriks Kanal ({channels.length})
            </button>
            <button
              onClick={() => setActiveTab("logs")}
              className={`rounded-md px-3 py-1.5 transition ${
                activeTab === "logs"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Riwayat Siaran ({distributionLogs.length})
            </button>
          </div>
        </div>

        {/* Isi Modal */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="grid min-h-64 place-items-center text-slate-400">
              <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
              <p className="mt-2 text-xs font-medium">Menghubungkan target omnichannel...</p>
            </div>
          ) : activeTab === "channels" ? (
            <>
              {/* Pilihan Kanal */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Pilih Kanal Penyiaran
                  </h5>
                  <span className="text-xs text-slate-400">
                    {channels.filter((c) => c.selected).length} dipilih
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {channels.map((ch, idx) => (
                    <div
                      key={ch.channelType}
                      onClick={() => toggleChannel(idx)}
                      className={`cursor-pointer rounded-xl border p-4 transition-all flex flex-col justify-between ${
                        ch.selected
                          ? "border-emerald-600 bg-emerald-50/20 shadow-sm ring-1 ring-emerald-600"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">{getChannelIcon(ch.channelType)}</div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-800">
                            {ch.name}
                          </p>
                          <p className="truncate text-xs text-slate-500 mt-0.5">
                            Target: {ch.targetDestination || "Sistem"}
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={ch.selected}
                          onChange={() => {}}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 mt-1 pointer-events-none"
                        />
                      </div>

                      {ch.channelType.includes("province") && (
                        <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md w-fit">
                          <Sparkles className="h-3 w-3" /> Rekomendasi Produk Unggulan
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Opsi Jadwal Siaran */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-600" />
                    <span className="text-sm font-bold text-slate-800">
                      Jadwalkan Penayangan (Posting Schedule)
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isScheduled}
                      onChange={(e) => setIsScheduled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {isScheduled && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Waktu Penyiaran Otomatis (WIB):
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full sm:w-auto rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Sistem background worker akan mempublikasikan secara otomatis saat waktu telah tiba.
                    </p>
                  </div>
                )}
              </div>

              {/* Caption Inspector & Editor */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Pratinjau & Penyesuaian Caption Siaran
                </h5>
                <div className="space-y-3">
                  {channels
                    .filter((c) => c.selected && c.customCaption)
                    .map((ch) => {
                      const idx = channels.findIndex((c) => c.channelType === ch.channelType);
                      return (
                        <div
                          key={ch.channelType}
                          className="rounded-xl border border-slate-200 p-3 bg-white"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                              {getChannelIcon(ch.channelType)} {ch.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {ch.customCaption.length} karakter
                            </span>
                          </div>
                          <textarea
                            rows={4}
                            value={ch.customCaption}
                            onChange={(e) => updateCaption(idx, e.target.value)}
                            className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-700 font-mono focus:border-emerald-500 focus:ring-emerald-500"
                          />
                        </div>
                      );
                    })}
                </div>
              </div>
            </>
          ) : (
            /* Tab Riwayat Siaran (Logs) */
            <div className="space-y-3">
              {distributionLogs.length === 0 ? (
                <div className="grid min-h-48 place-items-center text-center text-slate-400">
                  <div>
                    <Layers className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-xs font-bold text-slate-600">
                      Belum ada riwayat siaran
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Pilih kanal di tab sebelumnya dan klik &apos;Publikasikan&apos;.
                    </p>
                  </div>
                </div>
              ) : (
                distributionLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 bg-white hover:bg-slate-50 transition"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{getChannelIcon(log.channel_type)}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">
                            {log.channel_type}
                          </span>
                          {getStatusBadge(log.status)}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                          Target: {log.target_destination || "Sistem"}
                        </p>
                        {log.last_error && (
                          <p className="text-[11px] text-rose-600 font-medium mt-1">
                            ⚠️ Galat: {log.last_error}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-1">
                          Waktu:{" "}
                          {log.published_at
                            ? new Date(log.published_at).toLocaleString("id-ID")
                            : new Date(log.created_at).toLocaleString("id-ID")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {log.status === "failed" && (
                        <button
                          onClick={() => handleRetryJob(log.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 hover:bg-amber-100 transition"
                        >
                          <RefreshCw className="h-3.5 w-3.5" /> Kirim Ulang
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 transition"
          >
            Tutup
          </button>

          {activeTab === "channels" && (
            <button
              type="button"
              onClick={handleExecutePublish}
              disabled={publishing || loading}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 disabled:opacity-50 transition"
            >
              {publishing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : isScheduled ? (
                <>
                  <Clock className="h-4 w-4" />
                  <span>Jadwalkan Siaran Omnichannel</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Publikasikan Sekarang ({channels.filter((c) => c.selected).length})</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
