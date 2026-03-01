# Test Matrix: @titlerun/validation
**Coverage Target:** 100% of adversarial audit findings  
**Test Count:** 100+ test cases  
**Created:** 2026-02-28

---

## Test Organization

```
packages/validation/src/__tests__/
  normalizeId.test.ts       → 45 tests
  idMatch.test.ts           → 30 tests
  constants.test.ts         → 5 tests
  integration.test.ts       → 15 tests
  performance.test.ts       → 10 tests
  adversarial.test.ts       → 20 tests
  ────────────────────────────────────
  TOTAL:                      125 tests
```

---

## 1. normalizeId() - 45 Tests

### Happy Path (10 tests)
- [ ] Valid number IDs: `123 → 123`
- [ ] Valid string IDs: `"123" → 123`
- [ ] Trimmed strings: `" 123 " → 123`
- [ ] Leading zeros: `"0123" → 123`
- [ ] Zero ID: `0 → 0`
- [ ] MAX_SAFE_INTEGER: `9007199254740991 → 9007199254740991`
- [ ] Large valid ID: `1000000 → 1000000`
- [ ] Single digit: `"5" → 5`
- [ ] Multiple spaces: `"  123  " → 123`
- [ ] Tab/newline: `"\t123\n" → 123`

### Null/Undefined (2 tests)
- [ ] null input: `null → null`
- [ ] undefined input: `undefined → null`

### Empty/Whitespace (4 tests)
- [ ] Empty string: `"" → null`
- [ ] Whitespace only (spaces): `"   " → null`
- [ ] Whitespace only (tabs): `"\t\t" → null`
- [ ] Whitespace only (newlines): `"\n\n" → null`

### Invalid Types (8 tests)
- [ ] Object: `{id: 123} → throws TypeError`
- [ ] Array: `[123] → throws TypeError`
- [ ] Function: `() => 123 → throws TypeError`
- [ ] Symbol: `Symbol('123') → throws TypeError`
- [ ] Boolean true: `true → throws TypeError`
- [ ] Boolean false: `false → throws TypeError`
- [ ] BigInt: `123n → throws TypeError` (future: may accept)
- [ ] Date: `new Date() → throws TypeError`

### Invalid Numbers (7 tests)
- [ ] NaN: `NaN → null`
- [ ] Infinity: `Infinity → null`
- [ ] -Infinity: `-Infinity → null`
- [ ] Negative: `-5 → null`
- [ ] Float: `123.45 → null`
- [ ] Scientific notation: `1e10 → 10000000000 OR null` (depends on MAX_SAFE_INTEGER)
- [ ] MAX_SAFE_INTEGER + 1: `9007199254740992 → null`

### Invalid Strings (6 tests)
- [ ] Non-numeric: `"abc" → null`
- [ ] Mixed alphanumeric: `"12abc" → null`
- [ ] Hex: `"0x123" → null` (or convert to decimal if we support it)
- [ ] Negative string: `"-5" → null`
- [ ] Float string: `"123.45" → null`
- [ ] Overflow string: `"9007199254740993" → null`

### DOS Prevention (3 tests)
- [ ] 2MB whitespace: `" ".repeat(1000000) + "123" → null` (TOO_LONG)
- [ ] Very long valid number: `"1234567890123456789" → null` (exceeds safe integer)
- [ ] MAX_STRING_LENGTH exceeded: string >1000 chars → null

### Precision Edge Cases (5 tests)
- [ ] String parsed before length check (WRONG): `"9007199254740993"` loses precision
- [ ] String length checked BEFORE parse (CORRECT): rejected before conversion
- [ ] Leading zeros don't affect precision: `"0000123" → 123`
- [ ] Trailing zeros on float: `"123.0" → null` (not an integer)
- [ ] Very large number loses precision: `9007199254740993 === 9007199254740992` (rejected)

---

## 2. idMatch() - 30 Tests

### Happy Path (8 tests)
- [ ] Same number: `idMatch(123, 123) → true`
- [ ] Same string: `idMatch("123", "123") → true`
- [ ] Cross-type match: `idMatch(123, "123") → true`
- [ ] Trimmed match: `idMatch(" 123 ", "123") → true`
- [ ] Leading zeros match: `idMatch("0123", "123") → true`
- [ ] Zero match: `idMatch(0, "0") → true`
- [ ] Large ID match: `idMatch(9007199254740991, "9007199254740991") → true`
- [ ] Reference equality fast path: `idMatch(x, x) → true` (where x = 123)

### Non-Matching (4 tests)
- [ ] Different numbers: `idMatch(123, 456) → false`
- [ ] Different strings: `idMatch("123", "456") → false`
- [ ] One valid, one invalid: `idMatch(123, null) → false`
- [ ] Both invalid: `idMatch(null, null) → false`

### Null/Undefined (4 tests)
- [ ] Both null: `idMatch(null, null) → false`
- [ ] Both undefined: `idMatch(undefined, undefined) → false`
- [ ] One null, one valid: `idMatch(null, 123) → false`
- [ ] One undefined, one valid: `idMatch(undefined, "123") → false`

### Type Errors (6 tests)
- [ ] Object comparison: `idMatch({}, {}) → throws TypeError`
- [ ] Array comparison: `idMatch([], []) → throws TypeError`
- [ ] Function comparison: `idMatch(() => {}, () => {}) → throws TypeError`
- [ ] Symbol comparison: `idMatch(Symbol(), Symbol()) → throws TypeError`
- [ ] One object, one valid: `idMatch({id: 123}, 123) → throws TypeError`
- [ ] Mixed invalid types: `idMatch(Symbol(), []) → throws TypeError`

### NaN/Infinity Edge Cases (3 tests)
- [ ] NaN comparison: `idMatch(NaN, NaN) → false` (both invalid)
- [ ] Infinity comparison: `idMatch(Infinity, Infinity) → false` (both invalid)
- [ ] NaN vs number: `idMatch(NaN, 123) → false`

### Performance Fast Paths (3 tests)
- [ ] Reference equality skips validation: `const x = 123; idMatch(x, x)` uses fast path
- [ ] Both numbers fast path: `idMatch(123, 456)` no string conversion
- [ ] Both strings fast path: `idMatch("123", "456")` no number conversion

### Whitespace/Trimming (2 tests)
- [ ] Leading whitespace: `idMatch(" 123", "123") → true`
- [ ] Trailing whitespace: `idMatch("123 ", "123") → true`

---

## 3. Constants - 5 Tests

- [ ] ROSTER_MATCH_THRESHOLD is 0.7
- [ ] MAX_PREFILL_ASSETS is 100
- [ ] MAX_SAFE_ID equals Number.MAX_SAFE_INTEGER
- [ ] TEAM_NOT_FOUND is -1
- [ ] VALIDATION_VERSION is valid semver format

---

## 4. Integration Tests - 15 Tests

### Frontend → Backend Communication (5 tests)
- [ ] Frontend sends valid ID → backend accepts
- [ ] Frontend sends invalid ID (normalized to null) → shows error before API call
- [ ] Frontend sends version header → backend validates version
- [ ] Frontend on v1, backend on v1 → compatible
- [ ] Frontend on v1, backend on v2 → 426 Upgrade Required

### Type Consistency (5 tests)
- [ ] Frontend normalizes "123" → sends 123 → backend accepts
- [ ] Frontend normalizes " 123 " → sends 123 → backend accepts
- [ ] Frontend and backend idMatch agree: `idMatch(123, "123")` both return true
- [ ] Frontend extracts ID → backend validates ID → both use same rules
- [ ] Mixed type roster ["123", 123] → both normalize to [123, 123]

### Error Handling Consistency (5 tests)
- [ ] Frontend: normalizeId(null) → null → shows UI error
- [ ] Backend: normalizeId(null) → null → throws BadRequestError(400)
- [ ] Frontend: idMatch({}, {}) → throws TypeError → caught in try/catch
- [ ] Backend: normalizeId({}) → throws TypeError → 500 error
- [ ] Frontend never throws from components (all errors caught)

---

## 5. Performance Tests - 10 Tests

### Benchmarks (5 tests)
- [ ] normalizeId(number) <0.01ms (fast path)
- [ ] normalizeId(string) <0.02ms (parse)
- [ ] idMatch(same reference) <0.005ms (fastest path)
- [ ] idMatch(cross-type) <0.02ms (normalize both)
- [ ] 1000 normalizeId calls <20ms total

### DOS Prevention (5 tests)
- [ ] 2MB whitespace string rejected in <100ms
- [ ] 10K roster rank calculation <5 seconds
- [ ] 100 concurrent normalizeId calls <200ms p99
- [ ] MAX_STRING_LENGTH prevents memory exhaustion
- [ ] Repeated idMatch calls don't accumulate memory

---

## 6. Adversarial Tests - 20 Tests

### VULN #1: Dual idMatch Implementations (2 tests)
- [ ] Frontend idMatch("0123", "123") matches backend behavior
- [ ] Frontend and backend normalize "0123" identically

### VULN #2: Set Deduplication Broken (3 tests)
- [ ] Mixed types ["123", 123, " 123"] dedupe to single value
- [ ] Roster match calculation dedupes AFTER normalization
- [ ] Cannot achieve >100% match via type confusion

### VULN #3: MAX_SAFE_INTEGER Validated After Conversion (2 tests)
- [ ] String "9007199254740993" rejected BEFORE parsing
- [ ] Length check prevents precision loss

### VULN #4: Two Validation Functions (2 tests)
- [ ] Only ONE normalizeId exists (shared library)
- [ ] Backend and frontend import same function

### VULN #5: Fixes Don't Exist (2 tests)
- [ ] Fix #3 (sessionStorage) integrated and tested
- [ ] Fix #5 (ID extraction) integrated and tested

### PERF #1: O(n²) Rank Calculation (2 tests)
- [ ] 10K roster limited by MAX_ROSTER_SIZE
- [ ] Rank calculation times out if >5 seconds

### PERF #2: String Trimming DOS (2 tests)
- [ ] 2MB whitespace rejected by MAX_STRING_LENGTH
- [ ] Trim happens only once per normalization

### PERF #3: Early Return Validates Types (2 tests)
- [ ] Reference equality (a === b) returns immediately
- [ ] No type validation on fast path for valid primitives

### RACE #1: Concurrent Roster Updates (1 test)
- [ ] Version header detects stale client

### RACE #2: Cross-Tab sessionStorage (2 tests)
- [ ] Multiple tabs reading sessionStorage simultaneously works
- [ ] One tab writing doesn't corrupt other tab's read

---

## Test Execution Strategy

### Phase 1: Unit Tests (normalizeId, idMatch, constants)
Run first, block on failure
```bash
npm run test -- normalizeId.test.ts
npm run test -- idMatch.test.ts
npm run test -- constants.test.ts
```

### Phase 2: Integration Tests
Run after unit tests pass
```bash
npm run test -- integration.test.ts
```

### Phase 3: Performance Tests
Run on dedicated machine (no other load)
```bash
npm run test:perf
```

### Phase 4: Adversarial Tests
Run with expert panel review
```bash
npm run test -- adversarial.test.ts
```

### Phase 5: Full Suite (CI/CD)
Run on every commit
```bash
npm run test:coverage
# Required: 100% line coverage
# Required: 100% branch coverage
```

---

## Coverage Requirements

| File | Line Coverage | Branch Coverage | Function Coverage |
|------|---------------|-----------------|-------------------|
| normalizeId.ts | 100% | 100% | 100% |
| idMatch.ts | 100% | 100% | 100% |
| constants.ts | 100% | N/A | N/A |
| index.ts | 100% | N/A | 100% |
| **TOTAL** | **100%** | **100%** | **100%** |

**Quality Gate:** All tests must pass with 100% coverage before Phase 1 completion.

---

## Regression Prevention

**After implementation, these tests prevent:**
- Type confusion bugs (VULN #1, #2)
- Precision loss (VULN #3)
- Validation drift (VULN #4)
- DOS attacks (PERF #1, #2, #3)
- Race conditions (RACE #1, #2)

**If any test fails in the future:**
1. Investigate root cause
2. Document in issues.md
3. Fix bug
4. Add regression test
5. Update TEST-MATRIX.md

---

## Test Data Sets

### Edge Case IDs (use in multiple tests)
```javascript
export const EDGE_CASE_IDS = {
  // Valid
  valid: [0, 123, 9007199254740991, "123", " 123 ", "0123"],
  
  // Invalid (return null)
  invalidNull: [null, undefined],
  invalidEmpty: ["", "   ", "\t\t", "\n\n"],
  invalidNumber: [NaN, Infinity, -Infinity, -5, 123.45, 9007199254740992],
  invalidString: ["abc", "12abc", "-5", "123.45", "9007199254740993"],
  
  // Invalid (throw TypeError)
  invalidType: [{}, [], () => {}, Symbol(), true, false, 123n],
  
  // DOS
  dos: [" ".repeat(1000000) + "123", "x".repeat(1001)]
};
```

---

## Mutation Testing

Use Stryker to verify tests actually catch bugs:
```bash
npm run test:mutation
# Required: >95% mutation score
```

**Example mutations:**
- Change `0.7` to `0.6` → tests should fail
- Remove `.trim()` → tests should fail
- Change `>= 0` to `> 0` → tests should fail (zero ID rejected)
- Remove `isFinite` check → tests should fail (NaN accepted)

---

## Test Maintenance

**When adding new validation rules:**
1. Add to validation-schema.ts
2. Add test cases to this matrix
3. Update test count
4. Run full suite
5. Update coverage report

**When fixing bugs:**
1. Add regression test FIRST
2. Verify test fails (proves it catches bug)
3. Fix bug
4. Verify test passes
5. Add to adversarial test suite

---

**Total Test Count:** 125 tests  
**Coverage Target:** 100%  
**Status:** Ready for Phase 1 implementation

