# Adversarial Review Checklist — Migration Validation

**Date:** 2026-03-01  
**Target:** @titlerun/validation library migration  
**Reviewer:** Adversarial sub-agent

---

## Review Scope

**Files Changed:**
1. `src/routes/tradeEngine.js` — Migrated to library
2. `eslint.config.js` — Enforcement rule + helpers.js exclusion
3. `CLAUDE.md` (both repos) — Documentation updates
4. `package.json` — ESLint dependency added

**NOT Changed (Intentional):**
- `src/utils/helpers.js` — Different use case (comparison vs validation)

---

## Critical Questions (Break-This Mentality)

### 1. Does the Library Actually Work?

**Check:**
- [ ] Is @titlerun/validation installed and linked?
- [ ] Does `require('@titlerun/validation')` work?
- [ ] Are all tests passing?
- [ ] Did any test behavior change?

**Test:**
```bash
cd titlerun-api
npm test
# Should show: 81 tests passing
```

**Edge cases to verify:**
- What if library is not installed?
- What if import path is wrong?
- Does error handling still work correctly?

---

### 2. Did We Actually Remove All Manual Validation?

**Check:**
- [ ] Is tradeEngine.js actually shorter? (should be ~56 lines vs 79 before)
- [ ] Is the manual `normalizeId` function completely gone?
- [ ] Are there any remaining Number.isFinite/isInteger calls in tradeEngine.js?

**Scan:**
```bash
grep -n "Number.isFinite\|Number.isInteger" src/routes/tradeEngine.js
# Should return: (empty) or only comments
```

**Red flags:**
- If grep finds anything → migration incomplete
- If file is still ~79 lines → nothing was removed
- If tests fail → regression introduced

---

### 3. Does the ESLint Rule Actually Work?

**Check:**
- [ ] Does ESLint catch manual validation in NEW code?
- [ ] Is helpers.js properly excluded?
- [ ] Does `npm run lint` pass?

**Test the rule:**
```bash
# Create a test file with manual validation
echo "const x = 5; if (!Number.isFinite(x)) throw new Error();" > src/test-eslint.js

# Run lint
npm run lint

# Should show: Error caught in test-eslint.js
# Should NOT show: Error in helpers.js

# Clean up
rm src/test-eslint.js
```

**Questions:**
- What if someone adds manual validation in a NEW file?
- Will CI catch it before merge?
- Are there false positives?

---

### 4. Is the Documentation Accurate?

**Check CLAUDE.md (both repos):**
- [ ] Are code examples correct?
- [ ] Do the examples actually work if copy-pasted?
- [ ] Is the anti-pattern section clear?
- [ ] Are coverage stats correct? (142 tests, 99.28%)

**Test an example:**
```javascript
// From CLAUDE.md:
const { normalizeId } = require('@titlerun/validation');
const userId = normalizeId(req.params.userId);

// Does this actually work?
// What if userId is undefined? null? 'abc'?
```

**Red flags:**
- Examples that would throw errors if used
- Incorrect import paths
- Wrong function signatures

---

### 5. Behavior Preservation (Regression Check)

**Critical:** Does tradeEngine.js behave EXACTLY the same as before?

**Compare:**

**Before (manual validation):**
```javascript
normalizeId('123')   // → 123
normalizeId(456)     // → 456
normalizeId(null)    // → null
normalizeId('abc')   // → throws TypeError
normalizeId(-1)      // → throws TypeError
```

**After (library):**
```javascript
normalizeId('123')   // → should still be 123
normalizeId(456)     // → should still be 456
normalizeId(null)    // → should still be null
normalizeId('abc')   // → should still throw TypeError
normalizeId(-1)      // → should still throw TypeError
```

**Test:**
Check test results before/after. Did any test change behavior?

---

### 6. Error Messages (UX Check)

**Check:** Are error messages still clear?

**Before:**
```
TypeError: ID must be a finite number
TypeError: ID must be an integer
TypeError: ID must be non-negative
```

**After (using library):**
```
// Should be similar or better
```

**Test:**
```javascript
try {
  normalizeId('invalid');
} catch (e) {
  console.log(e.message);  // Is this helpful?
}
```

**Red flags:**
- Generic errors ("Invalid input")
- No indication of what went wrong
- Stack traces that don't help debugging

---

### 7. Edge Cases (Security Review)

**What happens if:**
- [ ] Library is not installed? (require() fails)
- [ ] Library version is incompatible?
- [ ] Someone passes malicious input?
- [ ] Input is an object pretending to be a number?

**Test:**
```javascript
// These should all be handled safely
normalizeId({ valueOf: () => 123 })  // Object with valueOf
normalizeId(Object.create(null))     // Object without prototype
normalizeId(new Number(123))         // Number object
normalizeId([123])                   // Array
```

**Questions:**
- Does the library handle these?
- Or does tradeEngine need additional validation?

---

### 8. Performance (Regression Check)

**Question:** Is the library version slower or faster?

**Before:** Manual validation (inline checks)  
**After:** Library call (function overhead)

**Measure:**
```javascript
// Time 1000 validations
console.time('validate');
for (let i = 0; i < 1000; i++) {
  normalizeId(i);
}
console.timeEnd('validate');
```

**Acceptable:**
- Slightly slower OK (library has more features)
- Much slower (>2x) → investigate

---

### 9. Integration Points

**Check:** Where is tradeEngine.js used?

**Scan:**
```bash
grep -r "tradeEngine\|normalizeId" src/ --exclude-dir=node_modules
```

**Questions:**
- Are there files that import tradeEngine.js?
- Do they still work after migration?
- Did we break any downstream code?

---

### 10. Commit Quality

**Check:**
- [ ] Are commit messages descriptive?
- [ ] Are commits atomic (one logical change each)?
- [ ] Can commits be reverted cleanly if needed?

**Review:**
```bash
git log --oneline -5
```

**Good:**
- "refactor: migrate tradeEngine.js to @titlerun/validation"
- "chore: add ESLint rule to enforce @titlerun/validation usage"
- "docs: add @titlerun/validation library to CLAUDE.md"

**Bad:**
- "fix stuff"
- "update files"
- "wip"

---

## Adversarial Findings Template

**For each issue found:**

```markdown
## [SEVERITY]: [Issue Title]

**File:** [exact path]
**Line:** [line number if applicable]

**What's wrong:**
[Specific description]

**Why it matters:**
[Impact/risk]

**How to test:**
[Steps to reproduce]

**Recommended fix:**
[Concrete solution]
```

**Severity levels:**
- **CRITICAL:** Blocks deployment (breaking change, security issue)
- **HIGH:** Should fix before deploy (functionality issue, regression)
- **MEDIUM:** Should fix soon (code quality, documentation issue)
- **LOW:** Nice to have (minor improvements)

---

## Final Checklist

Before approving for deployment:

- [ ] All tests pass
- [ ] ESLint passes (with helpers.js excluded)
- [ ] No regressions detected
- [ ] Documentation accurate
- [ ] Code quality acceptable
- [ ] Commits well-formed
- [ ] No CRITICAL or HIGH issues found

**If all checked:** ✅ Approve for deployment

**If any unchecked:** ⚠️ Document issues, fix, re-review

---

**Created:** 2026-03-01  
**Purpose:** Adversarial validation before deployment  
**Next:** Run adversarial review using this checklist
