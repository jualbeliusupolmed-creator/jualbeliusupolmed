# Panduan Lengkap Pelanggan — Jual Beli USU Polmed

**Website:** jualbeliusupolmed.web.id  
**WhatsApp Bot:** nomor tertera di website

---

## Daftar Isi

1. [Cara Pasang Iklan](#1-cara-pasang-iklan)
2. [Kelola Iklan](#2-kelola-iklan)
3. [Upgrade Iklan](#3-upgrade-iklan)
4. [Tawar & Tawaran](#4-tawar--tawaran)
5. [Cari Barang](#5-cari-barang)
6. [Langganan Kategori](#6-langganan-kategori)
7. [Lapor Iklan](#7-lapor-iklan)
8. [Profil & Statistik](#8-profil--statistik)
9. [Daftar Lengkap Perintah](#9-daftar-lengkap-perintah)

---

## 1. Cara Pasang Iklan

### Langkah-langkah

1. **Siapkan foto** barang yang mau dijual (bisa lebih dari 1 foto)
2. **Kirim foto** ke nomor WA bot dengan **caption** berisi:
   - Nama / judul barang
   - Harga yang kamu minta
   - Kondisi: baru atau bekas
   - Deskripsi singkat (opsional)

   **Contoh caption:**
   ```
   Jual laptop Asus VivoBook bekas, kondisi 85%, 
   harga Rp 3.500.000, area USU Medan
   ```

3. **Bot AI** akan membaca pesanmu dan membalas dengan ringkasan iklan
4. **Konfirmasi** detail iklan yang dibaca AI sudah benar
5. **Scan QRIS** yang dikirim bot untuk bayar biaya pasang iklan
6. **Kirim screenshot struk** pembayaran ke bot
7. Bot memverifikasi struk → **iklan langsung tayang** di website ✅

### Yang perlu diketahui
- Kode iklan berupa angka (contoh: **1001**) akan dikirim bot — **simpan kode ini**
- Iklan aktif selama **14 hari** sejak tayang
- Foto yang jelas dan deskripsi lengkap meningkatkan peluang laku
- Jika kirim beberapa foto sekaligus, semua foto masuk ke 1 iklan

---

## 2. Kelola Iklan

### Cek Status Iklan
```
CEK 1001
```
Menampilkan: status aktif/expired, jumlah views, sisa hari, link iklan.

### Naikkan Iklan (BUMP)
Iklan yang lama terpasang akan tenggelam. Bump untuk naik ke atas.
```
BUMP         → lihat daftar iklan yang bisa di-bump
BUMP 1001    → bump iklan tertentu (bayar via QRIS)
```
Biaya bump terjangkau, iklan naik ke posisi teratas.

### Perpanjang Masa Iklan
Iklan expired tidak akan muncul di website. Perpanjang sebelum habis.
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
Bot akan memandu proses bayar untuk mengaktifkan kembali.

### Edit Harga
```
EDIT 1001 HARGA 200000
```
Ubah harga iklan tanpa perlu pasang ulang.

### Hapus Iklan

**Barang sudah terjual:**
```
HAPUS LAKU 1001
```
Iklan ditandai sold dan tidak muncul di website.

**Barang tidak laku / mau tarik iklan:**
```
HAPUS GALAKU 1001
```
Permintaan dikirim ke admin untuk diproses.

---

## 3. Upgrade Iklan

### Featured (Iklan Unggulan)
Iklan ditampilkan di bagian atas dengan label ⭐ Unggulan.
```
UPGRADE FEATURED 1001 3    → featured 3 hari
UPGRADE FEATURED 1001 7    → featured 7 hari
```
Biaya: Rp 5.000/hari (default, bisa berbeda).

### Auto Bump
Iklan otomatis dinaikkan setiap hari selama 7 hari tanpa perlu bump manual.
```
UPGRADE AUTOBUMP 1001
```
Biaya: Rp 15.000/7 hari (default, bisa berbeda).

> Ketik `UPGRADE` saja untuk melihat opsi dan harga terkini.

---

## 4. Tawar & Tawaran

### Menawar Iklan Orang Lain
```
TAWAR 1001 150000
TAWAR 1001 150000 Boleh nego kak, saya serius beli
```
Format: `TAWAR [kode iklan] [harga tawaran] [pesan opsional]`

Penjual akan mendapat notifikasi dan bisa balas langsung via WA.

### Lihat Tawaran Masuk (untuk Penjual)
```
TAWARAN
```
Menampilkan semua tawaran yang masuk ke iklanmu beserta link WA pembeli.

---

## 5. Cari Barang

### Posting Iklan Dicari
Jika kamu mencari barang tertentu, post di halaman Dicari:
```
DICARI laptop bekas budget 3 juta area USU
DICARI motor matic 2019 plat BK
```
Iklanmu akan muncul di halaman Dicari dan penjual yang punya bisa menghubungimu.

Bisa juga langsung cari di website: **jualbeliusupolmed.web.id**

---

## 6. Langganan Kategori

Dapatkan notifikasi WA otomatis setiap ada iklan baru di kategori tertentu.

```
LANGGANAN              → lihat kategori yang bisa dilanggan
LANGGANAN Elektronik   → langganan kategori Elektronik
LANGGANAN Laptop       → langganan kategori Laptop
```

Notifikasi dikirim otomatis begitu ada iklan baru yang sesuai.

---

## 7. Lapor Iklan

Jika menemukan iklan palsu, penipuan, atau melanggar aturan:
```
LAPOR 1001 Penjual tidak responsif
LAPOR 1001 Harga tidak sesuai foto
LAPOR 1001 Iklan duplikat
```
Format: `LAPOR [kode iklan] [alasan]`

Admin akan meninjau laporan dalam waktu singkat.

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

---

## 9. Daftar Lengkap Perintah

### Iklan Saya
| Perintah | Fungsi |
|---|---|
| `SAYA` | Profil & statistik |
| `CEK 1001` | Status & views iklan |
| `BUMP 1001` | Naikkan iklan ke atas |
| `PERPANJANG 1001` | Perpanjang masa aktif |
| `AKTIFKAN 1001` | Aktifkan iklan expired |
| `EDIT 1001 HARGA 200000` | Edit harga iklan |
| `HAPUS LAKU 1001` | Tandai terjual |
| `HAPUS GALAKU 1001` | Minta hapus iklan |

### Upgrade
| Perintah | Fungsi |
|---|---|
| `UPGRADE` | Lihat opsi upgrade |
| `UPGRADE FEATURED 1001 3` | Featured 3 hari |
| `UPGRADE AUTOBUMP 1001` | Auto bump 7 hari |

### Beli & Cari
| Perintah | Fungsi |
|---|---|
| `TAWAR 1001 150000` | Tawar harga |
| `TAWARAN` | Lihat tawaran masuk |
| `DICARI [deskripsi]` | Post barang yang dicari |
| `LANGGANAN [kategori]` | Notif kategori baru |

### Umum
| Perintah | Fungsi |
|---|---|
| `MENU` | Daftar semua perintah |
| `LAPOR 1001 alasan` | Laporkan iklan |

---

## Tanya Jawab

**Q: Berapa lama iklan tayang?**  
A: 14 hari sejak diaktifkan. Bisa diperpanjang dengan `PERPANJANG 1001`.

**Q: Bagaimana cara bayar?**  
A: Scan QRIS yang dikirim bot, lalu kirim screenshot struk ke bot.

**Q: Iklan saya tidak muncul di website?**  
A: Cek status dengan `CEK 1001`. Mungkin pending konfirmasi atau sudah expired.

**Q: Bisa pasang lebih dari 1 foto?**  
A: Bisa. Kirim beberapa foto sekaligus, semua masuk ke 1 iklan.

**Q: Bagaimana kalau salah ketik deskripsi?**  
A: Gunakan `EDIT 1001 HARGA [harga baru]` untuk ubah harga. Untuk edit judul/deskripsi, hubungi admin.
