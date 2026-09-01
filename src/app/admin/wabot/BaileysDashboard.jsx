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


const TABS = ["status", "statistik", "sapaan", "aksi", "antrean", "kapabilitas", "profil", "story", "chat", "grup",
              "saluran", "kirim", "broadcast", "blocklist", "lid", "konteks", "log"];
const TAB_LABELS = {
  status:    " Status",
  statistik: " Statistik",
  sapaan:    " Sapaan & Nomor",
  aksi:      " Aksi",
  antrean:   " Antrean",
  kapabilitas: "Kemampuan",
  profil:    " Profil Bot",
  story:     " Status WA",
  chat:      " Chat",
  grup:      " Grup",
  saluran:   " Saluran",
  kirim:     " Kirim",
  broadcast: " Broadcast",
  blocklist: " Blocklist",
  lid:       " LID Map",
  konteks:   " Sesi Aktif",
  log:       " Log",
};

export default function BaileysDashboard() {
  const [tab, setTab] = useState("status");

  return (
    <div className="space-y-6">
      {/* Tujuh belas sub-tab dalam satu baris yang bisa digeser — bentuk tab
          Material: garis biru di bawah yang aktif, bukan blok hitam penuh. */}
      <div className="g-tabbar -mx-1 rounded-lg">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`g-tab${tab === t ? " is-active" : ""}`}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === "status"    && <TabStatus />}
      {tab === "statistik" && <TabStatistik />}
      {tab === "sapaan"    && <TabSapaan />}
      {tab === "aksi"      && <TabAksi />}
      {tab === "antrean" && <TabAntrean />}
      {tab === "kapabilitas" && <TabKapabilitas />}
      {tab === "profil"    && <TabProfil />}
      {tab === "story"     && <TabStory />}
      {tab === "chat"      && <TabChat />}
      {tab === "grup"      && <TabGrup />}
      {tab === "saluran"   && <TabSaluran />}
      {tab === "kirim"     && <TabKirim />}
      {tab === "broadcast" && <TabBroadcast />}
      {tab === "blocklist" && <TabBlocklist />}
      {tab === "lid"       && <TabLidMap />}
      {tab === "konteks"   && <TabKonteks />}
      {tab === "log"       && <TabLog />}
    </div>
  );
}
