---
title: "[Good First Issue] Fix accessibility issues (WCAG 2.1 AA)"
labels: ["good-first-issue", "a11y", "frontend"]
assignees: ""
---

## Description
Audit and fix accessibility issues across the web app to meet WCAG 2.1 AA standards.

## Acceptance Criteria
- [ ] Run axe-core audit on key pages: `/`, `/jual`, `/jual-beli`, `/dashboard`, `/produk/[slug]`, `/admin`
- [ ] Fix all critical/serious violations:
  - [ ] Missing alt text on images
  - [ ] Insufficient color contrast (4.5:1 normal, 3:1 large)
  - [ ] Missing form labels
  - [ ] Non-descriptive link text ("Click here")
  - [ ] Missing heading hierarchy (h1 → h2 → h3)
  - [ ] Keyboard focus indicators visible
  - [ ] ARIA labels on icon-only buttons
  - [ ] Form error messages associated with inputs
- [ ] Add `axe-core` to test suite for regression prevention
- [ ] Document remaining minor issues with tickets

## Tools
```bash
# Quick audit in browser console
npm install -g @axe-core/cli
axe https://localhost:3000/jual-beli

# Or in test
npm install --save-dev jest-axe @testing-library/jest-dom
```

## Files to Modify
- Pages and components with violations
- `src/app/globals.css` — ensure focus styles
- `src/components/` — add aria-labels, roles

## Estimated Effort
**L** (8-16 hours) — can be split by page

## Verification
```bash
npm run test
# axe tests pass
npm run dev
# Manual keyboard navigation test (Tab, Shift+Tab, Enter, Escape)
```