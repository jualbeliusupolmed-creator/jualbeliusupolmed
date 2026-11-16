---
title: "[Good First Issue] Add integration test for full listing creation flow"
labels: ["good-first-issue", "test", "integration"]
assignees: ""
---

## Description
Add an end-to-end integration test covering the complete listing creation flow: form submission → moderation → database → response.

## Acceptance Criteria
- [ ] Test file: `__tests__/integration/listing-creation.test.ts`
- [ ] Uses Vitest + Testing Library + MSW (Mock Service Worker) for API mocking
- [ ] Covers happy path:
  - [ ] Valid form data submitted
  - [ ] Moderation passes (mock Gemini)
  - [ ] Listing inserted via Service Role
  - [ ] Success response returned
- [ ] Covers error paths:
  - [ ] Validation error (Zod)
  - [ ] Moderation rejected (deterministic)
  - [ ] Moderation rejected (AI)
  - [ ] Unauthorized (no session)
  - [ ] Rate limited
- [ ] Test runs in CI (`npm run test`)
- [ ] No flaky tests

## Files to Create
- `__tests__/integration/listing-creation.test.ts`
- `__tests__/mocks/handlers.ts` (MSW handlers)

## Files to Reference
- `src/app/api/listings/route.js` — API handler
- `src/lib/moderationRules.js` — moderation logic
- `src/lib/listingSchema.js` — validation

## Setup MSW
```bash
npm install --save-dev msw @testing-library/react
```

```typescript
// vitest.setup.mjs (add)
import { beforeAll, afterAll, afterEach } from 'vitest'
import { server } from './mocks/server'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

## Estimated Effort
**L** (8-12 hours)

## Verification
```bash
npm run test __tests__/integration/listing-creation.test.ts
# All tests pass
npm run test:coverage
# Coverage increased for route.js
```