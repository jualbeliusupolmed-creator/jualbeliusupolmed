---
title: "[Good First Issue] Add campus filter to marketplace page"
labels: ["good-first-issue", "frontend", "feature", "multi-campus"]
assignees: ""
---

## Description
Add a campus filter dropdown to `/jual-beli` marketplace page so users can filter listings by campus.

## Acceptance Criteria
- [ ] Add campus filter dropdown using `campusConfig.campuses` from `@/config/campus`
- [ ] Filter updates URL query param: `?campus=usu` or `?campus=polmed`
- [ ] Filter persists on page navigation
- [ ] Show "Semua Kampus" (All Campuses) as default option
- [ ] Integrate with existing `HomeBrowser` / listing fetch logic
- [ ] Mobile responsive

## Files to Modify
- `src/app/jual-beli/page.tsx` (or `MarketplaceBrowser` component)
- `src/lib/constants.ts` (if needed for campus list)
- Use `campusConfig` from `@/config/campus`

## Estimated Effort
**M** (4-6 hours)

## Implementation Hint
```tsx
import { campusConfig } from '@/config/campus'

const campuses = campusConfig.campuses
// Map to options: { value: 'all', label: 'Semua Kampus' }, { value: 'usu', label: 'USU' }, ...
```

## Verification
```bash
npm run dev
# Go to /jual-beli
# Select campus filter
# Verify URL updates and listings filter
npm run test
npm run lint
```