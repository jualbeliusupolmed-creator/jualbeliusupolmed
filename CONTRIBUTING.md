# Contributing to Kampus Kita

Thank you for your interest in contributing! This guide will help you get started.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Commit Message Convention](#commit-message-convention)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Coding Standards](#coding-standards)
- [Architecture Overview](#architecture-overview)
- [Need Help?](#need-help)

---

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold this code. Please report unacceptable behavior to conduct@kampuskita.my.id.

---

## Getting Started

### Prerequisites
- Node.js 22+ (LTS)
- npm 10+
- Supabase account (for database)
- Git

### Local Setup (5 minutes)

```bash
# 1. Fork & clone
git clone https://github.com/YOUR_USERNAME/jualbeliusupolmed.git
cd jualbeliusupolmed

# 2. Install dependencies
npm ci

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials (see .env.example comments)

# 4. Set up Supabase (one-time)
# - Create project at supabase.com
# - Run migration: supabase/migration_semua_sekali_jalan.sql in SQL Editor
# - Run RLS migration: supabase/migration_rls_kunci_publik.sql

# 5. Start development
npm run dev
# Open http://localhost:3000
```

### Docker (Alternative)

```bash
docker compose up -d
# App at http://localhost:3000
# Postgres at localhost:5432
```

---

## Development Workflow

1. **Create an issue first** — Discuss the change before implementing (except trivial fixes)
2. **Branch from `main`** — `git checkout -b feat/your-feature` or `fix/your-fix`
3. **Make small, focused commits** — One logical change per commit
4. **Run quality checks locally**:
   ```bash
   npm run lint      # ESLint + Prettier
   npm run test      # Vitest (372 tests)
   npm run build     # Next.js production build
   ```
5. **Push and open PR** — Fill the PR template completely
6. **Address review feedback** — Keep PR up to date with `main`

---

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code restructure, no behavior change |
| `perf` | Performance improvement |
| `test` | Adding/updating tests |
| `chore` | Maintenance, deps, build config |
| `security` | Security fix |
| `ci` | CI/CD changes |

### Scopes (examples)
- `web` — Next.js web app
- `bot` — WhatsApp bot (bot-wa/)
- `db` — Database migrations
- `auth` — Authentication/authorization
- `payments` — Payment flows
- `moderation` — Content moderation
- `admin` — Admin panel

### Examples
```
feat(web): add campus selector to listing form

fix(auth): prevent session fixation on login

docs(readme): add Docker setup instructions

refactor(db): normalize campus config to single source

security(api): add rate limit to verify-receipt endpoint

test(fees): add edge cases for distributor fee calculation
```

---

## Pull Request Process

1. **PR Title**: Follow Conventional Commits (e.g., `feat(web): add multi-campus config`)
2. **Description**: Fill the PR template — link issue, describe changes, add screenshots
3. **Checks must pass**: Lint, TypeScript, Tests, Build
4. **Review**: At least 1 approval required (CODEOWNERS for sensitive paths)
5. **Merge**: Squash and merge to `main` (linear history)

### PR Size Guidelines
- **Small** (< 200 lines): Preferred, fast review
- **Medium** (200–500 lines): OK with good description
- **Large** (> 500 lines): Split into multiple PRs

---

## Testing

### Run All Tests
```bash
npm run test           # Unit + integration (Vitest)
npm run test:coverage  # With coverage report
```

### Write Tests For
- New utility functions (`src/lib/`)
- API route handlers (`src/app/api/`)
- Business logic (fees, moderation, payments)
- React components with complex behavior

### Test Patterns
```javascript
// src/lib/fees.test.js
import { describe, it, expect } from 'vitest'
import { adFeeFrom } from './fees'

describe('adFeeFrom', () => {
  it('returns 0 for free mode', () => {
    expect(adFeeFrom({ freeMode: true }, 'barang', 10000)).toBe(0)
  })
})
```

---

## Coding Standards

### TypeScript (Strict Mode)
- All new code: `.ts` / `.tsx`
- Enable `strict: true` in `tsconfig.json`
- No `any` — use proper types or `unknown`
- Prefer `interface` over `type` for object shapes

### ESLint + Prettier
```bash
npm run lint   # Check
npm run lint -- --fix  # Auto-fix
```

### File Organization
```
src/
  app/           # Next.js App Router pages & API routes
  components/    # React components (shared)
  lib/           # Business logic, utilities, clients
  config/        # Campus/app configuration (NEW)
```

### Naming
- Files: `kebab-case.tsx` (components), `camelCase.ts` (utils)
- Components: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`

### Error Handling
- Use structured errors with codes: `throw new AppError('CODE', 'message', status)`
- Never swallow errors silently — log with context
- API routes: return consistent error shape `{ error, code?, details? }`

### Logging
- Use `src/lib/logger.ts` (pino wrapper) — not `console.*`
- Levels: `debug`, `info`, `warn`, `error`
- Include correlation IDs for request tracing

---

## Architecture Overview

### Key Directories
| Path | Purpose |
|------|---------|
| `src/app/` | Next.js 14 App Router (pages, layouts, API routes) |
| `src/components/` | Reusable React components |
| `src/lib/` | Core logic: auth, fees, moderation, Supabase clients, upload |
| `src/config/` | **NEW**: Campus/app configuration (single source of truth) |
| `supabase/` | SQL migrations, schema, seeds |
| `bot-wa/` | WhatsApp bot (Baileys, runs on VPS) |

### Data Flow (Listing Creation)
```
Client (JualClient.jsx)
  → POST /api/listings (rate limit, auth, Zod validation)
  → Moderation: deterministic → Gemini AI
  → DB: insert via Service Role (bypass RLS)
  → Async: WA broadcast, IG publish, push notifications, subscriber alerts
```

### Security Model
- **RLS**: All tables protected; anon key reads only public data
- **Service Role**: Server-only (`getAdminClient()`), never in client components
- **Auth**: HMAC-signed cookies, timing-safe comparison, separate secrets
- **Rate Limit**: Per-IP, configurable windows

---

## Campus Configuration (Multi-Campus Support)

**All campus-specific values live in `src/config/campus.ts`**:

```typescript
// src/config/campus.ts
export const campusConfig = {
  name: 'Kampus Kita',
  domain: 'kampuskita.my.id',
  defaultCampus: 'usu',
  campuses: [
    { id: 'usu', name: 'Universitas Sumatera Utara', shortName: 'USU', provinceId: 'sumatera-utara' },
    { id: 'polmed', name: 'Politeknik Negeri Medan', shortName: 'POLMED', provinceId: 'sumatera-utara' },
  ],
  // ... fees, branding, WhatsApp groups, etc.
}
```

**To fork for another campus**: Copy this file, change values, deploy. No grep/replace needed.

---

## Need Help?

- **Questions**: Open a [Discussion](../../discussions/categories/q-a)
- **Bugs**: Use the [Bug Report template](../../issues/new?template=bug_report.md)
- **Features**: Use the [Feature Request template](../../issues/new?template=feature_request.md)
- **Security**: See [SECURITY.md](SECURITY.md) — private reporting only
- **General**: Tag `@maintainers` in issue/PR

---

## Recognition

Contributors are recognized in:
- `CONTRIBUTORS.md` (auto-generated from commits)
- Release notes
- GitHub contributor graph

Thank you for making Kampus Kita better! 🎓