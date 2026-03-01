# Phase 1: Context Ingestion — Code Review Skill

**Date:** 2026-03-01  
**Building from:** Mix of existing materials + first principles

---

## Existing Materials

### 1. Cron Job Prompt (What Was Attempted)
```
"Run the titlerun-code-review skill. Analyze commits since last review using 10-expert panel. 
Write results to workspace-titlerun/reviews/. Post summary to Jeff's inbox. 
Target score: 95+. If score <95, fix all issues before continuing. 
If score <80, tag as CRITICAL — halt feature work immediately."
```

**What this tells us:**
- Multi-expert review (not single lens)
- Commit-based analysis (Git history)
- Scoring system (95+ target)
- Integration with Jeff's inbox
- Severity tiers (<95 = fix, <80 = critical)

---

### 2. Cognitive Profiles Already Created
Located in `~/.openclaw/workspace/cognitive-profiles/`:
- `owasp-security.md` (7.4KB) — Security review framework
- `google-sre-performance.md` (8.9KB) — Performance/scalability framework
- `nielsen-ux-heuristics.md` (10.8KB) — UX review framework
- `paul-graham-yc.md` (3.9KB) — Product strategy framework (less relevant for code review)

**These are real expert frameworks**, ready to load on-demand.

---

### 3. TitleRun Codebase Context

**Repositories:**
- `titlerun-api` (Backend - TypeScript, Express, Prisma)
- `titlerun-app` (Frontend - React, TypeScript, TanStack Query)

**Common issues we've hit:**
- Nested response envelopes (`response.data.data.X`)
- N+1 query patterns
- `.find()` without useMemo (React re-render cascade)
- Request deduplication missing (concurrent identical API calls)
- Cache-related bugs (works in private mode, breaks in regular)

**Tech stack specifics:**
- TypeScript everywhere
- React with hooks
- Prisma ORM (backend)
- TanStack Query (frontend data fetching)
- Cloudflare Pages (frontend hosting)
- Railway (backend hosting)

---

### 4. Examples of GOOD Code Review

**What we want:**
```markdown
## CRITICAL: SQL Injection via Player Search

**File:** `titlerun-api/src/routes/players.ts`  
**Line:** 47  
**Severity:** Critical (block merge)

**Issue:**
Direct string interpolation in SQL query allows injection attack.

**Code:**
```typescript
const query = `SELECT * FROM players WHERE name LIKE '%${req.query.search}%'`;
```

**Impact:**
At production scale (10K+ users), attacker could:
- Extract entire player database
- Modify player valuations
- Inject malicious data

**Fix:**
Use parameterized query:
```typescript
const query = 'SELECT * FROM players WHERE name LIKE ?';
const results = await db.query(query, [`%${req.query.search}%`]);
```

**Test:**
Add test case for SQL injection attempt:
```typescript
expect(searchPlayers("'; DROP TABLE players--")).toThrow();
```

**Reference:** OWASP Top 10 - A03:2021 Injection
```

**Why this is good:**
- Specific file + line number
- Severity justified with user impact
- Concrete code example of the issue
- Concrete fix with code
- Quantified impact ("at 10K users...")
- Test case provided
- References expert framework (OWASP)

---

### 5. Examples of BAD Code Review

**What we DON'T want (baseline AI):**
```markdown
## Code Review Summary

Overall the code looks good! Here are some suggestions:

- Consider adding more error handling
- This could be more efficient
- You might want to add tests
- Great work overall, just a few minor improvements

Score: 85/100
```

**Why this is bad:**
- Vague ("more error handling" - where? what kind?)
- No specifics ("could be more efficient" - how? by how much?)
- Hedge language ("might want to" - is it required or not?)
- No file/line references
- No impact quantification
- Generic praise without substance
- Score without justification

---

### 6. Production Incidents (Real Examples)

**Incident 1: Mobile Auto-Refresh Cascade (2026-02-16)**
- `.find()` without useMemo created new object every render
- React thought data changed every render
- Caused infinite re-render loop on mobile (not desktop)
- 3 days to diagnose (worked in dev, broke in prod)

**Incident 2: 60-Hour Rate Limit Outage (2026-02-17)**
- Heavy sub-agent spawning overnight burned API credits
- All crons failed for 60 hours
- No monitoring/alerts set up

**Incident 3: Nested Response Envelope (#1 recurring bug)**
- `response.data.data.X` pattern
- Frontend expects `response.data.X`
- Causes "Cannot read property 'X' of undefined"
- Recurring issue across multiple PRs

---

### 7. Current Manual Review Process

**What I do manually:**
1. Check out PR branch
2. Review changed files in VS Code
3. Look for common anti-patterns (nested envelopes, N+1 queries, missing memoization)
4. Test locally if possible (frontend can't run locally, so rely on staging)
5. Comment on GitHub PR
6. Request changes or approve

**Pain points:**
- Manual = slow (30-60 min per PR)
- Can't test frontend locally (only staging)
- Relies on memory of past incidents (not systematic)
- Miss subtle issues (no security/performance framework)

**What skill should solve:**
- Automated 3-lens review (Security, Performance, UX)
- Systematic (checks every known pattern)
- Fast (5-10 min vs 30-60 min)
- Catches issues I would miss (cognitive profiles)

---

## Gap Analysis

**What I have:**
- ✅ Cognitive profiles (Security, Performance, UX)
- ✅ Production incident history
- ✅ Tech stack specifics
- ✅ Examples of good/bad output
- ✅ Current manual process

**What I'm building from first principles:**
- Trigger system (when to activate)
- Contrarian frame (how to differentiate from baseline)
- Verification gate (how to check quality)
- Integration with Git/GitHub

---

## Deliverable: Context Folder

**Collected materials:**
- This document (phase1-materials.md)
- Cognitive profiles (already exist in ../../cognitive-profiles/)
- Production incident list (documented above)
- TitleRun-specific patterns (documented above)

**Phase 1 complete:** ✅

**Next:** Phase 2 - Targeted Extraction
