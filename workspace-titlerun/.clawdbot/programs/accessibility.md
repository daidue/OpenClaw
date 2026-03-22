# TitleRun Improvement Program: Accessibility (a11y)

## Mission
Achieve WCAG 2.1 AA compliance and Lighthouse Accessibility score >95 through systematic improvements to semantic HTML, ARIA attributes, keyboard navigation, and screen reader support.

## Scope

### Files You CAN Modify
- `titlerun-app/src/**/*.{jsx,tsx}` (all React components)
- `titlerun-app/src/**/*.css` (styling for focus states, contrast)
- `titlerun-app/public/index.html` (lang attribute, meta tags)
- Component test files (to add a11y tests)

### Files You CANNOT Modify
- Backend API code
- Database schemas
- Build configuration (except for a11y tooling)
- Environment files

## Metrics

### Primary Metrics (Must Maintain or Improve)
- **All tests pass**: 100% pass rate
- **Functionality**: No user-facing regressions
- **TypeScript**: Zero errors

### Optimization Targets
- **Lighthouse Accessibility**: >95 (current: ~85)
- **WCAG 2.1 AA**: 100% compliance
- **axe-core violations**: 0 critical/serious issues
- **Keyboard navigation**: All interactive elements reachable

### Secondary Metrics (Nice to Have)
- **Color contrast**: WCAG AAA where feasible
- **Screen reader labels**: 100% coverage
- **Focus management**: Logical tab order

## Constraints

### Hard Limits
- **No visual regression**: UI must look identical (or better)
- **No feature removal**: All functionality remains accessible
- **Performance**: No >10% negative impact on performance
- **Mobile**: Touch targets must remain usable

### Soft Limits
- **Design tweaks**: Minor color adjustments for contrast OK
- **Component refactoring**: Improve semantic HTML structure
- **ARIA attributes**: Add where needed, but prefer semantic HTML

## Success Criteria

### Iteration Success
An iteration is successful if:
1. All tests pass (100% pass rate)
2. TypeScript compiles without errors
3. Lighthouse Accessibility ≥ baseline
4. No new axe-core violations

### Overall Success
The program succeeds when:
1. Lighthouse Accessibility >95
2. 0 critical/serious axe-core violations
3. Full keyboard navigation support
4. Screen reader tested and working

## Strategies to Explore

### High-Impact, Low-Risk
1. **Semantic HTML**: Replace `<div>` with `<button>`, `<nav>`, `<main>`, etc.
2. **Alt text**: Add descriptive alt text to all images
3. **ARIA labels**: Label interactive elements (`aria-label`, `aria-labelledby`)
4. **Focus indicators**: Ensure visible focus states (outline, ring)

### Medium-Impact, Medium-Risk
1. **Color contrast**: Adjust colors to meet WCAG AA (4.5:1 text, 3:1 UI)
2. **Keyboard shortcuts**: Add common shortcuts (Esc to close, Arrow keys for navigation)
3. **Focus trapping**: Trap focus in modals/dialogs
4. **Skip links**: Add "Skip to main content" link

### High-Impact, High-Risk (Careful)
1. **Component redesign**: Major refactor for semantic structure
2. **Headings hierarchy**: Fix h1 → h2 → h3 order (may affect visual hierarchy)
3. **Form validation**: Accessible error messages (may change UX flow)

### Avoid (Anti-Patterns)
- ❌ Hiding content with `display: none` that should be screen-reader accessible
- ❌ Using `aria-label` when semantic HTML would work
- ❌ Adding `tabindex` to non-interactive elements
- ❌ Removing focus indicators for aesthetic reasons
- ❌ Using color alone to convey information

## Baseline Metrics (Establish First)

Run Lighthouse and axe-core:
```bash
# Lighthouse
npx lighthouse https://app.titlerun.co --only-categories=accessibility --view

# axe-core (in browser DevTools or via Playwright)
npm run test:a11y  # If a11y tests exist, else add them
```

Record:
- Lighthouse Accessibility: ______ / 100
- axe-core critical violations: ______
- axe-core serious violations: ______
- axe-core moderate violations: ______
- Keyboard navigation issues: ______

## Evaluation Logic

```python
def evaluate_iteration(baseline, experiment):
    # Gate 1: Tests must pass
    if experiment.pass_rate < 1.0:
        return "DISCARD", "Tests failing"
    
    # Gate 2: No type errors
    if experiment.typescript_errors > 0:
        return "DISCARD", "TypeScript errors"
    
    # Gate 3: Accessibility must improve or stay same
    if experiment.lighthouse_a11y < baseline.lighthouse_a11y:
        return "DISCARD", "Lighthouse Accessibility decreased"
    
    # Gate 4: No new violations
    if experiment.axe_critical > baseline.axe_critical:
        return "DISCARD", "New critical violations"
    
    # Optimization check
    if experiment.lighthouse_a11y > baseline.lighthouse_a11y:
        improvement = experiment.lighthouse_a11y - baseline.lighthouse_a11y
        return "KEEP", f"Lighthouse Accessibility +{improvement:.1f} points"
    elif experiment.axe_critical < baseline.axe_critical:
        fixed = baseline.axe_critical - experiment.axe_critical
        return "KEEP", f"Fixed {fixed} critical violations"
    else:
        return "DISCARD", "No improvement"
```

## Logging Format

Each iteration should log to `improvement-log.jsonl`:

```json
{
  "timestamp": "2026-03-22T21:00:00Z",
  "iteration": 1,
  "program": "accessibility",
  "hypothesis": "Add aria-labels to all IconButton components",
  "changes": ["src/components/IconButton.tsx"],
  "metrics": {
    "lighthouse_a11y": 87,
    "axe_critical": 2,
    "axe_serious": 8,
    "axe_moderate": 15,
    "pass_rate": 1.0,
    "typescript_errors": 0
  },
  "baseline": {
    "lighthouse_a11y": 85,
    "axe_critical": 3,
    "axe_serious": 9,
    "axe_moderate": 15
  },
  "verdict": "KEEP",
  "reason": "Lighthouse +2 points, fixed 1 critical violation"
}
```

## Expected Output

At completion, generate a summary report:

```markdown
# Accessibility Improvements — 2026-03-22

## Results
- Iterations: 42
- Duration: 2h 45m
- Improvements kept: 18
- Improvements discarded: 24

## Final Metrics
- Lighthouse Accessibility: 96/100 (up from 85) → **+11 points** ✅
- axe-core critical violations: 0 (down from 3) → **100% fixed** ✅
- axe-core serious violations: 1 (down from 9) → **89% fixed** ✅
- WCAG 2.1 AA compliance: 98% (up from 72%)

## Key Changes
1. Replaced 47 `<div onClick>` with `<button>` (semantic HTML)
2. Added aria-labels to 23 icon-only buttons
3. Fixed color contrast on 12 components (WCAG AA)
4. Added focus indicators to all interactive elements
5. Implemented keyboard navigation for TradeBuilder
6. Added skip link to main content
7. Fixed heading hierarchy (h1 → h2 → h3)

## Remaining Issues
- 1 serious violation: Color contrast on disabled buttons (WONTFIX - intentionally low contrast)

## Recommendation
MERGE — Exceeds success criteria. WCAG 2.1 AA compliant, Lighthouse >95.
```

## Measurement Commands

```bash
# Run Lighthouse accessibility audit
npx lighthouse https://app.titlerun.co --only-categories=accessibility --view

# Run axe-core via Playwright (create this test if missing)
npx playwright test a11y.spec.ts

# Check color contrast manually
# Use browser DevTools Accessibility panel or:
# https://webaim.org/resources/contrastchecker/
```

## Testing Checklist

Before marking complete, manually verify:
- [ ] Tab through entire app (logical order, visible focus)
- [ ] Use screen reader (VoiceOver/NVDA) on 3 key pages
- [ ] Zoom to 200% (no content clipping)
- [ ] Test with keyboard only (no mouse)
- [ ] Check color contrast with DevTools
- [ ] Verify form validation messages are accessible
- [ ] Test modals/dialogs (focus trap, Esc to close)

## Next Steps After This Program

If successful:
1. Add automated a11y regression tests (axe-core in E2E suite)
2. Document accessibility guidelines in CONTRIBUTING.md
3. Create `seo.md` program for search optimization
4. Consider `i18n.md` for internationalization

---

**Ready to run:** `bash scripts/auto-improve.sh accessibility`
