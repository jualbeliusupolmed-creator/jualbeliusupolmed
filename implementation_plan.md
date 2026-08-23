# Rencana Refactoring: Memecah Monolith `bot-wa/index.js`

Sesuai arahan, kita akan melewati bagian keamanan untuk saat ini dan langsung melompat ke **Prioritas 2: Refactoring Bot**. 

File `bot-wa/index.js` saat ini berukuran **4.017 baris (215 KB)**. Mengelola semua fungsi—mulai dari server HTTP, manajemen WebSocket WhatsApp, antrean pesan, logika bisnis penjual, hingga halaman dashboard—di dalam satu file adalah bom waktu (*technical debt* yang sangat besar). 

*Catatan: Saya telah menghapus 11 file backup sampah (`index.js.bak-*`) dari mesin agar repositori kita bersih.*

Tujuan dari refactoring ini adalah memecah kode menjadi komponen modular tanpa mengubah *business logic* atau cara kerja sistem yang sudah ada.

## User Review Required

> [!WARNING]
> Memecah monolith sebesar ini adalah operasi yang berisiko tinggi. *State* (keadaan) bot seperti antrean pesan (`messageQueue`), status koneksi (`waSocket`), dan peta sesi pengguna (`nameMap`, `greetedMap`) tersebar sebagai variabel global di file utama.
>
> Kita harus memindahkan state ini ke sistem terpusat agar file-file terpisah tetap bisa saling berkomunikasi. 
> 
> **Persetujuan Bapak diperlukan** karena refactoring ini akan mengubah total bentuk proyek `wa-bot-usu` dari satu file menjadi struktur direktori profesional, yang mungkin memerlukan penyesuaian saat Bapak melakukan *debugging* manual ke depannya.

## Proposed Changes

Saya akan membuat direktori `src` di dalam `bot-wa/` untuk menampung kode baru secara rapi. Kita tidak akan langsung menghapus `index.js` lama, melainkan memindahkannya ke struktur baru secara bertahap.

### 1. Core Services (Infrastruktur & State)
Menangani mesin utama bot tanpa mencampur aduk dengan logika perintah pengguna.

#### [NEW] `bot-wa/src/core/state.js`
Menyimpan semua variabel *global state* yang sebelumnya mengambang di `index.js`, seperti `waSocket`, `messageQueue`, `greetedMap`, dan `settings`. File lain akan mengimpor state dari sini.

#### [NEW] `bot-wa/src/core/queue.js`
Memisahkan logika `kickQueue`, `enqueueMessage`, retry logic, dan mekanisme penyimpanan antrean ketika gagal (termasuk penyimpanan ke `outbox-dibuang.json`).

#### [NEW] `bot-wa/src/core/connection.js`
Fungsi `connectToWhatsApp()` akan dipindahkan ke sini, menangani relink sesi, auto-restart ketika putus, *kunci sesi eksponensial*, dan *outage guard* eskalasi waktu henti.

---

### 2. Command Handlers (Logika Bisnis WhatsApp)
Memisahkan cara bot merespons pesan berdasarkan tujuan pesannya.

#### [NEW] `bot-wa/src/handlers/router.js`
Berfungsi sebagai pos penjaga. Setiap pesan masuk akan dilempar ke sini, lalu fungsi ini akan menentukan apakah pesan tersebut adalah `admin`, `prefix command (.JUAL, .CARI)`, atau pesan sapaan biasa.

#### [NEW] `bot-wa/src/handlers/seller.js`
Menangani semua perintah *prefix* dari penjual: `.JUAL`, `.CARI`, `.MENU`, `.SAYA`, `.TOKO`, dan `.IKLAN`. Termasuk *session timeout* 15 menit.

#### [NEW] `bot-wa/src/handlers/admin.js`
Menangani perintah khusus tanpa prefix dari nomor admin (berdasarkan variabel `ADMIN_WA`), seperti `STATS`, `BROADCAST`, dan manajemen toko.

---

### 3. HTTP Routes (Web & API Bot)
Memisahkan routing Express.js dari logika bot.

#### [NEW] `bot-wa/src/routes/api.js`
Menangani endpoint untuk *machine-to-machine* seperti `/send`, `/status`, `/antrean/data`, `/qr`, `/pairing-code`, dan webhook dari Next.js.

#### [NEW] `bot-wa/src/routes/dashboard.js`
Menangani UI/Halaman yang dirender oleh bot, seperti `/`, `/home`, `/laporan`, `/progres`, `/antrean`, dan auth login manusia (`/masuk`, `/keluar`).

---

### 4. Entry Point Baru

#### [MODIFY] `bot-wa/index.js`
File raksasa ini akan disusutkan dari **4.000+ baris** menjadi mungkin kurang dari **200 baris**. Fungsinya hanya untuk menginisiasi Express, meluncurkan `connection.js`, mendaftarkan `routes`, dan mulai menjalankan `queue.js`.

## Verification Plan

Karena perubahannya drastis, validasi dilakukan dengan sangat ketat:
1. **Automated Lint & Build Check:** Menjalankan perintah eksekusi kode sementara untuk memastikan tidak ada kesalahan *Syntax* atau *Missing Import* di Node.js.
2. **Uji Coba Luring (Offline Test):** Kita akan menjalankannya tanpa koneksi WA sungguhan dulu untuk memastikan Express HTTP server dan Endpoint bisa *up* tanpa *crash*.
3. **Konfirmasi Akhir:** Setelah beres dipilah di VPS, saya akan memberikan laporan struktur baru, dan kita bisa melakukan pengujian manual.

Apakah Bapak setuju kita mulai meruntuhkan monolith ini ke dalam struktur modular sekarang?
