# Testing Plan — March 3, 2026

**Goal:** Validate agent orchestration and quality gates work in production

---

## TEST 1: Agent Orchestration — Jeff's First Real Heartbeat

**Time:** Tuesday 9:00 AM (Jeff's heartbeat)  
**Duration:** ~30 minutes  
**Success criteria:** Task created → Agent spawned → Bug fixed → PR opened

### Setup (Tonight or Early Tuesday)

**Create a test GitHub issue:**
```bash
cd ~/Documents/Claude\ Cowork\ Business/titlerun-api

# Create test issue via gh CLI
gh issue create \
  --title "TEST: Fix console.log in utils/logger.js" \
  --body "For testing agent orchestration. Remove any console.log statements in utils/logger.js and replace with proper logger calls." \
  --label "bug" \
  --label "test"
```

**Expected:** GitHub creates issue (e.g., #150)

### Step 1: Task File Created (via Heartbeat)

**Jeff's heartbeat will:**
1. Run `scripts/prepare-github-tasks.sh`
2. Scan titlerun-api for new issues
3. Create `.task` file in `workspace-titlerun/tasks/pending/`

**Verify:**
```bash
ls -la ~/.openclaw/workspace-titlerun/tasks/pending/
# Should see: gh-titlerun-api-150.task
```

### Step 2: Jeff Spawns Rush Subagent

**During heartbeat, Jeff will:**
1. Read task file from `tasks/pending/`
2. Use `sessions_spawn` tool to spawn Rush
3. Log spawn to `memory/spawn-log.txt`

**Verify spawn:**
```bash
# Check spawn log
cat ~/.openclaw/workspace-titlerun/memory/spawn-log.txt

# Check subagent is running
# (Jeff will use: subagents list)
```

**Expected output:**
```
2026-03-03T14:00:00Z | SPAWN_SUCCESS | task=gh-titlerun-api-150 | session=agent:titlerun:subagent:XXXXX
```

### Step 3: Monitor Rush's Work

**Rush should:**
1. Read the GitHub issue
2. Find console.log statements
3. Replace with proper logger
4. Run tests
5. Create PR

**Monitor via:**
```bash
# Watch spawn log for updates
watch -n 10 'tail -20 ~/.openclaw/workspace-titlerun/memory/spawn-log.txt'

# Check task status
cat ~/.openclaw/workspace-titlerun/tasks/pending/gh-titlerun-api-150.task
```

**Expected Rush timeline:**
- 0-5 min: Analysis (reading issue, finding code)
- 5-15 min: Implementation (fixing code)
- 15-20 min: Testing (running tests)
- 20-25 min: PR creation
- 25-30 min: Complete

### Step 4: Verify Completion

**Check task moved:**
```bash
ls ~/.openclaw/workspace-titlerun/tasks/completed/
# Should see: gh-titlerun-api-150.task
```

**Check PR created:**
```bash
cd ~/Documents/Claude\ Cowork\ Business/titlerun-api
gh pr list
# Should see: Fix console.log in utils/logger.js (#XXX)
```

**Check spawn log:**
```bash
tail ~/.openclaw/workspace-titlerun/memory/spawn-log.txt
# Should see: TASK_COMPLETE entry
```

### Success Criteria

- ✅ Task file created automatically
- ✅ Subagent spawned successfully
- ✅ Rush fixed the bug
- ✅ Tests pass
- ✅ PR opened and linked to issue
- ✅ Task moved to completed/

### If It Fails

**Spawn fails:**
- Check Jeff's heartbeat logs
- Verify sessions_spawn parameters
- Check task file format

**Rush gets stuck:**
- Use `subagents(action="steer")` to redirect
- Or kill and respawn
- Document issue for improvement

**PR not created:**
- Check Rush's session logs
- Verify gh CLI auth
- May need manual PR creation (acceptable for first test)

---

## TEST 2: Quality Gates — Automated Enforcement

**Time:** Tuesday afternoon (after Test 1 completes)  
**Duration:** ~15 minutes  
**Success criteria:** Quality gates catch issues automatically

### Step 1: Test Task Tiering

**Run the script:**
```bash
cd ~/.openclaw/workspace-titlerun

node scripts/determine-tier.js "Fix typo in README"
# Expected: tier=trivial, low requirements

node scripts/determine-tier.js "Implement OAuth authentication with JWT"
# Expected: tier=critical, high requirements
```

**Success:** Correct tier classification

### Step 2: Test Red Flag Detection

**Run on our codebase:**
```bash
node scripts/detect-red-flags.js ~/Documents/Claude\ Cowork\ Business/titlerun-api/src/
```

**Expected output:**
```
Scanning: /Users/jeffdaniels/Documents/Claude Cowork Business/titlerun-api/src/
Found X issues:
- [MEDIUM] Large function detected: processTradeOffer (142 lines)
- [LOW] TODO comment: src/services/tradeService.js:45
```

**Success:** Finds real issues (if any exist)

### Step 3: Test Evidence Chain

**Initialize a test task:**
```bash
node scripts/evidence-chain.js --init TEST-TASK-001
```

**Add evidence:**
```bash
echo "Test completed successfully" > /tmp/test-log.txt
node scripts/evidence-chain.js --add /tmp/test-log.txt test-log
```

**Verify chain:**
```bash
node scripts/evidence-chain.js --verify
# Expected: ✅ Evidence chain valid
```

**Success:** Tamper-proof chain works

### Step 4: Test Git Hooks

**Make a test commit:**
```bash
cd ~/.openclaw/workspace-titlerun

# Create test file
echo "// test" > test-file.js

# Try to commit (should trigger pre-commit hook)
git add test-file.js
git commit -m "Test commit for quality gates"
```

**Expected:**
- Pre-commit hook runs
- Evidence collected automatically
- Commit succeeds (or blocks if issues found)

**Check evidence:**
```bash
ls .quality-gates/evidence/
# Should see new evidence files from commit
```

**Success:** Git hooks work automatically

### Step 5: Test Dashboard

**Open web dashboard:**
```bash
cd ~/.openclaw/workspace-titlerun
open dashboard/index.html
```

**Check displays:**
- Task statistics (currently mock data)
- Progress indicators
- Leaderboard
- Charts

**Success:** Dashboard loads and displays data

---

## TEST 3: Integration — End-to-End Workflow

**Time:** Tuesday late afternoon  
**Duration:** ~45 minutes  
**Success criteria:** Full workflow from issue to PR with quality gates

### Setup

**Create realistic GitHub issue:**
```bash
gh issue create \
  --title "Improve error handling in trade validation" \
  --body "Add better error messages when trade validation fails. Currently returns generic 'Invalid trade' message." \
  --label "enhancement"
```

### Workflow Steps

**1. Jeff's heartbeat (automatic):**
- Scans GitHub, finds new issue
- Creates task file
- Spawns Rush subagent

**2. Rush works (automatic):**
- Quality gates determine tier (likely "standard")
- Rush reads issue, analyzes code
- Red flag detection scans code
- Rush implements fix
- Git hooks collect evidence on commits
- Rush runs tests
- Definition of Done checks run
- Rush creates PR

**3. 3-AI Review (manual trigger for now):**
```bash
# After PR is created, trigger 3-AI review
cd ~/Documents/Claude\ Cowork\ Business/titlerun-api
# (Would use GitHub Actions in production)
```

**4. Verify quality gates worked:**
- Check task tier was assigned
- Check evidence chain has entries
- Check red flags were scanned
- Check git hooks ran
- Check DoD checklist completed

### Success Criteria

**End-to-end success:**
- ✅ Issue → Task → Agent → Code → Tests → PR
- ✅ Quality gates enforced at each step
- ✅ Evidence collected automatically
- ✅ No manual intervention needed

---

## TEST 4: Stress Test — Multiple Agents (Wednesday)

**Time:** Wednesday morning  
**Duration:** ~60 minutes  
**Success criteria:** 3+ agents work in parallel without conflicts

### Setup

**Create 3 test issues:**
```bash
gh issue create --title "TEST 1: Fix typo in docs" --label "trivial"
gh issue create --title "TEST 2: Add unit test for userService" --label "test"
gh issue create --title "TEST 3: Update dependencies" --label "maintenance"
```

### Test

**Let Jeff's heartbeat spawn all 3:**
- Should create 3 task files
- Should spawn 3 Rush subagents
- Agents work in parallel

**Monitor:**
```bash
# Watch active agents
watch -n 5 'echo "=== Active Subagents ===" && wc -l < <(pgrep -f "titlerun:subagent") && echo ""'

# Watch spawn log
tail -f ~/.openclaw/workspace-titlerun/memory/spawn-log.txt
```

**Check for conflicts:**
- Do agents step on each other?
- Do browser locks work?
- Do all PRs get created?

### Success Criteria

- ✅ 3 agents run simultaneously
- ✅ No resource conflicts (locks work)
- ✅ All 3 tasks complete
- ✅ All 3 PRs created

---

## WHAT WE'RE TESTING

**Agent Orchestration:**
- ✅ Spawn mechanism (sessions_spawn)
- ✅ Task workflow (pending → spawn → completed)
- ✅ Lock system (browser, resources)
- ✅ Monitoring (spawn log, task registry)

**Quality Gates:**
- ✅ Task tiering (automatic classification)
- ✅ Red flag detection (code quality)
- ✅ Evidence chain (tamper-proof audit)
- ✅ Git hooks (automatic collection)
- ✅ Dashboard (visibility)

**Integration:**
- ✅ End-to-end workflow works
- ✅ Quality enforced at each step
- ✅ No manual babysitting needed
- ✅ Multiple agents don't conflict

---

## EXPECTED ISSUES (Be Ready)

**Likely issues we'll find:**
1. Task file format needs tweaking
2. Spawn parameters need adjustment
3. Rush might not handle edge cases
4. Git hooks might be too strict
5. Browser locks might timeout incorrectly
6. Evidence chain might have gaps

**That's GOOD — finding issues is the point of testing.**

**Fix as we find them, document in memory/patterns.md**

---

## SUCCESS METRICS

**By end of Tuesday:**
- ✅ At least 1 GitHub issue → PR via agent orchestration
- ✅ Quality gates ran automatically
- ✅ Evidence collected without manual work

**By end of Wednesday:**
- ✅ 3+ agents worked in parallel
- ✅ Found and fixed at least 2 issues with the system
- ✅ Documented learnings

**By end of Friday:**
- ✅ Agent swarm is production-ready
- ✅ Decided: accelerate to Phase 2 OR improve systems
- ✅ Updated roadmap with actual timeline

---

**This is how we validate what we built. Real tasks. Real agents. Real bugs fixed.** 🦞
