# Test Implementation Checklist

## Phase 1: Setup (15 minutes)

- [ ] Install Vitest and dependencies
  ```bash
  npm install --save-dev vitest @vitest/ui @testing-library/react-hooks
  ```

- [ ] Add test scripts to package.json
  ```json
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
  ```

- [ ] Create vitest.config.js with coverage thresholds

## Phase 2: Integration (30 minutes)

- [ ] Replace placeholder functions in test file with actual imports
  ```javascript
  import { 
    getPlayerRank,
    idMatch,
    useLeaguematesPrefill,
    validatePlayerId,
    getAssetId 
  } from '../src/utils';
  ```

- [ ] Adjust import paths to match project structure

- [ ] Run initial test suite
  ```bash
  npm test
  ```

- [ ] Fix any import/path issues

## Phase 3: Verification (20 minutes)

- [ ] Verify all 60+ tests run successfully

- [ ] Check each fix category:
  - [ ] Fix #1: Rank Calculation (13 tests)
  - [ ] Fix #2: ID Matching (14 tests)
  - [ ] Fix #3: Session Storage (17 tests)
  - [ ] Fix #4: Backend Validation (18 tests)
  - [ ] Fix #5: ID Extraction (16 tests)

- [ ] Review failed tests (expected - these should fail until bugs are fixed)

- [ ] Document which tests are failing (these validate the bugs exist)

## Phase 4: Bug Fixing (varies by fix)

For each bug fix:

- [ ] Implement the fix in source code
- [ ] Run related test suite
  ```bash
  npm test -- --grep "Fix #X"
  ```
- [ ] Verify tests now pass
- [ ] Run full suite to ensure no regressions

## Phase 5: CI/CD Integration (30 minutes)

- [ ] Create GitHub Actions workflow (`.github/workflows/test.yml`)

- [ ] Configure workflow to:
  - [ ] Run on push to main/develop
  - [ ] Run on pull requests
  - [ ] Generate coverage reports
  - [ ] Upload to Codecov (optional)

- [ ] Set up pre-commit hooks with Husky
  ```bash
  npm install --save-dev husky
  npx husky install
  npx husky add .husky/pre-commit "npm test -- --run"
  ```

- [ ] Test the workflow with a sample commit

## Phase 6: Documentation (15 minutes)

- [ ] Add test documentation to project README

- [ ] Document test patterns for team

- [ ] Create contributing guidelines that require tests

- [ ] Add test coverage badge to README
  ```markdown
  ![Coverage](https://img.shields.io/codecov/c/github/username/repo)
  ```

## Phase 7: Monitoring (ongoing)

- [ ] Set coverage thresholds in vitest.config.js
  ```javascript
  thresholds: {
    lines: 90,
    functions: 90,
    branches: 85,
    statements: 90
  }
  ```

- [ ] Review coverage reports weekly

- [ ] Add tests for any new bugs discovered

- [ ] Refactor tests as needed to reduce duplication

## Quick Wins

Do these first for immediate value:

1. **Run tests locally** (5 min)
   ```bash
   npm install --save-dev vitest
   npm test
   ```

2. **Identify existing bugs** (5 min)
   - Note which tests fail
   - Confirms bugs exist in current code

3. **Fix one critical bug** (30 min)
   - Pick highest-impact bug
   - Implement fix
   - Watch tests turn green

4. **Add to CI** (15 min)
   - Create GitHub Actions workflow
   - Automatic testing on every PR

## Expected Outcomes

After completing this checklist:

✅ **60+ comprehensive tests** covering all adversarial scenarios
✅ **Automated testing** on every commit and PR
✅ **90%+ code coverage** for critical utilities
✅ **Pre-commit hooks** preventing untested code from being committed
✅ **Coverage tracking** showing test health over time
✅ **Bug prevention** - these specific bugs can't happen again
✅ **Confidence** in code changes through comprehensive test suite

## Time Estimate

- **Minimum viable:** 1 hour (setup + run locally)
- **Production ready:** 2-3 hours (setup + CI + documentation)
- **Full implementation:** 4-5 hours (including bug fixes)

## Success Criteria

- [ ] All 60+ tests passing
- [ ] Coverage ≥90% for tested functions
- [ ] CI/CD pipeline green
- [ ] Pre-commit hooks working
- [ ] Team understands how to run and write tests
- [ ] No regressions on bug fixes

---

**Priority:** HIGH
**Impact:** Prevents all 5 bugs from recurring
**ROI:** ~15 minutes of testing saves hours of debugging
