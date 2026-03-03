# P0 Critical Issues - Master List
**Created:** 2026-03-03 3:53 PM EST  
**Status:** FIXING NOW  
**Commit Base:** 2c0101f

---

## CATEGORY 1: Pipeline Bugs (3 issues)

### P0-1: Sleeper ADP Completely Broken
- **File:** `~/.openclaw/workspace-titlerun/codebase/titlerun-api/src/services/sourceRefreshPipeline.js:177-178`
- **Issue:** Query uses `WHERE sleeper_id = $1` but players table only has `id` column
- **Impact:** 100% of Sleeper ADP inserts fail silently (12% of valuation signal lost)
- **Fix Required:** Change `WHERE sleeper_id = $1` → `WHERE id = $1`
- **Verification:** Run Sleeper ADP refresh, verify stored > 0 records
- **Status:** 🔴 NOT FIXED
- **Assigned to:** Agent 1 (Pipeline Bug Fixer)

### P0-2: Bare Catch Block Swallows All Errors
- **File:** `~/.openclaw/workspace-titlerun/codebase/titlerun-api/src/services/sourceRefreshPipeline.js:184`
- **Issue:** `catch {}` with no error logging
- **Impact:** Zero visibility when Sleeper ADP inserts fail
- **Fix Required:** Add error logging: `catch (err) { logger.debug(\`[SleeperADP] Skip ${sleeperId}: ${err.message}\`); }`
- **Verification:** Grep for bare catch blocks, check logs on error
- **Status:** 🔴 NOT FIXED
- **Assigned to:** Agent 1 (Pipeline Bug Fixer)

### P0-3: Source Name Mismatch Breaks Bayesian Weights
- **Files:** 
  - `sourceRefreshPipeline.js:127` uses `dynasty_daddy`
  - `dynamicWeightService.js:55` uses `dynasty_daddy`
  - `bayesianWeightService.js:42,87` uses `dynastydaddy` (no underscore)
- **Issue:** Inconsistent naming prevents weight lookup (returns 0/undefined)
- **Impact:** 10% of weight calculation incorrect
- **Fix Required:** Standardize to `dynasty_daddy` everywhere
- **Verification:** Grep all files for `dynastydaddy` and `dynasty_daddy`, verify consistency
- **Status:** 🔴 NOT FIXED
- **Assigned to:** Agent 1 (Pipeline Bug Fixer)

---

## CATEGORY 2: Weight System Issues (2 issues)

### P0-4: Bayesian Weight System Uses Wrong Sources
- **File:** `~/.openclaw/workspace-titlerun/codebase/titlerun-api/src/services/bayesianWeightService.js:41-44`
- **Issue:** ALL_SOURCES = 9 sources (includes dtc, ftc, aod), missing sleeper_adp and production
- **Current:** `['ktc', 'fantasycalc', 'dynastyprocess', 'dynastydaddy', 'dtc', 'ftc', 'uth', 'dlf', 'aod']`
- **Should Be:** `['ktc', 'fantasycalc', 'dynastyprocess', 'dynasty_daddy', 'uth', 'dlf', 'sleeper_adp', 'production']`
- **Impact:** Bayesian machinery computes weights for phantom sources, ignores real sources
- **Fix Required:** Update ALL_SOURCES to match 8-source pipeline
- **Verification:** Compare ALL_SOURCES to SOURCES array in sourceRefreshPipeline.js
- **Status:** 🔴 NOT FIXED
- **Assigned to:** Agent 2 (Weight System Architect)

### P0-5: Success Threshold Too Strict
- **File:** `~/.openclaw/workspace-titlerun/codebase/titlerun-api/src/services/sourceRefreshPipeline.js:210`
- **Issue:** MIN_SOURCES_FOR_SUCCESS = 6 (75% of 8 sources)
- **Should Be:** 5 (62.5%, matching old 6/10 ratio)
- **Impact:** 3 source failures → entire pipeline fails
- **Fix Required:** Change default from 6 to 5
- **Verification:** Check constant value, test with simulated 3 failures
- **Status:** 🔴 NOT FIXED
- **Assigned to:** Agent 2 (Weight System Architect)

---

## CATEGORY 3: Service Cleanup (1 issue)

### P0-6: ESPN Still Operational
- **File:** `~/.openclaw/workspace-titlerun/codebase/titlerun-api/src/services/espnWeeklyService.js`
- **Issue:** ESPN service still running ESPN ingestion despite removal from pipeline
- **Impact:** Confusion about whether ESPN is used, wasted API calls
- **Fix Required:** 
  - Option A: Delete espnWeeklyService.js
  - Option B: Add deprecation notice and disable
- **Verification:** Grep for ESPN references, verify no active usage
- **Status:** 🔴 NOT FIXED
- **Assigned to:** Agent 3 (Service Cleanup Specialist)

---

## CATEGORY 4: Integration Issues (3 issues) - SHOWSTOPPER

### P0-7: Calculation Engine Uses Old 5-Source Weights (SHOWSTOPPER)
- **Files:**
  - `~/.openclaw/workspace-titlerun/codebase/titlerun-api/src/config/titlerun.js`
  - `~/.openclaw/workspace-titlerun/codebase/titlerun-api/src/services/titlerunCalculationService.js`
- **Issue:** Calculation engine uses OLD 5-source weights (KTC:30%, FC:25%, DP:18-24%, DD:15-21%, fantasypros:12%)
- **Reality:** Pipeline collects 8 sources with Rush weights, but calculation ignores 4 new sources
- **Impact:** ALL TODAY'S WORK ON 8-SOURCE PIPELINE PROVIDES ZERO BENEFIT TO USERS
- **Fix Required:**
  1. Update `config/titlerun.js` DEFAULT_WEIGHTS to 8-source Rush weights
  2. Update SOURCES array to include all 8 sources
  3. Update REQUIRED_SOURCES to include sleeper_adp, uth, dlf, production
  4. Remove fantasypros from all configs
  5. Update titlerunCalculationService.js to use new weights
- **Verification:** 
  - Check config matches sourceRefreshPipeline weights
  - Run calculation, verify all 8 sources used
  - Check logs for "using 8 sources" message
- **Status:** 🔴 NOT FIXED
- **Assigned to:** Agent 4 (Integration Engineer)

### P0-8: Scheduler Not Using Unified Pipeline
- **File:** `~/.openclaw/workspace-titlerun/codebase/titlerun-api/src/services/schedulerService.js:1355-1360`
- **Issue:** Scheduler runs OLD per-source refresh jobs (7:00-7:15 AM), NOT unified pipeline
- **Current Jobs:**
  - 7:00 AM - REFRESH_VALUES (FantasyCalc only)
  - 7:05 AM - REFRESH_KTC
  - 7:10 AM - REFRESH_DP
  - 7:15 AM - REFRESH_DYNASTY_DADDY
- **Impact:** 4 new sources (sleeper_adp, uth, dlf, production) NEVER GET REFRESHED AUTOMATICALLY
- **Fix Required:**
  1. Remove individual source refresh jobs (7:00-7:15 AM)
  2. Add unified pipeline job: `sourceRefreshPipeline.refreshAllSources()` at 7:00 AM
  3. Verify all 8 sources run in parallel
- **Verification:** 
  - Check scheduler config
  - Simulate cron trigger
  - Verify all 8 sources refresh
- **Status:** 🔴 NOT FIXED
- **Assigned to:** Agent 5 (Scheduler Architect)

### P0-9: Player Sync Not Scheduled
- **File:** `~/.openclaw/workspace-titlerun/codebase/titlerun-api/src/services/schedulerService.js`
- **Issue:** Player sync endpoint exists but NOT in internal scheduler (relies on external Railway cron)
- **Impact:** If Railway cron not configured, players never sync
- **Fix Required:** Add player sync to internal scheduler at 3:00 AM
- **Verification:** Check scheduler has player sync job
- **Status:** 🔴 NOT FIXED
- **Assigned to:** Agent 5 (Scheduler Architect)

---

## SUMMARY

**Total P0 Issues:** 9
- Pipeline Bugs: 3
- Weight System: 2
- Service Cleanup: 1
- Integration: 3

**Blocking Deployment:**
- P0-1: Sleeper ADP broken (12% signal loss)
- P0-7: Calculation engine uses old weights (entire 8-source pipeline useless)
- P0-8: Scheduler doesn't use unified pipeline (4 sources never refresh)

**Estimated Fix Time:** 1.5-2 hours (5 agents working in parallel)

**Verification Strategy:**
- Syntax checks: `node -c` on all modified files
- Weight math: Verify all weights sum to 1.00
- Source counts: Verify all 3 systems use same 8 sources
- Integration test: Run full pipeline → calculation → verify 8-source output
- Scheduler test: Simulate cron triggers

---

## STATUS TRACKING

| Issue | Agent | Status | ETA |
|-------|-------|--------|-----|
| P0-1 | Agent 1 | 🔴 Pending | 15 min |
| P0-2 | Agent 1 | 🔴 Pending | 15 min |
| P0-3 | Agent 1 | 🔴 Pending | 15 min |
| P0-4 | Agent 2 | 🔴 Pending | 20 min |
| P0-5 | Agent 2 | 🔴 Pending | 20 min |
| P0-6 | Agent 3 | 🔴 Pending | 15 min |
| P0-7 | Agent 4 | 🔴 Pending | 30 min |
| P0-8 | Agent 5 | 🔴 Pending | 25 min |
| P0-9 | Agent 5 | 🔴 Pending | 25 min |

**Total ETA:** ~30 minutes (parallel execution)

---

_This document will be updated as agents complete their work._
