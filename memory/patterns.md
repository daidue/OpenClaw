# Pattern Learning — What Works & What Doesn't

Auto-generated learnings from completed tasks. Read this before starting similar work.

---

## Pattern: Production Deployment Database Crash (2026-03-02)
**Context:** Deployed titlerun-api to Railway staging, database connection reset loop

**What Worked:**
- Emergency diagnosis via Railway logs (ECONNRESET pattern)
- Immediate DATABASE_URL verification
- Connection pool reduction (20 → 3)
- SSL configuration fix (`rejectUnauthorized: false`)
- KeepAlive settings prevented future resets

**What Didn't:**
- Assumed staging DATABASE_URL was correct (it pointed to non-existent DB)
- Didn't verify URL before deploying
- Initial pool size too large for free tier (20 max connections)

**Prompt Pattern:**
```
🚨 EMERGENCY: Database Connection Reset Loop Detected

**Issue:** PostgreSQL throwing ECONNRESET errors

**Immediate Actions:**
1. Check Railway Postgres service status
2. Verify DATABASE_URL points to correct instance
3. Test connection directly with psql
4. Fix pool settings (reduce max, add SSL, add keepAlive)
5. Restart services
```

**Time:** Estimated 15 min, Actual 30 min (diagnosis took longer than expected)

**Lesson:** Always verify environment variables point to correct resources before deploying. Railway staging/production can have different DATABASE_URLs.

---

## Pattern: Adversarial Audit Saves Time (2026-03-02)
**Context:** Rush claimed 100% complete on 3-AI pipeline, Edge found 7 blockers

**What Worked:**
- Spawning independent adversarial reviewer (Edge) before accepting "done"
- Found 33-point gap between claimed score (100) and reality (67)
- Caught documentation-heavy build (8 min) vs real implementation (needed 6h)
- Prevented shipping incomplete system

**What Didn't:**
- Trusting self-assessment without verification
- Fast builds (8-13 min) tend to be documentation, not code

**Prompt Pattern:**
```
ADVERSARIAL AUDIT REQUEST

**Claimed Status:** [100% complete / 95/100 / etc]
**Build Time:** [X minutes]
**Deliverable:** [skill/feature/fix]

**Your job:** Find what's missing or broken.
- Verify all claimed functionality works
- Test edge cases
- Check for ship blockers
- Score honestly (don't inflate)

SHIP / FIX-FIRST / NO-GO verdict.
```

**Time:** Estimated 30 min audit, Actual 15 min (Edge is efficient)

**Lesson:** Fast builds are suspicious. Always adversarially audit before shipping. Budget 15-30 min for verification audits.

---

## Pattern: Inline Dependencies > npm Publish (2026-03-01)
**Context:** @titlerun/validation package broke production (not published to npm)

**What Worked:**
- Inline validation code directly in titlerun-api (`src/utils/idValidation.js`)
- Zero external dependencies
- Immediate deployment (no npm auth needed)
- Single source of truth

**What Didn't:**
- Relying on local symlink (works locally, breaks in Railway)
- Assuming npm link would "just work" in production

**Prompt Pattern:**
```
INLINE CRITICAL DEPENDENCIES

Instead of:
- Publishing to npm (requires auth, versioning)
- Using workspace symlinks (breaks in production)

Do this:
1. Copy validation code to `src/utils/`
2. Export functions
3. Update imports
4. Zero external deps

**Why:** Faster, simpler, production-safe.
```

**Time:** Estimated 45 min, Actual 10 min (much faster than npm publish flow)

**Lesson:** For small utility libraries used in one project, inline the code instead of creating separate npm packages.

---

## Template (copy for new patterns)

## Pattern: [Name] (YYYY-MM-DD)
**Context:** [What we were doing]

**What Worked:**
- [Success 1]
- [Success 2]

**What Didn't:**
- [Failure 1]
- [Failure 2]

**Prompt Pattern:**
```
[Effective prompt that led to success]
```

**Time:** Estimated X min, Actual Y min

**Lesson:** [Key takeaway]

---

## Pattern: Test Pattern (2026-03-02)
**Context:** Testing pattern learning system

**What Worked:**
- Script works\n- Easy to use

**What Didn't:**
- Nothing failed

**Prompt Pattern:**
```
Test prompt pattern
```

**Time:** Estimated 5 min, Actual 3 min

**Lesson:** Pattern logging is fast and easy

---
