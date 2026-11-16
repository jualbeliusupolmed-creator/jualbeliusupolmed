---
title: "[Good First Issue] Add loading skeletons to listing cards"
labels: ["good-first-issue", "frontend", "ux"]
assignees: ""
---

## Description
Add skeleton loading placeholders to listing cards while data is fetching, improving perceived performance.

## Acceptance Criteria
- [ ] Create a `ListingCardSkeleton` component in `src/components/`
- [ ] Show skeleton while `useSWR`/`fetch` is loading on `/jual-beli`, `/dashboard`, `/produk/[slug]`
- [ ] Match the dimensions of actual `ProductCard` component
- [ ] Use Tailwind `animate-pulse` for animation
- [ ] No layout shift when skeleton replaces real content

## Files to Modify
- `src/components/ProductCard.tsx` (reference for dimensions)
- New: `src/components/ListingCardSkeleton.tsx`
- Pages: `src/app/jual-beli/page.tsx`, `src/app/dashboard/page.tsx`, `src/app/produk/[slug]/page.tsx`

## Estimated Effort
**S** (2-4 hours)

## Getting Started
```bash
npm run dev
# Visit /juel-beli and observe loading state
```

## Resources
- [Skeleton pattern examples](https://tailwindcss.com/docs/animation#pulse)
- Existing `ProductCard` component for reference