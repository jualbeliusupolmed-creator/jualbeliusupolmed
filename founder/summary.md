# Executive Summary: Kampus Kita

## 1. What the Business Is & Who It Is For
**Kampus Kita** is a hyper-local campus marketplace and automated chat-commerce engine that lets university students at USU, Polmed, and surrounding campuses buy, sell, and pre-order secondhand items and food without delivery fees or app installations. It operates seamlessly across an automated WhatsApp bot, Instagram DM, and high-speed web portal, facilitating trusted face-to-face transactions at designated campus meeting points.

---

## 2. Verdict & Key Economic Numbers
**Verdict: PROFITABLE**
- **Contribution Margin:** **94%** (Rp 11.326 net profit on every Rp 12.000 paid package).
- **Daily Break-Even:** Only **4 paid listing packages a day** covers all fixed infrastructure and moderator stipends (capacity is 100/day).
- **Year 1 Operating Profit:** Projected at **Rp 65.308.740** on Rp 83.880.000 total revenue, with initial capital fully paid back by Month 3.

---

## 3. Where the Board & Buyer Panel Aligned vs Disagreed
- **Alignment:** Both the Board of Directors and the 20-student Consumer Panel enthusiastically praised the zero-app WhatsApp/IG chat ingestion and hyper-local COD speed, recognizing that students hate bloated app downloads and expensive courier shipping fees.
- **Divergence:** While the Board worried about monetization resistance on micro-items, the Consumer Panel revealed that students are more than willing to pay Rp 5.000 to Rp 12.000 *if* it guarantees immediate visibility, verified student safety (KTM badge), and auto-bumps that prevent chat bury.

---

## 4. The Critical Risk & Tactical Mitigation
- **The Risk:** Unofficial WhatsApp Baileys session bans by Meta or server downtime could temporarily disconnect the primary distribution pipeline.
- **The Mitigation:** Hardened Azure Linux VPS with dual-instance failover (`wa-bot-2`), automatic cron watchdog (`penjaga-bot.sh`), strict randomized rate-limiting, and dual-channel ingestion through the official Instagram DM webhook.

---

## 5. Startup Capital Required & Immediate Next Step
- **Cash Needed to Self-Sustainability:** **Rp 1.585.660** (covers server costs, domain registration, and campus marketing).
- **The One Thing to Do This Week:** Deploy the **Hallmark-crafted landing page** on `kampuskita.my.id` and launch the 3-day validation pop-up booth at Kantin FISIP USU with 50 free priority boosts to seed initial liquidity.
