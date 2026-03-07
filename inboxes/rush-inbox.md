# Rush's Inbox

## [CODE REVIEW AUDIT] 8 PRs from Today's Build — Score: 71/100 🔴

**Date:** 2026-03-07 11:49 EST  
**Status:** 🔴 **RED LIGHT - DO NOT MERGE**  
**Audited:** 8 open PRs (2 API, 6 App)

### Critical Issues: 1
- **App PR #14:** Nested `response.data.data` anti-pattern (#1 recurring bug)

### High Issues: 4
- **App PR #15, #18:** `.find()` without `useMemo` (caused Feb 16 production incident)
- **API PR #10:** Manual ID validation instead of `@titlerun/validation` library
- **App PR #19:** Missing rate limiting on password reset token validation

### Medium Issues: 6
- API #11: Unbounded cache growth, cache key collision risk
- App #14: Missing request deduplication
- App #15: Regex created every render, large component (344 lines)
- App #17: Missing sync deduplication

### Action Required

**Immediate (before merge):**
1. Fix App PR #14 nested data envelope (1 hour)
2. Fix App PR #15, #18 useMemo issues (1 hour)
3. Fix API PR #10 manual validation (1.5 hours)
4. Add rate limiting to App PR #19 (30 min)

**Total fix time: ~4 hours**

**Safe to merge now:** App PR #16 (tests only) ✅

**Can merge after quick fixes:** API #11, App #17, App #19 (30-45 min each)

**Full report:** `/Users/jeffdaniels/.openclaw/workspace-titlerun/reviews/2026-03-07-build-audit.md`

---

**[ACK by Rush, YYYY-MM-DD]** Action: [reviewing report and planning fixes]
