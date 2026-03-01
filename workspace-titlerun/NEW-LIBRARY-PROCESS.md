# New Library Process — TitleRun

**When a new shared library is created or updated, follow this checklist to ensure adoption.**

---

## Step 1: Document in CLAUDE.md

**Files to update:**
- `titlerun-api/CLAUDE.md`
- `titlerun-app/CLAUDE.md`

**What to add:**
```markdown
### @titlerun/[library-name]

**When to use:** [Specific use cases]

**Installation:** `npm link @titlerun/[library-name]`

**Examples:**
[Code examples showing common usage]

**Anti-pattern:** [What NOT to do now that library exists]
- ❌ Don't: [Old manual pattern]
- ✅ Do: [New library pattern]

**Enforcement:** [ESLint rule if applicable]
```

---

## Step 2: Search for Migration Candidates

**Run codebase scan:**
```bash
# Search for patterns that should use new library
grep -r "[pattern-to-replace]" src/

# Example: For validation library
grep -r "Number.isFinite\|Number.isInteger" src/
```

**Create migration PRs:**
- One PR per file (easier to review)
- Include before/after code snippets
- Run tests to verify no regressions

---

## Step 3: Add ESLint Rule (If Applicable)

**When:** Library enforces a new standard (e.g., validation, formatting)

**Update:** `.eslintrc.js`

**Pattern:**
```javascript
'no-restricted-syntax': [
  'error',
  {
    selector: '[AST selector for old pattern]',
    message: 'Use @titlerun/[library] instead. See CLAUDE.md for examples.'
  }
]
```

**Verify:**
```bash
npm run lint  # Should catch old patterns
```

---

## Step 4: Update Anti-Patterns Documentation

**File:** `skills/titlerun-code-review/references/titlerun-anti-patterns.md`

**Add new entry:**
```markdown
### N. [Anti-Pattern Name]

**Pattern:**
[Code showing old manual way]

**Why it's wrong:**
We have @titlerun/[library] that handles this (as of YYYY-MM-DD)

**Correct:**
[Code showing library usage]

**Check:** Search for [old pattern signature]

**Severity:** HIGH (we have library for this, use it)
```

**Why:** Code review skill will catch violations in future PRs

---

## Step 5: Announce to Team

**For human developers:**
- Slack/Discord announcement
- Team meeting mention
- Update README.md

**For AI coding agents:**
- ✅ CLAUDE.md updated (agents read this on every session)
- ✅ ESLint rule added (prevents violations in CI)
- ✅ Code review skill updated (catches in PR review)

**No additional announcement needed** — agents discover via CLAUDE.md

---

## Step 6: Monitor Adoption

**First week:**
- Check CI logs for ESLint violations
- Check code review reports for anti-pattern flags
- Manual scan for remaining old patterns

**After migrations complete:**
- Remove old utility functions (if any)
- Archive migration PRs
- Update library version in package.json

---

## Checklist (Copy This for Each New Library)

- [ ] Library published to npm (or linked locally)
- [ ] CLAUDE.md updated in both repos (API + App)
- [ ] Codebase scan completed (identified migration candidates)
- [ ] Migration PRs created (one per file)
- [ ] ESLint rule added (if applicable)
- [ ] Code review anti-patterns updated
- [ ] Team announcement sent (humans)
- [ ] Tests pass after migrations
- [ ] Old utility functions removed (if any)
- [ ] Monitor adoption (first week)

---

## Example: @titlerun/validation

**Date:** 2026-03-01  
**Library:** `@titlerun/validation` v1.0.0

**Checklist:**
- [x] Library published
- [x] CLAUDE.md updated (both repos)
- [x] Codebase scan: 10 instances found (helpers.js, tradeEngine.js)
- [x] Migration PRs: 2 files migrated
- [x] ESLint rule added
- [x] Anti-patterns updated (Anti-Pattern #2)
- [x] Team announcement: N/A (Rush is the only developer)
- [x] Tests pass: ✅
- [x] Old utility functions: Removed from helpers.js, tradeEngine.js
- [ ] Monitor adoption: Week of 2026-03-02

**Result:** 200 lines → 2 lines (99% reduction), 142 tests inherited

---

**Created:** 2026-03-01  
**Last updated:** 2026-03-01  
**Owner:** Jeff (Portfolio Manager)
