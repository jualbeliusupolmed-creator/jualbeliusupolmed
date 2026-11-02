"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Megaphone, Users, MessageSquareText, Bell, Sparkles } from "lucide-react";
import BroadcastPanel from "../BroadcastPanel";
import GroupBroadcastPanel from "../GroupBroadcastPanel";
import GroupPostsPanel from "../GroupPostsPanel";
import NotifikasiPanel from "../NotifikasiPanel";

const TABS = [
  { id: "kontak", label: "Siaran Kontak", icon: Megaphone, desc: "Kirim pesan ke penjual / kontak aktif dengan AI & jadwal" },
  { id: "grup", label: "Siaran Grup WA", icon: Users, desc: "Siarkan pesan atau gambar langsung ke grup WhatsApp kampus" },
  { id: "riwayat", label: "Moderasi Post Grup", icon: MessageSquareText, desc: "Daftar dan moderasi postingan yang masuk ke grup WhatsApp" },
  { id: "notifikasi", label: "Pelanggan Notifikasi", icon: Bell, desc: "Kelola langganan notifikasi kategori WA dan web push browser" },
];

export default function BroadcastClient({ sellers = [], initialTab = "kontak" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = searchParams?.get("tab");

  const [activeTab, setActiveTab] = useState(urlTab || initialTab || "kontak");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (urlTab && TABS.some((t) => t.id === urlTab)) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  function handleTabChange(tabId) {
    setActiveTab(tabId);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.set("tab", tabId);
      router.replace(`/admin/broadcast?${params.toString()}`, { scroll: false });
    }
  }

  async function action(body, okMsg) {
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
    }
  }

  const currentTabInfo = TABS.find((t) => t.id === activeTab) || TABS[0];

  return (
    <div className="space-y-6">
      {toast && (
        <div
          role="alert"
          className={`rounded-xl border px-4 py-3 text-xs font-bold transition-all ${
            toast.type === "err"
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Header Pusat Siaran */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
              <Megaphone className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              Pusat Siaran &amp; Broadcast
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {currentTabInfo.desc}
          </p>
        </div>
      </header>

      {/* Segmented Control Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-white/10">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                isActive
                  ? "bg-emerald-800 text-white shadow-md shadow-emerald-950/10"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Konten Tab Aktif */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900 sm:p-6">
        {activeTab === "kontak" && <BroadcastPanel sellers={sellers} />}
        {activeTab === "grup" && <GroupBroadcastPanel />}
        {activeTab === "riwayat" && <GroupPostsPanel action={action} />}
        {activeTab === "notifikasi" && <NotifikasiPanel action={action} />}
      </div>
    </div>
  );
}
