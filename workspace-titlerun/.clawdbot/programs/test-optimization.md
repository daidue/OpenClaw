# TitleRun Improvement Program: Playwright Test Optimization

## Mission
Reduce Playwright end-to-end test suite execution time from ~20 seconds to under 10 seconds while maintaining or improving test coverage and reliability.

## Scope

### Files You CAN Modify
- `titlerun-app/src/__tests__/e2e/**/*.spec.ts` (all E2E test files)
- `titlerun-app/playwright.config.ts` (Playwright configuration)
- `titlerun-app/src/__tests__/setup/**/*` (test utilities and fixtures)

### Files You CANNOT Modify
- All production code (`src/` except `__tests__/`)
- `package.json` (no new dependencies without approval)
- `.env` files
- Database schemas
- API routes

## Metrics

### Primary Metrics (Must Maintain or Improve)
- **Test pass rate**: 100% (all tests must pass)
- **Test coverage**: ≥ current baseline (do not reduce coverage)
- **TypeScript compilation**: Zero errors

### Optimization Target
- **Test suite duration**: Reduce from ~20s to <10s (50% improvement)

### Secondary Metrics (Nice to Have)
- **Parallelization efficiency**: Increase parallel test execution
- **Test flakiness**: Reduce intermittent failures
- **Setup/teardown time**: Minimize per-test overhead

## Constraints

### Hard Limits
- **No new npm packages** without explicit approval
- **No skipping tests** (`test.skip()` not allowed)
- **No reducing assertions** to make tests faster
- **No mocking real API calls** that should be integration tested
- **Bundle size**: No impact (test code not shipped)

### Soft Limits
- **Individual test duration**: Aim for <500ms per test
- **Playwright workers**: Can adjust (current: auto)
- **Test timeout**: Can reduce if tests are stable

## Success Criteria

### Iteration Success
An iteration is successful if:
1. All tests pass (100% pass rate)
2. Test suite duration < baseline
3. TypeScript compiles without errors
4. No new linting errors

### Overall Success
The program succeeds when:
1. Test suite runs in <10 seconds (down from ~20s)
2. All tests still pass
3. Coverage unchanged or improved
4. Changes are maintainable (not "clever hacks")

## Strategies to Explore

### High-Impact, Low-Risk
1. **Parallel execution**: Increase Playwright workers
2. **Selective retries**: Remove unnecessary retry logic
3. **Fixture optimization**: Reduce setup/teardown overhead
4. **Smart test grouping**: Run fast tests first, slow tests in parallel

### Medium-Impact, Medium-Risk
1. **Page object caching**: Reuse browser contexts where safe
2. **Data fixture optimization**: Use lighter test data
3. **Conditional test execution**: Skip redundant assertions
4. **Network stubbing**: Mock external dependencies (if appropriate)

### Avoid (Anti-Patterns)
- ❌ Skipping tests to reduce time
- ❌ Removing assertions to make tests faster
- ❌ Ignoring flaky tests
- ❌ Overly complex test setup that's hard to maintain
- ❌ Mocking things that should be integration tested

## Baseline Metrics (Establish First)

Run the test suite 3 times and record:
- Average duration: ______ seconds
- Pass rate: ______ %
- Coverage line %: ______ %
- Coverage branch %: ______ %
- Number of tests: ______
- Number of test files: ______

## Evaluation Logic

```python
def evaluate_iteration(baseline, experiment):
    # Gate 1: Tests must pass
    if experiment.pass_rate < 1.0:
        return "DISCARD", "Tests failing"
    
    # Gate 2: No type errors
    if experiment.typescript_errors > 0:
        return "DISCARD", "TypeScript errors"
    
    # Gate 3: Coverage must not decrease
    if experiment.coverage < baseline.coverage:
        return "DISCARD", "Coverage decreased"
    
    # Optimization check: Duration improved?
    if experiment.duration < baseline.duration:
        improvement_pct = ((baseline.duration - experiment.duration) / baseline.duration) * 100
        return "KEEP", f"Duration reduced by {improvement_pct:.1f}%"
    else:
        return "DISCARD", "No improvement"
```

## Logging Format

Each iteration should log to `improvement-log.jsonl`:

```json
{
  "timestamp": "2026-03-21T20:30:00Z",
  "iteration": 1,
  "program": "test-optimization",
  "hypothesis": "Increase Playwright workers from auto to 4",
  "changes": ["playwright.config.ts: workers = 4"],
  "metrics": {
    "duration_ms": 18200,
    "pass_rate": 1.0,
    "coverage_line_pct": 76.3,
    "typescript_errors": 0
  },
  "baseline": {
    "duration_ms": 20100,
    "pass_rate": 1.0,
    "coverage_line_pct": 76.3
  },
  "verdict": "KEEP",
  "reason": "Duration reduced by 9.5%"
}
```

## Expected Output

At completion, generate a summary report:

```markdown
# Test Optimization Run — 2026-03-21

## Results
- Iterations: 45
- Duration: 2h 15m
- Improvements kept: 12
- Improvements discarded: 33

## Final Metrics
- Test duration: 9.8s (down from 20.1s) → **51% improvement** ✅
- Pass rate: 100% (maintained)
- Coverage: 78.1% (up from 76.3%) → **+1.8%** ✅

## Key Changes
1. Increased Playwright workers to 6
2. Removed redundant retry logic in 8 tests
3. Optimized fixture setup (reduced 200ms overhead)
4. Grouped fast tests for early feedback

## Recommendation
MERGE — All success criteria met. Changes are maintainable and well-tested.
```

## Next Steps After This Program

If successful:
1. Apply same patterns to unit tests
2. Create `performance-api.md` program for backend optimization
3. Build `accessibility.md` program for Lighthouse improvements

---

**Ready to run:** `bash scripts/auto-improve.sh test-optimization`
