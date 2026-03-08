# Adversarial Audit: API 500 Error Fixes

**Auditor:** Backend Engineer (Opus 4.6)
**Date:** 2026-03-08
**Score:** 72/100

**Summary:** The three fixes correctly prevent the 500 errors. Column names now match migrations, validation matches DB constraints. However, one fix introduces a semantic data accuracy problem, tests rely entirely on mocks (never validate actual SQL), and there are additional latent column-mismatch bugs in adjacent files.

---

## Critical Issues (Block Merge)

### CRIT-1: `updated_at` Is NOT a Valid Proxy for `last_login_at`
**File:** `src/routes/onboarding.js:146`
**Severity:** Critical (data accuracy)

The fix changed `u.last_login_at` → `u.updated_at` to prevent the 500 error. But `updated_at` on the `users` table only changes when the **user record itself** is modified (password change, display name edit, subscription tier change). It does NOT change on login.

**Impact:** The `active_today` metric in `/api/onboarding/stats` will **severely undercount** active users. A user who logs in daily but never edits their profile will never appear as "active today." This is a social proof endpoint shown to new users — displaying "0 active today" destroys trust.

**Evidence:**
```sql
-- users table schema (src/index.js:400-408):
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    subscription_tier VARCHAR(20) DEFAULT 'free',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP  -- ← Only set on record modification
);
```

No login handler updates `updated_at`. The auth routes (`src/routes/auth.js`) don't `UPDATE users SET updated_at = NOW()` on successful login.

**Fix options (pick one):**
1. Add `last_login_at TIMESTAMPTZ` column to `users` table via migration, update it on login in `auth.js`
2. Update `users.updated_at = NOW()` in the login handler (quick hack, pollutes semantics)
3. Track login events in a separate `user_sessions` or `login_events` table
4. Use `connected_accounts.updated_at` or `onboarding_sessions` for recency proxy

**Recommendation:** Option 1. Add a proper `last_login_at` column. The original code was correct in intent — it just referenced a column that was never created.

---

## High Priority (Fix Before Deploy)

### HIGH-1: `auth.js` References Potentially Missing Columns
**File:** `src/routes/auth.js:179-182`
**Severity:** High (potential 500 on /api/auth/me)

```js
`SELECT alert_preferences, display_preferences, notification_email, notification_push
 FROM user_preferences WHERE user_id = $1`
```

These columns (`alert_preferences`, `display_preferences`, `notification_email`, `notification_push`) exist in the base table created at startup in `src/index.js:530-536`. However:
- They overlap with the newer notification columns from migration 047 (`trade_alerts`, `value_change_alerts`, etc.)
- `notification_email` vs `email_notifications` — **two different columns for email notification toggle**
- `notification_push` vs `push_notifications` — **two different columns for push toggle**

This means there are **TWO parallel notification preference systems** in the same table. The Settings page (`userPreferences.js` PUT handler) writes to `email_notifications`/`push_notifications`, but `/api/auth/me` reads from `notification_email`/`notification_push`. **User changes to notification settings may not be reflected in the profile response.**

**Fix:** Consolidate to one set of columns. Migrate `notification_email` → `email_notifications` and `notification_push` → `push_notifications`, then update `auth.js` and `users.js`.

### HIGH-2: `users.js` Has Same Dual-Column Problem
**File:** `src/routes/users.js:96`
**Severity:** High (same issue as HIGH-1)

```js
`SELECT alert_preferences, display_preferences, notification_email, notification_push
 FROM user_preferences WHERE user_id = $1`
```

Same outdated column references as HIGH-1. Both `/api/users/me` endpoints read from the old columns.

### HIGH-3: Tests Don't Validate SQL Correctness
**File:** `src/tests/onboarding-preferences.test.js`, `src/tests/onboarding-flow.test.js`
**Severity:** High (false confidence)

All 15 tests mock `query()` and return pre-built response objects. **The SQL strings are never executed against a database.** This means:
- Column name mismatches in SQL → **not caught** by tests
- Constraint violations → **not caught** by tests
- The very class of bug these fixes address (wrong column names) → **not caught** by the test suite

The tests validate JavaScript logic and HTTP routing, but provide zero confidence that the SQL is correct.

**Recommendation:** Add at least one integration test suite that runs against a test database (e.g., Docker Postgres) to validate the actual queries.

---

## Medium Priority (Polish)

### MED-1: Duplicate Preference CRUD Routes
**Files:** `src/routes/userPreferences.js` AND `src/routes/onboardingPreferences.js`
**Severity:** Medium (maintenance risk)

Both files provide POST/GET/PUT for `user_preferences` with overlapping functionality:
- `userPreferences.js` POST uses `league_type` → `league_type_preference` (aliased)
- `onboardingPreferences.js` POST uses `leagueType` → `league_type_preference` (mapped)

**Different input field names** for the same database column:
| Frontend field | userPreferences.js | onboardingPreferences.js |
|---|---|---|
| League type | `league_type` | `leagueType` |
| Priority | `primary_priority` | `priority` |

If either file drifts, you get another 500 error. This is exactly the class of bug that caused the original issues.

**Fix:** Consolidate to one route file, or extract shared column definitions to a constants module.

### MED-2: PUT Handler Won't Save for New Users
**File:** `src/routes/userPreferences.js:227`
**Severity:** Medium

```js
INSERT INTO user_preferences (user_id) VALUES ($1)
ON CONFLICT (user_id) DO UPDATE SET ${updates.join(', ')}
```

If no `user_preferences` row exists, this INSERT creates a row with **only** `user_id` — none of the notification preferences are included in the INSERT columns. Since there's no conflict, the DO UPDATE SET clause **never fires**. The notification preferences are silently discarded.

In practice, `auth.js:66` creates the row on registration, so this is unlikely to trigger. But it's a latent bug if that registration path ever changes.

### MED-3: No Transaction Wrapping for Multi-Query Operations
**File:** `src/routes/onboarding.js` (processOnboarding function)
**Severity:** Medium

The onboarding flow updates `onboarding_sessions`, creates `connected_accounts`, and processes leagues in separate queries without a transaction. If the process crashes mid-way:
- Session could be `in_progress` forever with no cleanup
- Connected account could be created but session shows error
- No automatic rollback

### MED-4: Portfolio Value Placeholder Calculation
**File:** `src/routes/onboarding.js:382`
**Severity:** Medium (UX concern)

```js
totalValue = playersImported * 1500; // Placeholder calculation
```

This is still a placeholder. Users see a fake portfolio value during onboarding. Fine for MVP, but should be flagged for replacement.

---

## Positive Findings

1. ✅ **Column names in `userPreferences.js` now match migration 045** — `league_type_preference` and `priority` are correct
2. ✅ **AS aliases preserve API contract** — `league_type_preference AS league_type` means frontend doesn't need changes
3. ✅ **Validation in `onboardingPreferences.js` now matches DB constraint** — `'beginner'` aligns with `CHECK (experience_level IN ('beginner', 'intermediate', 'veteran'))`
4. ✅ **COALESCE usage in upsert is correct** — progressive save properly preserves existing values
5. ✅ **Parameterized queries throughout** — no SQL injection risk
6. ✅ **SSE connection lifecycle management** — proper state machine (`active` → `completing` → `closed`) prevents race conditions
7. ✅ **Rate limiting on all write endpoints** — prevents abuse
8. ✅ **Error handling patterns are consistent** — proper use of ValidationError/NotFoundError

---

## Test Coverage Gaps

| Gap | Risk | Recommendation |
|-----|------|----------------|
| No integration tests (SQL never hits a DB) | HIGH — column mismatches undetectable | Add Docker Postgres test suite |
| `updated_at` accuracy not tested | HIGH — metric silently wrong | Test with real login flow |
| No test for PUT creating new user row | MED — notification prefs lost | Add edge case test |
| No test for concurrent upserts | LOW — PostgreSQL handles it | Nice-to-have |
| No test for `onboardingPreferences.js` with `'new'` value | MED — regression guard | Add test asserting `'new'` is rejected |
| No test for `/api/onboarding/stats` query | HIGH — `updated_at` metric untested | Add with seeded users |

---

## Recommendations

### Immediate (Before Merge)
1. **Add `last_login_at` column** to `users` table (new migration). Update login handler in `auth.js` to set it. Revert `onboarding.js` to use `last_login_at`. (CRIT-1)
2. **Decide on notification column naming** — `notification_email`/`notification_push` vs `email_notifications`/`push_notifications`. Consolidate. (HIGH-1, HIGH-2)

### Before Launch (April 15)
3. **Add integration test infrastructure** — even 5 tests hitting a real Postgres would catch this entire class of bugs (HIGH-3)
4. **Extract column constants** — shared `PREFERENCE_COLUMNS` constant used by both route files (MED-1)
5. **Add regression test** — assert `experience_level: 'new'` returns 400, not 500 (MED-5)

### Post-Launch
6. **Audit all `user_preferences` queries** across the codebase for column consistency
7. **Consider adding a schema validation layer** (e.g., Knex or Drizzle ORM) to catch column mismatches at build time
8. **Replace portfolio value placeholder** (MED-4)

---

## Files Examined

| File | Status |
|------|--------|
| `src/routes/onboarding.js` | Fixed, but `updated_at` proxy is semantically wrong |
| `src/routes/userPreferences.js` | Fixed correctly, column names match migration |
| `src/routes/onboardingPreferences.js` | Fixed correctly, validation matches constraint |
| `migrations/045_smart_onboarding.sql` | ✅ Verified — columns and constraints confirmed |
| `migrations/047_notification_preferences.sql` | ✅ Verified — notification columns confirmed |
| `migrations/058_user_league_preferences.sql` | ✅ Verified — `selected_roster_id` confirmed |
| `src/index.js` (table creation) | ⚠️ `users` table has no `last_login_at`; `user_preferences` has dual notification columns |
| `src/routes/auth.js` | ⚠️ References old column names (`notification_email`/`notification_push`) |
| `src/routes/users.js` | ⚠️ Same old column name references |
| `src/tests/onboarding-flow.test.js` | ⚠️ All mocked — no SQL validation |
| `src/tests/onboarding-preferences.test.js` | ⚠️ All mocked — no SQL validation |
