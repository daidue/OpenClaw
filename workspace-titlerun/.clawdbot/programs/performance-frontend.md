# TitleRun Improvement Program: Frontend Performance

## Mission
Optimize frontend bundle size and runtime performance to achieve <500KB gzipped bundle and 90+ Lighthouse performance score while maintaining functionality and developer experience.

## Scope

### Files You CAN Modify
- `titlerun-app/src/**/*.{js,jsx,ts,tsx}` (all frontend code)
- `titlerun-app/vite.config.ts` (build configuration)
- `titlerun-app/package.json` (dependencies - with approval)
- `titlerun-app/.env.example` (environment config)

### Files You CANNOT Modify
- Backend API code
- Database schemas
- Test files (unless optimizing test utilities)
- CI/CD configuration

## Metrics

### Primary Metrics (Must Maintain or Improve)
- **All tests pass**: 100% pass rate
- **Functionality**: No user-facing regressions
- **TypeScript**: Zero errors

### Optimization Targets
- **Bundle size (gzipped)**: <500KB (current: ~800KB)
- **Lighthouse Performance**: >90 (current: 89-92)
- **Time to Interactive (TTI)**: <2.5s (current: ~3.2s)
- **First Contentful Paint (FCP)**: <1.5s (current: ~1.8s)

### Secondary Metrics (Nice to Have)
- **Code splitting**: Reduce initial bundle load
- **Image optimization**: Lazy load, WebP conversion
- **Tree shaking**: Remove unused code
- **Dependency reduction**: Remove unnecessary packages

## Constraints

### Hard Limits
- **No removing features** to reduce bundle size
- **No degrading UX** (e.g., removing animations to improve perf)
- **API compatibility**: No breaking changes to API contracts
- **Mobile support**: Must maintain mobile UX quality

### Soft Limits
- **Dependency changes**: Prefer swapping heavy libs for lighter alternatives
- **Code refactoring**: Large refactors need incremental commits
- **Breaking changes**: Avoid if possible, document if necessary

## Success Criteria

### Iteration Success
An iteration is successful if:
1. All tests pass (100% pass rate)
2. TypeScript compiles without errors
3. Lighthouse score ≥ baseline
4. Bundle size ≤ baseline

### Overall Success
The program succeeds when:
1. Bundle size <500KB gzipped (down from ~800KB)
2. Lighthouse Performance >90
3. TTI <2.5s, FCP <1.5s
4. All functionality works as expected

## Strategies to Explore

### High-Impact, Low-Risk
1. **Code splitting**: Dynamic imports for heavy routes
2. **Tree shaking**: Remove unused lodash/moment imports
3. **Image optimization**: WebP conversion, lazy loading
4. **Dependency audit**: Replace heavy libs (moment → date-fns, lodash → native JS)

### Medium-Impact, Medium-Risk
1. **Route-based splitting**: Lazy load non-critical routes
2. **Component lazy loading**: Suspend heavy components
3. **CSS optimization**: Remove unused Tailwind classes
4. **Font optimization**: Subset fonts, preload critical fonts

### High-Impact, High-Risk (Careful)
1. **Major dependency swaps**: React Query config changes
2. **Build tool changes**: Vite optimizations
3. **State management refactor**: Zustand optimization

### Avoid (Anti-Patterns)
- ❌ Removing features to reduce bundle size
- ❌ Degrading UX (removing animations, transitions)
- ❌ Breaking mobile experience
- ❌ Removing error handling to save bytes
- ❌ Minifying source maps (breaks debugging)

## Baseline Metrics (Establish First)

Run Lighthouse 3 times (incognito, throttled) and record:
- Bundle size (gzipped): ______ KB
- Lighthouse Performance: ______ / 100
- TTI: ______ seconds
- FCP: ______ seconds
- Total JS size: ______ KB
- Number of requests: ______
- Largest Contentful Paint: ______ seconds

## Evaluation Logic

```python
def evaluate_iteration(baseline, experiment):
    # Gate 1: Tests must pass
    if experiment.pass_rate < 1.0:
        return "DISCARD", "Tests failing"
    
    # Gate 2: No type errors
    if experiment.typescript_errors > 0:
        return "DISCARD", "TypeScript errors"
    
    # Gate 3: Lighthouse must not decrease
    if experiment.lighthouse_score < baseline.lighthouse_score:
        return "DISCARD", "Lighthouse score decreased"
    
    # Optimization check: Bundle size improved?
    if experiment.bundle_size_kb < baseline.bundle_size_kb:
        reduction_pct = ((baseline.bundle_size_kb - experiment.bundle_size_kb) / baseline.bundle_size_kb) * 100
        return "KEEP", f"Bundle reduced by {reduction_pct:.1f}%"
    elif experiment.lighthouse_score > baseline.lighthouse_score:
        improvement = experiment.lighthouse_score - baseline.lighthouse_score
        return "KEEP", f"Lighthouse improved by {improvement:.1f} points"
    else:
        return "DISCARD", "No improvement"
```

## Logging Format

Each iteration should log to `improvement-log.jsonl`:

```json
{
  "timestamp": "2026-03-22T20:00:00Z",
  "iteration": 1,
  "program": "performance-frontend",
  "hypothesis": "Replace moment.js with date-fns for 40KB savings",
  "changes": ["src/utils/dates.ts", "package.json"],
  "metrics": {
    "bundle_size_kb": 760,
    "lighthouse_performance": 91,
    "tti_ms": 3100,
    "fcp_ms": 1750,
    "pass_rate": 1.0,
    "typescript_errors": 0
  },
  "baseline": {
    "bundle_size_kb": 800,
    "lighthouse_performance": 89,
    "tti_ms": 3200,
    "fcp_ms": 1800
  },
  "verdict": "KEEP",
  "reason": "Bundle reduced by 5%, Lighthouse +2 points"
}
```

## Expected Output

At completion, generate a summary report:

```markdown
# Frontend Performance Optimization — 2026-03-22

## Results
- Iterations: 38
- Duration: 3h 20m
- Improvements kept: 15
- Improvements discarded: 23

## Final Metrics
- Bundle size: 485KB (down from 800KB) → **39% reduction** ✅
- Lighthouse Performance: 93/100 (up from 89) → **+4 points** ✅
- TTI: 2.3s (down from 3.2s) → **28% faster** ✅
- FCP: 1.4s (down from 1.8s) → **22% faster** ✅

## Key Changes
1. Replaced moment.js with date-fns (-40KB)
2. Lazy loaded PlayerCard charts (-85KB)
3. Code-split trade history route (-120KB)
4. Optimized Tailwind purge config (-55KB)
5. Converted PNGs to WebP, lazy loaded images (-95KB)

## Recommendation
MERGE — All success criteria exceeded. Changes are maintainable and well-tested.
```

## Measurement Commands

```bash
# Build production bundle
npm run build

# Check bundle size
du -sh dist/ && find dist -name "*.js" -exec gzip -c {} \; | wc -c

# Run Lighthouse (requires deployed build)
npx lighthouse https://app.titlerun.co --view --output=html --output-path=./lighthouse-report.html

# Analyze bundle
npx vite-bundle-visualizer
```

## Next Steps After This Program

If successful:
1. Create `performance-api.md` for backend optimization
2. Build `accessibility.md` for a11y improvements
3. Consider `seo.md` for search optimization

---

**Ready to run:** `bash scripts/auto-improve.sh performance-frontend`
