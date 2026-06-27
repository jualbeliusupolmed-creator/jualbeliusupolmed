"use client";

import { useState } from "react";
import { 
  Bot, MessagesSquare, BellRing, Database, 
  Users, ShieldAlert 
} from "lucide-react";

const CAPABILITIES = [
  {
    category: "Otomatisasi Bisnis & CS",
    icon: <Bot className="w-5 h-5" />,
    features: [
      { id: "auto_reply", title: "Chatbot FAQ Otomatis", desc: "Menjawab pertanyaan berulang dari pelanggan secara instan (pricelist, format order, dll)." },
      { id: "cs_alloc", title: "Alokasi Chat (CS Tim)", desc: "Meneruskan pesan masuk dari satu nomor ke nomor staf CS yang sedang online." },
      { id: "queue", title: "Sistem Antrean Digital", desc: "Mengatur antrean pelanggan atau sistem reservasi lewat chat WhatsApp secara otomatis." }
    ]
  },
  {
    category: "Gateway & Notifikasi",
    icon: <BellRing className="w-5 h-5" />,
    features: [
      { id: "reminder", title: "Pengingat Tagihan", desc: "Mengirim pesan otomatis saat jatuh tempo atau konfirmasi pesanan (sistem E-commerce)." },
      { id: "otp", title: "Kode OTP & Autentikasi", desc: "Mengirimkan kode verifikasi 6 digit untuk keamanan login atau pendaftaran pengguna." },
      { id: "server_notif", title: "Notifikasi Server / IoT", desc: "Peringatan instan ke WhatsApp Anda jika downtime server terjadi atau sensor perangkat cerdas aktif." }
    ]
  },
  {
    category: "Media Interaktif & Komunikasi",
    icon: <MessagesSquare className="w-5 h-5" />,
    features: [
      { id: "polling", title: "Sistem Polling", desc: "Membuat jajak pendapat di grup dan menghitung hasil suara yang masuk secara otomatis." },
      { id: "reactions", title: "Reaksi Pesan (Emoji)", desc: "Bot memberikan reaksi emoji (👍, ❤️) pada pesan pelanggan agar lebih interaktif tanpa spam teks." },
      { id: "view_once", title: "Bypass Pesan Sekali Lihat", desc: "Kemampuan mendeteksi, mengunduh, dan menyimpan media (foto/video) berlabel View Once." },
      { id: "disappearing", title: "Pesan Otomatis Terhapus", desc: "Mengirim pesan rahasia yang terprogram untuk terhapus otomatis dalam waktu tertentu." },
      { id: "ctwa", title: "CTWA Ads Recovery", desc: "Melacak sumber iklan Click-to-WhatsApp (Ads) dan memperbaiki template pesan masuk yang rusak." }
    ]
  },
  {
    category: "Manajemen Grup & Komunitas",
    icon: <Users className="w-5 h-5" />,
    features: [
      { id: "group_admin", title: "Otomatisasi Admin Grup", desc: "Mengubah nama, deskripsi, foto, dan setelan privasi grup secara terprogram (via API)." },
      { id: "member_approve", title: "Persetujuan Anggota Pintar", desc: "Menyetujui (approve) atau menolak calon anggota grup terkunci berdasarkan logika internal." },
      { id: "community_broadcast", title: "Pengumuman Komunitas Massal", desc: "Siaran pesan satu arah ke seluruh anggota sub-grup di dalam satu Komunitas (WhatsApp Community)." }
    ]
  },
  {
    category: "Integrasi Eksternal & Data",
    icon: <Database className="w-5 h-5" />,
    features: [
      { id: "ai_mcp", title: "AI Agent (MCP Protocol)", desc: "Jembatan untuk AI modern (Claude/ChatGPT) agar dapat membaca, merangkum, dan membalas chat WA layaknya manusia." },
      { id: "web_scrape", title: "Web Scraping ke WA", desc: "Bot otomatis menarik dan mengirimkan update harga saham, cuaca, atau laporan analitik harian." },
      { id: "crm_sync", title: "Sinkronisasi CRM & Kontak", desc: "Menarik daftar kontak dan profil publik pengguna secara massal tanpa harus menyimpannya di buku telepon lokal." }
    ]
  },
  {
    category: "Keamanan & Low-Level (Advance)",
    icon: <ShieldAlert className="w-5 h-5" />,
    features: [
      { id: "reject_call", title: "Auto-Reject Panggilan", desc: "Mendeteksi dan otomatis menolak telepon masuk (vcall/audio) beserta pesan peringatan balasan." },
      { id: "voice_note", title: "Spoofing Voice Note", desc: "Mengirim file audio yang direkayasa sedemikian rupa agar UI WhatsApp membacanya sebagai rekaman suara asli (ikon mic biru)." },
      { id: "link_preview", title: "Manipulasi Link Preview", desc: "Mengkustomisasi gambar thumbnail, judul, dan deskripsi dari sebuah link URL secara bebas saat dibagikan." },
      { id: "anti_delete", title: "Audit & Anti-Delete", desc: "Merekam isi pesan asli di server lokal sebelum diedit atau sebelum dihapus (tarik pesan) oleh pihak pengirim." },
      { id: "device_spoof", title: "Device Spoofing", desc: "Memanipulasi metadata nama perangkat terhubung (misal: WhatsApp Web diubah menjadi 'Server Jual Beli')." },
      { id: "anti_ban", title: "Sistem Anti-Banned & Humanize", desc: "Menerapkan random delay dan status spoofing (Sedang Mengetik...) untuk mengelabui algoritma deteksi spam milik Meta." }
    ]
  }
];

export function TabKapabilitas() {
  const [activeModules, setActiveModules] = useState({});

  const toggleModule = (id) => {
    setActiveModules(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">🌟 Katalog Kapabilitas Modul Baileys</h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Kumpulan fitur tingkat mahir (low-level) yang didukung oleh mesin arsitektur Baileys. 
          Anda dapat menyalakan <i>toggle</i> di bawah ini sebagai representasi modul aktif di dalam <i>roadmap</i> sistem WaBot Anda.
        </p>
      </div>

      <div className="space-y-8">
        {CAPABILITIES.map((cat, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-5 border-b border-gray-100 dark:border-slate-800 pb-4">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg shadow-sm">
                {cat.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{cat.category}</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {cat.features.map((feat) => (
                <div key={feat.id} className="relative flex flex-col p-5 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/40 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-800 transition-colors shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm pr-8 leading-tight">{feat.title}</h4>
                    <button 
                      onClick={() => toggleModule(feat.id)}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                        activeModules[feat.id] ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-700'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        activeModules[feat.id] ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed flex-grow">
                    {feat.desc}
                  </p>
                  
                  {activeModules[feat.id] && (
                    <div className="mt-4 pt-3 border-t border-gray-200 dark:border-slate-700">
                       <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 ring-1 ring-inset ring-green-600/20">
                         <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
                         Modul Aktif & Siaga
                       </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
