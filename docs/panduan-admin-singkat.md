# Panduan Cepat Admin — Jual Beli USU Polmed

**Panel Admin:** jualbeliusupolmed.web.id/admin  
**WA Admin:** 62895429126232

---

## Login Admin

Masuk ke `/admin` menggunakan password admin yang sudah diset.

---

## Tab Listing

| Aksi | Cara |
|---|---|
| Approve iklan pending | Klik **✓ Aktifkan** |
| Tolak / suspend iklan | Klik **✗ Suspend** |
| Approve permintaan hapus | Klik **✓ Approve** (di status *Minta Hapus*) |
| Tolak permintaan hapus | Klik **✗ Reject** (iklan kembali aktif) |
| Filter status | Pilih: Semua / Pending / Aktif / Expired / dll |

---

## Tab Penjual

| Aksi | Cara |
|---|---|
| Cari penjual | Ketik nama / nomor di kolom cari |
| Pause bot penjual | Klik **⏸ Pause Bot** |
| Aktifkan bot penjual | Klik **▶ Aktifkan Bot** |
| Lihat profil penjual | Klik **Profil ↗** |
| Export daftar penjual | Klik **Export CSV** |

---

## Tab Transaksi

- Lihat semua pembayaran (pending / lunas / gagal)
- Ringkasan total pendapatan ditampilkan di atas
- Filter berdasarkan tanggal atau status

---

## Perintah WA Admin

```
BROADCAST [pesan]    → Kirim pesan ke semua penjual aktif
```

Kirim dari nomor WA admin (62895429126232).

---

## Alur Iklan Baru

```
Penjual kirim foto → Bot baca AI → Penjual bayar QRIS
→ Penjual kirim struk → Bot verifikasi → Status: pending
→ Admin approve → Status: active → Tayang di website ✅
```
