# TitleRun Improvement Program: Code Quality & Maintainability

## Mission
Improve codebase maintainability through systematic refactoring: reduce complexity, eliminate duplication, improve naming, enforce consistent patterns, and achieve 100% TypeScript strict mode compliance.

## Scope

### Files You CAN Modify
- `titlerun-app/src/**/*.{js,jsx,ts,tsx}` (all frontend code)
- `titlerun-api/src/**/*.{js,ts}` (all backend code)
- `tsconfig.json` (to enable strict mode)
- ESLint/Prettier config
- Component structure

### Files You CANNOT Modify
- Database schemas (unless improving type safety)
- Test files (unless improving test quality)
- Build configuration
- CI/CD pipelines

## Metrics

### Primary Metrics (Must Maintain or Improve)
- **All tests pass**: 100% pass rate
- **Functionality**: No user-facing regressions
- **TypeScript**: Zero errors

### Optimization Targets
- **TypeScript strict mode**: 100% compliance (`strict: true`)
- **Cyclomatic complexity**: Max 10 per function
- **Code duplication**: <3% (per SonarQube/ESLint)
- **ESLint warnings**: 0 (all resolved)
- **File size**: No file >500 lines

### Secondary Metrics (Nice to Have)
- **Function length**: Max 50 lines
- **Prop drilling**: Reduce >3 levels of prop passing
- **Magic numbers**: Replace with named constants
- **Comment coverage**: Document complex logic

## Constraints

### Hard Limits
- **No feature changes**: Pure refactoring, no new functionality
- **No breaking changes**: API contracts must remain stable
- **Performance**: No >5% regression
- **Test coverage**: Must maintain or improve

### Soft Limits
- **Large refactors**: Break into incremental commits
- **Component structure**: Prefer composition over inheritance
- **Naming**: Prefer clarity over brevity

## Success Criteria

### Iteration Success
An iteration is successful if:
1. All tests pass (100% pass rate)
2. TypeScript compiles without errors
3. ESLint warnings ≤ baseline
4. Code complexity ≤ baseline

### Overall Success
The program succeeds when:
1. TypeScript strict mode enabled (0 errors)
2. Cyclomatic complexity <10 per function
3. Code duplication <3%
4. 0 ESLint warnings

## Strategies to Explore

### High-Impact, Low-Risk
1. **Enable TypeScript strict mode**: Fix type errors incrementally
2. **Extract magic numbers**: Create named constants
3. **Simplify conditionals**: Replace nested if/else with early returns
4. **Consistent naming**: Follow naming conventions (camelCase, PascalCase)

### Medium-Impact, Medium-Risk
1. **Extract components**: Split large components (>200 lines) into smaller ones
2. **DRY principle**: Extract duplicate code into utilities
3. **Reduce prop drilling**: Use Context or Zustand where appropriate
4. **Type safety**: Add generics to reduce `any` usage

### High-Impact, High-Risk (Careful)
1. **Zustand refactor**: Simplify state management
2. **File structure reorganization**: Group by feature, not type
3. **Major component rewrites**: Only if complexity >20

### Avoid (Anti-Patterns)
- ❌ Premature optimization (don't refactor working code without reason)
- ❌ Over-abstraction (don't create abstractions for single use cases)
- ❌ Breaking existing patterns (maintain consistency)
- ❌ Renaming just for style (only rename if truly confusing)
- ❌ Removing comments that explain "why" (keep context)

## Baseline Metrics (Establish First)

Run code quality tools:
```bash
# TypeScript strict mode check
npx tsc --noEmit --strict | wc -l  # Count errors

# Cyclomatic complexity (via ESLint plugin)
npx eslint src/ --ext .ts,.tsx,.js,.jsx --format json > complexity.json

# Code duplication (via jscpd)
npx jscpd src/ --format json

# ESLint warnings
npx eslint src/ --ext .ts,.tsx,.js,.jsx | grep "warning" | wc -l

# File size distribution
find src/ -name "*.{ts,tsx,js,jsx}" -exec wc -l {} + | sort -rn | head -20
```

Record:
- TypeScript strict errors: ______
- Functions with complexity >10: ______
- Code duplication %: ______
- ESLint warnings: ______
- Files >500 lines: ______

## Evaluation Logic

```python
def evaluate_iteration(baseline, experiment):
    # Gate 1: Tests must pass
    if experiment.pass_rate < 1.0:
        return "DISCARD", "Tests failing"
    
    # Gate 2: No type errors (or fewer than baseline)
    if experiment.typescript_errors > baseline.typescript_errors:
        return "DISCARD", "TypeScript errors increased"
    
    # Gate 3: Complexity must improve or stay same
    if experiment.avg_complexity > baseline.avg_complexity:
        return "DISCARD", "Code complexity increased"
    
    # Optimization check
    if experiment.typescript_errors < baseline.typescript_errors:
        fixed = baseline.typescript_errors - experiment.typescript_errors
        return "KEEP", f"Fixed {fixed} TypeScript errors"
    elif experiment.code_duplication < baseline.code_duplication:
        reduction = baseline.code_duplication - experiment.code_duplication
        return "KEEP", f"Reduced duplication by {reduction:.1f}%"
    elif experiment.eslint_warnings < baseline.eslint_warnings:
        fixed = baseline.eslint_warnings - experiment.eslint_warnings
        return "KEEP", f"Fixed {fixed} ESLint warnings"
    else:
        return "DISCARD", "No improvement"
```

## Logging Format

Each iteration should log to `improvement-log.jsonl`:

```json
{
  "timestamp": "2026-03-22T23:00:00Z",
  "iteration": 1,
  "program": "code-quality",
  "hypothesis": "Enable strictNullChecks in tsconfig.json",
  "changes": ["tsconfig.json", "src/utils/api.ts", "src/hooks/useApi.ts"],
  "metrics": {
    "typescript_errors": 45,
    "avg_complexity": 7.2,
    "code_duplication_pct": 4.5,
    "eslint_warnings": 8,
    "pass_rate": 1.0
  },
  "baseline": {
    "typescript_errors": 67,
    "avg_complexity": 8.1,
    "code_duplication_pct": 5.2,
    "eslint_warnings": 12
  },
  "verdict": "KEEP",
  "reason": "Fixed 22 TypeScript errors, reduced duplication by 0.7%"
}
```

## Expected Output

At completion, generate a summary report:

```markdown
# Code Quality Improvements — 2026-03-22

## Results
- Iterations: 52
- Duration: 4h 10m
- Improvements kept: 19
- Improvements discarded: 33

## Final Metrics
- TypeScript strict mode: ✅ ENABLED (0 errors, down from 127)
- Cyclomatic complexity: Avg 6.8 (down from 9.4) → **28% simpler** ✅
- Code duplication: 2.1% (down from 5.7%) → **63% reduction** ✅
- ESLint warnings: 0 (down from 23) → **100% fixed** ✅
- Files >500 lines: 0 (down from 4)

## Key Changes
1. Enabled TypeScript strict mode, fixed all 127 type errors
2. Extracted 8 large components into smaller composable pieces
3. Reduced prop drilling with Zustand in 6 components
4. Replaced 47 magic numbers with named constants
5. Simplified 23 complex conditionals (nested if → early return)
6. Extracted duplicate validation logic into 3 utility functions
7. Split 4 files >500 lines into feature-based modules

## Example Refactoring
**Before:**
\```typescript
function processData(data: any) {  // any type
  if (data && data.items && data.items.length > 0) {  // nested checks
    for (let i = 0; i < data.items.length; i++) {  // C-style loop
      if (data.items[i].value > 100) {  // magic number
        // ... 50 lines of logic
      }
    }
  }
}
\```

**After:**
\```typescript
const TRADE_VALUE_THRESHOLD = 100;

function processData(data: TradeData): void {
  if (!data?.items?.length) return;  // early return
  
  data.items
    .filter(item => item.value > TRADE_VALUE_THRESHOLD)
    .forEach(processTradeItem);  // extracted function
}
\```

## Recommendation
MERGE — TypeScript strict mode enabled, significant quality improvements.
```

## Refactoring Patterns

### Pattern 1: Extract Component
**When:** Component >200 lines  
**How:** Split into smaller components (Header, Body, Footer, etc.)

### Pattern 2: Extract Utility
**When:** Same logic used in 3+ places  
**How:** Create utility function in `src/utils/`

### Pattern 3: Early Return
**When:** Nested if/else >3 levels  
**How:** Guard clauses at top, return early

### Pattern 4: Named Constants
**When:** Magic numbers/strings used multiple times  
**How:** `const API_TIMEOUT_MS = 30000;` at top of file

### Pattern 5: Type Safety
**When:** `any`, `unknown`, type assertions  
**How:** Create proper types, use generics

## Next Steps After This Program

If successful:
1. Document code quality standards in CONTRIBUTING.md
2. Add complexity/duplication checks to CI pipeline
3. Create `documentation.md` program for comprehensive docs
4. Set up SonarQube for continuous quality monitoring

---

**Ready to run:** `bash scripts/auto-improve.sh code-quality`
