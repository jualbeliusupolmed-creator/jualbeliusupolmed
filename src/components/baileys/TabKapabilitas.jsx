"use client";

import {
  Wifi, MessageSquare, Users, UserCheck, SlidersHorizontal, Fingerprint
} from "lucide-react";

/*
 * Tab ini dulu 82 sakelar yang semuanya menulis ke `settings.kapabilitas` —
 * kolom yang tidak dibaca siapa pun, termasuk bot. Tujuh di antaranya bahkan
 * bernama sama persis dengan setelan asli di tab Aksi, jadi ada dua sakelar
 * untuk satu hal dan cuma satu yang bekerja: mematikan "Tolak Panggilan" di
 * sini tidak menghentikan apa pun, sementara bot tetap menolak panggilan.
 *
 * Sekarang isinya daftar baca-saja, dan cuma memuat yang benar-benar ada di
 * bot — tiap baris ditelusuri ke endpoint atau berkasnya, disebut di `bukti`.
 * Yang tidak ada dicabut, bukan ditandai "nonaktif": daftar panjang berisi
 * kemampuan yang tidak dipasang membuat yang asli ikut tidak dipercaya.
 *
 * Kalau nanti bot benar-benar bisa sesuatu yang baru, tambahkan barisnya DI
 * SINI beserta buktinya — jangan pernah menambah baris yang belum ada kodenya.
 */

const KEMAMPUAN = [
  {
    kategori: "Koneksi & Sesi",
    icon: <Wifi className="w-5 h-5" />,
    fitur: [
      { judul: "Login via QR", desc: "Pindai kode QR dari dashboard untuk menautkan nomor.", di: "Tab Taut", bukti: "GET /qr" },
      { judul: "Login via Pairing Code", desc: "Kode 8 digit, tanpa kamera — untuk menautkan lewat nomor telepon.", di: "Tab Taut", bukti: "POST /pairing-code" },
      { judul: "Sesi File Lokal", desc: "Kredensial sesi disimpan sebagai berkas di server, bukan di database.", di: "Otomatis", bukti: "auth_info_baileys/" },
      { judul: "Cadangan Sesi Terenkripsi", desc: "Tiap 03:10 arsip sesi dienkripsi AES-256 lalu didorong ke repo GitHub privat.", di: "Otomatis", bukti: "cadangkan-sesi.sh" },
      { judul: "Auto-Reconnect", desc: "Menyambung ulang sendiri saat koneksi putus, dengan jeda yang menanjak.", di: "Otomatis", bukti: "DisconnectReason" },
      { judul: "Deteksi Alasan Putus", desc: "Membedakan putus biasa dari 401 (nomor dibatasi) dan berhenti mencoba saat perlu.", di: "Otomatis", bukti: "DisconnectReason" },
      { judul: "Multi-Device", desc: "HP tetap bisa dipakai bersamaan saat bot aktif.", di: "Bawaan Baileys", bukti: "—" },
      { judul: "Dua Nomor Sekaligus", desc: "Bot kedua berjalan terpisah sebagai cadangan saat nomor pertama padam.", di: "Kartu Perangkat 2", bukti: "wa-bot-2 · port 3001" },
      { judul: "Enkripsi E2EE di Server Sendiri", desc: "Enkripsi ujung-ke-ujung ditangani proses ini, bukan dititipkan ke layanan pihak ketiga.", di: "Bawaan Baileys", bukti: "—" },
    ],
  },
  {
    kategori: "Pesan",
    icon: <MessageSquare className="w-5 h-5" />,
    fitur: [
      { judul: "Kirim & Terima Teks", desc: "Pesan teks masuk dan keluar, termasuk balasan otomatis.", di: "Tab Kirim", bukti: "POST /send" },
      { judul: "Kirim Gambar + Caption", desc: "Gambar dikirim lewat URL beserta teksnya. Video, audio, dan dokumen belum.", di: "Tab Kirim", bukti: "sendMessage({ image })" },
      { judul: "Antrean Tahan Mati", desc: "Pesan yang dikirim saat bot putus disimpan dan menyusul begitu tersambung — dengan masa berlaku, supaya OTP basi tidak ikut mendarat.", di: "Otomatis", bukti: "outbox.json" },
      { judul: "Broadcast Terpilih", desc: "Kirim satu pesan ke banyak penerima yang dipilih, bukan ke semua orang.", di: "Tab Broadcast", bukti: "POST /broadcast" },
      { judul: "Polling", desc: "Kirim polling ke obrolan atau grup.", di: "Tab Kirim", bukti: "POST /send-poll" },
    ],
  },
  {
    kategori: "Grup, Komunitas & Saluran",
    icon: <Users className="w-5 h-5" />,
    fitur: [
      { judul: "Buat Grup", desc: "Membuat grup baru lewat panel.", di: "Tab Grup", bukti: "POST /groups/create" },
      { judul: "Kelola Anggota", desc: "Tambah atau keluarkan anggota grup.", di: "Tab Grup", bukti: "POST /groups/:jid/participants" },
      { judul: "Tautan Undangan", desc: "Ambil tautan undangan sebuah grup.", di: "Tab Grup", bukti: "GET /groups/:jid/invite" },
      { judul: "Buat & Tautkan Komunitas", desc: "Membuat Komunitas dan menautkan sub-grup ke dalamnya.", di: "Tab Grup", bukti: "POST /community/create" },
      { judul: "Kirim ke Saluran", desc: "Kirim konten ke Saluran WhatsApp yang diikuti bot.", di: "Tab Saluran", bukti: "POST /channel/send" },
    ],
  },
  {
    kategori: "Status, Profil & Privasi",
    icon: <UserCheck className="w-5 h-5" />,
    fitur: [
      { judul: "Pasang Story", desc: "Pasang Status/Story ke daftar penerima tertentu.", di: "Tab Story", bukti: "POST /story" },
      { judul: "Pantau Kehadiran", desc: "Baca status online dan 'sedang mengetik' sebuah nomor.", di: "Tab Konteks", bukti: "POST /get-presence" },
      { judul: "Validasi Nomor", desc: "Cek apakah sebuah nomor benar-benar terdaftar di WhatsApp.", di: "Tab Aksi", bukti: "POST /check-number" },
      { judul: "Ubah Privasi Akun", desc: "Ubah Last Seen, foto profil, dan tanda baca.", di: "Tab Profil", bukti: "POST /set-privacy" },
      { judul: "Blokir & Buka Blokir", desc: "Blokir nomor lewat panel, dan lihat daftar yang sedang diblokir.", di: "Tab Blocklist", bukti: "POST /blocklist/block" },
      { judul: "Ubah Nama & Status Profil", desc: "Ganti nama tampilan dan teks status bot.", di: "Tab Profil", bukti: "POST /profile/name" },
    ],
  },
  {
    kategori: "Yang punya sakelar sungguhan",
    icon: <SlidersHorizontal className="w-5 h-5" />,
    catatan: "Tujuh setelan ini satu-satunya yang benar-benar mengubah perilaku bot saat disimpan. Semuanya diatur di tab Aksi, dan mendarat di proses yang memegang koneksi WhatsApp — bukan di database.",
    fitur: [
      { judul: "Tolak Panggilan", desc: "Tolak panggilan suara/video masuk otomatis.", di: "Tab Aksi", bukti: "modul.panggilan.tolak" },
      { judul: "Balas Saat Panggilan Ditolak", desc: "Kirim teks penjelasan begitu panggilan ditolak.", di: "Tab Aksi", bukti: "modul.panggilan.balas" },
      { judul: "Anti-Delete", desc: "Rekam isi pesan yang ditarik pengirim.", di: "Tab Aksi", bukti: "modul.forensik.antiHapus" },
      { judul: "Anti-Edit", desc: "Rekam isi asli pesan yang diedit pengirim.", di: "Tab Aksi", bukti: "modul.forensik.antiEdit" },
      { judul: "Sinyal Mengetik", desc: "Kirim 'sedang mengetik…' sebelum membalas.", di: "Tab Aksi", bukti: "modul.antiban.sinyalMengetik" },
      { judul: "Jeda Acak", desc: "Jeda acak antar pesan supaya polanya tidak terbaca mesin.", di: "Tab Aksi", bukti: "modul.antiban.jedaAcak" },
      { judul: "Batas Pesan per Jam", desc: "Rem laju kirim; 0 berarti tanpa batas.", di: "Tab Aksi", bukti: "modul.antiban.batasJam" },
    ],
  },
  {
    kategori: "Identitas & Riwayat",
    icon: <Fingerprint className="w-5 h-5" />,
    fitur: [
      { judul: "LID & Username", desc: "Memetakan ID baru WhatsApp (@lid) yang tanpa nomor kembali ke nomor aslinya.", di: "Tab LID Map", bukti: "lib/lidMigrate.js" },
      { judul: "Riwayat Percakapan", desc: "Tiap pesan masuk dan keluar dicatat, bisa dibaca ulang dari panel.", di: "Tab Chat", bukti: "wa_conversations" },
      { judul: "Kontak & Nama", desc: "Nama profil pengirim disimpan lokal supaya obrolan tidak cuma deretan nomor.", di: "Otomatis", bukti: "contacts.json · name_map.json" },
    ],
  },
];

const JUMLAH = KEMAMPUAN.reduce((n, k) => n + k.fitur.length, 0);

export function TabKapabilitas() {
  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Kemampuan Bot</h2>
        <p className="mt-1 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
          Daftar baca-saja: {JUMLAH} kemampuan yang benar-benar ada di bot, masing-masing
          ditelusuri ke endpoint atau berkasnya. Halaman ini tidak menyimpan apa pun — kolom
          terakhir menunjukkan di mana kemampuan itu sebenarnya diatur.
        </p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
        <b>Sakelarnya dicabut, dan itu disengaja.</b> Sebelum ini tab ini punya 82 sakelar yang
        semuanya menulis ke kolom yang tidak dibaca siapa pun — termasuk tujuh yang bernama sama
        dengan setelan asli di tab Aksi, jadi ada dua sakelar untuk satu hal dan cuma satu yang
        bekerja. Kemampuan yang tidak dipasang di bot juga dihapus dari daftar, bukan ditandai
        nonaktif: daftar panjang berisi janji yang tidak ditepati membuat yang asli ikut tidak
        dipercaya.
      </div>

      <div className="space-y-8">
        {KEMAMPUAN.map((kat) => (
          <div
            key={kat.kategori}
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-gray-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600 shadow-sm dark:bg-blue-900/30 dark:text-blue-400">
                  {kat.icon}
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">{kat.kategori}</h3>
              </div>
              <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-slate-800 dark:text-gray-400">
                {kat.fitur.length}
              </span>
            </div>

            {kat.catatan && (
              <p className="mb-5 text-sm text-gray-600 dark:text-gray-400">{kat.catatan}</p>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {kat.fitur.map((f) => (
                <div
                  key={f.judul}
                  className="flex flex-col rounded-xl border border-gray-100 bg-gray-50/40 p-4 dark:border-slate-800 dark:bg-slate-900/40"
                >
                  <h4 className="text-[13px] font-semibold leading-tight text-gray-900 dark:text-white">
                    {f.judul}
                  </h4>
                  <p className="mt-1.5 flex-grow text-[11px] leading-relaxed text-gray-600 dark:text-gray-400">
                    {f.desc}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-gray-100 pt-2 dark:border-slate-800">
                    <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-400">
                      {f.di}
                    </span>
                    {f.bukti !== "—" && (
                      <code className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-slate-800 dark:text-gray-400">
                        {f.bukti}
                      </code>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
