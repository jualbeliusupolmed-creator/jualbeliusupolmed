# Operations Manual & Risk Management

## 1. Day-One Infrastructure & Technical Setup

```
[ Mahasiswa / Pembeli ]  ──>  [ Cloudflare SSL / DNS ]  ──>  [ Next.js Vercel Web ]
                                                                       │
                                                                 (Supabase DB)
                                                                       │
[ WhatsApp / IG User ]   ──>  [ Azure Linux VPS: 20.205.16.13 ]       │
                                 ├── PM2: wa-bot-usu (Port 3000) ──────┤
                                 ├── PM2: wa-bot-2 (Backup)            │
                                 ├── PM2: ig-bot-server                │
                                 └── Cron: penjaga-bot.sh (Tiap 2 mnt) ┘
```

### Essential Service Directory:
- **Server:** Azure Linux VM (`20.205.16.13`, user `ubuntu`, key-only SSH).
- **Process Manager:** PM2 managing `wa-bot-usu` and backup workers.
- **Database:** Supabase PostgreSQL with Row Level Security (RLS) and real-time triggers.
- **Payment Ingestion:** QRIS Static/Dynamic via payment gateway (Midtrans / Xendit).

---

## 2. Standard Operating Procedures (SOP Harian)

### A. Morning Routine (07:30 - 08:30 WIB)
1. **Health Check Bot:** Jalankan perintah diagnosa otomatis:
   ```bash
   ssh azure-vps "pm2 status && curl -s http://127.0.0.1:3000/health"
   ```
2. **Review Antrean Pending (`wa_outbox`):**
   - Buka `/admin/antrean` di dashboard web.
   - Pastikan tidak ada pesan outbox tertahan > 5 menit.
3. **Approval Gelombang Pagi (09:00 WIB):**
   - Moderator memeriksa 5-10 postingan prioritas yang dijadwalkan blast jam 09.00.
   - Verifikasi foto tidak mengandung pornografi, senjata, obat terlarang, atau penipuan.

### B. Daytime Serving Routine (11:00 - 16:00 WIB)
1. **Moderasi Iklan Baru (Real-time Queue):**
   - Notifikasi masuk ke Telegram/WA admin saat ada iklan baru status `pending`.
   - SLA moderasi: maksimal 15 menit per iklan.
2. **Penanganan Kasus Ghosting / Laporkan Penjual:**
   - Jika ada laporan penipuan, moderator memeriksa ID transaksi di database dan membekukan sementara nomor yang dilaporkan via flag `is_banned: true`.

### C. Night Routine (21:30 - 22:30 WIB)
1. **Audit Outbox & Log Penjaga:**
   - Periksa `tail -n 50 /home/ubuntu/wa-bot-usu/penjaga-bot.log`.
2. **Rekonsiliasi QRIS:**
   - Samakan saldo QRIS hari ini dengan total iklan berbayar yang lunas di database.
3. **Backup Status & Sesi Baileys:**
   - Cron otomatis mem-backup sesi auth WhatsApp terenkripsi ke storage lokal.

---

## 3. Risk Register & Mitigation Matrix

| Risiko | Dampak | Probabilitas | Mitigasi Konkret |
|---|:---:|:---:|---|
| **Akun WhatsApp Terkena Ban Meta** | Kritis | Sedang | - Batasi blast maksimal 15 pesan/menit dengan jeda acak (*jitter*).<br>- Siapkan nomor cadangan di `wa-bot-2`.<br>- Alihkan sebagian pendaftaran ke Instagram DM Bot. |
| **Penipuan Barang Rusak saat COD** | Tinggi | Sedang | - Wajibkan pembeli memeriksa fisik barang di tempat sebelum bayar.<br>- Terapkan sistem *Verified Seller* (KTM). |
| **Server VPS Down / Out of Memory** | Tinggi | Rendah | - Skrip `penjaga-bot.sh` memantau memori tiap 2 menit.<br>- Otomatis restart PM2 jika RAM tembus 80%. |
| **Spam / Iklan Pinjol & Judi Online** | Tinggi | Tinggi | - Regex keyword filter otomatis di `src/lib/moderationRules.js`.<br>- Semua iklan akun baru wajib persetujuan moderator sebelum tayang. |
| **Pembeli Ghosting saat Janjian** | Sedang | Tinggi | - Panduan 5 Titik COD Resmi yang terpantau satpam kampus.<br>- Sistem reputasi bintang 1-5 bagi pembeli dan penjual. |

---

## 4. Legal & Regulatory Compliance
- **Kategori Platform:** Forum jual beli komunitas tertutup / perantara elektronik peer-to-peer non-finansial.
- **Penyimpanan Data:** Seluruh nomor telepon disamarkan (masked) di database publik untuk mematuhi UU Perlindungan Data Pribadi (UU PDP).
- **Disclaimer Hukum:** Platform tidak memegang uang barang secara langsung; transaksi barang fisik diselesaikan tunai secara mandiri oleh para pihak di lokasi COD.
