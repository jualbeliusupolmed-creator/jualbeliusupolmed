"use client";

import { useState } from "react";

import { TabStatus } from "@/components/baileys/TabStatus";
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


const TABS = ["status", "profil", "story", "chat", "grup", "saluran", "kirim", "blocklist", "lid", "konteks", "log"];
const TAB_LABELS = {
  status:    "🔌 Status",
  profil:    "👤 Profil Bot",
  story:     "📱 Status WA",
  chat:      "💬 Chat",
  grup:      "👥 Grup",
  saluran:   "📢 Saluran",
  kirim:     "✉️ Kirim",
  blocklist: "🚫 Blocklist",
  lid:       "🗺️ LID Map",
  konteks:   "🧠 Sesi Aktif",
  log:       "📜 Log",
};

export default function BaileysDashboard() {
  const [tab, setTab] = useState("status");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-3 dark:border-slate-800">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t ? "bg-gray-900 text-white dark:bg-slate-100 dark:text-slate-900"
                       : "text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === "status"    && <TabStatus />}
      {tab === "profil"    && <TabProfil />}
      {tab === "story"     && <TabStory />}
      {tab === "chat"      && <TabChat />}
      {tab === "grup"      && <TabGrup />}
      {tab === "saluran"   && <TabSaluran />}
      {tab === "kirim"     && <TabKirim />}
      {tab === "blocklist" && <TabBlocklist />}
      {tab === "lid"       && <TabLidMap />}
      {tab === "konteks"   && <TabKonteks />}
      {tab === "log"       && <TabLog />}
    </div>
  );
}
