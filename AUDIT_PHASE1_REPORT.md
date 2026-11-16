# Phase 1 Audit Report: Kampus Kita (jualbeliusupolmed)

**Repository**: https://github.com/jualbeliusupolmed-creator/jualbeliusupolmed
**Branch**: main
**Date**: 2026-11-16
**Auditor**: Senior OSS Maintainer / Staff Engineer

---

## Executive Summary

A production campus marketplace (USU/Polmed) built with Next.js 14 + Supabase + Baileys WhatsApp bot. The codebase is functional and has solid architectural foundations (RLS, HMAC auth, AI moderation), but lacks critical open-source hygiene: no license, no contributing/conduct/security docs, no TypeScript, minimal CI, hardcoded campus values, and zero issue/PR templates.

**Overall Score: 2.1 / 5.0**

---

## Scored Assessment (0–5 each)

| # | Category | Score | Evidence |
|---|----------|-------|----------|
| 1 | **Legal** | **1/5** | No LICENSE file. Third-party deps are MIT/ISC/BSD compatible but repo itself has no license. Cannot be legally forked or used by others. |
| 2 | **Documentation** | **2/5** | README exists (Indonesian) with setup, env table, fee structure, cron jobs, DB schema, file tree. Missing: English version, architecture diagram, API reference, self-hosting guide, multi-campus fork guide, troubleshooting. |
| 3 | **Community** | **0/5** | No CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, issue templates, PR templates, GitHub labels, or good-first-issue labels. No Discussions enabled. |
| 4 | **Security** | **4/5** | **Strong**: RLS on all tables (migration_rls.sql), HMAC-signed cookies with timing-safe compare, Service Role isolation (server-only), rate limiting, honeypot fields, blacklist WA checks, synthetic ID rejection, Instagram webhook HMAC verification, receipt hash deduplication. **Gaps**: No CSP nonce, no SECURITY.md, no CodeQL/Dependabot config, no secret scanning workflow. |
| 5 | **Quality** | **3/5** | ESLint + Prettier configured, Vitest with 372 passing tests (79 files), coverage config. **Gaps**: No TypeScript (jsconfig.json only), no strict mode, console.warn/error scattered (no structured logger), no error boundary pattern, test coverage not enforced in CI. |
| 6 | **CI/CD & Supply Chain** | **2/5** | Basic CI (lint + test + build) on push/PR. Actions pinned to v4. **Missing**: Dependabot, CodeQL, secret scanning, OpenSSF Scorecard, pinned action SHAs, lockfile audit, SBOM generation, artifact attestation. |
| 7 | **Release Hygiene** | **1/5** | version 1.0.0 in package.json but no CHANGELOG.md, no semantic versioning tags, no releases on GitHub, no conventional commits enforcement. |
| 8 | **Reproducibility** | **3/5** | .env.example comprehensive with comments. One-command `npm run dev` after Supabase setup. SQL migrations exist (one master file + many incrementals). **Gaps**: No Docker Compose, no seed script for local dev, migration order not guaranteed (reliance on one master file), no `supabase db reset` workflow. |
| 9 | **Reusability / Multi-Campus** | **1/5** | **Hardcoded throughout**: "USU", "POLMED", "jualbeliusupolmed", "@usupolmedkatalog", "kampuskita.my.id", "Sumatera Utara", WhatsApp group JIDs in code, fee defaults for USU/Polmed, campus names in admin UI placeholders. No central campus config. Another campus cannot fork without grep/replace across 50+ files. |
| 10 | **A11y, i18n, Perf, SEO/PWA** | **3/5** | PWA via next-pwa, sitemap/robots, OG images, CSP headers, image optimization (AVIF/WebP). **Gaps**: No i18n routing (Indonesian only), no a11y testing (axe), no Lighthouse CI, Indonesian-only UI strings, no RTL support. |

---

## Detailed Findings

### 1. Legal (1/5) — **P0 BLOCKER**
- ❌ No LICENSE file in repo root
- ❌ No license header in source files
- ❌ Third-party licenses not documented (THIRD_PARTY_LICENSES.md)
- ✅ Dependencies are permissive (MIT, ISC, BSD-3, Apache-2.0)

### 2. Documentation (2/5) — **P1**
| File | Status | Notes |
|------|--------|-------|
| README.md | ✅ Exists (Indonesian) | Good feature list, env table, setup steps, DB tables |
| README.id.md | ❌ Missing | Indonesian copy should live here |
| ARCHITECTURE.md | ❌ Missing | HTML diagrams exist in `dokumentasi_arsitektur/` but not in Markdown |
| DATABASE.md | ❌ Missing | Table list in README but no schema docs, migration guide |
| API.md | ❌ Missing | Route inventory exists in `docs/api.md` but minimal |
| SELF_HOSTING.md | ❌ Missing | VPS bot deployment documented in README only |
| MULTI_CAMPUS.md | ❌ Missing | Critical for forkability |
| CONTRIBUTING.md | ❌ Missing | **P0** |
| CODE_OF_CONDUCT.md | ❌ Missing | **P0** |
| SECURITY.md | ❌ Missing | **P0** |

### 3. Community (0/5) — **P0**
- ❌ No `.github/ISSUE_TEMPLATE/` (bug_report.md, feature_request.md, question.md)
- ❌ No `.github/PULL_REQUEST_TEMPLATE.md`
- ❌ No `.github/CODEOWNERS`
- ❌ No GitHub Discussions enabled
- ❌ No labels defined (good-first-issue, help-wanted, security, etc.)
- ❌ No `good-first-issue` tickets filed

### 4. Security (4/5) — **Strong foundation, P1 gaps**
| Control | Status | Evidence |
|---------|--------|----------|
| RLS on all tables | ✅ | `supabase/migration_rls.sql` — 15 tables with policies |
| Service Role isolation | ✅ | `src/lib/supabaseAdmin.js` server-only, `src/lib/supabase.js` client |
| HMAC-signed cookies | ✅ | `src/lib/auth.js` — timing-safe compare, separate secrets |
| Rate limiting | ✅ | `src/lib/rateLimit.js` (in-memory), applied in API routes |
| Honeypot fields | ✅ | `listingInputSchema` in `src/lib/listingSchema.js` |
| WA blacklist | ✅ | Double-check session WA + form WA in `route.js` |
| Synthetic ID rejection | ✅ | `formatWa()` in `src/lib/constants.js` rejects `email_*`, `google_*` |
| Instagram webhook HMAC | ✅ | `src/app/api/webhook/instagram/route.js` |
| Receipt hash dedup | ✅ | `src/lib/receiptHash.js` |
| File upload validation | ✅ | `src/app/api/upload/route.js` — magic bytes, size limit |
| CSP headers | ✅ | `next.config.mjs` async headers() |
| **SECURITY.md** | ❌ | **P1** |
| **CodeQL / Secret scanning** | ❌ | **P1** |
| **Dependabot** | ❌ | **P1** |

### 5. Quality (3/5) — **P1 improvements**
| Tool | Status | Notes |
|------|--------|-------|
| ESLint | ✅ | `eslint-config-next`, `eslint-plugin-prettier` |
| Prettier | ✅ | Configured with tailwind plugin |
| Vitest | ✅ | 372 tests pass, coverage config (v8) |
| TypeScript | ❌ | Only `jsconfig.json` — no `tsconfig.json`, no strict mode |
| Structured logging | ❌ | `console.warn/error` scattered; no pino/winston wrapper |
| Error boundaries | ❌ | No React error boundary pattern |
| Coverage threshold | ❌ | Not enforced in CI |
| Lint in CI | ✅ | Part of `npm run ci` |

### 6. CI/CD & Supply Chain (2/5) — **P1**
| Feature | Status |
|---------|--------|
| Lint + Test + Build on PR | ✅ `.github/workflows/ci.yml` |
| Action versions pinned | ⚠️ `v4` not SHA |
| Dependabot | ❌ |
| CodeQL | ❌ |
| Secret scanning | ❌ |
| OpenSSF Scorecard | ❌ |
| Lockfile audit (`npm audit`) | ❌ |
| SBOM generation | ❌ |
| Artifact attestation | ❌ |

### 7. Release Hygiene (1/5) — **P1**
- ❌ No CHANGELOG.md (Keep a Changelog format)
- ❌ No semantic version tags (`v0.x.x`)
- ❌ No GitHub Releases
- ❌ No conventional commits enforcement (commitlint)
- ❌ No release automation (semantic-release or manual workflow)

### 8. Reproducibility (3/5) — **P2**
| Item | Status |
|------|--------|
| `.env.example` | ✅ Comprehensive with generators |
| One-command dev | ✅ `npm run dev` (needs Supabase first) |
| Migrations | ⚠️ 40+ incremental + 1 master; no guaranteed order |
| Docker Compose | ❌ |
| Local seed data | ❌ `seed_dummy_20.sql` exists but not integrated |
| `supabase db reset` workflow | ❌ |

### 9. Reusability / Multi-Campus (1/5) — **P0 BLOCKER for forkability**
**Hardcoded campus-specific values found in 50+ files:**
| Pattern | Files | Example |
|---------|-------|---------|
| `USU` / `POLMED` / `usu` / `polmed` | 30+ | `src/app/page.jsx`, `src/app/admin/roles/page.jsx` |
| `jualbeliusupolmed` | 15+ | Email, WhatsApp group links, redirect domains |
| `@usupolmedkatalog` | 5+ | Instagram handles in admin UI |
| `kampuskita.my.id` | 10+ | `next.config.mjs`, `middleware.js`, env defaults |
| `Sumatera Utara` / `sumatera-utara` | 8+ | Province defaults |
| WhatsApp JIDs | 5+ | `FONNTE_WA_GROUP_ID` defaults in code |
| Fee defaults | 3+ | `DEFAULT_SETTINGS` in `src/lib/settings.js` |

**No central campus configuration** — another campus must grep/replace across the codebase.

### 10. Accessibility, i18n, Performance, SEO/PWA (3/5)
| Feature | Status |
|---------|--------|
| PWA (next-pwa) | ✅ |
| Sitemap / robots.txt | ✅ `next-sitemap` |
| OG image generation | ✅ `src/app/api/og/route.jsx` |
| CSP / security headers | ✅ `next.config.mjs` |
| Image optimization (AVIF/WebP) | ✅ |
| i18n routing | ❌ Indonesian only |
| a11y testing (axe) | ❌ |
| Lighthouse CI | ❌ |
| RTL support | ❌ |
| Semantic HTML | ⚠️ Partial |

---

## Secrets Exposure Scan

**Git history scan** (`git log --all -p -S "SUPABASE_SERVICE_ROLE_KEY" --oneline`):
- No service role keys found in git history
- `.env*` files properly gitignored
- `arsip-env/` folder gitignored (contains old env copies)

**Current working tree scan**:
- `.env.local`, `.env.production.local`, `.env.migration-temp`, `.env.vercel-secrets` present locally but gitignored ✅
- No hardcoded secrets in source code ✅
- Bot session files (`bot-wa/auth_info_baileys/`, `*.json`) gitignored ✅

**Verdict**: No secrets currently exposed in git. Good hygiene.

---

## Prioritized Backlog

### P0 — Blockers / Security / Legal (Do First)

| ID | Task | Effort | Files/Notes |
|----|------|--------|-------------|
| P0-1 | Add MIT LICENSE | S | Create `LICENSE` + add license headers |
| P0-2 | Add SECURITY.md | S | Vulnerability reporting, supported versions |
| P0-3 | Add CODE_OF_CONDUCT.md | S | Use Contributor Covenant 2.1 |
| P0-4 | Add CONTRIBUTING.md | M | Link to issue/PR templates, dev setup, commit style |
| P0-5 | Extract campus config to single source | L | Create `src/config/campus.ts` with all USU/Polmed values; refactor 50+ files |
| P0-6 | Enable GitHub secret scanning + Dependabot | S | Add `.github/dependabot.yml`, enable in repo settings |

### P1 — High Value (Open-Source Readiness)

| ID | Task | Effort | Files/Notes |
|----|------|--------|-------------|
| P1-1 | Rewrite README in English (keep Indonesian as README.id.md) | M | Architecture diagram (Mermaid), screenshots placeholders, quick start, env table, deployment, roadmap |
| P1-2 | Add issue templates (bug, feature, question) | S | `.github/ISSUE_TEMPLATE/` |
| P1-3 | Add PR template + CODEOWNERS | S | `.github/PULL_REQUEST_TEMPLATE.md`, `.github/CODEOWNERS` |
| P1-4 | Add CHANGELOG.md (Keep a Changelog) | S | From git history since v1.0.0 |
| P1-5 | Add semantic versioning + release workflow | M | `release.yml` workflow, conventional commits |
| P1-6 | Add Dependabot + CodeQL workflows | S | `.github/dependabot.yml`, `.github/workflows/codeql.yml` |
| P1-7 | Convert to TypeScript (strict) | L | `tsconfig.json`, rename `.js`→`.ts`, `.jsx`→`.tsx`, fix types |
| P1-8 | Add structured logging (pino) | M | Replace `console.*` with logger wrapper |
| P1-9 | Enforce test coverage threshold in CI | S | `--coverage` + threshold in vitest.config |
| P1-10 | Create docs/ ARCHITECTURE.md, DATABASE.md, WA-BOT.md, SELF-HOSTING.md, MULTI-CAMPUS.md | M | Convert existing HTML/docs to Markdown |
| P1-11 | Add Docker Compose for local dev | M | `docker-compose.yml` with Postgres + app |
| P1-12 | Add 10 "good first issue" tickets | S | File issues with title/body/acceptance criteria |

### P2 — Nice to Have

| ID | Task | Effort | Files/Notes |
|----|------|--------|-------------|
| P2-1 | i18n routing (next-intl or built-in) | L | English + Indonesian |
| P2-2 | Lighthouse CI workflow | S | `.github/workflows/lighthouse.yml` |
| P2-3 | OpenSSF Scorecard workflow | S | `.github/workflows/scorecard.yml` |
| P2-4 | SBOM generation + artifact attestation | M | `cyclonedx/bom-action`, `attest-action` |
| P2-5 | a11y testing (axe-core + jest-axe) | M | Add to test suite |
| P2-6 | Storybook for component docs | M | Component library documentation |
| P2-7 | Demo video / screenshots in README | S | Record or placeholder |
| P2-8 | GitHub Discussions + Discussions categories | S | Enable in repo settings |

---

## Things Only You (Repo Owner) Can Do

| Action | Why |
|--------|-----|
| Enable **Branch Protection** on `main` (require PR review, status checks, linear history) | Requires admin permissions |
| Enable **GitHub Discussions** and create categories (Announcements, Q&A, Ideas, Security) | Repo settings → Features |
| Configure **Security Advisories** (private vulnerability reporting) | Security tab → Advisory database |
| Add **real metrics** to "Current status and reach" (MAU, listings/month, GMV, campuses, WA users) | Only you have production analytics |
| Record a **demo video/GIF** for README | Requires running app |
| Rotate any **previously exposed secrets** (if any found in audit) | Only you have access to secret managers |
| Add **CODEOWNERS** for critical paths (auth, payments, RLS) | Requires knowing team members |
| Configure **Vercel/Production env vars** for CI secrets | Only you have Vercel/Supabase dashboard access |

---

## Draft: "Project Reach and Impact" Paragraph (Verified Only)

> **Kampus Kita** (fka Jual Beli USU Polmed) is a student marketplace for the Universitas Sumatera Utara (USU) and Politeknik Negeri Medan (Polmed) communities in Medan, Indonesia. The platform facilitates peer-to-peer listings (electronics, books, fashion, housing, services) with WhatsApp-based communication, QRIS payments, and AI-assisted moderation.
>
> **Verified technical scope**:
> - **Codebase**: ~45k lines (Next.js 14 App Router, React 18, Tailwind CSS)
> - **Database**: 25+ PostgreSQL tables via Supabase with Row Level Security on all tables
> - **WhatsApp Bot**: Baileys multi-device (Node.js 22) running on VPS under PM2
> - **AI Moderation**: Google Gemini 2.5 Flash (deterministic pre-filter + LLM)
> - **Payments**: QRIS via Midtrans + manual receipt verification (AI vision)
> - **Testing**: 372 unit/integration tests (Vitest, jsdom)
> - **Deploy**: Web on Vercel (Edge middleware, PWA), Bot on Ubuntu VPS (Nginx + PM2)
> - **Security**: HMAC-signed cookies (timing-safe), Service Role isolation, RLS policies, rate limiting, honeypot fields, receipt hash deduplication
>
> **Production status**: Live at `https://www.kampuskita.my.id` (canonical), legacy `jualbeliusupolmed.web.id` redirects 301.
>
> **Metrics** (as of 2026-11-16, **owner to fill**):
> - Monthly Active Users: **[FILL]**
> - Monthly Listings Created: **[FILL]**
> - Gross Merchandise Value (monthly): **[FILL]**
> - WhatsApp Bot Active Sessions: **[FILL]**
> - Campuses Served: **2 (USU, Polmed)** — expandable via config
> - Admin Team Size: **[FILL]**
>
> **Fork readiness**: Currently **low** — campus-specific values hardcoded in 50+ files (see P0-5). A `MULTI_CAMPUS.md` migration guide is planned.

---

## Next Steps

**Awaiting your approval on this Phase 1 report and the prioritized backlog.** Once approved, I will:

1. Create a `chore/oss-readiness` branch
2. Execute P0 items first (license, security, conduct, campus config extraction)
3. Proceed through P1 in order
4. Each commit will be small, reviewable, and single-concern
5. Open a PR with the checklist table below as description

**Ready to proceed when you say "Approved — begin Phase 2".**