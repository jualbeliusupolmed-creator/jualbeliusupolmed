# Security Policy

## Supported Versions

We actively support the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | ✅ Yes             |
| < 1.0   | ❌ No              |

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, report them privately via one of these channels:

1. **GitHub Security Advisories** (preferred):  
   Go to the [Security tab](../../security/advisories/new) and create a private advisory.

2. **Email**: security@kampuskita.my.id

Include the following details:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fix (if you have one)

## Response Timeline

| Stage | Target |
|-------|--------|
| Initial acknowledgment | ≤ 48 hours |
| Triage & severity assessment | ≤ 5 business days |
| Fix development (critical) | ≤ 7 days |
| Fix development (high) | ≤ 14 days |
| Fix development (medium/low) | ≤ 30 days |
| Public disclosure (after fix) | Coordinated with reporter |

## Security Architecture Overview

This project implements defense-in-depth:

### Authentication & Authorization
- **Admin sessions**: HMAC-SHA256 signed cookies (1h TTL), timing-safe comparison
- **Seller sessions**: HMAC-SHA256 signed cookies (30d TTL), separate secret from admin
- **Key rotation**: `SESSION_SECRET_PREVIOUS` supports seamless rotation
- **Supabase Auth**: Admin login via individual Supabase Auth accounts (not shared password)

### Database Security (Supabase)
- **Row Level Security (RLS)** enabled on all 15+ tables
- **Anon key** (client): restricted by RLS policies — only `active`/`sold` listings, public profiles
- **Service Role key** (server-only): bypasses RLS, used only in API routes via `getAdminClient()`
- **No anon access** to sensitive tables: `payments`, `reports`, `blacklist`, `price_offers`, `settings`, `otps`, `push_subscriptions`

### API Protection
- **Rate limiting**: IP-based (10 req/10min for listings, 5 req/min for admin login)
- **Honeypot fields**: Hidden form fields detect bots
- **HMAC webhook verification**: Instagram webhooks verified via `x-hub-signature-256`
- **Input validation**: Zod schemas on all public endpoints
- **File upload validation**: Magic bytes check, 8MB limit, type allowlist

### Anti-Fraud
- **Receipt hash deduplication**: SHA-256 of receipt images prevents reuse
- **Synthetic ID rejection**: `formatWa()` rejects `email_*`, `google_*` patterns
- **Blacklist double-check**: Both session WA and form WA verified
- **Receiver name verification**: AI vision confirms payment recipient matches official account

### Secrets Management
- All secrets in Vercel Environment Variables / Supabase Dashboard
- `.env*` files in `.gitignore`
- Bot session files (`auth_info_baileys/`, `*.json`) gitignored
- No secrets in source code or git history (verified)

## Secure Development Practices

- **Dependencies**: `npm audit` in CI, Dependabot alerts enabled
- **Code scanning**: CodeQL workflow on every PR
- **Secret scanning**: GitHub secret scanning + push protection enabled
- **Lockfile**: `package-lock.json` committed, `npm ci` in CI
- **Actions**: Pinned to SHA where possible

## Disclosure Policy

We follow coordinated vulnerability disclosure. We ask reporters to allow us reasonable time to investigate and fix before public disclosure. We will credit reporters (unless they request anonymity) in the security advisory.

## Contact

For security questions (not vulnerability reports):  
Open a [Discussion](../../discussions/categories/security) in the Security category.