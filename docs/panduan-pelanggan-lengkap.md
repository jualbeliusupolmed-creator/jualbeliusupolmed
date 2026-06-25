# Panduan Lengkap Pelanggan — Jual Beli USU Polmed

**Website:** jualbeliusupolmed.web.id  
**WhatsApp Bot:** nomor tertera di website

---

## Daftar Isi

1. [Registrasi & Login](#1-registrasi--login)
2. [Cara Pasang Iklan](#2-cara-pasang-iklan)
3. [Kelola Iklan](#3-kelola-iklan)
4. [Upgrade Iklan](#4-upgrade-iklan)
5. [Tawar & Tawaran](#5-tawar--tawaran)
6. [Cari Barang](#6-cari-barang)
7. [Langganan Kategori](#7-langganan-kategori)
8. [Profil & Statistik](#8-profil--statistik)
9. [Lapor Iklan](#9-lapor-iklan)
10. [Dashboard Web](#10-dashboard-web)
11. [Daftar Lengkap Perintah WA](#11-daftar-lengkap-perintah-wa)
12. [Tanya Jawab](#12-tanya-jawab)

---

## 1. Registrasi & Login

Tidak perlu daftar akun secara manual. Cukup dengan nomor WhatsApp.

### Login via Website
1. Buka **jualbeliusupolmed.web.id** → klik **Login**
2. Masukkan nomor WhatsApp aktif
3. Bot akan kirim **OTP 6 digit** ke WA kamu
4. Masukkan OTP + buat PIN 6 digit
5. Login berhasil — session tersimpan 30 hari

### Ganti Nama Profil
```
NAMA [nama baru]
```
Contoh: `NAMA Budi Santoso`

Perubahan nama perlu disetujui admin jika nama sebelumnya sudah diverifikasi. Semua iklan aktif/pending akan ikut update namanya.

---

## 2. Cara Pasang Iklan

Bisa lewat **WhatsApp** (lebih simpel) atau **Website** (lebih lengkap).

### Via WhatsApp Bot

1. **Siapkan foto** barang (bisa lebih dari 1 foto)
2. **Kirim foto** ke nomor WA bot dengan **caption** berisi:
   - Nama/judul barang
   - Harga
   - Kondisi: baru atau bekas
   - Deskripsi singkat (opsional)

   **Contoh caption:**
   ```
   Jual laptop Asus VivoBook bekas, kondisi 85%, 
   harga Rp 3.500.000, area USU Medan
   ```

3. **AI bot** membaca caption dan membalas ringkasan iklan
4. **Konfirmasi** detail sudah benar
5. **Scan QRIS** yang dikirim bot → bayar biaya pasang
6. **Kirim screenshot struk** ke bot
7. AI verifikasi → **iklan tayang** ✅

> Jika nominal terlalu tinggi, bisa negosiasi dengan `TAWAR BIAYA [kode] [nominal]`

### Via Website

1. Buka **jualbeliusupolmed.web.id/jual**
2. Login dengan OTP WA (jika belum login)
3. Isi form: judul, kategori, harga, kondisi, deskripsi
4. Upload foto (otomatis dikonversi ke WebP)
5. Submit → tampil QRIS + nominal
6. Transfer sesuai nominal → upload screenshot struk
7. AI verifikasi → **iklan tayang** ✅

### Yang perlu diketahui
- Kode iklan (angka, contoh: **1001**) dikirim ke WA — **simpan kode ini**
- Iklan aktif selama **14 hari** sejak tayang
- Foto yang jelas dan deskripsi lengkap meningkatkan peluang laku
- Jika kirim beberapa foto sekaligus, semua foto masuk ke 1 iklan
- Setelah tayang, kamu dapat 2 pesan WA: konfirmasi + link iklan untuk di-share

---

## 3. Kelola Iklan

### Cek Status Iklan
```
CEK          → lihat semua iklan aktifmu
CEK 1001     → detail status iklan tertentu
```
Menampilkan: status, jumlah views, sisa hari, link iklan.

### Naikkan Iklan (BUMP)
Iklan lama akan tenggelam. Bump untuk naik ke posisi teratas.
```
BUMP         → lihat daftar iklan yang bisa di-bump
BUMP 1001    → bump iklan tertentu (bayar via QRIS)
```

### Perpanjang Masa Iklan
Iklan expired tidak muncul di website. Perpanjang sebelum habis — bot akan kirim reminder H-3 dan H-1.
```
PERPANJANG         → lihat daftar iklan yang bisa diperpanjang
PERPANJANG 1001    → perpanjang iklan tertentu (bayar via QRIS)
```
Masa aktif diperpanjang 14 hari dari sekarang.

### Aktifkan Iklan
Jika iklan expired atau tersuspend:
```
AKTIFKAN 1001
```

### Edit Harga
```
EDIT 1001 HARGA 200000
```

### Hapus Iklan

**Barang sudah terjual:**
```
HAPUS LAKU 1001
```
Iklan ditandai sold, tidak muncul di website.

**Barang tidak laku / mau tarik iklan:**
```
HAPUS GALAKU 1001
```
Permintaan dikirim ke admin untuk diproses.

### Negosiasi Biaya (TAWAR BIAYA)
Jika biaya pasang iklan dirasa terlalu tinggi:
```
TAWAR BIAYA 1001 5000
```
Admin akan dapat notif dan bisa setujui/tolak. Jika disetujui dengan nominal Rp 0, iklan diaktifkan gratis.

---

## 4. Upgrade Iklan

### Featured (Iklan Unggulan)
Iklan tampil di bagian atas halaman utama dengan label ⭐ Unggulan.
```
UPGRADE FEATURED 1001 3    → featured 3 hari
UPGRADE FEATURED 1001 7    → featured 7 hari
```
Biaya: Rp 5.000/hari (default, bisa berbeda — cek dengan `UPGRADE`).

### Auto Bump
Iklan otomatis dinaikkan setiap hari selama 7 hari.
```
UPGRADE AUTOBUMP 1001
```
Biaya: Rp 15.000/7 hari (default).

> Ketik `UPGRADE` saja untuk melihat semua opsi dan harga terkini.

---

## 5. Tawar & Tawaran

### Menawar Iklan Orang Lain
```
TAWAR 1001 150000
TAWAR 1001 150000 Saya serius beli kak, bisa COD area USU?
```
Format: `TAWAR [kode iklan] [harga tawaran] [pesan opsional]`

Penjual mendapat notifikasi WA dengan harga tawaran dan link chat langsung ke kamu.

### Lihat Tawaran Masuk (untuk Penjual)
```
TAWARAN
```
Tampil semua tawaran yang masuk ke iklanmu beserta link WA pembeli.

---

## 6. Cari Barang

### Posting Iklan Dicari
Jika kamu mencari barang tertentu:
```
DICARI laptop bekas budget 3 juta area USU
DICARI motor matic 2019 plat BK murah
```
Iklanmu muncul di halaman **Dicari** dan penjual yang punya bisa menghubungimu.

Bisa juga langsung cari di website dengan kolom search.

---

## 7. Langganan Kategori

Dapatkan notifikasi WA otomatis setiap ada iklan baru di kategori yang kamu langgani.

```
LANGGANAN              → lihat kategori yang tersedia
LANGGANAN Elektronik   → langganan kategori Elektronik
STOP                   → berhenti dari semua langganan
```

Notifikasi dikirim otomatis begitu ada iklan baru yang disetujui admin.

---

## 8. Profil & Statistik

```
SAYA
```
Menampilkan:
- Nama dan bio profil
- Jumlah iklan aktif
- Jumlah barang terjual
- Rating dari pembeli
- Tawaran yang belum dibalas

Profil publik tersedia di: **jualbeliusupolmed.web.id/profil/[nomor_wa]**

---

## 9. Lapor Iklan

Jika menemukan iklan palsu, penipuan, atau melanggar aturan:
```
LAPOR 1001 Penjual tidak responsif
LAPOR 1001 Harga tidak sesuai dengan barang
LAPOR 1001 Iklan duplikat
```
Format: `LAPOR [kode iklan] [alasan]`

Admin akan meninjau laporan.

---

## 10. Dashboard Web

Login ke **jualbeliusupolmed.web.id/dashboard** untuk:
- Melihat semua iklan aktif, pending, expired
- Statistik views dan tawaran
- Riwayat pembayaran
- Bump & perpanjang langsung dari web
- Edit data iklan

---

## 11. Daftar Lengkap Perintah WA

### Profil
| Perintah | Fungsi |
|---|---|
| `SAYA` | Profil & statistik |
| `NAMA [nama]` | Ganti nama profil |
| `IKLANKU` | Daftar semua iklan |

### Kelola Iklan
| Perintah | Fungsi |
|---|---|
| `CEK` | Status semua iklan aktif |
| `CEK 1001` | Status & views iklan tertentu |
| `BUMP 1001` | Naikkan iklan ke atas |
| `PERPANJANG 1001` | Perpanjang masa aktif 14 hari |
| `AKTIFKAN 1001` | Aktifkan iklan expired |
| `EDIT 1001 HARGA 200000` | Edit harga iklan |
| `HAPUS LAKU 1001` | Tandai terjual |
| `HAPUS GALAKU 1001` | Minta hapus iklan |
| `TAWAR BIAYA 1001 5000` | Negosiasi biaya pasang ke admin |
| `BATAL 1001` | Batalkan proses yang sedang berjalan |

### Upgrade
| Perintah | Fungsi |
|---|---|
| `UPGRADE` | Lihat opsi & harga |
| `UPGRADE FEATURED 1001 3` | Featured 3 hari |
| `UPGRADE FEATURED 1001 7` | Featured 7 hari |
| `UPGRADE AUTOBUMP 1001` | Auto bump 7 hari |

### Beli & Cari
| Perintah | Fungsi |
|---|---|
| `TAWAR 1001 150000` | Tawar harga |
| `TAWARAN` | Lihat tawaran masuk ke iklanmu |
| `DICARI [deskripsi]` | Post barang yang dicari |

### Notifikasi & Komunitas
| Perintah | Fungsi |
|---|---|
| `LANGGANAN [kategori]` | Notif WA iklan baru di kategori |
| `STOP` | Berhenti dari semua langganan |
| `LAPOR 1001 alasan` | Laporkan iklan |
| `MENU` | Daftar semua perintah |

---

## 12. Tanya Jawab

**Q: Berapa lama iklan tayang?**  
A: 14 hari sejak diaktifkan. Bot akan kirim reminder H-3 dan H-1 sebelum expired. Perpanjang dengan `PERPANJANG 1001`.

**Q: Bagaimana cara bayar?**  
A: Scan QRIS statis yang dikirim bot/web, transfer sesuai nominal, lalu kirim screenshot struk.

**Q: Iklan saya tidak muncul di website?**  
A: Cek dengan `CEK 1001`. Kemungkinan masih pending moderasi admin atau struk belum terverifikasi.

**Q: Bisa pasang lebih dari 1 foto?**  
A: Bisa. Via WA: kirim beberapa foto sekaligus (semua masuk ke 1 iklan). Via web: upload multi-foto di form.

**Q: Bagaimana jika biaya terlalu mahal?**  
A: Kirim `TAWAR BIAYA [kode] [nominal]` untuk negosiasi dengan admin.

**Q: Bagaimana cara cek tawaran dari pembeli?**  
A: Ketik `TAWARAN` di WA atau cek di dashboard website.

**Q: Bisa ganti nama yang sudah diset?**  
A: Bisa dengan `NAMA [nama baru]`. Perlu persetujuan admin jika nama sebelumnya sudah diverifikasi.
