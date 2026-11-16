---
title: "[Good First Issue] Replace console.* with structured logger"
labels: ["good-first-issue", "refactor", "logging"]
assignees: ""
---

## Description
Replace scattered `console.log`, `console.warn`, `console.error` calls with the new structured logger (`src/lib/logger.ts`) for consistent, searchable logs.

## Acceptance Criteria
- [ ] Replace all `console.log` → `logger.debug` or `logger.info`
- [ ] Replace all `console.warn` → `logger.warn`
- [ ] Replace all `console.error` → `logger.error` (with Error object)
- [ ] Import logger: `import logger from '@/lib/logger'` or `createLogger({ component: 'xyz' })`
- [ ] Run `npm run lint` — no console.* warnings
- [ ] Tests still pass

## Files to Modify (from grep)
- `src/app/sitemap.js`
- `src/app/layout.jsx`
- `src/app/chat/page.jsx`
- `src/app/chat-wa/[id]/route.js`
- `src/app/auth/callback/route.js`
- `src/app/admin/listings/[slug]/page.jsx`
- `src/app/admin/AdminListingModal.jsx`
- `src/app/admin/BroadcastPanel.jsx`
- And more (search for `console\.`)

## Estimated Effort
**S** (2-3 hours)

## Example
```typescript
// Before
console.error("[admin/listings/[slug]] getData error:", err?.message)

// After
import { createLogger } from '@/lib/logger'
const logger = createLogger({ route: 'admin-listings-detail' })
logger.error({ err }, "Failed to load listing data")
```

## Verification
```bash
npm run lint
npm run test
```