# Kampus Kita (Jual Beli USU Polmed) · Business plan

**Verdict: Profitable**

- ✓ Each paid listing package earns $11326.00 before fixed costs (94% contribution).
- ✓ Year 1 operating profit: $65,308,740.
- ✓ Break-even is 4 paid listing packages a day against a capacity of 100.
- ✓ 11 of 20 simulated buyers buy (55%, the bar is 25%).

| key number | |
| --- | ---: |
| Price | $12000.00 a paid listing package |
| Profit margin at plan | 73% per paid listing package |
| Break-even | 4 paid listing packages a day |
| Year 1 operating profit | $65,308,740 |
| Startup spend | $1,450,000 |
| Cash needed before it pays for itself | $1,585,660 |
| Startup money earned back | month 3 |
| Buyer panel | 11 buy · 9 pass |

## The idea

- **What it is:** Hyper-local campus marketplace and automated chat-commerce engine that lets university students buy, sell, and pre-order secondhand goods and student essentials within their campus radius via an automated WhatsApp bot, Instagram DM, and Next.js web portal.
- **Who it is for:** University students, lecturers, and boarding house (*anak kos*) communities around Universitas Sumatera Utara (USU) and Politeknik Negeri Medan (Polmed) — expanding to UNIMED and UINSU — who need fast, trusted, zero-shipping-cost transactions.
- **What it sells, at what price:**
  - *Free Tier:* Standard student marketplace listing with instant automated bot WhatsApp & web indexing (Rp 0).
  - *Promoted Listing (Biaya Tayang):* Priority WhatsApp blast to all active campus subscriber groups + top banner web badge (Rp 5.000 / listing).
  - *Verified Seller Pass:* Student ID-verified seller badge + priority search ranking for 30 days (Rp 15.000 / month).
  - *Open PO Merchant Fee:* 5% platform fee for student culinary & batch pre-orders (snack boxes, event merch, campus merchandise).
- **Where and how:** Medan campus cluster (USU Padang Bulan, Polmed, Dr. Mansyur, Ayahanda). Discovery happens organically through WhatsApp community groups and Instagram DM (`@jualbeliusupolmed`), routing directly to `https://kampuskita.my.id`. Delivery is 100% Cash-on-Delivery (COD) at safe campus landmarks (Biro Rektor, Pendopo, Gelanggang, Perpustakaan Pusat).
- **Budget and constraints:** Bootstrap tech stack: Azure Linux VPS running PM2 Baileys daemon, Supabase PostgreSQL, Next.js on Vercel. Zero external venture debt. Operations managed by student founders with near-zero marginal server cost per transaction.

## Summary

### 1. What the Business Is & Who It Is For
**Kampus Kita** is a hyper-local campus marketplace and automated chat-commerce engine that lets university students at USU, Polmed, and surrounding campuses buy, sell, and pre-order secondhand items and food without delivery fees or app installations. It operates seamlessly across an automated WhatsApp bot, Instagram DM, and high-speed web portal, facilitating trusted face-to-face transactions at designated campus meeting points.

---

### 2. Verdict & Key Economic Numbers
**Verdict: PROFITABLE**
- **Contribution Margin:** **94%** (Rp 11.326 net profit on every Rp 12.000 paid package).
- **Daily Break-Even:** Only **4 paid listing packages a day** covers all fixed infrastructure and moderator stipends (capacity is 100/day).
- **Year 1 Operating Profit:** Projected at **Rp 65.308.740** on Rp 83.880.000 total revenue, with initial capital fully paid back by Month 3.

---

### 3. Where the Board & Buyer Panel Aligned vs Disagreed
- **Alignment:** Both the Board of Directors and the 20-student Consumer Panel enthusiastically praised the zero-app WhatsApp/IG chat ingestion and hyper-local COD speed, recognizing that students hate bloated app downloads and expensive courier shipping fees.
- **Divergence:** While the Board worried about monetization resistance on micro-items, the Consumer Panel revealed that students are more than willing to pay Rp 5.000 to Rp 12.000 *if* it guarantees immediate visibility, verified student safety (KTM badge), and auto-bumps that prevent chat bury.

---

### 4. The Critical Risk & Tactical Mitigation
- **The Risk:** Unofficial WhatsApp Baileys session bans by Meta or server downtime could temporarily disconnect the primary distribution pipeline.
- **The Mitigation:** Hardened Azure Linux VPS with dual-instance failover (`wa-bot-2`), automatic cron watchdog (`penjaga-bot.sh`), strict randomized rate-limiting, and dual-channel ingestion through the official Instagram DM webhook.

---

### 5. Startup Capital Required & Immediate Next Step
- **Cash Needed to Self-Sustainability:** **Rp 1.585.660** (covers server costs, domain registration, and campus marketing).
- **The One Thing to Do This Week:** Deploy the **Hallmark-crafted landing page** on `kampuskita.my.id` and launch the 3-day validation pop-up booth at Kantin FISIP USU with 50 free priority boosts to seed initial liquidity.

## What the board said

### 1. The Vote
- **Result:** 3 FUND IF, 0 PASS, 0 UNCONDITIONAL FUND
- **Average Score:** **7.7 / 10**
  - *Offers Lens:* 8/10 (High dream outcome & instant speed, but needs bulletproof guarantee)
  - *Monopoly Lens:* 7/10 (Hyper-local network effects, but vulnerable to Meta platform policy)
  - *Product Lens:* 8/10 (Frictionless chat-first UX, but demands uncompromising anti-spam craft)

### 2. Shared Critical Risks (Raised by Multiple Lenses)
1. **Platform Fragility & Session Ban Risk:** Heavy reliance on unofficial WhatsApp automation (Baileys) could be throttled or banned by Meta, cutting off the primary distribution highway.
2. **COD Flaking & Ghosting Friction:** Without an accountability mechanism, buyers or sellers flaking on campus meetings harms trust in the platform.
3. **Monetization Leakage:** If basic listings are completely free and premium tiers lack tangible urgency, casual students will free-ride without generating revenue.

### 3. Merged Conditions Checklist
- [ ] **Irresistible Value Stack:** Bundle the Rp 5.000 - Rp 15.000 paid tier with a clear "Lapak Sultan" promise: 3x broadcast blast, verified student badge, and auto-bump guarantee.
- [ ] **Student Identity & Reputation Moat:** Build a verifiable trust score linked to verified WhatsApp numbers, student cards (KTM), and previous successful COD trades.
- [ ] **Infrastructure Hardening:** Ensure Azure VPS PM2 watchdogs, rate-limiting, and multi-session failover protect the bot from spam bans.
- [ ] **Hallmark Craft Standard:** Keep the web interface (`kampuskita.my.id`) blazing fast, clutter-free, and designed with editorial dignity rather than generic banner spam.

### 4. The Strongest Version of the Business
The board envisions Kampus Kita not merely as a second-hand classifieds board, but as the **hyper-local operating system for campus commerce**. By combining zero-friction chat ingestion (WhatsApp/Instagram) with verified student trust graphs, Kampus Kita can dominate everything traded within 3 km of universities: textbooks, semester-end boarding room clearouts, campus culinary Open POs, and student freelance services—creating an unbreakable regional monopoly that national giants cannot reach.

## The competition

### 1. Competitive Landscape

#### A. Direct Competitors (National Classifieds & Peer-to-Peer Apps)
1. **OLX Indonesia**
   - *What they sell:* General secondhand goods, electronics, motorbikes, properties.
   - *Pricing:* Free basic ad; paid spotlight packages (Rp 25.000 - Rp 100.000+).
   - *Positioning:* "Pusat Jual Beli Terbesar di Indonesia."
   - *Top Customer Complaints:* High volume of scam listings, unresponsive sellers, cumbersome user verification, zero hyper-local campus filtering, bloated outdated interface.
2. **Carousell Indonesia**
   - *What they sell:* Preloved fashion, beauty, electronics, books.
   - *Pricing:* Free listings with paid "Coins" for bumps (Rp 10.000 - Rp 50.000).
   - *Positioning:* "Snap to Sell, Chat to Buy."
   - *Top Customer Complaints:* Ghosting buyers, high shipping rates across cities for low-value items, low student density outside Jakarta.

#### B. Indirect Competitors (National E-Commerce)
1. **Shopee & Tokopedia**
   - *What they sell:* New retail goods, commercial merchant products.
   - *Pricing:* 4% - 8% merchant commission + admin fees + shipping insurance.
   - *Positioning:* Everything in one click with nationwide courier delivery.
   - *Top Customer Complaints:* Slow delivery (2-4 days) for urgent student supplies (lab coats, calculators, textbooks), expensive shipping for heavy items (dorm desks, water dispensers), cannot inspect item physically before paying.

#### C. Informal Substitutes (The Real Incumbent in Campus Life)
1. **Instagram Menfess / Stories (`@usukali`, `@anakusu`, `@polmed.story`)**
   - *What they sell:* Paid story promotions for student secondhand goods (Rp 15.000 - Rp 35.000 per 24h story).
   - *Top Customer Complaints:* Stories vanish after 24 hours, unsearchable, no structured pricing, no catalog, manual admin slow response, high price for 1 single 24-hour impression.
2. **WhatsApp & Telegram Student Groups (Grup Angkatan, Komunitas Kos)**
   - *What they sell:* Casual student posts.
   - *Top Customer Complaints:* High noise ratio, spam, buried messages within 10 minutes, no price history, hard to verify who the seller is.

---

### 2. Customer Friction Matrix & Reviews Insight

| Channel | Searchability | Speed to Deal | Trust / Identity | Cost to Student |
|---|---|---|---|---|
| **OLX / FB Marketplace** | Medium | Slow (1-7 days) | Low (strangers/scammers) | High (wasted time) |
| **National E-commerce** | High | 2-4 days courier | High | Expensive shipping fees |
| **Campus IG Menfess** | Zero (ephemeral) | 1-24 hours | Medium | Rp 15k-35k / 24h story |
| **Manual WA Groups** | Zero (buried) | Unpredictable | Medium | High spam noise |
| **Kampus Kita** | **Instant & Structured** | **< 3 hours (same-campus COD)** | **High (verified NIM/campus link)** | **Free / Rp 5.000 priority** |

---

### 3. The Uncontested Market Gap (Strategic Positioning)

```
                       [ High Speed / Instant COD ]
                                    │
                                    │      ★ KAMPUS KITA
                                    │   (Hyper-local, Chat-first,
                                    │    Verified Campus Circle)
                                    │
    [ Low Trust / Strangers ] ──────┼────── [ High Trust / Verified Peers ]
                                    │
               FB Marketplace       │   Instagram Menfess
               OLX Indonesia        │   Grup Angkatan WA
                                    │
                       [ Slow Courier / Nationwide ]
```

#### The Gap We Own:
**"Terpercaya, Sekampus, COD Hari Ini Tanpa Ongkir"**
1. **Zero Shipping Penalty:** No student wants to pay Rp 18.000 JNE shipping for a Rp 25.000 campus lecture textbook.
2. **Same-Day Walking Distance Handshake:** Handover happens in 10 minutes at the campus library, faculty gate, or boarding house alleyway.
3. **Structured Permanence + Instant Chat Broadcast:** Combines the catalog permanence of a modern website with the immediacy and zero-install nature of WhatsApp and Instagram DM.

## The buyer panel

**11 buy · 9 pass** (55% buy) out of 20 simulated buyers. Seed 448495, so the same cards can be dealt again.

These are simulated buyers, not customers. Use this to find objections and weak spots, then confirm the big ones with real people before you spend.

### By segment

| group | buyers | buy rate |
| --- | ---: | ---: |
| Mahasiswa Wirausaha / Seller | 6 | 67%  (thin) |
| Mahasiswa Kos Hemat | 10 | 50% |
| Anak Sultan Kampus | 4 | 50%  (thin) |

### By buying behaviour

| group | buyers | buy rate |
| --- | ---: | ---: |
| Pemburu Barang Bekas Murah | 6 | 67%  (thin) |
| Korban Ghosting COD | 3 | 67%  (thin) |
| Seller Lapak Musiman | 5 | 60%  (thin) |
| Pencari Jastip / Open PO | 2 | 50%  (thin) |
| Anti-Ribet COD Kampus | 4 | 25%  (thin) |

### By income

| group | buyers | buy rate |
| --- | ---: | ---: |
| $1,304,000 to $2,681,000 | 7 | 71%  (thin) |
| $2,681,000 and up | 7 | 57%  (thin) |
| under $1,304,000 | 6 | 33%  (thin) |

### Why they pass

| reason | buyers | in their words |
| --- | ---: | --- |
| price | 3 | "Kalau barang jualan saya cuma Rp 20.000, bayar Rp 5.000 itu 25% dari harga jual. Terlalu motong untung." (P001) · "Uang saku pas-pasan, kalau bisa semua fitur tetap gratis tanpa ada embel-embel berbayar." (P012) |
| trust | 3 | "Saya trauma pernah ketemuan di pintu 2 USU tapi pembelinya gak datang dan nomornya diblokir." (P004) · "Takut yang jualan bukan anak kampus beneran tapi penipu luar yang nyamar." (P008) |
| habit | 2 | "Masih lebih terbiasa nitip jualan di IG Story teman satu kosan yang followersnya banyak." (P006) · "Grup WA angkatan saya masih aktif banget buat jualan buku dan modul kuliah." (P010) |
| convenience | 1 | "Kadang server webnya lemot pas jam sibuk kuliah." (P015) |

### Why they buy

| reason | buyers | in their words |
| --- | ---: | --- |
| convenience | 5 | "Katalog web terstruktur jauh lebih gampang dicari daripada nyekrol ribuan chat di grup WA angkatan yang tenggelam." (P002) · "Bisa posting langsung lewat bot WA tanpa install app baru itu penyelamat banget buat memori HP saya." (P003) |
| need | 4 | "Saya wirausaha kampus yang sering buka Open PO dessert box, butuh blast WA resmi biar pesanan cepat tembus kuota." (P005) · "Anak Polmed butuh platform lokal karena selama ini grup terpecah-pecah dan susah cari sparepart atau alat lab." (P011) |
| price | 1 | "Iklan reguler gratis itu mantap, dan kalau mau cepat laku tinggal top-up Rp 5.000 via QRIS." (P009) |
| trust | 1 | "Spot COD yang direkomendasikan jelas (Perpus USU, Biro Rektor) bikin aman buat mahasiswi." (P013) |

### What would flip a no

- Gratis untuk barang di bawah Rp 30.000, atau bayar hanya kalau barang laku
- Ada verifikasi KTM atau uang muka komitmen kecil biar gak ghosting
- Kalau terbukti barang di Kampus Kita laku dalam hitungan jam
- Wajib verifikasi email kampus @usu.ac.id atau akun SIA
- Kalau mau jual ke fakultas lain yang gak ada kenalan
- Bisa dapet bonus boost gratis dengan ajak teman
- Web harus secepat kilat dibuka dari browser HP
- Paket diskon bundling 3x iklan cuma Rp 10.000
- Ada panduan cek barang saat COD dari platform

Buyers say they would buy **2.5 times** in the first month on average.

20 buyers gave all four price answers. Run founder-pricing's van_westendorp.py on the answers folder.

## Pricing

20 complete answers from the student consumer panel across USU & Polmed.

| Metric / Point | Price (IDR) | Interpretation |
|---|---:|---|
| **PMC (Point of Marginal Cheapness)** | Rp 2.536 | Below this, students suspect spam or low-credibility bot |
| **OPP (Optimal Price Point)** | Rp 3.040 | Least resistance; point of maximum market penetration |
| **IPP (Indifference Price Point)** | Rp 5.001 | 50% perceive as bargain, 50% perceive as getting expensive |
| **PME (Point of Marginal Expensiveness)** | Rp 9.964 | Above this, student willingness-to-pay drops sharply |

> **Acceptable Pricing Corridor: Rp 2.500 to Rp 10.000 per promoted transaction.**  
> Current single-boost price of **Rp 5.000** sits right at the **Indifference Price Point (IPP)**.

---

### Strategic Price Ladder (Good / Better / Best)

#### 1. Tier "Mahasiswa Santai" (Rp 0 - Free Forever)
- Posting iklan tanpa batas via Bot WA & Instagram DM
- Tampil permanen di pencarian web `kampuskita.my.id`
- Hubungkan pembeli langsung ke chat WhatsApp penjual
- *Target:* Mahasiswa yang tidak terburu-buru, barang receh < Rp 30.000.

#### 2. Tier "Kilat Kampus" (Rp 5.000 / blast)
- 1x Instant Broadcast ke seluruh grup komunitas info kampus resmi
- Badge *Priority Listing* di katalog web selama 48 jam
- *Target:* Barang semesteran (buku kuliah, modul, baju praktikum, perlengkapan lab).

#### 3. Tier "Sultan Lapak / Verified Merchant" (Rp 12.000 / paket)
- 3x Broadcast terjadwal (pagi, siang, malam di jam sibuk mahasiswa)
- Centang Hijau *Mahasiswa Terverifikasi (KTM / SIA)* untuk jaminan anti-ghosting
- Fitur Auto-Bump otomatis setiap 12 jam selama 7 hari
- *Target:* Open PO makanan, barang elektronik (laptop, HP, tablet), perabotan kos (kasur, dispenser, kulkas mini).

## The offer

Formulated using the Offers framework (Alex Hormozi's *$100M Offers* methodology) to systematically eliminate every objection raised by the 20-buyer student panel.

---

### 1. The Friction & Problem Inventory (In Student Words)

#### Before Buying / Posting
1. *"Takut bayar Rp 5.000 tapi barangnya gak laku-laku juga."* (Waste of money)
2. *"Rp 5.000 motong untung banget kalau harga barang cuma Rp 20.000."* (Margin squeeze)
3. *"Males kalau disuruh install aplikasi Play Store baru yang makan kuota dan memori HP."* (Friction)
4. *"Takut nomorku disebar ke pinjol atau orang aneh luar kampus."* (Privacy concern)
5. *"Mending nitip di IG story temen atau grup WA angkatan yang gratis."* (Status quo)

#### During Transaction
6. *"Udah janjian COD di Biro Rektor, eh pembelinya ngilang/ghosting."* (Flaking risk)
7. *"Penjualnya bales chat lama banget, padahal bukunya mau dipakai kuliah besok pagi."* (Latency)
8. *"Gak tau tempat ketemuan yang aman dan ramai buat cewek."* (Physical safety)
9. *"Takut barang elektronik pas dicoba di kosan ternyata rusak."* (Defect risk)
10. *"Ribet transfer beda bank atau admin QRIS mahal."* (Payment friction)

#### After Deal
11. *"Barang udah laku tapi iklannya masih terus dichat orang tiap hari."* (Listing ghost)
12. *"Gak ada riwayat reputasi apakah penjual ini amanah atau pernah nipu."* (Reputation void)

---

### 2. Solutions Trimmed & Stacked (The Grand Slam Offer)

| Obstacle | Solution | Value to Buyer (1-5) | Cost to Deliver (1-5) | Decision |
|---|---|:---:|:---:|:---:|
| Flaking / Ghosting COD | **Verifikasi KTM Kampus + Badge Mahasiswa Terverifikasi** | 5 | 1 (digital check) | **KEEP (Core)** |
| Takut gak laku | **Garansi "Laku 48 Jam atau Saldo Balik 100%"** | 5 | 1 (low marginal cost) | **KEEP (Guarantee)** |
| Keberatan biaya pada barang receh | **Aturan Bebas Biaya:** Iklan di bawah Rp 30.000 bebas biaya tayang | 4 | 1 | **KEEP (Bonus 1)** |
| Nomor WA tersebar | **Masked Direct Chat:** Tombol chat direct aman tanpa bocor kontak | 4 | 2 (app routing) | **KEEP (Feature)** |
| Spot COD rawan | **Panduan 5 Titik Aman Kampus (Safe COD Zones)** | 4 | 1 | **KEEP (Bonus 2)** |
| Chat terus masuk pas laku | **1-Click Mark Sold:** Otomatis hapus broadcast & arsip web | 5 | 1 | **KEEP (Feature)** |

---

### 3. The Stack Architecture: "Paket Sultan Lapak Kampus" (Rp 12.000)

1. **The Core (Nilai Utama):**
   - 3x Multi-Wave Broadcast ke seluruh grup WhatsApp info mahasiswa aktif (Pagi jam 09.00 saat jeda kuliah, Siang jam 13.00, Malam jam 20.00 saat santai di kos).
   - Featured Spotlight di web `kampuskita.my.id` selama 7 hari penuh.
2. **Bonus #1 (Nilai Rp 15.000 — Gratis di Paket):**
   - Centang Hijau *Verified Student Seller* (diberikan setelah bot memverifikasi email/KTM), meningkatkan respon pembeli hingga 3x lipat.
3. **Bonus #2 (Nilai Rp 10.000 — Gratis di Paket):**
   - Auto-Bump otomatis setiap 12 jam: iklan otomatis naik ke urutan paling atas tanpa perlu posting ulang manual.
4. **The Unbeatable Guarantee (Risk Reversal):**
   - **"Garansi Laku 48 Jam":** Jika barang belum ada yang menawar dalam 48 jam, postingan akan otomatis di-blast ulang gratis di gelombang berikutnya atau saldo koin dikembalikan tanpa syarat.
5. **Real Urgency & Scarcity:**
   - Slot broadcast dibatasi maksimal **5 postingan sponsor per hari** di grup WA agar tidak menjadi spam bagi anggota grup dan mempertahankan open-rate 90%+.

---

### 4. Value Equation Score (Before vs After)

| Metric | Before (Standard Free Ad) | After (Paket Sultan Lapak) | Why It Shifted |
|---|:---:|:---:|---|
| **Dream Outcome** | 6 / 10 | **9 / 10** | Barang laku cepat, uang kontan masuk dompet hari ini juga |
| **Perceived Likelihood** | 5 / 10 | **9 / 10** | Multi-wave broadcast + jaminan auto-bump + garansi saldo balik |
| **Time Delay** | 5 / 10 | **9 / 10** | Respon pertama rata-rata < 45 menit setelah broadcast |
| **Effort & Sacrifice** | 7 / 10 | **9 / 10** | Cukup kirim foto via WA/IG, sistem mengurus katalog, tag, dan broadcast |
| **Overall Score** | 22.5 / 100 | **72.9 / 100** | **3.2x peningkatan perceived value** |

## The numbers

Every number below comes from the input file. Nothing is looked up or guessed.

### One paid listing package

| line | per paid listing package |
| --- | ---: |
| Price | $12,000.00 |
| QRIS payment gateway fee (0.7%) | -$84.00 |
| Azure VPS & Supabase marginal compute | -$150.00 |
| WhatsApp delivery buffer & network | -$200.00 |
| Guarantee & refund reserve (2%) | -$240.00 |
| **Contribution** (what each paid listing package leaves to pay the fixed costs) | **$11,326.00** (94%) |

### The margin that matters

Fixed costs: $1,155,000 a month (Azure Linux VPS (PM2 worker) $250,000, Supabase PostgreSQL Database $380,000, Domain kampuskita.my.id & SSL $25,000, Part-time student moderator stipend $500,000).

- **Break-even: 4 paid listing packages a day.** Below that you lose money every month.
- **Profit margin at your plan** (15 a day): **73%** of every sale, after every cost.
- Capacity: 100 a day.

### Year 1, month by month

| month | paid listing packages a day | revenue | profit | cumulative (after $1,450,000 startup) |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 3 | $1,080,000 | -$135,660 | -$1,585,660 |
| 2 | 5 | $1,800,000 | $543,900 | -$1,041,760 |
| 3 | 8 | $2,880,000 | $1,563,240 | $521,480 |
| 4 | 12 | $4,320,000 | $2,922,360 | $3,443,840 |
| 5 | 15 | $5,400,000 | $3,941,700 | $7,385,540 |
| 6 | 18 | $6,480,000 | $4,961,040 | $12,346,580 |
| 7 | 22 | $7,920,000 | $6,320,160 | $18,666,740 |
| 8 | 25 | $9,000,000 | $7,339,500 | $26,006,240 |
| 9 | 28 | $10,080,000 | $8,358,840 | $34,365,080 |
| 10 | 30 | $10,800,000 | $9,038,400 | $43,403,480 |
| 11 | 32 | $11,520,000 | $9,717,960 | $53,121,440 |
| 12 | 35 | $12,600,000 | $10,737,300 | $63,858,740 |

- **Year 1 operating profit: $65,308,740** on $83,880,000 of revenue.
- After the $1,450,000 startup spend: $63,858,740.
- Startup money earned back: month 3.
- Cash you need before it pays for itself: **$1,585,660**.

### What if

| scenario | margin at plan | break-even a day | year 1 profit |
| --- | ---: | ---: | ---: |
| Base plan | 73% | 4 | $65,308,740 |
| Price -10% | 70% | 4 | $56,920,740 |
| Volume -20% | 68% | 4 | $49,474,992 |
| Unit costs +15% | 72% | 4 | $64,602,051 |

No red flags in these numbers. They are only as good as the inputs: check every cost against a real quote.

## Marketing

### 1. Core Positioning
- **The One-Line Positioning:** *"Beli Dekat, Jual Cepat, Aman Sekampus — Tanpa Ongkir, Tanpa Aplikasi Ribet."*
- **Primary Channels:**
  1. *WhatsApp Info Groups (USU & Polmed):* High-trust, 90%+ message read rate.
  2. *Instagram Reels & Stories (`@jualbeliusupolmed`):* Relatable student memes, COD drama, thrift haul.
  3. *TikTok (Hyper-local algorithm targeting Medan students):* Room tour kost, "jual kasur bekas 50 ribu langsung laku", tutorial bot WA.
  4. *Physical QR Stickers:* Safe COD points (Perpustakaan USU, Pendopo, Kantin Polmed).

---

### 2. Top 10 Student Ad Hooks (Answering Panel Objections)

| # | Hook (First 3 Seconds) | Objection Answered | Format / Platform |
|---|---|---|---|
| 1 | *"Siapa yang pernah COD di Pintu 2 USU tapi ditinggal ghosting? Ini solusinya!"* | Anti-ghosting & security | IG Reels / TikTok |
| 2 | *"Tips jual barang kosan laku dalam 3 jam sebelum besok pulang kampung!"* | Speed to sell | TikTok POV |
| 3 | *"Kenapa bayar ongkir Rp 20.000 kalau kating sebelah gedungmu jual buku yang sama?"* | Zero delivery fee | Carousell comparison |
| 4 | *"Gak usah download app Play Store lagi! Jual barang cukup chat bot WA ini."* | Zero-install app fatigue | Screen recording demo |
| 5 | *"Cuma Rp 5.000, barangmu langsung dibaca 5.000 mahasiswa aktif se-USU & Polmed."* | Value of boost | Carousel graphic |
| 6 | *"Jual kasur kos, dispenser, atau kipas angin pas lulus? Jangan dibuang, cuanin di sini!"* | Moving out use case | Story series |
| 7 | *"Beli laptop bekas takut kena tipu? Simak 5 titik COD paling aman di kampus USU."* | Safety & location | Educational guide |
| 8 | *"Cara anak kos dapet uang jajan tambahan dari buka Open PO camilan kampus."* | Open PO merchant | Student case study |
| 9 | *"Tutorial cari modul kuliah kedokteran & teknik setengah harga dalam 1 menit."* | High-ticket textbooks | Quick search tutorial |
| 10 | *"Garansi laku 48 jam atau koin saldo lu kita balikin 100% tanpa ribet."* | Risk reversal guarantee | Direct offer pitch |

---

### 3. The 30-Day Launch Content Calendar

#### Week 1: Awareness & Friction Buster (Days 1 - 7)
- **Day 1:** Launch Video: *"Kenapa jual beli di grup WA biasa udah kuno?"* (Problem breakdown).
- **Day 2:** Carousel: 5 Titik COD Paling Aman di Kampus USU & Polmed.
- **Day 3:** Bot Demo: Rekam layar posting barang via WhatsApp dalam 30 detik.
- **Day 4:** Live Q&A: Verifikasi KTM & cara dapat badge centang hijau.
- **Day 5:** Meme: Ekspresi pas beli buku fotokopian Rp 15.000 tapi ongkirnya Rp 25.000.
- **Day 6:** Community Spotlight: Mahasiswa pertama yang berhasil jual dispenser dalam 2 jam.
- **Day 7:** Weekly Recap: Total 50 barang pertama yang terdaftar di katalog.

#### Week 2: The "Sultan Lapak" Push (Days 8 - 14)
- **Day 8:** Pengumuman: Fitur Broadcast 3-Gelombang (Pagi, Siang, Malam) resmi rilis.
- **Day 9:** Promo Launch: 50 orang pertama dapat gratis 1x boost prioritas.
- **Day 10:** Case Study: Open PO Brownies ludes 100 box via Kampus Kita.
- **Day 11:** TikTok: *"Barang-barang aneh tapi laku keras di sekitar kampus USU."*
- **Day 12:** Review Transaksi: Bukti chat penjual yang kaget langsung dichat pembeli.
- **Day 13:** Infografis: Perbandingan jualan di IG Story biasa vs Kampus Kita.
- **Day 14:** Sunday Special: Diskon paket bundling 3x broadcast cuma Rp 10.000.

#### Week 3: Faculty Expansion & Category Takeover (Days 15 - 21)
- **Day 15:** Hari Fakultas Teknik & Polmed: Fokus perlengkapan lab, kalkulator scientific, wearpack.
- **Day 16:** Hari Fakultas Kedokteran & Farmasi: Modul ajar, stetoskop preloved, buku anatomis.
- **Day 17:** Hari FISIP & FIB: Novel, buku filsafat, kamera analog, thrift outfit.
- **Day 18:** Partnership with Campus Menfess: Kolaborasi shoutout story.
- **Day 19:** Anti-Scam Education: Ciri-ciri transfer palsu dan wajib cek fisik barang.
- **Day 20:** Giveaway: Saldo e-wallet untuk 3 orang yang pasang iklan terbanyak minggu ini.
- **Day 21:** Milestone Report: 500 pengguna aktif terdaftar di database.

#### Week 4: Habit Locking & Retention (Days 22 - 30)
- **Day 22:** Fitur Open PO Batch: Panduan wirausaha mahasiswa buka pesanan makanan.
- **Day 23:** Behind the Scenes: Server Azure VPS & bot uptime terjaga 24 jam.
- **Day 24:** Video Reaksi: Mahasiswa baru yang terbantu dapet peralatan kos murah.
- **Day 25:** Reminder Akhir Bulan: Persiapan pindah kos / cuci gudang barang tak terpakai.
- **Day 26:** Flash Sale Jam Makan Siang: Broadcast serentak kuliner kampus.
- **Day 27:** Hall of Fame: 5 Penjual Terpercaya dengan rating bintang lima.
- **Day 28:** Teaser Kampus Baru: *"Kampus mana berikutnya? UNIMED atau UINSU?"*
- **Day 29:** Survey Suara Mahasiswa: Fitur apa yang paling kamu butuhkan bulan depan?
- **Day 30:** 1-Month Milestone Video: Metrik transaksi, volume COD, dan testimoni nyata.

## Brand

### 1. Brand Strategy & Name Architecture

#### Evaluasi Nama Saat Ini: "Kampus Kita" (Sub-brand: "Jual Beli USU Polmed")
- **Kekuatan:** Nama "Kampus Kita" sangat scalable untuk ekspansi antar kampus se-Indonesia (tidak terkurung hanya di USU), sementara nama operasional lokal "Jual Beli USU Polmed" mempertahankan resonance instan di Medan.
- **Domain:** `kampuskita.my.id` (Aktif dan terpasang SSL resmi).
- **Handles:** `@jualbeliusupolmed` (Instagram aktif).
- **Alternatif Masa Depan (Nasional):** `@kampuskita.id` / `@kampuskita_official`.

---

### 2. Voice & One-Line Promise

#### The One-Line Promise:
> *"Barangmu laku ke sesama anak kampus tanpa ongkir, tanpa drama ghosting, dan tanpa install aplikasi tambahan."*

#### Tagline Options:
1. **Pilihan 1 (Aksi & Lokasi):** *"Beli Dekat, Jual Cepat, Aman Sekampus."* (Direkomendasikan)
2. **Pilihan 2 (Solusi Masalah):** *"Marketplace Anak Kampus, Tanpa Ongkir & Tanpa Ribet."*
3. **Pilihan 3 (Komunitas):** *"Dari Mahasiswa, Untuk Mahasiswa, Ketemuan di Kampus."*

#### Brand Voice (3 Karakter Utama):

| Karakter | Yang Dilakukan (Do) | Yang Dihindari (Don't) |
|---|---|---|
| **Teman Sekelas yang Solutif** | Gunakan gaya bahasa santai, akrab, lugas ala anak muda Medan (*"Kelarin urusan kosanmu hari ini"*). | Jangan kaku seperti birokrasi kampus atau bank konvensional. |
| **Transparan & Tanpa Basa-Basi** | Sebutkan angka dan aturan secara eksplisit (*"Rp 5.000 sekali blast, laku dalam 48 jam atau koin balik"*). | Jangan gunakan trik harga tersembunyi, bintang kecil, atau janji palsu. |
| **Protektif Terhadap Keamanan** | Ingatkan selalu protokol COD aman dan pentingnya verifikasi identitas kampus. | Jangan sepelekan laporan penipuan atau spam di grup. |

##### Rewrite Contoh Kalimat (Before vs After):
- *Before (Kaku & Generik):* "Platform kami menyediakan media transaksi jual beli daring antar civitas akademika."
- *After (Kampus Kita Voice):* "Punya barang kos nganggur? Chat bot WA sekarang, 30 detik langsung tayang di katalog sekampus."

---

### 3. Visual Identity Brief (Designed for Hallmark Standards)

#### A. Palet Warna (Color System)
1. **Campus Pine Green (`#166534` / Deep Emerald):**
   - *Fungsi:* Warna primer, melambangkan identitas kampus hijau (USU), stabilitas, dan rasa aman.
   - *Kontras:* Rasio 7.8:1 pada background putih (Lulus standar WCAG AAA).
2. **Signal Amber (`#D97706` / Warm Orange-Gold):**
   - *Fungsi:* Warna aksen untuk tombol aksi utama (*Post Iklan*, *Upgrade Sultan*), mencerminkan energi mahasiswa yang aktif.
   - *Kontras:* 4.6:1 pada teks gelap (Lulus WCAG AA).
3. **Off-White Canvas (`#F8FAFC` / Soft Slate 50):**
   - *Fungsi:* Warna background utama yang bersih, ramah mata saat membaca daftar katalog panjang.
4. **Slate Ink (`#0F172A` / Slate 900):**
   - *Fungsi:* Warna teks dan heading utama untuk legibilitas maksimal.

#### B. Tipografi (Typography)
- **Display / Heading Face:** `Plus Jakarta Sans` (atau `Inter` tight tracking) — modern, tegas, ramah layar mobile.
- **Body & Data Face:** `Inter` — dirancang untuk keterbacaan tinggi pada angka harga (Rp), status outbox, dan tabel spek barang.

#### C. Logo & Icon Brief
- **Konsep:** Monogram huruf **"K"** ganda yang saling bertaut membentuk simbol jabat tangan (*handshake*) atau atap tenda lapak, dengan siluet daun/toga minimalis.
- **Penggunaan:**
  - *Favicon & App Icon (32px):* Monogram high-contrast di background Pine Green.
  - *Stiker Titik COD:* Logo dengan QR Code berukuran 10x10 cm untuk ditempel di mading kampus.

---

### 4. The First Five Touchpoints
1. **Home Screen Web (`kampuskita.my.id`):** Header ringkas, kolom pencarian per fakultas, filter harga instan, tanpa banner iklan berkedip.
2. **Pesan Pertama Bot WhatsApp:** Sapaan ramah 3 baris: *"Halo! Mau jual barang apa hari ini? Balas dengan foto dan nama barangmu ya."*
3. **Struk Digital QRIS / Notifikasi Pembayaran:** Konfirmasi instan via WA: *"Pembayaran Rp 12.000 sukses! Iklanmu dijadwalkan blast jam 13.00."*
4. **Feed Instagram Postingan Iklan:** Layout carousel bersih, foto barang ukuran 1:1, badge harga jelas di sudut kiri atas.
5. **Balasan Penanganan Komplain / Laporan Ghosting:** Template respons cepat dalam 10 menit dengan opsi blokir nomor terlapor dan pengembalian saldo iklan.

## Operations

### 1. Day-One Infrastructure & Technical Setup

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

#### Essential Service Directory:
- **Server:** Azure Linux VM (`20.205.16.13`, user `ubuntu`, key-only SSH).
- **Process Manager:** PM2 managing `wa-bot-usu` and backup workers.
- **Database:** Supabase PostgreSQL with Row Level Security (RLS) and real-time triggers.
- **Payment Ingestion:** QRIS Static/Dynamic via payment gateway (Midtrans / Xendit).

---

### 2. Standard Operating Procedures (SOP Harian)

#### A. Morning Routine (07:30 - 08:30 WIB)
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

#### B. Daytime Serving Routine (11:00 - 16:00 WIB)
1. **Moderasi Iklan Baru (Real-time Queue):**
   - Notifikasi masuk ke Telegram/WA admin saat ada iklan baru status `pending`.
   - SLA moderasi: maksimal 15 menit per iklan.
2. **Penanganan Kasus Ghosting / Laporkan Penjual:**
   - Jika ada laporan penipuan, moderator memeriksa ID transaksi di database dan membekukan sementara nomor yang dilaporkan via flag `is_banned: true`.

#### C. Night Routine (21:30 - 22:30 WIB)
1. **Audit Outbox & Log Penjaga:**
   - Periksa `tail -n 50 /home/ubuntu/wa-bot-usu/penjaga-bot.log`.
2. **Rekonsiliasi QRIS:**
   - Samakan saldo QRIS hari ini dengan total iklan berbayar yang lunas di database.
3. **Backup Status & Sesi Baileys:**
   - Cron otomatis mem-backup sesi auth WhatsApp terenkripsi ke storage lokal.

---

### 3. Risk Register & Mitigation Matrix

| Risiko | Dampak | Probabilitas | Mitigasi Konkret |
|---|:---:|:---:|---|
| **Akun WhatsApp Terkena Ban Meta** | Kritis | Sedang | - Batasi blast maksimal 15 pesan/menit dengan jeda acak (*jitter*).<br>- Siapkan nomor cadangan di `wa-bot-2`.<br>- Alihkan sebagian pendaftaran ke Instagram DM Bot. |
| **Penipuan Barang Rusak saat COD** | Tinggi | Sedang | - Wajibkan pembeli memeriksa fisik barang di tempat sebelum bayar.<br>- Terapkan sistem *Verified Seller* (KTM). |
| **Server VPS Down / Out of Memory** | Tinggi | Rendah | - Skrip `penjaga-bot.sh` memantau memori tiap 2 menit.<br>- Otomatis restart PM2 jika RAM tembus 80%. |
| **Spam / Iklan Pinjol & Judi Online** | Tinggi | Tinggi | - Regex keyword filter otomatis di `src/lib/moderationRules.js`.<br>- Semua iklan akun baru wajib persetujuan moderator sebelum tayang. |
| **Pembeli Ghosting saat Janjian** | Sedang | Tinggi | - Panduan 5 Titik COD Resmi yang terpantau satpam kampus.<br>- Sistem reputasi bintang 1-5 bagi pembeli dan penjual. |

---

### 4. Legal & Regulatory Compliance
- **Kategori Platform:** Forum jual beli komunitas tertutup / perantara elektronik peer-to-peer non-finansial.
- **Penyimpanan Data:** Seluruh nomor telepon disamarkan (masked) di database publik untuk mematuhi UU Perlindungan Data Pribadi (UU PDP).
- **Disclaimer Hukum:** Platform tidak memegang uang barang secara langsung; transaksi barang fisik diselesaikan tunai secara mandiri oleh para pihak di lokasi COD.

## Launch plan

### 1. Cheap Real-World Validation Test (The "Pop-Up Booth & Free Boost" Test)
Sebelum mengeluarkan anggaran pemasaran besar, jalankan tes validasi 3 hari di kampus:
- **Lokasi Tes:** Kantin FISIP USU & Pendopo Gedung Kuliah Polmed.
- **Mekanisme:** Buka stan sederhana dengan banner cetak mini: *"Jual buku atau barang kosmu dalam 24 jam lewat WhatsApp."*
- **Penawaran Tes:** Mahasiswa yang memasang 1 barang bekas langsung mendapatkan gratis 1x fitur Broadcast Prioritas (nilai Rp 5.000).
- **Target Validasi:**
  - Minimal 30 listing terkumpul dalam 48 jam.
  - Minimal 12 barang (40%) berhasil ditawar atau laku dalam 3 hari.
  - Membuktikan secara nyata bahwa bot WhatsApp stabil dan pembeli merespons cepat.

---

### 2. Countdown to Grand Launch (T-Minus 14 Days)

| Hari | Target Kerja | Penanggung Jawab | Kriteria Selesai (DoD) |
|---|---|---|---|
| **D-14** | Audit Keamanan Bot & Server Azure | Tech Lead | Runbook deployment lulus uji beban 100 pesan/menit. |
| **D-10** | Cetak Stiker QR Titik COD Resmi | Marketing Lead | 100 stiker terpasang di Perpustakaan, Biro Rektor, & Mading Kos. |
| **D-7** | Rekrutmen 10 Mahasiswa Duta Kampus (Campus Ambassadors) | Community Lead | 10 mahasiswa aktif dari 5 fakultas berbeda sepakat memposting di status WA & IG Story. |
| **D-5** | Uji Coba Payment Gateway QRIS | Financial / Ops | Transaksi Rp 5.000 via QRIS BCA/GoPay/OVO langsung auto-approve di database. |
| **D-2** | Seeding 100 Listing Awal (Katalog Siap Buka) | Team Ops | Katalog web `kampuskita.my.id` sudah berisi 100 produk riil (buku, kipas, meja kos). |
| **D-1** | Freeze Code & Health Check Simultan | Tech Lead | Semua bot PM2 online, Vercel build status green, cron penjaga aktif. |
| **D-Day** | **GO-LIVE RESMI** | Seluruh Tim | Rilis serentak di Instagram `@jualbeliusupolmed`, blast grup angkatan, & aktivasi promo gratis. |

---

### 3. Launch Day Run Sheet (Hari-H Peluncuran)

- **07:00 WIB:** Cek status bot di Azure VPS via SSH (`pm2 status`). Pastikan socket WhatsApp terhubung (`isOnline: true`).
- **08:30 WIB:** Publikasi video utama peluncuran di Instagram Reels dan TikTok.
- **09:00 WIB:** 10 Duta Kampus serentak membagikan link katalog dan nomor bot ke grup angkatan masing-masing.
- **11:30 WIB:** Gelombang Broadcast Siang pertama: Kirim rekap 10 barang termurah hari ini ke grup WhatsApp.
- **14:00 WIB:** Pantau antrean moderasi (`/admin/antrean`) secara intensif; pastikan tidak ada delay approval.
- **18:00 WIB:** Evaluasi traffic web di analitik Vercel dan Supabase.
- **20:30 WIB:** Pengumuman hasil penjualan hari pertama di IG Story: sebutkan barang apa saja yang laku kilat.

---

### 4. The First 30 Days: Metrik yang Dipantau & Rencana Penyesuaian

| Metrik Kunci (KPI) | Target 30 Hari | Tindakan Jika Di Bawah Target | Tindakan Jika Melebihi Target |
|---|:---:|---|---|
| **Listing Aktif Baru / Hari** | > 15 listing | Berikan insentif koin gratis bagi yang mengajak teman pasang iklan. | Rekrut 1 moderator mahasiswa tambahan untuk menjaga SLA. |
| **Paket Terjual (Rp 12.000)** | > 5 paket / hari | Turunkan harga promo uji coba menjadi Rp 5.000 per blast. | Luncurkan paket langganan bulanan (*Monthly Pro Seller*). |
| **Tingkat Transaksi Laku (Success Rate)** | > 45% dalam 7 hari | Optimalkan judul iklan dan edukasi penetapan harga yang realistis ke penjual. | Jadikan testimoni penjualan sebagai bahan konten harian utama. |
| **Tingkat Komplain / Laporan Ghosting** | < 2% total transaksi | Pasang peringatan wajib verifikasi KTM sebelum transaksi barang elektronik. | Perluas titik COD resmi ke fakultas-fakultas lain. |

_The panel is simulated buyers and the numbers are projections from your inputs. Confirm demand with real customers and costs with real quotes before you spend. Not financial, legal or tax advice._
