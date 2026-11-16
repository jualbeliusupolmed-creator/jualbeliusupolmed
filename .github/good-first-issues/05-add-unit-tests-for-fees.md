---
title: "[Good First Issue] Add unit tests for fee calculation utilities"
labels: ["good-first-issue", "test", "backend"]
assignees: ""
---

## Description
Increase test coverage for fee calculation functions in `src/lib/fees.js` — critical for payment correctness.

## Acceptance Criteria
- [ ] Add tests for `adFeeFrom()` — listing, bump, featured, auto-bump, renew
- [ ] Add tests for `soldFeeFrom()` — percentage calculation
- [ ] Add tests for `featuredRateFrom()` — daily rate
- [ ] Add tests for `calcDistributorFee()` (in `src/lib/distributor.js`) — tiered rules
- [ ] Test edge cases: free mode, pro user, distributor, zero price
- [ ] Target: 100% coverage for `src/lib/fees.js` and `src/lib/distributor.js`
- [ ] All tests pass: `npm run test`

## Files to Modify
- `src/lib/fees.test.js` (extend existing)
- `src/lib/distributor.test.js` (create new)

## Current Coverage
Run `npm run test:coverage` to see current coverage for these files.

## Estimated Effort
**M** (4-6 hours)

## Example Test
```javascript
// src/lib/fees.test.js
import { describe, it, expect } from 'vitest'
import { adFeeFrom, soldFeeFrom } from './fees'

describe('adFeeFrom', () => {
  const pricing = { listing: 2000, bump: 2000, featuredPerDay: 5000, autoBump7Days: 15000, renew: 2000, freeMode: false }

  it('returns listing fee for barang', () => {
    expect(adFeeFrom(pricing, 'barang', 100000)).toBe(2000)
  })

  it('returns 0 for gratis type', () => {
    expect(adFeeFrom(pricing, 'gratis', 0)).toBe(0)
  })

  it('returns 0 for Hibah category', () => {
    expect(adFeeFrom(pricing, 'barang', 0, 'Hibah')).toBe(0)
  })

  it('returns 0 when freeMode is true', () => {
    expect(adFeeFrom({ ...pricing, freeMode: true }, 'barang', 100000)).toBe(0)
  })
})
```

## Verification
```bash
npm run test:coverage
# Verify fees.js and distributor.js show 100% coverage
```