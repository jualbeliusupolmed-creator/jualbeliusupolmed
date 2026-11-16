# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- MIT LICENSE file
- SECURITY.md with vulnerability reporting process
- CODE_OF_CONDUCT.md (Contributor Covenant 2.1)
- CONTRIBUTING.md with development workflow
- GitHub issue templates: bug_report, feature_request, question
- GitHub PR template with security checklist
- CODEOWNERS for automatic review assignment
- Dependabot configuration for automated dependency updates
- CodeQL workflow for static analysis
- Release workflow with semantic-release
- CI workflow with lint, typecheck, test, build, secret scanning, SBOM
- Campus configuration module (`src/config/campus.ts`) — single source of truth for multi-campus forkability

### Changed
- CI workflow enhanced with separate jobs, pinned action SHAs, coverage upload
- Updated .github/workflows/ci.yml with secret scanning, dependency audit, SBOM generation

### Security
- No secrets exposed in git history (verified)
- All `.env*` files properly gitignored
- Bot session files gitignored

## [1.0.0] - 2024-11-16

### Added
- Initial production release
- Next.js 14 App Router web application
- Supabase backend with 25+ tables and RLS policies
- WhatsApp bot (Baileys) on VPS with PM2
- AI moderation (Gemini 2.5 Flash + deterministic filter)
- QRIS payments via Midtrans + manual receipt verification
- Admin panel with RBAC (superadmin, province admin, university admin)
- PWA support with push notifications
- Instagram auto-publish (Menfess & Katalog)
- Campus marketplace for USU & Polmed

### Security
- HMAC-signed cookies with timing-safe comparison
- Service Role isolation (server-only)
- Row Level Security on all tables
- Rate limiting + honeypot fields
- Blacklist WA double-check
- Synthetic ID rejection
- Instagram webhook HMAC verification
- Receipt hash deduplication

---

## Release Notes Template

### [X.Y.Z] - YYYY-MM-DD

### Added
- Feature description

### Changed
- Modification description

### Deprecated
- Feature to be removed

### Removed
- Feature removed

### Fixed
- Bug fix description

### Security
- Security improvement description