---
title: "[Good First Issue] Add RTL support check for Indonesian UI"
labels: ["good-first-issue", "frontend", "i18n", "a11y"]
assignees: ""
---

## Description
Verify and fix any RTL (Right-to-Left) layout issues in preparation for future Arabic/Jawi script support. Indonesian uses LTR but good practice to ensure CSS is RTL-ready.

## Acceptance Criteria
- [ ] Audit all CSS for hardcoded `left`/`right` properties
- [ ] Replace with logical properties: `inline-start`/`inline-end`, `margin-inline-start`/`margin-inline-end`
- [ ] Check flex/grid direction utilities use logical equivalents
- [ ] Test with `[dir="rtl"]` on `<html>` in browser dev tools
- [ ] Document any components that need special handling
- [ ] No visual regression in LTR mode

## Files to Audit
- `src/app/globals.css` (or Tailwind config)
- `src/components/` — all UI components
- `tailwind.config.js` — check for directional utilities

## Tailwind Logical Properties Reference
| Legacy | Logical (RTL-ready) |
|--------|---------------------|
| `ml-4` | `ms-4` (margin-inline-start) |
| `mr-4` | `me-4` (margin-inline-end) |
| `pl-4` | `ps-4` (padding-inline-start) |
| `pr-4` | `pe-4` (padding-inline-end) |
| `left-4` | `start-4` |
| `right-4` | `end-4` |
| `text-left` | `text-start` |
| `text-right` | `text-end` |
| `float-left` | `float-start` |
| `float-right` | `float-end` |

## Estimated Effort
**M** (4-6 hours)

## Verification
```bash
npm run dev
# In browser dev tools: <html dir="rtl">
# Check all pages for layout issues
npm run build
# Ensure no build errors
```