# Implementation Plan — Manual Validation Migration

**Date:** 2026-03-01  
**Goal:** Migrate manual ID validation to @titlerun/validation library + prevent future violations  
**Owner:** Jeff (Portfolio Manager)  
**Executor:** Rush (TitleRun coding agent) + Jeff (process updates)

---

## Context

**What we found:**
- Code review of `tradeEngine.js` revealed manual ID validation (71 lines)
- Codebase scan found 10 total instances across 2 files
- `@titlerun/validation` library already exists (shipped 2026-03-01)
- Strategic issue: COMMUNICATION gap (agents didn't know about library)

**Impact:**
- Current: 200 lines of duplicate validation
- After fix: 2 lines (1 import per file)
- Test coverage: 0 tests → 142 inherited tests (99.28% coverage)
- Future: ESLint prevents violations before merge

---

## Phase 1: Code Migrations (45 min) ✅ READY TO DELEGATE

### Task 1.1: Migrate tradeEngine.js (15 min)

**Delegate to:** Rush (coding agent)

**Command:**
```
Spawn coding agent in workspace-titlerun/titlerun-api with task:

"Migrate src/routes/tradeEngine.js to use @titlerun/validation library.

Context:
- Current: 71 lines of manual ID validation (normalizeId function)
- Target: Import normalizeId from @titlerun/validation library

Steps:
1. Install library: npm link @titlerun/validation
2. Replace manual normalizeId function with library import:
   const { normalizeId } = require('@titlerun/validation');
3. Export library function:
   module.exports = { normalizeId };
4. Run tests: npm test (verify no regressions)
5. Commit: 'refactor: migrate tradeEngine.js to @titlerun/validation'

Success criteria:
- File reduces from ~79 lines to ~5 lines
- Tests pass
- Library import works correctly"
```

**ETA:** 15 minutes

---

### Task 1.2: Migrate helpers.js (15 min)

**Delegate to:** Rush (coding agent - same or parallel session)

**Command:**
```
Spawn coding agent in workspace-titlerun/titlerun-api with task:

"Migrate src/utils/helpers.js to use @titlerun/validation library.

Context:
- Current: 6 instances of Number.isFinite/isInteger manual validation
- Target: Import normalizeId from @titlerun/validation library

Steps:
1. Install library: npm link @titlerun/validation (if not already done)
2. Find all manual validation logic (search for Number.isFinite, Number.isInteger)
3. Replace with library import: const { normalizeId } = require('@titlerun/validation');
4. Run tests: npm test
5. Commit: 'refactor: migrate helpers.js to @titlerun/validation'

Success criteria:
- Manual validation code removed
- Tests pass
- Library import works correctly"
```

**ETA:** 15 minutes

---

### Task 1.3: Add ESLint Rule (15 min)

**Delegate to:** Rush (coding agent)

**Command:**
```
Spawn coding agent in workspace-titlerun/titlerun-api with task:

"Add ESLint rule to prevent manual Number.isFinite/isInteger validation.

Steps:
1. Create or update .eslintrc.js in root directory
2. Add rule:

module.exports = {
  extends: ['eslint:recommended'],
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: 'CallExpression[callee.object.name="Number"][callee.property.name=/isFinite|isInteger/]',
        message: 'Use @titlerun/validation library instead of manual Number.isFinite/isInteger checks. Import: const { normalizeId } = require(\"@titlerun/validation\");'
      }
    ]
  }
};

3. Test: npm run lint (should pass after migrations complete)
4. Commit: 'chore: add ESLint rule to enforce @titlerun/validation usage'

Success criteria:
- ESLint rule added
- Linting passes
- Future violations will be caught in CI"
```

**ETA:** 15 minutes

---

## Phase 2: Documentation (60 min) ✅ PARTIALLY COMPLETE

### Task 2.1: Update CLAUDE.md (Both Repos) (30 min)

**Status:** ✅ Template created (see below)

**Delegate to:** Rush (coding agent)

**Command:**
```
Spawn coding agent with task:

"Update CLAUDE.md in both titlerun-api and titlerun-app repos.

Add this section under 'Shared Libraries':

---

### @titlerun/validation

**When to use:** All ID validation, input sanitization

**Installation:** `npm link @titlerun/validation`

**Examples:**
\`\`\`javascript
const { normalizeId } = require('@titlerun/validation');

// Validate user/player/trade IDs
const userId = normalizeId(req.params.userId);  // Throws if invalid

// Returns normalized number or null
const optionalId = normalizeId(req.query.id);  // null for undefined
\`\`\`

**Coverage:** 142 tests, 99.28% coverage

**Anti-pattern:** Manual Number.isFinite/isInteger checks
- ❌ Don't: `if (!Number.isInteger(id)) throw new Error(...)`
- ✅ Do: `const id = normalizeId(req.params.id);`

**Enforcement:** ESLint will flag manual validation

---

## Library-First Development

**Before adding validation logic:**
1. Check: Does @titlerun/validation support this?
2. If NO: Extend library FIRST (add to validation package)
3. Then: Import from library in application code

**Never:**
- Write inline validation in route handlers
- Copy-paste validation across files
- Create util functions for validation (should be in library)

---

Files to update:
1. workspace-titlerun/titlerun-api/CLAUDE.md
2. workspace-titlerun/titlerun-app/CLAUDE.md

Commit: 'docs: add @titlerun/validation library to CLAUDE.md'"
```

**ETA:** 30 minutes

---

### Task 2.2: Process Documentation

**Status:** ✅ COMPLETE

Files created:
- `workspace-titlerun/NEW-LIBRARY-PROCESS.md` (3.9KB)
- Updated `skills/titlerun-code-review/references/titlerun-anti-patterns.md`

---

### Task 2.3: Codebase Scan

**Status:** ✅ COMPLETE

- Script created: `titlerun-api/scripts/scan-duplicate-patterns.sh`
- First scan run: `titlerun-api/reports/codebase-scan-2026-03-01.txt`
- Results: Only ID validation duplicates found (addressed in Phase 1)

---

### Task 2.4: Weekly Review Update

**Status:** ✅ COMPLETE

- Updated `HEARTBEAT.md` with Library Health Check step
- Runs weekly as part of Sunday portfolio review

---

## Phase 3: Validation (15 min)

### Task 3.1: Run Code Review on Migrated Files (15 min)

**After Phase 1 migrations complete:**

**Command:**
```
Run titlerun-code-review skill on migrated files:

"Review changes in titlerun-api/src/routes/tradeEngine.js and titlerun-api/src/utils/helpers.js"

Expected result:
- Score: 95+ (no more manual validation anti-pattern)
- CRITICAL: 0
- HIGH: 0
- MEDIUM: 0 (or minor improvements)
- LOW: 0

If score <95: Review findings, fix issues, re-review.
```

**ETA:** 15 minutes

---

## Summary

**Total time:** 2 hours (45 min code + 60 min docs + 15 min validation)

**Delegatable to Rush:**
- ✅ Task 1.1: Migrate tradeEngine.js (15 min)
- ✅ Task 1.2: Migrate helpers.js (15 min)
- ✅ Task 1.3: Add ESLint rule (15 min)
- ✅ Task 2.1: Update CLAUDE.md (30 min)
- ✅ Task 3.1: Run code review (15 min)

**Total Rush time:** 90 minutes (can spawn 3 agents in parallel → 30 min wall-clock time)

**Already complete:**
- ✅ NEW-LIBRARY-PROCESS.md
- ✅ Anti-patterns documentation updated
- ✅ Codebase scan script + first run
- ✅ HEARTBEAT.md updated

---

## Execution Plan (Tonight)

**Option 1: Sequential (90 min total)**
1. Spawn Rush → Task 1.1 (15 min)
2. Wait → Task 1.2 (15 min)
3. Wait → Task 1.3 (15 min)
4. Wait → Task 2.1 (30 min)
5. Wait → Task 3.1 (15 min)

**Option 2: Parallel (30 min wall-clock)**
1. Spawn 3 Rush agents simultaneously:
   - Agent 1: Task 1.1 + 1.2 (30 min)
   - Agent 2: Task 1.3 (15 min)
   - Agent 3: Task 2.1 (30 min)
2. After all complete → Task 3.1 (15 min)

**Recommended:** Option 2 (parallel) → Done in 45 minutes

---

## Success Criteria

**Code:**
- ✅ tradeEngine.js migrated (71 lines → 5 lines)
- ✅ helpers.js migrated (6 instances removed)
- ✅ ESLint rule added (prevents future violations)
- ✅ Tests pass
- ✅ Code review score 95+

**Documentation:**
- ✅ CLAUDE.md updated (both repos)
- ✅ NEW-LIBRARY-PROCESS.md created
- ✅ Anti-patterns updated
- ✅ HEARTBEAT.md updated

**Process:**
- ✅ Codebase scan script ready
- ✅ Weekly library health check scheduled
- ✅ Future violations prevented (ESLint + code review skill)

---

**Status:** ✅ Ready to execute

**Next:** Spawn Rush agents with tasks above

---

**Created:** 2026-03-01 18:38 EST  
**Owner:** Jeff (Portfolio Manager)  
**Executor:** Rush (TitleRun coding agent)
