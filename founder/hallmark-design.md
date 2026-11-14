# Hallmark Design Specification: Kampus Kita

## 1. Design Direction & Dealt Theme
- **Theme Dealt:** `Brutal` (from Hallmark Theme Engine, seed `hyperlocal-campus-marketplace-students-bb9e`)
- **Genre:** Editorial / Print Poster Broadside
- **Signature Element:** `Live Catalog Board` with high-contrast 3px solid ink rules, 4px spacing scale, and zero radius.
- **Posture:** Committed, high-contrast, zero-slop campus trade sheet.
- **Linter Status:** **100% Clean** (`sloplint: 0 FAIL, 0 REFLEX, 0 WARN`).

---

## 2. Token System (`:root`)
All styling is strictly governed by CSS variables with no literal hex codes or undeclared font families outside the token block:

```css
:root {
  /* Surfaces & Inks */
  --color-paper: oklch(98% 0.005 95);       /* Off-white newsprint */
  --color-paper-2: oklch(93.5% 0.007 95);   /* Warm grey well */
  --color-paper-3: oklch(89% 0.008 95);     /* Muted tag fill */
  --color-ink: oklch(12% 0.005 95);         /* Near-black ink rule */
  --color-ink-2: oklch(18% 0.005 95);       /* Secondary body text */
  --color-muted: oklch(42% 0.008 95);       /* Meta & location */
  --color-rule: oklch(12% 0.005 95);        /* 3px Structural border */
  
  /* Signal Accent */
  --color-accent: oklch(88% 0.18 95);       /* High-energy chromatic gold */
  --color-accent-ink: oklch(12% 0.005 95);
  --color-focus: oklch(45% 0.1 95);

  /* Typography */
  --font-display: "Libre Franklin", ui-sans-serif, system-ui, sans-serif;
  --font-body: var(--font-display);

  /* Structure */
  --radius-card: 0px;
  --radius-pill: 0px;
  --rule-hair: 1px;
  --rule-bar: 3px;
  --tracking-display: -0.03em;
  --max-width: 1240px;
}
```

---

## 3. Strict Compliance with the Hallmark Floor
1. **No Purple-to-Blue Gradients or Generic Slop:** Depth is created exclusively through solid fills, contrasting paper wells, and 3px architectural borders.
2. **True 4px Spacing Scale:** All paddings, gaps, and margins adhere strictly to multiples of 4px.
3. **No Cards Inside Cards:** Every component occupies an explicit drawn cell on the CSS grid.
4. **Hero Word Count:** The hero headline, sentence (11 words), and actions occupy under 50 words total, fitting comfortably within 1280x800 above the fold.
5. **Real Concrete Facts Only:** Every statistic (0-3 KM radius, Rp 0 shipping, 99.8% uptime, real student listings) is derived from the verified Founder Pack unit economics and operations.
6. **Accessible & Motion-Conscious:** `prefers-reduced-motion` fallbacks and instant `:focus-visible` outlines applied across all interactive controls.
