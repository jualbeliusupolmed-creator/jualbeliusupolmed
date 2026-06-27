"use client";

import { useState, useEffect, useRef } from "react";
import {
  Wifi, MessageSquare, FileText, MousePointer,
  Users, Globe, Megaphone, UserCheck, PhoneCall,
  Database, Shield, Server, Cpu, ShieldAlert
} from "lucide-react";

const CAPABILITIES = [
  {
    category: "Koneksi & Autentikasi",
    icon: <Wifi className="w-5 h-5" />,
    features: [
      { id: "login_qr", title: "Login via QR Code scan", desc: "Masuk menggunakan pindai kode QR konvensional." },
      { id: "login_pairing", title: "Login via Pairing Code", desc: "Masuk via kode 8 digit tanpa kamera." },
      { id: "session_local", title: "Sesi File Lokal", desc: "Simpan sesi ke file lokal (multi-file auth state)." },
      { id: "session_db", title: "Sesi Database", desc: "Simpan sesi ke database (MongoDB, PostgreSQL)." },
      { id: "auto_reconnect", title: "Auto-Reconnect", desc: "Koneksi ulang otomatis saat terputus." },
      { id: "detect_disconnect", title: "Deteksi Disconnect", desc: "Mendeteksi alasan pemutusan (DisconnectReason)." },
      { id: "multi_device", title: "Multi-Device Native", desc: "HP tetap bisa dipakai bersamaan saat bot aktif." },
      { id: "multi_session", title: "Multi-Session", desc: "Banyak nomor berjalan dalam satu server." },
      { id: "device_spoofing", title: "Device Spoofing", desc: "Kustomisasi nama perangkat tertaut." }
    ]
  },
  {
    category: "Pesan Teks",
    icon: <MessageSquare className="w-5 h-5" />,
    features: [
      { id: "text_basic", title: "Kirim/Terima Teks", desc: "Kirim & terima pesan teks biasa." },
      { id: "text_quote", title: "Quote & Reply", desc: "Balas pesan spesifik (quote/reply)." },
      { id: "text_mention", title: "Mention & Tag", desc: "Menandai anggota grup." },
      { id: "text_forward", title: "Forward Pesan", desc: "Meneruskan pesan ke obrolan lain." },
      { id: "text_edit", title: "Edit Pesan", desc: "Mengubah teks yang sudah terkirim." },
      { id: "text_delete", title: "Tarik Pesan", desc: "Tarik/hapus pesan (delete for everyone)." },
      { id: "text_link_preview", title: "Link Preview Kustom", desc: "Judul & thumbnail dimodifikasi secara manual." },
      { id: "text_disappearing", title: "Pesan Disappearing", desc: "Auto-hapus 24 jam / 7 hari / 90 hari." }
    ]
  },
  {
    category: "Media & Dokumen",
    icon: <FileText className="w-5 h-5" />,
    features: [
      { id: "media_img", title: "Gambar & Video", desc: "Kirim & terima file gambar atau video." },
      { id: "media_gif", title: "GIF Interaktif", desc: "Kirim & terima gambar gerak (GIF)." },
      { id: "media_audio", title: "Audio & VN Asli", desc: "Kirim audio biasa atau Voice Note asli (ikon biru)." },
      { id: "media_docs", title: "File Dokumen", desc: "Kirim & terima dokumen (PDF, Excel, Word, dll)." },
      { id: "media_vcard", title: "Kartu Kontak (VCard)", desc: "Bagikan nomor kontak dengan VCard." },
      { id: "media_location", title: "Titik Lokasi", desc: "Kirim titik lokasi GPS." },
      { id: "media_sticker", title: "Stiker", desc: "Kirim gambar dalam format stiker WhatsApp." },
      { id: "media_download", title: "Unduh Otomatis", desc: "Unduh media dari pesan masuk ke server." },
      { id: "media_view_once", title: "Bypass View Once", desc: "Baca & unduh pesan View Once (Sekali Lihat)." }
    ]
  },
  {
    category: "Fitur Interaktif",
    icon: <MousePointer className="w-5 h-5" />,
    features: [
      { id: "interact_poll", title: "Polling Otomatis", desc: "Kirim polling dan baca/hitung hasil suara masuk." },
      { id: "interact_buttons", title: "Tombol Aksi", desc: "Kirim pesan dengan tombol interaktif (buttons)." },
      { id: "interact_lists", title: "Daftar Pilihan", desc: "Kirim pesan daftar pilihan (list messages)." },
      { id: "interact_reactions", title: "Reaksi Emoji", desc: "Kirim emoji reaksi pada pesan." },
      { id: "interact_catalog", title: "Katalog Produk", desc: "Kirim pesan kartu katalog produk." },
      { id: "interact_rich", title: "Rich Response", desc: "Kirim pesan interaktif dengan format kaya." }
    ]
  },
  {
    category: "Grup",
    icon: <Users className="w-5 h-5" />,
    features: [
      { id: "group_create", title: "Buat Grup Baru", desc: "Membuat grup melalui perintah program." },
      { id: "group_members", title: "Manajemen Anggota", desc: "Tambah/keluarkan anggota dari grup." },
      { id: "group_admins", title: "Manajemen Admin", desc: "Tunjuk atau turunkan jabatan admin grup." },
      { id: "group_info", title: "Ubah Info Grup", desc: "Ubah nama, deskripsi, atau foto profil grup." },
      { id: "group_privacy", title: "Setelan Privasi", desc: "Ubah siapa yang bisa mengirim pesan." },
      { id: "group_detect", title: "Deteksi Aktivitas", desc: "Deteksi anggota yang masuk/keluar grup." },
      { id: "group_approval", title: "Approval System", desc: "Setujui/tolak permintaan bergabung secara otomatis." },
      { id: "group_welcome", title: "Sambutan Otomatis", desc: "Sistem sambutan otomatis untuk anggota baru." },
      { id: "group_kick", title: "Auto Kick Spammer", desc: "Keluarkan penipu berdasarkan logika sistem." }
    ]
  },
  {
    category: "Komunitas (WA Community)",
    icon: <Globe className="w-5 h-5" />,
    features: [
      { id: "comm_manage", title: "Kelola Komunitas", desc: "Buat & kelola Komunitas WhatsApp." },
      { id: "comm_subgroups", title: "Manajemen Sub-Grup", desc: "Tautkan/lepaskan sub-grup ke dalam Komunitas." },
      { id: "comm_broadcast", title: "Pengumuman Massal", desc: "Kirim pengumuman massal ke semua anggota Komunitas." }
    ]
  },
  {
    category: "Saluran (WA Channel)",
    icon: <Megaphone className="w-5 h-5" />,
    features: [
      { id: "channel_post", title: "Auto-Post Saluran", desc: "Post konten ke Saluran secara terjadwal." },
      { id: "channel_react", title: "Pantau Reaksi", desc: "Pantau reaksi emoji dari pengikut Saluran." }
    ]
  },
  {
    category: "Status & Privasi Akun",
    icon: <UserCheck className="w-5 h-5" />,
    features: [
      { id: "status_download", title: "Baca/Unduh Story", desc: "Baca dan unduh Status kontak (Story)." },
      { id: "status_presence", title: "Pantau Kehadiran", desc: "Pantau status online & typing secara real-time." },
      { id: "status_validate", title: "Validasi Nomor", desc: "Cek apakah nomor terdaftar di WhatsApp." },
      { id: "status_privacy", title: "Ubah Privasi Akun", desc: "Ubah Last Seen, foto profil, dan read receipt." },
      { id: "status_block", title: "Sistem Blokir", desc: "Blokir/buka blokir secara terprogram." },
      { id: "status_anti_spam", title: "Blokir Anti-Spam", desc: "Blokir dinamis untuk menangkal spam." }
    ]
  },
  {
    category: "Panggilan (Call)",
    icon: <PhoneCall className="w-5 h-5" />,
    features: [
      { id: "call_reject", title: "Tolak Panggilan", desc: "Tolak panggilan suara/video masuk otomatis." },
      { id: "call_reply", title: "Balas Otomatis", desc: "Balas otomatis dengan teks saat panggilan ditolak." },
      { id: "call_research", title: "Riset Protokol (WACRG)", desc: "Dukungan riset untuk menerima/streaming panggilan." }
    ]
  },
  {
    category: "Data & Forensik",
    icon: <Database className="w-5 h-5" />,
    features: [
      { id: "forensic_antidelete", title: "Anti-Delete", desc: "Tangkap pesan ditarik sebelum terhapus di server." },
      { id: "forensic_antiedit", title: "Anti-Edit", desc: "Tangkap isi pesan asli sebelum diedit pengirim." },
      { id: "forensic_timing", title: "Presisi Waktu", desc: "Lacak waktu sampai pesan hingga level milidetik." },
      { id: "forensic_forward", title: "Forwarding Score", desc: "Lacak berapa kali sebuah pesan telah diteruskan." },
      { id: "forensic_history", title: "History Sync", desc: "Unduh seluruh arsip chat lama saat pertama konek." },
      { id: "forensic_contacts", title: "Mass Contact Pull", desc: "Unduh daftar kontak dan nama profil tanpa simpan di HP." }
    ]
  },
  {
    category: "Keamanan & Enkripsi",
    icon: <Shield className="w-5 h-5" />,
    features: [
      { id: "sec_e2ee", title: "Enkripsi E2EE Lokal", desc: "Tangani enkripsi E2EE WhatsApp di sisi server Anda." },
      { id: "sec_keys", title: "Ekstraksi Kriptografi", desc: "Ekstrak kunci kriptografi untuk riset keamanan." },
      { id: "sec_cloud", title: "Cloud Encryption", desc: "Penyimpanan sesi login terenkripsi di database cloud." }
    ]
  },
  {
    category: "Integrasi & Infrastruktur",
    icon: <Server className="w-5 h-5" />,
    features: [
      { id: "infra_ai", title: "Integrasi AI", desc: "Integrasi dengan ChatGPT atau Claude via API." },
      { id: "infra_mcp", title: "MCP Server Agent", desc: "Penghubung agen AI Desktop (Claude Desktop, Cursor)." },
      { id: "infra_ctwa", title: "CTWA Ads Recovery", desc: "Deteksi dan pemulihan pesan template Click-to-WhatsApp." },
      { id: "infra_db", title: "Integrasi Database", desc: "Terhubung langsung dengan MySQL, PostgreSQL, MongoDB." },
      { id: "infra_rest", title: "Backend REST API", desc: "Jadikan fondasi untuk Evolution API / WAHA." },
      { id: "infra_serverless", title: "Deploy Serverless", desc: "Optimasi untuk AWS Lambda / Cloud Functions." },
      { id: "infra_iot", title: "Dukungan Perangkat IoT", desc: "Bisa jalan di Raspberry Pi atau STB murah." }
    ]
  },
  {
    category: "Protokol Tingkat Lanjut",
    icon: <Cpu className="w-5 h-5" />,
    features: [
      { id: "proto_manual", title: "Protobuf Manual", desc: "Susun struktur Protobuf WhatsApp secara mentah." },
      { id: "proto_metadata", title: "Modifikasi Metadata", desc: "Manipulasi data forwarding info atau link preview." },
      { id: "proto_wam", title: "WAM Metrics Reader", desc: "Baca parameter pantauan WhatsApp untuk hindari spam." },
      { id: "proto_lid", title: "LID & Username", desc: "Tangani sistem ID baru (LID) yang tanpa nomor." },
      { id: "proto_coex", title: "Meta Coexistence", desc: "Kompatibel berdampingan dengan asisten Meta AI." }
    ]
  },
  {
    category: "Strategi Anti-Ban",
    icon: <ShieldAlert className="w-5 h-5" />,
    features: [
      { id: "ban_composing", title: "Sinyal Mengetik", desc: "Kirim sinyal 'composing' sebelum membalas." },
      { id: "ban_recording", title: "Sinyal Merekam", desc: "Kirim sinyal 'recording' sebelum kirim VN." },
      { id: "ban_delay", title: "Random Delay", desc: "Terapkan jeda acak antar pesan mirip manusia." },
      { id: "ban_ratelimit", title: "Rate Limiting", desc: "Batasi jumlah pesan maksimal per jam." },
      { id: "ban_abprops", title: "Abprops Reader", desc: "Sesuaikan perilaku bot berbasis Abprops WhatsApp." },
      { id: "ban_autoreconnect", title: "Silent Reconnect", desc: "Auto-reconnect aman tanpa memicu sistem spam." }
    ]
  }
];

const ALL_IDS = CAPABILITIES.flatMap(c => c.features.map(f => f.id));

export function TabKapabilitas() {
  const [activeModules, setActiveModules] = useState({});
  const [loadStatus, setLoadStatus] = useState("loading"); // "loading" | "ok" | "error"
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    fetch("/api/admin/kapabilitas")
      .then(r => r.json())
      .then(d => { setActiveModules(d.kapabilitas || {}); setLoadStatus("ok"); })
      .catch(() => setLoadStatus("error"));
  }, []);

  function saveModules(modules) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await fetch("/api/admin/kapabilitas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modules }),
        });
        setSavedAt(new Date());
      } finally {
        setSaving(false);
      }
    }, 600);
  }

  function toggleModule(id) {
    const updated = { ...activeModules, [id]: !activeModules[id] };
    setActiveModules(updated);
    saveModules(updated);
  }

  function toggleAll(on) {
    const updated = Object.fromEntries(ALL_IDS.map(id => [id, on]));
    setActiveModules(updated);
    saveModules(updated);
  }

  const activeCount = Object.values(activeModules).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="mb-2 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">🌟 Katalog Kapabilitas Modul Baileys</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Aktifkan modul yang digunakan oleh server bot. Status disimpan ke database dan bisa dibaca bot via <code className="rounded bg-gray-100 dark:bg-slate-800 px-1 text-xs">/api/config</code>.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex items-center gap-2">
            {loadStatus === "loading" && <span className="text-xs text-gray-400">Memuat...</span>}
            {saving && <span className="text-xs text-blue-500 animate-pulse">Menyimpan...</span>}
            {!saving && savedAt && <span className="text-xs text-emerald-600 dark:text-emerald-400">✓ Tersimpan {savedAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>}
            <span className="rounded-full bg-blue-100 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
              {activeCount} aktif
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => toggleAll(true)} className="rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors">Aktifkan Semua</button>
            <button onClick={() => toggleAll(false)} className="rounded-lg border border-gray-200 dark:border-slate-700 px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">Reset Semua</button>
          </div>
        </div>
      </div>

      {loadStatus === "error" && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-800 p-4 text-sm text-rose-600 dark:text-rose-400">
          Gagal memuat data kapabilitas dari server. Toggle masih bisa dipakai tapi tidak tersimpan permanen.
        </div>
      )}

      <div className="space-y-8">
        {CAPABILITIES.map((cat, idx) => {
          const catActive = cat.features.filter(f => activeModules[f.id]).length;
          return (
            <div key={idx} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center justify-between gap-3 mb-5 border-b border-gray-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg shadow-sm">
                    {cat.icon}
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">{cat.category}</h3>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${catActive > 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-gray-100 text-gray-400 dark:bg-slate-800"}`}>
                  {catActive}/{cat.features.length} aktif
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {cat.features.map((feat) => {
                  const on = !!activeModules[feat.id];
                  return (
                    <div key={feat.id} className={`relative flex flex-col p-4 rounded-xl border transition-all ${on ? "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/10" : "border-gray-100 dark:border-slate-800 bg-gray-50/40 dark:bg-slate-900/40"} hover:shadow-sm`}>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white text-[13px] pr-6 leading-tight">{feat.title}</h4>
                        <button
                          onClick={() => toggleModule(feat.id)}
                          className={`relative inline-flex h-4 w-7 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${on ? "bg-blue-600" : "bg-gray-300 dark:bg-slate-700"}`}
                        >
                          <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${on ? "translate-x-3" : "translate-x-0"}`} />
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed flex-grow">{feat.desc}</p>
                      {on && (
                        <div className="mt-3 pt-2 border-t border-blue-100 dark:border-blue-900/30">
                          <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 ring-1 ring-inset ring-green-600/20">
                            <span className="h-1 w-1 rounded-full bg-green-500 animate-pulse" />
                            Aktif
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
