"use client";

import { useState } from "react";

import { TabStatus } from "@/components/baileys/TabStatus";
import { TabKapabilitas } from "@/components/baileys/TabKapabilitas";
import { TabProfil } from "@/components/baileys/TabProfil";
import { TabStory } from "@/components/baileys/TabStory";
import { TabChat } from "@/components/baileys/TabChat";
import { TabGrup } from "@/components/baileys/TabGrup";
import { TabSaluran } from "@/components/baileys/TabSaluran";
import { TabKirim } from "@/components/baileys/TabKirim";
import { TabBlocklist } from "@/components/baileys/TabBlocklist";
import { TabLidMap } from "@/components/baileys/TabLidMap";
import { TabKonteks } from "@/components/baileys/TabKonteks";
import { TabLog } from "@/components/baileys/TabLog";
import { TabAksi } from "@/components/baileys/TabAksi";
import { TabStatistik } from "@/components/baileys/TabStatistik";
import { TabSapaan } from "@/components/baileys/TabSapaan";
import { TabBroadcast } from "@/components/baileys/TabBroadcast";
import { TabAntrean } from "@/components/baileys/TabAntrean";

const TABS = [
  "status", "statistik", "sapaan", "aksi", "antrean", "kapabilitas", "profil", "story", "chat", "grup",
  "saluran", "kirim", "broadcast", "blocklist", "lid", "konteks", "log"
];

const TAB_LABELS = {
  status:      "⚡ Status",
  statistik:   "📊 Statistik",
  sapaan:      "💬 Sapaan & Nomor",
  aksi:        "⚙️ Aksi Cepat",
  antrean:     "⏳ Antrean",
  kapabilitas: "🧩 Kemampuan",
  profil:      "👤 Profil Bot",
  story:       "📸 Status WA",
  chat:        "✉️ Percakapan",
  grup:        "👥 Grup",
  saluran:     "📣 Saluran",
  kirim:       "📤 Kirim Pesan",
  broadcast:   "📢 Broadcast",
  blocklist:   "🚫 Blocklist",
  lid:         "📇 LID Map",
  konteks:     "🔄 Sesi Aktif",
  log:         "📜 Log Sistem",
};

export default function BaileysDashboard() {
  const [tab, setTab] = useState("status");

  return (
    <div className="space-y-6">
      {/* Tab Navigasi Bot Responsif & Modern */}
      <div className="border-b border-slate-200/80 pb-3 dark:border-white/10">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {TABS.map((t) => {
            const isActive = tab === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  isActive
                    ? "bg-emerald-800 text-white shadow-md shadow-emerald-950/15"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                <span>{TAB_LABELS[t]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-[400px]">
        {tab === "status"      && <TabStatus />}
        {tab === "statistik"   && <TabStatistik />}
        {tab === "sapaan"      && <TabSapaan />}
        {tab === "aksi"        && <TabAksi />}
        {tab === "antrean"     && <TabAntrean />}
        {tab === "kapabilitas" && <TabKapabilitas />}
        {tab === "profil"      && <TabProfil />}
        {tab === "story"       && <TabStory />}
        {tab === "chat"        && <TabChat />}
        {tab === "grup"        && <TabGrup />}
        {tab === "saluran"     && <TabSaluran />}
        {tab === "kirim"       && <TabKirim />}
        {tab === "broadcast"   && <TabBroadcast />}
        {tab === "blocklist"   && <TabBlocklist />}
        {tab === "lid"         && <TabLidMap />}
        {tab === "konteks"     && <TabKonteks />}
        {tab === "log"         && <TabLog />}
      </div>
    </div>
  );
}
