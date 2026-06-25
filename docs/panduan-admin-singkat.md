# Panduan Cepat Admin — Jual Beli USU Polmed

**Panel Admin:** jualbeliusupolmed.web.id/admin  
**WA Admin:** 62895429126232

---

## Login Admin

Buka `/admin` → masuk dengan password admin (env `ADMIN_PASSWORD`).

---

## Panel Admin — 6 Seksi

| Seksi | Halaman |
|---|---|
| **Utama** | Ringkasan, Moderasi |
| **Marketplace** | Listings, Penjual, Transaksi, Tawaran, Dicari, Rating |
| **Konten** | Blog, Kategori, Group Post |
| **Analitik** | Keuangan, Tren, Audit |
| **Bot & Komunikasi** | WA Bot, Broadcast, Notifikasi, AI, Referral |
| **Pengaturan** | Pengaturan, Profil Request, Reports, Blacklist |

Gunakan **search bar** di sidebar untuk cari halaman dengan cepat.

---

## Moderasi Iklan

| Aksi | Cara |
|---|---|
| Approve iklan pending | Klik **✓ Aktifkan** |
| Tolak iklan | Klik **✗ Suspend** |
| Approve permintaan hapus | Klik **✓ Approve** |
| Tolak permintaan hapus | Klik **✗ Reject** |

---

## Alur Iklan Baru (Mode Freemium / perlu moderasi)

```
Penjual kirim foto → AI baca → Penjual bayar QRIS
→ Penjual kirim struk → AI verifikasi → Status: pending
→ Admin approve di /admin/moderasi → Iklan tayang ✅
```

Pada mode **Gratis Semua** atau **Jual Dulu**, iklan langsung aktif tanpa moderasi.

---

## Perintah WA Admin

Kirim dari nomor admin (62895429126232):

```
STATS                           → Statistik ringkas sistem
BROADCAST [pesan]               → Kirim pesan ke semua penjual aktif
PAUSE [nomor_wa]                → Pause bot penjual tertentu
RESUME [nomor_wa]               → Aktifkan kembali bot penjual
SETUJUI NAMA [nomor_wa]         → Setujui permintaan ganti nama
TOLAK NAMA [nomor_wa]           → Tolak permintaan ganti nama
SETUJUI TAWAR BIAYA [kode]      → Setujui negosiasi biaya iklan
TOLAK TAWAR BIAYA [kode]        → Tolak negosiasi biaya iklan
SETMODE [mode]                  → Ganti mode monetisasi
```

Mode monetisasi: `sewa_lapak` | `jual_dulu` | `freemium` | `gratis_semua` | `custom`
