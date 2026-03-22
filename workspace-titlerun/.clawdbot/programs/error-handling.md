# TitleRun Improvement Program: Error Handling & Resilience

## Mission
Achieve production-grade error handling with graceful degradation, comprehensive error boundaries, retry logic, and user-friendly error messages across the entire application.

## Scope

### Files You CAN Modify
- `titlerun-app/src/**/*.{js,jsx,ts,tsx}` (all frontend code)
- `titlerun-api/src/**/*.{js,ts}` (all backend code)
- Error boundary components
- API error handling middleware
- Test files (to add error case coverage)

### Files You CANNOT Modify
- Database schemas (unless adding error logging tables)
- CI/CD configuration
- Environment files (unless adding error tracking config)

## Metrics

### Primary Metrics (Must Maintain or Improve)
- **All tests pass**: 100% pass rate
- **Functionality**: No user-facing regressions
- **TypeScript**: Zero errors

### Optimization Targets
- **Error boundary coverage**: 100% of pages/routes
- **API error handling**: 100% of endpoints return structured errors
- **Retry logic**: Critical operations auto-retry (network, auth)
- **User-facing errors**: 0 technical jargon, all errors actionable

### Secondary Metrics (Nice to Have)
- **Error logging**: Structured logs for debugging
- **Sentry integration**: Error tracking in production
- **Fallback UI**: All errors show helpful fallback
- **Network resilience**: Offline detection, retry queues

## Constraints

### Hard Limits
- **No silent failures**: Every error must be logged or shown to user
- **No breaking changes**: API error format must remain backward compatible
- **Performance**: Error handling overhead <5ms per request
- **Privacy**: Never log sensitive data (passwords, tokens, PII)

### Soft Limits
- **Error messages**: Prefer user-friendly over technical
- **Retry limits**: Max 3 retries to avoid infinite loops
- **Fallback UI**: Keep it simple, don't over-design

## Success Criteria

### Iteration Success
An iteration is successful if:
1. All tests pass (100% pass rate)
2. TypeScript compiles without errors
3. No new unhandled promise rejections
4. Error coverage ≥ baseline

### Overall Success
The program succeeds when:
1. 100% error boundary coverage
2. All API endpoints return structured errors
3. User-facing errors are clear and actionable
4. Critical operations have retry logic

## Strategies to Explore

### High-Impact, Low-Risk
1. **Error boundaries**: Wrap routes/pages with ErrorBoundary
2. **API error formatting**: Standardize error response shape
3. **Toast notifications**: Show user-friendly errors
4. **Network retry**: Auto-retry failed API calls (3x with exponential backoff)

### Medium-Impact, Medium-Risk
1. **Fallback UI**: Design error state for each component
2. **Optimistic updates**: Show immediate UI, rollback on error
3. **Offline detection**: Show offline banner, queue actions
4. **Error logging**: Send errors to Sentry/LogRocket

### High-Impact, High-Risk (Careful)
1. **Global error handler**: window.onerror, unhandledrejection listeners
2. **API middleware refactor**: Centralize error handling
3. **Database error handling**: Add error logging tables

### Avoid (Anti-Patterns)
- ❌ Showing stack traces to users
- ❌ Generic "Something went wrong" messages (be specific)
- ❌ Infinite retry loops
- ❌ Logging sensitive data (passwords, tokens)
- ❌ Silently catching errors without logging

## Baseline Metrics (Establish First)

Audit current error handling:
```bash
# Find unhandled errors
grep -r "catch" src/ | wc -l  # Total try/catch blocks
grep -r "\.catch()" src/ | wc -l  # Promise catches
grep -r "ErrorBoundary" src/ | wc -l  # Error boundaries

# Find TODO/FIXME error handling
grep -r "TODO.*error" src/
grep -r "FIXME.*error" src/
```

Record:
- Error boundaries: ______ components
- API endpoints with error handling: ______ / ______
- Try/catch blocks: ______
- Promise .catch() calls: ______
- Unhandled rejection handlers: ______

## Evaluation Logic

```python
def evaluate_iteration(baseline, experiment):
    # Gate 1: Tests must pass
    if experiment.pass_rate < 1.0:
        return "DISCARD", "Tests failing"
    
    # Gate 2: No type errors
    if experiment.typescript_errors > 0:
        return "DISCARD", "TypeScript errors"
    
    # Gate 3: No new unhandled errors
    if experiment.unhandled_errors > baseline.unhandled_errors:
        return "DISCARD", "New unhandled errors"
    
    # Optimization check
    if experiment.error_coverage > baseline.error_coverage:
        improvement = experiment.error_coverage - baseline.error_coverage
        return "KEEP", f"Error coverage +{improvement:.1f}%"
    else:
        return "DISCARD", "No improvement"
```

## Logging Format

Each iteration should log to `improvement-log.jsonl`:

```json
{
  "timestamp": "2026-03-22T22:00:00Z",
  "iteration": 1,
  "program": "error-handling",
  "hypothesis": "Add ErrorBoundary to all route components",
  "changes": ["src/App.tsx", "src/components/ErrorBoundary.tsx"],
  "metrics": {
    "error_boundaries": 8,
    "api_error_handling_pct": 75,
    "unhandled_errors": 2,
    "pass_rate": 1.0,
    "typescript_errors": 0
  },
  "baseline": {
    "error_boundaries": 3,
    "api_error_handling_pct": 60,
    "unhandled_errors": 5
  },
  "verdict": "KEEP",
  "reason": "Added 5 error boundaries, reduced unhandled errors by 3"
}
```

## Expected Output

At completion, generate a summary report:

```markdown
# Error Handling Improvements — 2026-03-22

## Results
- Iterations: 35
- Duration: 2h 30m
- Improvements kept: 14
- Improvements discarded: 21

## Final Metrics
- Error boundary coverage: 100% (up from 40%) → **+60%** ✅
- API error handling: 100% (up from 60%) → **+40%** ✅
- Unhandled errors: 0 (down from 5) → **100% fixed** ✅
- User-friendly errors: 95% (up from 30%)

## Key Changes
1. Added ErrorBoundary to all 12 routes
2. Standardized API error response format ({code, message, data})
3. Added retry logic to 8 critical API calls (auth, trades, player data)
4. Created user-friendly error messages (no stack traces)
5. Added offline detection with retry queue
6. Implemented toast notifications for all errors
7. Added fallback UI for 6 error-prone components

## Error Response Format (Standardized)
\```typescript
{
  code: "AUTH_FAILED" | "NOT_FOUND" | "VALIDATION_ERROR" | ...,
  message: "User-friendly message",
  details?: { field: "error details" },
  retryable: boolean
}
\```

## Recommendation
MERGE — Production-ready error handling. All errors handled gracefully.
```

## Testing Checklist

Before marking complete, manually verify:
- [ ] Disconnect network → app shows offline banner
- [ ] Invalid API request → shows user-friendly error
- [ ] Component throws error → ErrorBoundary catches it
- [ ] API 500 error → retries 3x, then shows error
- [ ] Network timeout → shows timeout message, retry button
- [ ] Form validation errors → shows field-specific messages
- [ ] Check browser console for unhandled rejections (should be 0)

## Common Error Scenarios to Handle

| Scenario | Expected Behavior |
|----------|-------------------|
| Network offline | Show banner, queue actions, retry when online |
| API 500 error | Auto-retry 3x, show error toast if all fail |
| API 401 error | Redirect to login, preserve current URL |
| API 404 error | Show "Not found" page with helpful links |
| Component crash | ErrorBoundary shows fallback, logs to Sentry |
| Form validation | Show field-specific errors inline |
| Slow API call | Show loading spinner, timeout after 30s |

## Next Steps After This Program

If successful:
1. Integrate Sentry for production error tracking
2. Add error analytics (most common errors)
3. Create runbook for common production errors
4. Build `monitoring.md` program for observability

---

**Ready to run:** `bash scripts/auto-improve.sh error-handling`
