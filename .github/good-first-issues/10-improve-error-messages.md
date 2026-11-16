---
title: "[Good First Issue] Improve user-facing error messages across the app"
labels: ["good-first-issue", "ux", "frontend", "backend"]
assignees: ""
---

## Description
Audit and improve all user-facing error messages to be clear, actionable, and consistent in Indonesian.

## Acceptance Criteria
- [ ] Audit all error messages in:
  - API routes (`src/app/api/**/route.js`)
  - Client components (toast notifications)
  - Form validation (Zod schemas)
- [ ] Apply consistent pattern:
  - **What happened** (1 sentence, plain Indonesian)
  - **What user can do** (1 actionable sentence)
  - **Error code** (for support reference)
- [ ] Remove technical jargon (SQL errors, stack traces, internal codes)
- [ ] Ensure toast notifications use `sonner` consistently
- [ ] Test error flows manually

## Before/After Examples

| Context | Before | After |
|---------|--------|-------|
| Validation | "Data iklan tidak lengkap atau tidak valid." | "Judul iklan wajib diisi. Silakan isi judul dan coba lagi." (Code: VAL_001) |
| Auth | "Sesi tidak valid atau telah berakhir." | "Sesi login Anda sudah berakhir. Silakan login kembali." (Code: AUTH_001) |
| Payment | "Tagihan belum dapat dibuat." | "Gagal membuat tagihan QRIS. Coba lagi dalam beberapa saat atau hubungi admin." (Code: PAY_001) |
| Moderation | "Iklan tidak lolos moderasi: Barang terlarang" | "Iklan Anda tidak bisa dipasang karena berisi barang terlarang. Periksa ketentuan komunitas." (Code: MOD_001) |

## Files to Modify
- `src/lib/jawabGalat.js` — central error handler
- `src/app/api/listings/route.js` — error responses
- `src/app/api/payments/**/route.js` — payment errors
- `src/lib/listingSchema.js` — Zod error messages
- `src/app/jual/JualClient.jsx` — toast messages
- All other API routes

## Estimated Effort
**M** (4-6 hours)

## Verification
```bash
npm run dev
# Test each error flow:
# - Submit empty form
# - Submit invalid WA
# - Trigger rate limit
# - Test with expired session
# Verify messages are clear and actionable
npm run test
npm run lint
```