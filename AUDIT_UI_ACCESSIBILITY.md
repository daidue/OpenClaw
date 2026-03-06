# UI Accessibility Audit — ML Prediction Components

**Date:** 2026-03-06
**Auditor:** Senior Accessibility Auditor (WCAG 2.1 AA Specialist)
**Scope:** `src/components/ml/` — PredictionCard, PredictionComparison, RankingsTable
**Standard:** WCAG 2.1 Level AA

---

## Overall Grade: **A-**

## WCAG 2.1 Compliance: ✅ Level A — PASS | ✅ Level AA — PASS

## Recommendation: **SHIP** ✅

---

## Fix Verification

### Fix #1: Keyboard Navigation ✅ VERIFIED
**RankingsTable.tsx — SortHeader component**
- `tabIndex={0}` on all sortable `<th>` elements ✅
- `onKeyDown` handler fires on Enter and Space ✅
- `e.preventDefault()` prevents scroll on Space ✅
- `aria-sort` with correct ascending/descending/none values ✅
- `role="columnheader"` semantic role ✅
- `focus:ring-2 focus:ring-blue-500 focus:ring-inset` — visible focus indicator ✅

**PredictionCard.tsx — Clickable cards**
- `role="button"` when `onClick` is provided (conditional) ✅
- `tabIndex={0}` when interactive ✅
- `onKeyDown` for Enter/Space ✅
- Not applied when non-interactive (no false positives) ✅

**RankingsTable.tsx — Clickable rows**
- `tabIndex={0}` on rows when `onPlayerClick` provided ✅
- `onKeyDown` Enter/Space handler ✅
- Conditional — non-clickable rows don't get keyboard props ✅

**Position filter buttons**
- Native `<button>` elements (inherently keyboard accessible) ✅
- `aria-pressed` state on filter buttons ✅
- `role="group"` with `aria-label="Filter by position"` ✅
- `focus:ring-2 focus:ring-blue-500` visible focus ✅

### Fix #2: Charts Accessible ✅ VERIFIED
**PredictionComparison.tsx — Bar chart**
- `role="img"` wrapper around Recharts `<ResponsiveContainer>` ✅
- `aria-label` with dynamic player name + format count ✅
- `.sr-only` div with full text alternative (list of all data points) ✅
- Screen reader gets: format name, PPG value, floor–ceiling range ✅

**PredictionCard.tsx — Range bar (meter)**
- `role="meter"` on the range bar ✅
- `aria-label` with player name context ✅
- `aria-valuemin`, `aria-valuemax`, `aria-valuenow` ✅
- Semantic meaning fully communicated without visuals ✅

### Fix #3: Color Contrast ✅ VERIFIED
**All informational text** now uses `text-gray-400` (#9ca3af) on dark backgrounds:
- PredictionCard: Floor/Ceiling labels, uncertainty text, starter text, model version ✅
- PredictionComparison: Table floor/ceiling/range values, header text ✅
- RankingsTable: Player count, floor/ceiling/range cells, legend text ✅

**Contrast ratio: `text-gray-400` (#9ca3af) on `bg-gray-900` (#111827) = ~5.9:1** — exceeds 4.5:1 AA minimum ✅

**Remaining `text-gray-600` instances (2):**
- `PredictionComparison.tsx:122` — BarChart3 icon, `aria-hidden="true"` (decorative)
- `RankingsTable.tsx:196` — Filter icon, `aria-hidden="true"` (decorative)
- **Verdict:** NOT a WCAG violation. Decorative icons hidden from AT don't require contrast compliance. LOW priority for visual consistency only.

### Fix #4: React Anti-Pattern ✅ VERIFIED
**RankingsTable.tsx — SortHeader component**
- Defined at **module scope** (line ~58), NOT inside RankingsTable ✅
- Stable component identity across re-renders ✅
- No unmount/remount cycle on parent state change ✅
- Focus is preserved when sort direction toggles ✅

**PredictionComparison.tsx — CustomTooltip**
- Also defined at module scope ✅
- Helper functions (`safeFixed`) at module scope ✅

---

## Detailed Audit Results

### WCAG 2.1 Level A Checks

| Criterion | Status | Notes |
|-----------|--------|-------|
| 1.1.1 Non-text Content | ✅ PASS | All icons have `aria-hidden="true"`, charts have text alternatives |
| 1.3.1 Info & Relationships | ✅ PASS | `scope="col"` on `<th>`, `role="meter"`, `role="img"`, semantic HTML |
| 1.3.2 Meaningful Sequence | ✅ PASS | DOM order matches visual order |
| 2.1.1 Keyboard | ✅ PASS | All interactive elements keyboard accessible |
| 2.1.2 No Keyboard Trap | ✅ PASS | Tab moves through all focusable elements freely |
| 2.4.1 Bypass Blocks | N/A | Component level, not page level |
| 2.4.2 Page Titled | N/A | Component level |
| 2.4.3 Focus Order | ✅ PASS | Logical tab order follows visual layout |
| 4.1.1 Parsing | ✅ PASS | Valid JSX, proper nesting |
| 4.1.2 Name, Role, Value | ✅ PASS | `aria-sort`, `aria-pressed`, `role="button"`, `role="meter"` |

### WCAG 2.1 Level AA Checks

| Criterion | Status | Notes |
|-----------|--------|-------|
| 1.4.3 Contrast (Minimum) | ✅ PASS | text-gray-400 on dark = 5.9:1 (>4.5:1) |
| 1.4.4 Resize Text | ✅ PASS | Uses rem-based Tailwind sizing |
| 1.4.11 Non-text Contrast | ✅ PASS | Focus rings (blue-500), range bar markers visible |
| 2.4.7 Focus Visible | ✅ PASS | `focus:ring-2 focus:ring-blue-500` on interactive elements |
| 3.2.1 On Focus | ✅ PASS | No context change on focus |
| 3.2.2 On Input | ✅ PASS | Sort/filter changes are user-initiated |

---

## Issues Found

### MEDIUM — 0 issues
### LOW — 2 issues (non-blocking)

| # | Severity | File | Issue | WCAG | Recommendation |
|---|----------|------|-------|------|----------------|
| 1 | LOW | PredictionComparison.tsx:122 | Decorative icon uses `text-gray-600` — visually dim but `aria-hidden` so not a violation | N/A | Change to `text-gray-500` for visual consistency |
| 2 | LOW | RankingsTable.tsx:196 | Same pattern — decorative Filter icon uses `text-gray-600` | N/A | Change to `text-gray-500` for visual consistency |

### CRITICAL — 0 issues ✅
### HIGH — 0 issues ✅

---

## Additional Observations

### Strengths
1. **Excellent conditional accessibility** — `role="button"`, `tabIndex`, `onKeyDown` only applied when `onClick`/`onPlayerClick` is provided. No false ARIA on non-interactive elements.
2. **Proper sr-only pattern** — Chart text alternatives are comprehensive (format, value, range per data point).
3. **`role="meter"`** on the range bar is semantically correct (continuous value within known range) — better than generic `role="progressbar"`.
4. **TypeScript types are solid** — `SortHeaderProps` interface, proper generic typing, no `any` usage.
5. **`prefers-reduced-motion`** respected in `index.css` — all animations disabled for users who request it.
6. **Touch targets** — global `touch-action: manipulation` and `.touch-target` utilities ensure 48dp minimum.
7. **`scope="col"`** on all non-sortable `<th>` elements (Pos column, Range column) — proper table semantics.

### Minor Recommendations (not blocking)
- Consider adding `aria-live="polite"` to the player count span in RankingsTable so screen readers announce filter changes.
- The `role="grid"` on the RankingsTable `<table>` is technically for interactive grids (cells individually focusable). Since only rows are focusable, `role="table"` or just native `<table>` semantics would be more accurate. Not a violation, but a pedantic improvement.
- ErrorBar in PredictionComparison only shows `errorHigh` — consider adding `errorLow` for full range visualization.

---

## Files Audited

| File | Exists | Lines | Status |
|------|--------|-------|--------|
| src/components/ml/PredictionCard.tsx | ✅ | ~230 | PASS |
| src/components/ml/PredictionComparison.tsx | ✅ | ~250 | PASS |
| src/components/ml/RankingsTable.tsx | ✅ | ~430 | PASS |
| src/components/ml/index.ts | ✅ | 7 | PASS — clean barrel exports |
| src/types/predictions.ts | ✅ | ~190 | PASS — comprehensive types |
| src/index.css | ✅ | ~600+ | PASS — sr-only utility present |

---

## Summary

All 4 accessibility fixes are correctly implemented and verified. The components meet WCAG 2.1 Level AA requirements. Zero critical or high-severity issues found. Two LOW-severity cosmetic items (decorative icons with `text-gray-600`) are not WCAG violations since they're hidden from assistive technology.

**Verdict: SHIP** ✅

---

_Audit completed 2026-03-06 12:33 EST_
