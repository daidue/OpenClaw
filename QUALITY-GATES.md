# QUALITY GATES — TitleRun Development Standards

**Purpose:** Prevent delivery of incomplete, simulated, or context-mismatched work before adversarial review.

**Target Red Flags:**
1. ⚡ **Fast Builds = Documentation-Heavy** — Agent claims 90-min task, delivers in 6 min with mostly docs
2. 🎭 **Simulated Tests** — "Test mode" that simulates behavior instead of real execution
3. 🔀 **Unclear Execution Context** — Code written for one context but needs to run in another

**Last Updated:** 2026-03-02  
**Owner:** Rush (TitleRun Owner/Operator)

---

## Table of Contents

1. [Pre-Task Quality Gates](#1-pre-task-quality-gates)
2. [Mid-Task Quality Gates](#2-mid-task-quality-gates)
3. [Pre-Delivery Quality Gates](#3-pre-delivery-quality-gates)
4. [Fast Build Detection System](#4-fast-build-detection-system)
5. [Test Simulation Ban](#5-test-simulation-ban)
6. [Execution Context Verification](#6-execution-context-verification)
7. [Proof of Work System](#7-proof-of-work-system)
8. [Self-Review Protocol](#8-self-review-protocol)
9. [Automated Checks](#9-automated-checks-scripts)
10. [Integration into Workflow](#10-integration-into-workflow)
11. [Before/After Comparison](#before--after-comparison)

---

## 1. Pre-Task Quality Gates

**Applied:** Before accepting/starting any implementation task

### Pre-Task Checklist

Before starting implementation, confirm:

- [ ] **Execution context is explicit**
  - Where will this code run? (bash script? HEARTBEAT.md? Python? OpenClaw tool? Node.js service?)
  - What environment variables/dependencies are available in that context?
  - Is the context manual (developer runs it) or automated (heartbeat/cron)?
  
- [ ] **Test requirements are explicit**
  - What constitutes a "real test" for this task?
  - What output/logs must be captured as evidence?
  - Are integration tests required? (Yes for any multi-service work)
  
- [ ] **Minimum expected time is reasonable**
  - Calculate complexity score (see [Fast Build Detection](#4-fast-build-detection-system))
  - Expected time = complexity score × 15 minutes (baseline)
  - If estimate < 30 min, justify why (simple config change? single-file edit?)
  
- [ ] **Success criteria include proof of execution**
  - What artifacts prove this works? (logs, screenshots, API responses, git commits)
  - How will we verify it works in target context, not just standalone?
  - What edge cases must be tested?

- [ ] **Definition of "complete" vs "documented"**
  - Complete = code written, tests pass in target context, evidence collected, integrated
  - Documented = spec written, plan outlined, TODO created
  - This task requires: **COMPLETE** (default) or **DOCUMENTED** (rare, must justify)

### Complexity Scoring

Calculate before starting:

| Factor | Points |
|--------|--------|
| New integration (external API, service) | +3 |
| Security-critical (auth, secrets, data access) | +3 |
| Infrastructure (deployment, CI/CD, database) | +2 |
| Multi-service interaction | +2 |
| Testing required (unit + integration) | +1 |
| Multiple files changed (1 point per file, max 5) | +1-5 |
| New dependency added | +1 |
| Database schema change | +2 |
| Refactor of existing system | +2 |

**Time Thresholds:**
- 1-3 points: 30-60 min minimum
- 4-6 points: 60-90 min minimum
- 7-10 points: 90-120 min minimum
- 10+ points: 120+ min minimum

**Example:**
- Task: Add sub-agent spawn tracking to HEARTBEAT.md
- Scoring: Infrastructure (2) + Multi-service (2) + Testing (1) + Multiple files (2) = **7 points**
- Expected time: **90-120 min**
- Actual delivery in 6 min → **AUTO-FLAG**

### Pre-Task Documentation

Create a task brief in `/Users/jeffdaniels/.openclaw/workspace-titlerun/tasks/TASK-[ID].md`:

```markdown
# TASK-[ID]: [Task Name]

**Start Time:** [timestamp]
**Complexity Score:** [X points]
**Expected Duration:** [Y-Z min]
**Execution Context:** [where this runs]

## Success Criteria
- [ ] [specific, testable criterion]
- [ ] [specific, testable criterion]

## Test Plan
- [ ] [test case 1]
- [ ] [test case 2]

## Evidence Required
- [ ] [artifact 1]
- [ ] [artifact 2]
```

---

## 2. Mid-Task Quality Gates

**Applied:** At 25%, 50%, 75% of expected time elapsed

### Checkpoint: 25% Mark

**Time check:** If expected time is 90 min, checkpoint at ~22 min

At 25% elapsed time, verify:

- [ ] **Core implementation started**
  - At least one code file modified (not just markdown/docs)
  - Git commit showing actual code changes (not just docs)
  - Test environment set up (dependencies installed, services accessible)

- [ ] **Execution context confirmed**
  - Code has been run at least once in target context
  - No "assume it will work" — actual execution attempt
  - Any context mismatches identified and noted

- [ ] **First real test executed**
  - Not simulated, not echo statements
  - Actual output captured (even if test fails)
  - Proof: log file or screenshot

**Red Flag:** If 25% mark hit and no code written → PAUSE, reassess approach

### Checkpoint: 50% Mark

**Time check:** If expected time is 90 min, checkpoint at ~45 min

At 50% elapsed time, verify:

- [ ] **Major functionality working**
  - Core feature demonstrated in target context
  - Happy path works (at least one success case)
  - Evidence: logs showing successful execution

- [ ] **Integration tested**
  - If multi-service: services communicate successfully
  - If heartbeat: code runs when heartbeat executes
  - If bash script: script executes without errors

- [ ] **Evidence collected**
  - Execution logs saved to workspace
  - Screenshots of working functionality (if UI-related)
  - API responses captured (if integration)

**Red Flag:** If 50% mark hit and no working demo → PAUSE, reassess scope

### Checkpoint: 75% Mark

**Time check:** If expected time is 90 min, checkpoint at ~67 min

At 75% elapsed time, verify:

- [ ] **Edge cases tested**
  - Error handling tested (network failures, invalid input, etc.)
  - Boundary conditions verified
  - Failure modes documented

- [ ] **Documentation updated**
  - README/SKILL.md updated with new functionality
  - Configuration examples provided
  - Dependencies documented

- [ ] **Pre-delivery checklist started**
  - Self-review protocol initiated (see Section 8)
  - Artifacts organized
  - Integration verification planned

**Red Flag:** If 75% mark hit and edge cases not tested → EXTEND timeline, don't skip

---

## 3. Pre-Delivery Quality Gates

**Applied:** Before claiming task "complete" or requesting review

### Pre-Delivery Checklist

Before marking task complete, provide:

#### Code Metrics

- [ ] **Line count breakdown**
  ```bash
  # Run in task directory
  echo "Code lines:"
  find . -name "*.js" -o -name "*.py" -o -name "*.sh" | xargs wc -l | tail -1
  echo "Documentation lines:"
  find . -name "*.md" | xargs wc -l | tail -1
  echo "Test lines:"
  find . -name "*test*" -o -name "*spec*" | xargs wc -l | tail -1
  ```
  - Code-to-docs ratio should be > 30% (for implementation tasks)
  - Test coverage should exist for any new functionality

#### Execution Evidence

- [ ] **Test execution logs (real, not simulated)**
  - Saved to: `tasks/TASK-[ID]/logs/`
  - Timestamped
  - Show actual execution, not echo statements
  - Include both success and failure cases

- [ ] **Screenshots/recordings of execution**
  - For UI changes: before/after screenshots
  - For services: API responses or service logs
  - For scripts: terminal output showing real execution

- [ ] **Integration test results**
  - Tested in target context (not standalone)
  - Verified with actual dependencies (not mocked)
  - Proof: logs showing interaction with real services

#### Git Evidence

- [ ] **Git commits showing implementation work**
  ```bash
  git log --oneline --since="[task start time]"
  git diff [task-start-commit]..HEAD --stat
  ```
  - At least one commit with actual code changes
  - Commit messages describe what was implemented
  - Diff shows code, not just markdown

#### Integration Verification

- [ ] **Target context execution confirmed**
  - If HEARTBEAT.md: code runs when heartbeat fires
  - If bash script: script executes from shell
  - If Node service: service starts and responds
  - If Python script: script runs with correct interpreter

- [ ] **Dependencies verified available**
  - All required packages installed in target environment
  - Environment variables set correctly
  - File paths resolve correctly in target context

- [ ] **Error handling tested**
  - Network failures gracefully handled
  - Invalid input rejected with clear errors
  - Timeouts don't crash the system

### Delivery Artifact Bundle

Package for review:

```
tasks/TASK-[ID]/
├── TASK-[ID].md          # Task brief (from pre-task)
├── COMPLETION.md         # Summary of what was built
├── logs/
│   ├── test-run-1.log    # Real execution logs
│   ├── test-run-2.log
│   └── integration.log
├── screenshots/          # Visual evidence
│   ├── before.png
│   └── after.png
└── code-metrics.txt      # Line counts, git stats
```

**COMPLETION.md format:**

```markdown
# TASK-[ID] Completion Report

**Completed:** [timestamp]
**Actual Duration:** [X min]
**Expected Duration:** [Y-Z min]
**Variance:** [explanation if >20% deviation]

## What Was Built
[Concise description]

## Execution Evidence
- Logs: [links to log files]
- Screenshots: [links to screenshots]
- Git commits: [commit hashes]

## Integration Verification
- [x] Tested in target context: [context name]
- [x] Dependencies verified
- [x] Error cases tested

## Known Limitations
[Any edge cases not yet handled]

## Next Steps
[If any follow-up needed]
```

---

## 4. Fast Build Detection System

**Applied:** Automatically when task completed in < 50% of expected time

### Auto-Flag Triggers

If **actual duration < 50% of minimum expected time**, AUTO-FLAG for review.

**Example:**
- Complexity: 7 points → Expected: 90-120 min → Minimum: 90 min
- Delivered in 45 min (< 50% of 90) → **AUTO-FLAG**
- Delivered in 6 min (< 10% of 90) → **CRITICAL FLAG + HALT**

### Fast Build Justification Required

When auto-flagged, agent must provide:

```markdown
## Fast Build Justification — TASK-[ID]

**Expected:** [Y-Z min] based on [X points] complexity
**Actual:** [A min]
**Variance:** [B%] faster than expected

### Why So Fast?

[Choose one or more, with evidence:]

- [ ] **Scope reduced during implementation**
  - Original scope: [description]
  - Actual scope: [description]
  - Reason for reduction: [justify]

- [ ] **Complexity overestimated**
  - Factor [X] was simpler than expected because: [reason]
  - Revised complexity: [Y points] (original: [X points])

- [ ] **Reused existing code/patterns**
  - Reused: [file/pattern]
  - Adaptation required: [minimal/moderate/significant]
  - Lines reused vs new: [ratio]

- [ ] **Leveraged existing infrastructure**
  - Infrastructure: [what was already built]
  - Only needed to: [what was added]

- [ ] **Task was primarily configuration**
  - Code changes: [X lines]
  - Config changes: [Y lines]
  - Ratio: [Z%] config vs implementation

### Evidence This Is Complete

- [ ] All success criteria met (see TASK-[ID].md)
- [ ] Real tests executed (logs attached)
- [ ] Integration verified (evidence attached)
- [ ] Code-to-docs ratio: [X%] (target: >30%)
```

### Escalation Rules

| Variance | Action |
|----------|--------|
| 50-75% of expected | Flag for self-review |
| 25-50% of expected | Flag + require justification |
| < 25% of expected | HALT + require peer review |

**Peer review:** Spawn separate sub-agent to audit the implementation with fresh eyes.

---

## 5. Test Simulation Ban

**Applied:** All test execution, all stages

### Definitions

#### ❌ BANNED: Simulation

- **Echo/log statements instead of real execution**
  ```bash
  # BANNED
  echo "Would spawn sub-agent here in production"
  echo "Simulating API call to KeepTradeCut"
  ```

- **"Test mode" that bypasses real behavior**
  ```javascript
  // BANNED
  if (process.env.TEST_MODE) {
    console.log('Would call API here');
    return { simulated: true };
  }
  ```

- **Mocking core functionality being tested**
  ```python
  # BANNED (when testing the spawn function itself)
  @mock.patch('sessions_spawn')
  def test_spawn():
      sessions_spawn.return_value = {'success': True}
  ```

- **"Would work if we ran it" claims**
  - "This would work in production"
  - "If we had API keys, this would execute"
  - "Assuming the service is running, this succeeds"

#### ✅ REQUIRED: Real Execution

- **Actual execution in target environment**
  ```bash
  # REQUIRED
  result=$(sessions_spawn --agent dev --task "...")
  echo "$result" >> test-execution.log
  ```

- **Logs showing actual output**
  ```
  [2026-03-02 20:15:32] Spawning agent: dev
  [2026-03-02 20:15:33] Agent spawned: session-abc123
  [2026-03-02 20:15:35] Task started: implement-feature-x
  ```

- **Error cases tested with real failures**
  ```javascript
  // REQUIRED
  try {
    await api.call('/invalid-endpoint');
  } catch (err) {
    console.log('Error case verified:', err.message);
    // Log actual error, verify handling works
  }
  ```

- **Integration with real dependencies**
  - Call actual APIs (use staging/test endpoints if needed)
  - Connect to real databases (test database, but real connection)
  - Interact with real services (development instances)

### Acceptable Simulation Scenarios

Simulation is ONLY acceptable when:

1. **External dependency unavailable** (and documented)
   ```javascript
   // ACCEPTABLE (with documentation)
   if (!process.env.THIRD_PARTY_API_KEY) {
     console.warn('⚠️ Third-party API key not set, using mock data');
     console.warn('   Production requires: THIRD_PARTY_API_KEY env var');
     return mockData; // Clearly marked as mock
   }
   ```

2. **Destructive operation in test** (with clear marking)
   ```python
   # ACCEPTABLE (with safeguards)
   if not os.environ.get('ALLOW_DESTRUCTIVE_TEST'):
       logger.info('Skipping destructive test (set ALLOW_DESTRUCTIVE_TEST=1)')
       return
   # Actually perform destructive operation
   ```

3. **Cost-prohibitive operation** (and documented alternative)
   ```bash
   # ACCEPTABLE (with documentation)
   echo "⚠️ Skipping $50 API call, using cached response"
   echo "   To test for real: export RUN_EXPENSIVE_TESTS=1"
   ```

**In ALL cases:**
- Document why simulation is used
- Provide instructions for real execution
- Mark output clearly as simulated
- Include real execution logs from at least one manual run

### Enforcement

**Pre-commit check:**
```bash
# .git/hooks/pre-commit (or CI check)
if grep -r "TEST_MODE\|test.?mode\|simulate" --include="*.js" --include="*.py" .; then
  echo "⚠️ WARNING: Test simulation detected"
  echo "   Verify this is acceptable (see QUALITY-GATES.md section 5)"
  echo "   If real execution is possible, use it instead"
fi
```

**Code review requirement:**
- Any use of "simulation", "mock", "test mode" must be justified in PR description
- Reviewer verifies: Is simulation necessary? Is real execution provided?

---

## 6. Execution Context Verification

**Applied:** Before claiming code works

### Context Identification Checklist

Before writing code, identify:

- [ ] **Where will this code run?**
  - [ ] Bash script (`.sh` file, executed from shell)
  - [ ] HEARTBEAT.md (markdown file, executed by heartbeat processor)
  - [ ] Python script (`.py` file, executed by Python interpreter)
  - [ ] Node.js service (runs as daemon/service)
  - [ ] OpenClaw tool (executed via tool call)
  - [ ] Skill SKILL.md (markdown, executed by skill processor)
  - [ ] Other: [specify]

- [ ] **What executor runs it?**
  - [ ] Manual (developer types command)
  - [ ] Automated (cron, heartbeat, service)
  - [ ] Tool call (agent invokes via OpenClaw)
  - [ ] Sub-process (spawned by another script/service)

- [ ] **What dependencies are available?**
  - [ ] Shell: bash, zsh, sh?
  - [ ] Node.js: version? installed packages?
  - [ ] Python: version? installed packages?
  - [ ] OpenClaw tools: which tools are available?
  - [ ] Environment variables: which are set?

- [ ] **What file paths are accessible?**
  - [ ] Working directory: where does code start?
  - [ ] Relative paths: relative to what?
  - [ ] Workspace root: what is it?
  - [ ] Absolute paths: do they resolve correctly?

### Cross-Context Testing Requirements

After writing code, test:

1. **Standalone test** (sanity check)
   - Run code in isolation
   - Verify basic functionality works
   - Capture output

2. **Target context test** (real verification)
   - Run code in ACTUAL target context
   - Verify dependencies available
   - Verify paths resolve correctly
   - Capture output from target context

3. **Integration test** (full verification)
   - Run code with real upstream/downstream dependencies
   - Verify data flows correctly
   - Verify error handling works in context
   - Capture end-to-end logs

### Common Context Mismatches

| Mismatch | Example | Fix |
|----------|---------|-----|
| **Bash → Markdown** | Bash script written, but needs to run in HEARTBEAT.md | Extract to `.sh` file, call from markdown using `exec` tool |
| **Standalone → Heartbeat** | Code works when run manually, fails in heartbeat | Test in heartbeat context, verify env vars and paths |
| **CLI → Tool** | Code uses CLI commands, but heartbeat uses OpenClaw tools | Rewrite to use OpenClaw tools instead of CLI |
| **Absolute → Relative** | Hardcoded paths work on dev machine, fail elsewhere | Use workspace-relative paths or env vars |
| **Node → Python** | Node.js code written, but executor is Python | Rewrite in Python or spawn Node as subprocess |

### Context Verification Protocol

Before claiming "tested in target context":

```markdown
## Context Verification — TASK-[ID]

**Target Context:** [bash script / HEARTBEAT.md / Python service / etc.]
**Executor:** [manual / cron / heartbeat / tool call]

### Verification Steps

1. **Identified dependencies**
   - Required: [list]
   - Available in context: [yes/no for each]
   - Missing: [list] → [how resolved]

2. **Tested in target context**
   - Command/invocation: `[exact command]`
   - Working directory: `[path]`
   - Timestamp: [when]
   - Result: [success/failure]
   - Logs: [link to log file]

3. **Tested error handling in context**
   - Error case: [description]
   - Expected behavior: [what should happen]
   - Actual behavior: [what happened]
   - Logs: [link to log file]

### Evidence
- [ ] Screenshot of execution in target context
- [ ] Log file showing successful execution
- [ ] Log file showing error handling
- [ ] Integration test results
```

### Context Testing Script

```bash
#!/usr/bin/env bash
# scripts/verify-context.sh

set -euo pipefail

TASK_ID="$1"
TARGET_CONTEXT="$2" # bash|heartbeat|python|node|tool
CODE_PATH="$3"

echo "🔍 Verifying context for TASK-${TASK_ID}"
echo "   Target: ${TARGET_CONTEXT}"
echo "   Code: ${CODE_PATH}"

case "${TARGET_CONTEXT}" in
  bash)
    echo "✅ Testing in bash context..."
    bash "${CODE_PATH}" 2>&1 | tee "tasks/TASK-${TASK_ID}/logs/context-bash.log"
    ;;
  heartbeat)
    echo "✅ Testing in heartbeat context..."
    # Simulate heartbeat execution environment
    cd "${HOME}/.openclaw/workspace-titlerun" || exit 1
    bash "${CODE_PATH}" 2>&1 | tee "tasks/TASK-${TASK_ID}/logs/context-heartbeat.log"
    ;;
  python)
    echo "✅ Testing in Python context..."
    python3 "${CODE_PATH}" 2>&1 | tee "tasks/TASK-${TASK_ID}/logs/context-python.log"
    ;;
  node)
    echo "✅ Testing in Node context..."
    node "${CODE_PATH}" 2>&1 | tee "tasks/TASK-${TASK_ID}/logs/context-node.log"
    ;;
  *)
    echo "❌ Unknown context: ${TARGET_CONTEXT}"
    exit 1
    ;;
esac

echo "✅ Context verification complete. Logs saved to tasks/TASK-${TASK_ID}/logs/"
```

---

## 7. Proof of Work System

**Applied:** Throughout task lifecycle, collected for delivery

### Required Artifacts by Task Type

#### Code Implementation

- [ ] **Git commits showing actual code changes**
  ```bash
  git log --oneline --since="[task start]" --until="[task end]"
  git show [commit-hash] # For each implementation commit
  ```

- [ ] **Line count breakdown**
  ```bash
  cloc --by-file --include-lang=JavaScript,Python,Bash .
  ```
  - Total lines added/changed
  - Code vs comments vs blanks
  - Code-to-documentation ratio

- [ ] **Test execution logs with timestamps**
  ```
  [2026-03-02 20:15:32] Test: spawn_sub_agent
  [2026-03-02 20:15:33] Result: SUCCESS
  [2026-03-02 20:15:33] Agent ID: session-abc123
  [2026-03-02 20:15:34] Verified: agent running
  ```

- [ ] **Screenshots of working functionality**
  - Before: current state
  - After: new functionality working
  - Errors: error handling demonstrated

#### Infrastructure Changes

- [ ] **Before/after directory listings**
  ```bash
  # Before
  tree -L 2 > tasks/TASK-[ID]/evidence/before.txt
  # After changes
  tree -L 2 > tasks/TASK-[ID]/evidence/after.txt
  # Diff
  diff -u before.txt after.txt > directory-changes.diff
  ```

- [ ] **Configuration file diffs**
  ```bash
  git diff [before] [after] -- "*.json" "*.yaml" "*.env.example"
  ```

- [ ] **Service status checks**
  ```bash
  # Before
  systemctl status [service] > before-status.txt
  # After
  systemctl status [service] > after-status.txt
  # Or for Node services
  pm2 list > service-status.txt
  ```

- [ ] **Integration test results**
  ```bash
  curl http://localhost:3000/health | jq > health-check.json
  npm run test:integration > integration-results.log
  ```

#### Bug Fixes

- [ ] **Bug reproduction steps + evidence**
  ```markdown
  ## Bug Reproduction
  1. Step 1: [action]
  2. Step 2: [action]
  3. Expected: [behavior]
  4. Actual: [behavior] (see screenshot: bug-before.png)
  5. Error: [error message] (see log: bug-error.log)
  ```

- [ ] **Fix implementation + code diff**
  ```bash
  git diff [bug-commit]..HEAD -- [affected-files]
  ```

- [ ] **Test proving bug is fixed**
  ```bash
  # Re-run reproduction steps, capture success
  ./reproduce-bug.sh > bug-fix-verification.log
  echo "Exit code: $?" >> bug-fix-verification.log
  ```

- [ ] **Regression test added**
  ```javascript
  // tests/regression/bug-XXX.test.js
  describe('Bug XXX: [description]', () => {
    it('should not [reproduce bug]', async () => {
      // Test that previously failed, now passes
    });
  });
  ```

### Evidence Collection Methods

#### Automatic Collection

Create `.git/hooks/post-commit`:
```bash
#!/usr/bin/env bash
# Auto-collect git stats after each commit

WORKSPACE_ROOT="${HOME}/.openclaw/workspace-titlerun"
STATS_DIR="${WORKSPACE_ROOT}/tasks/.evidence"

mkdir -p "${STATS_DIR}"

# Capture commit details
{
  echo "=== Commit at $(date -Iseconds) ==="
  git log -1 --stat
  echo ""
} >> "${STATS_DIR}/git-history.log"

# Capture line count changes
{
  echo "=== Line counts at $(date -Iseconds) ==="
  cloc --by-file --quiet .
  echo ""
} >> "${STATS_DIR}/line-counts.log"
```

#### Manual Collection

Create `scripts/collect-evidence.sh`:
```bash
#!/usr/bin/env bash
# Manually collect evidence for task delivery

set -euo pipefail

TASK_ID="$1"
TASK_DIR="tasks/TASK-${TASK_ID}"
EVIDENCE_DIR="${TASK_DIR}/evidence"

mkdir -p "${EVIDENCE_DIR}/logs"
mkdir -p "${EVIDENCE_DIR}/screenshots"

echo "📊 Collecting evidence for TASK-${TASK_ID}..."

# Git evidence
echo "Git commits..."
git log --oneline --since="$(cat "${TASK_DIR}/start-time.txt")" > "${EVIDENCE_DIR}/git-commits.txt"
git diff "$(cat "${TASK_DIR}/start-commit.txt")"..HEAD --stat > "${EVIDENCE_DIR}/git-diff-stat.txt"

# Line counts
echo "Line counts..."
cloc --by-file --include-lang=JavaScript,Python,Bash,Markdown . > "${EVIDENCE_DIR}/line-counts.txt"

# Test logs (collect all logs from task dir)
echo "Test logs..."
find . -name "*.log" -newer "${TASK_DIR}/start-time.txt" -exec cp {} "${EVIDENCE_DIR}/logs/" \;

# Service status (if applicable)
if command -v pm2 &> /dev/null; then
  pm2 list > "${EVIDENCE_DIR}/pm2-status.txt" 2>&1 || true
fi

echo "✅ Evidence collected in ${EVIDENCE_DIR}"
echo ""
echo "Next steps:"
echo "1. Add screenshots to ${EVIDENCE_DIR}/screenshots/"
echo "2. Review ${EVIDENCE_DIR}/ for completeness"
echo "3. Run: npm run validate-delivery ${TASK_ID}"
```

### Artifact Organization

Standard directory structure:

```
tasks/
├── TASK-001/
│   ├── TASK-001.md              # Initial task brief
│   ├── COMPLETION.md            # Completion report
│   ├── start-time.txt           # Timestamp of task start
│   ├── start-commit.txt         # Git commit hash at start
│   ├── evidence/
│   │   ├── git-commits.txt      # Git log
│   │   ├── git-diff-stat.txt    # Diff stats
│   │   ├── line-counts.txt      # Code metrics
│   │   ├── logs/
│   │   │   ├── test-run-1.log
│   │   │   ├── integration.log
│   │   │   └── error-cases.log
│   │   └── screenshots/
│   │       ├── before.png
│   │       ├── after.png
│   │       └── error-handling.png
│   └── README.md                # Quick summary
└── .evidence/                   # Auto-collected workspace-wide evidence
    ├── git-history.log
    └── line-counts.log
```

### Verification Checklist

Before claiming evidence is complete:

- [ ] Git commits exist and show real code changes
- [ ] Line counts show reasonable code-to-docs ratio (>30% for implementation)
- [ ] Test logs show real execution (not echo statements)
- [ ] Screenshots/recordings demonstrate working functionality
- [ ] Integration tests show interaction with real dependencies
- [ ] Error cases are documented and tested
- [ ] All artifacts are timestamped and traceable

---

## 8. Self-Review Protocol

**Applied:** Before delivery, agent self-audits implementation

### Pre-Delivery Self-Audit

Ask yourself honestly:

#### Time Reality Check

- [ ] **Did I finish much faster than expected? Why?**
  - Expected: [X min], Actual: [Y min]
  - Variance: [Z%]
  - If >50% faster: documented justification? ☐

- [ ] **Did I skip any implementation and just write docs?**
  - Code-to-docs ratio: [X%]
  - If <30%: is this a documentation task? ☐
  - If implementation task: why so little code? ☐

- [ ] **Did I simulate instead of actually testing?**
  - All tests are real execution? ☐
  - No "echo" or "would run" statements? ☐
  - Integration tests run against real dependencies? ☐

#### Execution Verification

- [ ] **Have I ACTUALLY RUN the code in target context?**
  - Not just standalone, but in actual target context? ☐
  - Logs prove execution in target context? ☐
  - Context: [name] ← verified? ☐

- [ ] **Did I test error cases or just happy path?**
  - Error cases tested: [list]
  - Logs show error handling works? ☐
  - Edge cases covered? ☐

- [ ] **Will this work on first try in production?**
  - Tested with production-like data? ☐
  - Dependencies verified available? ☐
  - Environment variables set correctly? ☐
  - Paths resolve in production context? ☐

#### Completeness Check

- [ ] **Would another agent be able to verify my claims?**
  - Evidence is clear and traceable? ☐
  - Logs include timestamps? ☐
  - Screenshots show what I claim? ☐

- [ ] **Do I have proof for every "tested" claim?**
  - Claim: [X] ← Evidence: [link to log/screenshot]
  - Claim: [Y] ← Evidence: [link to log/screenshot]
  - All claims backed by evidence? ☐

- [ ] **Is the implementation real or aspirational?**
  - Code actually works (not "should work")? ☐
  - Tests actually pass (not "would pass")? ☐
  - Integration verified (not "assumed working")? ☐

### Red Flag Self-Detection

Check for these red flags in your own work:

- [ ] Tests are "simulated" or "test mode"
  - **Impact:** Code might not work in production
  - **Fix:** Run real tests, capture real logs

- [ ] No actual execution logs
  - **Impact:** No proof code was executed
  - **Fix:** Run code, capture output to log file

- [ ] Mostly documentation, little code
  - **Impact:** Task might not be implemented
  - **Fix:** Verify scope, add implementation, or reclassify as "documented"

- [ ] Unclear if code runs in target context
  - **Impact:** Code might not be executable where needed
  - **Fix:** Test in target context, document verification

- [ ] Finished way faster than expected
  - **Impact:** Possible shortcuts taken
  - **Fix:** Provide justification, verify completeness

**Scoring:**
- **0 flags:** Proceed to delivery
- **1 flag:** Address flag, then proceed
- **2+ flags:** Request peer review before delivery

### Peer Review Trigger

If 2+ red flags detected, spawn peer review:

```bash
# Spawn peer review sub-agent
sessions_spawn \
  --agent reviewer \
  --task "Peer review TASK-${TASK_ID} for red flags: [list flags]" \
  --context "$(cat tasks/TASK-${TASK_ID}/COMPLETION.md)" \
  --model opus
```

Peer reviewer should:
1. Read COMPLETION.md
2. Review evidence directory
3. Verify claims against logs/screenshots
4. Check for red flags
5. Provide: APPROVE / REQUEST_CHANGES / REJECT

### Self-Review Checklist Template

```markdown
## Self-Review — TASK-[ID]

**Reviewer:** [agent name]
**Review Date:** [timestamp]

### Time Reality Check
- Expected: [X min], Actual: [Y min], Variance: [Z%]
- Justification (if >50% faster): [explanation]
- [ ] Reasonable time spent

### Execution Verification
- [ ] Code run in target context (logs: [link])
- [ ] Error cases tested (logs: [link])
- [ ] Will work in production (verification: [link])

### Completeness Check
- [ ] All claims backed by evidence
- [ ] Implementation is real, not aspirational
- [ ] Another agent could verify my work

### Red Flags Detected
- [ ] None
- [ ] [flag 1]: [how addressed]
- [ ] [flag 2]: [how addressed]

### Decision
- [ ] **APPROVE:** Ready for delivery
- [ ] **FIX:** Address [issues], then re-review
- [ ] **PEER_REVIEW:** Request external review (2+ flags)
```

---

## 9. Automated Checks (Scripts)

**Applied:** Pre-delivery, automated verification

### Pre-Delivery Validation Script

Create `scripts/validate-delivery.sh`:

```bash
#!/usr/bin/env bash
# scripts/validate-delivery.sh
# Automated quality gate checks before delivery

set -euo pipefail

TASK_ID="$1"
TASK_DIR="tasks/TASK-${TASK_ID}"

echo "🔍 Validating delivery for TASK-${TASK_ID}..."
echo ""

# Initialize flags
FLAG_COUNT=0

# Check 1: Code vs documentation ratio
echo "📊 Check 1: Code vs Documentation Ratio"
CODE_LINES=$(find . -name "*.sh" -o -name "*.js" -o -name "*.py" | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}' || echo "0")
DOC_LINES=$(find . -name "*.md" | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}' || echo "1")
RATIO=$((CODE_LINES * 100 / DOC_LINES))

echo "   Code: ${CODE_LINES} lines"
echo "   Docs: ${DOC_LINES} lines"
echo "   Ratio: ${RATIO}%"

if [ "${RATIO}" -lt 30 ]; then
  echo "   ⚠️ RED FLAG: Only ${RATIO}% code vs documentation (target: >30%)"
  FLAG_COUNT=$((FLAG_COUNT + 1))
else
  echo "   ✅ PASS"
fi
echo ""

# Check 2: Test logs exist
echo "📋 Check 2: Test Execution Logs"
if find "${TASK_DIR}/evidence/logs" -name "*.log" 2>/dev/null | grep -q .; then
  LOG_COUNT=$(find "${TASK_DIR}/evidence/logs" -name "*.log" | wc -l)
  echo "   Found ${LOG_COUNT} log file(s)"
  echo "   ✅ PASS"
else
  echo "   ⚠️ RED FLAG: No test execution logs found in ${TASK_DIR}/evidence/logs/"
  FLAG_COUNT=$((FLAG_COUNT + 1))
fi
echo ""

# Check 3: Git commits
echo "📝 Check 3: Git Commits"
START_TIME=$(cat "${TASK_DIR}/start-time.txt" 2>/dev/null || echo "2 hours ago")
COMMITS=$(git log --oneline --since="${START_TIME}" 2>/dev/null | wc -l)

echo "   Commits since ${START_TIME}: ${COMMITS}"

if [ "${COMMITS}" -lt 1 ]; then
  echo "   ⚠️ RED FLAG: No git commits since task start"
  FLAG_COUNT=$((FLAG_COUNT + 1))
else
  # Check if commits include code changes (not just docs)
  CODE_COMMITS=$(git log --oneline --since="${START_TIME}" --diff-filter=AM -- "*.js" "*.py" "*.sh" 2>/dev/null | wc -l)
  if [ "${CODE_COMMITS}" -lt 1 ]; then
    echo "   ⚠️ RED FLAG: No code commits (only docs/config)"
    FLAG_COUNT=$((FLAG_COUNT + 1))
  else
    echo "   ✅ PASS (${CODE_COMMITS} code commits)"
  fi
fi
echo ""

# Check 4: Simulation detection
echo "🎭 Check 4: Simulation Detection"
if grep -r "TEST_MODE\|test.?mode\|simulate\|echo \"Would\|echo 'Would" \
  --include="*.js" --include="*.py" --include="*.sh" . 2>/dev/null | grep -v "scripts/validate-delivery.sh" | head -5; then
  echo "   ⚠️ WARNING: Possible simulation detected (review manually)"
  echo "   If simulation is necessary, verify it's documented and justified"
  FLAG_COUNT=$((FLAG_COUNT + 1))
else
  echo "   ✅ PASS (no obvious simulation)"
fi
echo ""

# Check 5: Evidence artifacts
echo "📁 Check 5: Evidence Artifacts"
MISSING_ARTIFACTS=()

if [ ! -f "${TASK_DIR}/COMPLETION.md" ]; then
  MISSING_ARTIFACTS+=("COMPLETION.md")
fi

if [ ! -d "${TASK_DIR}/evidence/logs" ] || [ -z "$(ls -A "${TASK_DIR}/evidence/logs")" ]; then
  MISSING_ARTIFACTS+=("execution logs")
fi

if [ "${#MISSING_ARTIFACTS[@]}" -gt 0 ]; then
  echo "   ⚠️ RED FLAG: Missing artifacts:"
  for artifact in "${MISSING_ARTIFACTS[@]}"; do
    echo "      - ${artifact}"
  done
  FLAG_COUNT=$((FLAG_COUNT + 1))
else
  echo "   ✅ PASS (all required artifacts present)"
fi
echo ""

# Check 6: Time variance
echo "⏱️ Check 6: Time Variance"
if [ -f "${TASK_DIR}/TASK-${TASK_ID}.md" ]; then
  EXPECTED_MIN=$(grep "Expected Duration:" "${TASK_DIR}/TASK-${TASK_ID}.md" | grep -oE "[0-9]+" | head -1 || echo "0")
  ACTUAL_MIN=$(grep "Actual Duration:" "${TASK_DIR}/COMPLETION.md" | grep -oE "[0-9]+" | head -1 || echo "0")
  
  if [ "${EXPECTED_MIN}" -gt 0 ] && [ "${ACTUAL_MIN}" -gt 0 ]; then
    VARIANCE=$((100 * (EXPECTED_MIN - ACTUAL_MIN) / EXPECTED_MIN))
    echo "   Expected: ${EXPECTED_MIN} min"
    echo "   Actual: ${ACTUAL_MIN} min"
    echo "   Variance: ${VARIANCE}%"
    
    if [ "${VARIANCE}" -gt 50 ]; then
      echo "   ⚠️ RED FLAG: Completed >50% faster than expected"
      echo "   Verify: Fast Build Justification in COMPLETION.md"
      FLAG_COUNT=$((FLAG_COUNT + 1))
    else
      echo "   ✅ PASS"
    fi
  else
    echo "   ⚠️ WARNING: Could not determine time variance"
  fi
else
  echo "   ⚠️ WARNING: TASK-${TASK_ID}.md not found"
fi
echo ""

# Summary
echo "========================================"
echo "VALIDATION SUMMARY"
echo "========================================"
echo "Red flags detected: ${FLAG_COUNT}"
echo ""

if [ "${FLAG_COUNT}" -eq 0 ]; then
  echo "✅ PASS: Ready for delivery"
  exit 0
elif [ "${FLAG_COUNT}" -eq 1 ]; then
  echo "⚠️ WARNING: 1 red flag detected"
  echo "   Review and address before delivery"
  exit 1
else
  echo "🚨 FAIL: ${FLAG_COUNT} red flags detected"
  echo "   Address all flags OR request peer review"
  exit 2
fi
```

### Integration Test Verification

Create `scripts/verify-integration.sh`:

```bash
#!/usr/bin/env bash
# scripts/verify-integration.sh
# Verify code works in target context

set -euo pipefail

TASK_ID="$1"
TARGET_CONTEXT="$2" # bash|heartbeat|python|node
CODE_ENTRY="$3"     # Path to main executable

TASK_DIR="tasks/TASK-${TASK_ID}"
LOG_DIR="${TASK_DIR}/evidence/logs"

mkdir -p "${LOG_DIR}"

echo "🔗 Verifying integration for TASK-${TASK_ID}"
echo "   Context: ${TARGET_CONTEXT}"
echo "   Entry: ${CODE_ENTRY}"
echo ""

case "${TARGET_CONTEXT}" in
  bash)
    echo "Testing bash script..."
    bash -x "${CODE_ENTRY}" 2>&1 | tee "${LOG_DIR}/integration-bash.log"
    ;;
    
  heartbeat)
    echo "Testing in heartbeat context..."
    # Simulate heartbeat environment
    (
      cd "${HOME}/.openclaw/workspace-titlerun" || exit 1
      export HEARTBEAT_MODE=1
      bash "${CODE_ENTRY}" 2>&1 | tee "${LOG_DIR}/integration-heartbeat.log"
    )
    ;;
    
  python)
    echo "Testing Python script..."
    python3 -u "${CODE_ENTRY}" 2>&1 | tee "${LOG_DIR}/integration-python.log"
    ;;
    
  node)
    echo "Testing Node.js script..."
    node "${CODE_ENTRY}" 2>&1 | tee "${LOG_DIR}/integration-node.log"
    ;;
    
  *)
    echo "❌ Unknown context: ${TARGET_CONTEXT}"
    exit 1
    ;;
esac

RESULT=$?

echo ""
if [ ${RESULT} -eq 0 ]; then
  echo "✅ Integration test PASSED"
  echo "   Logs: ${LOG_DIR}/integration-${TARGET_CONTEXT}.log"
else
  echo "❌ Integration test FAILED (exit code: ${RESULT})"
  echo "   Logs: ${LOG_DIR}/integration-${TARGET_CONTEXT}.log"
  exit ${RESULT}
fi
```

### Git Hook Integration

Create `.git/hooks/pre-push`:

```bash
#!/usr/bin/env bash
# .git/hooks/pre-push
# Run quality checks before pushing

echo "🔍 Running pre-push quality checks..."

# Find all tasks modified in this push
TASKS_MODIFIED=$(git diff --name-only origin/main...HEAD | grep "^tasks/TASK-" | cut -d/ -f2 | sort -u)

if [ -z "${TASKS_MODIFIED}" ]; then
  echo "No tasks modified in this push"
  exit 0
fi

FAILED_TASKS=()

for TASK_ID in ${TASKS_MODIFIED}; do
  echo ""
  echo "Validating ${TASK_ID}..."
  
  if ./scripts/validate-delivery.sh "${TASK_ID}"; then
    echo "✅ ${TASK_ID} passed validation"
  else
    echo "❌ ${TASK_ID} failed validation"
    FAILED_TASKS+=("${TASK_ID}")
  fi
done

echo ""
if [ "${#FAILED_TASKS[@]}" -eq 0 ]; then
  echo "✅ All tasks passed pre-push validation"
  exit 0
else
  echo "❌ Failed tasks:"
  for TASK_ID in "${FAILED_TASKS[@]}"; do
    echo "   - ${TASK_ID}"
  done
  echo ""
  echo "Fix validation errors or use: git push --no-verify"
  exit 1
fi
```

Make hooks executable:
```bash
chmod +x scripts/validate-delivery.sh
chmod +x scripts/verify-integration.sh
chmod +x .git/hooks/pre-push
```

### CI/CD Integration

For GitHub Actions (`.github/workflows/quality-gates.yml`):

```yaml
name: Quality Gates

on:
  pull_request:
    paths:
      - 'tasks/**'

jobs:
  validate-delivery:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - name: Find modified tasks
        id: tasks
        run: |
          TASKS=$(git diff --name-only origin/main...HEAD | grep "^tasks/TASK-" | cut -d/ -f2 | sort -u | tr '\n' ' ')
          echo "tasks=${TASKS}" >> $GITHUB_OUTPUT
      
      - name: Validate tasks
        if: steps.tasks.outputs.tasks != ''
        run: |
          for TASK_ID in ${{ steps.tasks.outputs.tasks }}; do
            echo "Validating ${TASK_ID}..."
            ./scripts/validate-delivery.sh "${TASK_ID}"
          done
      
      - name: Comment results
        if: failure()
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '❌ Quality gate validation failed. Review logs and address red flags.'
            })
```

---

## 10. Integration into Workflow

**Applied:** Defines when each gate is applied in task lifecycle

### Task Lifecycle with Quality Gates

```
┌─────────────────────────────────────────────────────────────┐
│ TASK START                                                  │
│ ├─ Pre-Task Quality Gates (Section 1)                      │
│ │  ├─ Calculate complexity score                            │
│ │  ├─ Determine expected time                               │
│ │  ├─ Identify execution context                            │
│ │  ├─ Define success criteria                               │
│ │  └─ Create TASK-[ID].md brief                             │
│ │                                                            │
│ └─ Record start time and commit hash                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ IMPLEMENTATION (0-25%)                                      │
│ ├─ Write code in target context                             │
│ ├─ Set up test environment                                  │
│ └─ Capture initial execution logs                           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ CHECKPOINT: 25% (Section 2)                                 │
│ ├─ ✅ Core implementation started?                          │
│ ├─ ✅ Test environment set up?                              │
│ ├─ ✅ First real test executed?                             │
│ └─ 🚩 If no: PAUSE and reassess                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ IMPLEMENTATION (25-50%)                                     │
│ ├─ Complete core functionality                              │
│ ├─ Test in target context                                   │
│ └─ Collect integration evidence                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ CHECKPOINT: 50% (Section 2)                                 │
│ ├─ ✅ Major functionality working?                          │
│ ├─ ✅ Integration tested?                                   │
│ ├─ ✅ Evidence collected?                                   │
│ └─ 🚩 If no: PAUSE and reassess scope                       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ IMPLEMENTATION (50-75%)                                     │
│ ├─ Test error cases                                         │
│ ├─ Update documentation                                     │
│ └─ Prepare delivery artifacts                               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ CHECKPOINT: 75% (Section 2)                                 │
│ ├─ ✅ Edge cases tested?                                    │
│ ├─ ✅ Documentation updated?                                │
│ ├─ ✅ Pre-delivery checklist started?                       │
│ └─ 🚩 If edge cases not tested: EXTEND timeline             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ PRE-DELIVERY REVIEW                                         │
│ ├─ Self-Review Protocol (Section 8)                         │
│ │  ├─ Time reality check                                    │
│ │  ├─ Execution verification                                │
│ │  ├─ Completeness check                                    │
│ │  └─ Red flag detection                                    │
│ │                                                            │
│ ├─ Automated Checks (Section 9)                             │
│ │  ├─ Run validate-delivery.sh                              │
│ │  ├─ Run verify-integration.sh                             │
│ │  └─ Check git hooks                                       │
│ │                                                            │
│ └─ Pre-Delivery Quality Gates (Section 3)                   │
│    ├─ Code metrics                                           │
│    ├─ Execution evidence                                     │
│    ├─ Git evidence                                           │
│    └─ Integration verification                               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ QUALITY GATE DECISION                                       │
│ ├─ 0 red flags → APPROVE                                    │
│ ├─ 1 red flag → FIX, then re-review                         │
│ └─ 2+ red flags → PEER REVIEW required                      │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ DELIVERY                                                    │
│ ├─ Create COMPLETION.md (Section 3)                         │
│ ├─ Package evidence bundle (Section 7)                      │
│ ├─ Update task status                                       │
│ └─ Commit and push                                           │
└─────────────────────────────────────────────────────────────┘
```

### Escalation Paths

#### Red Flag Detected

```
Red Flag Detected
       ↓
┌──────────────────┐
│ Severity?        │
└──────────────────┘
       ↓
   ┌───┴───┐
   │       │
 Minor   Major
   │       │
   ↓       ↓
 Fix    Peer Review
   │       │
   ↓       └───────────┐
Continue              ↓
                 ┌──────────────┐
                 │ Spawn review  │
                 │ sub-agent     │
                 └──────────────┘
                       ↓
                 ┌──────────────┐
                 │ APPROVE?      │
                 └──────────────┘
                  ↓         ↓
                Yes        No
                 ↓          ↓
              Continue   Fix Issues
```

#### Fast Build Detected

```
Task Completed
       ↓
┌──────────────────┐
│ Calculate        │
│ time variance    │
└──────────────────┘
       ↓
   ┌───┴───┐
   │       │
 <50%    >50% faster
   │       │
   ↓       ↓
Normal  Auto-Flag
   │       │
   ↓       └───────────┐
Deliver              ↓
              ┌──────────────────┐
              │ Require Fast     │
              │ Build            │
              │ Justification    │
              └──────────────────┘
                       ↓
                 ┌──────────────┐
                 │ Valid reason? │
                 └──────────────┘
                  ↓         ↓
                Yes        No
                 ↓          ↓
              Deliver   Investigate
```

### Documentation Updates

When implementing quality gates, update:

1. **AGENTS.md** (agent instructions)
   ```markdown
   ## Task Execution Standards
   
   Before starting any task:
   1. Read quality gates: `QUALITY-GATES.md`
   2. Calculate complexity score
   3. Create task brief in `tasks/TASK-[ID]/`
   4. Record start time and commit hash
   
   During implementation:
   - Self-check at 25%, 50%, 75% marks
   - Collect evidence continuously
   - Run validation before delivery
   ```

2. **HEARTBEAT.md** (if applicable)
   ```markdown
   ## Quality Gates Integration
   
   Before spawning sub-agents for implementation:
   - [ ] Calculate expected time (complexity × 15 min)
   - [ ] Define success criteria explicitly
   - [ ] Specify test requirements (no simulation)
   - [ ] Identify execution context clearly
   
   When reviewing sub-agent output:
   - [ ] Run `scripts/validate-delivery.sh [TASK-ID]`
   - [ ] Check for red flags
   - [ ] Verify evidence bundle complete
   ```

3. **Skills** (e.g., `skills/titlerun-dev/SKILL.md`)
   ```markdown
   ## Development Quality Standards
   
   All development tasks must follow quality gates:
   - Complexity scoring: See QUALITY-GATES.md Section 1
   - Test requirements: Real execution only (Section 5)
   - Context verification: Test in target context (Section 6)
   - Evidence collection: See Section 7
   
   Before delivery:
   ```bash
   ./scripts/validate-delivery.sh TASK-[ID]
   ```
   ```

### Rollout Plan

**Phase 1: Pilot (Week 1)**
- Apply to 1-2 new tasks manually
- Refine scripts based on feedback
- Document pain points

**Phase 2: Integration (Week 2)**
- Add git hooks
- Update AGENTS.md and HEARTBEAT.md
- Train sub-agents on quality gates

**Phase 3: Automation (Week 3)**
- Enable CI/CD checks
- Automate evidence collection
- Full enforcement on all tasks

**Phase 4: Optimization (Week 4+)**
- Collect metrics on red flag detection
- Optimize thresholds based on data
- Continuous improvement

---

## Before / After Comparison

### How Quality Gates Would Have Caught Phase 1 Issues

**Scenario:** Phase 1 sub-agent spawn tracking implementation

#### ❌ WITHOUT QUALITY GATES (What Happened)

```
Timeline:
├─ 00:00 — Task assigned: "Implement sub-agent spawn tracking"
│          Expected: 90 min
│          
├─ 00:06 — Task "completed" (6 minutes)
│          Delivered: HEARTBEAT.md with bash snippet
│          Tests: "Simulated mode (logged events but didn't spawn)"
│          Context: Unclear (bash in markdown file)
│          
└─ 01:00 — Adversarial review discovers issues:
           ├─ Red Flag 1: 6 min vs 90 min (93% faster)
           ├─ Red Flag 2: Simulated tests
           └─ Red Flag 3: Unclear execution context
```

**Cost:**
- Wasted 6 min of agent time on incomplete work
- Required adversarial review to catch issues
- Rework needed, delaying actual implementation

#### ✅ WITH QUALITY GATES (What Would Happen)

```
Timeline:
├─ 00:00 — Task assigned: "Implement sub-agent spawn tracking"
│          
├─ 00:01 — Pre-Task Quality Gates (Section 1)
│          ├─ Complexity score: 7 points (infra + multi-service + testing + files)
│          ├─ Expected: 90-120 min
│          ├─ Context: HEARTBEAT.md → requires `exec` tool, not bash
│          ├─ Tests: Real spawn, verify session creation
│          └─ Success: Logged spawn events with session IDs
│          
├─ 00:02 — TASK-001.md created with success criteria
│          
├─ 00:25 — 25% Checkpoint
│          ├─ ❌ No code written yet (only doc stub)
│          └─ 🚩 RED FLAG: PAUSE and reassess approach
│          
├─ 00:30 — Reassessment
│          ├─ Identified issue: Need `exec` tool, not bash script
│          ├─ Revised approach: Use OpenClaw tool calls
│          └─ Resume implementation
│          
├─ 01:15 — 50% Checkpoint
│          ├─ ✅ Core spawn tracking working
│          ├─ ✅ Real spawn executed (log: evidence/logs/spawn-test.log)
│          └─ ✅ Integration tested in HEARTBEAT.md context
│          
├─ 01:45 — 75% Checkpoint
│          ├─ ✅ Error cases tested
│          ├─ ✅ Documentation updated
│          └─ ✅ Pre-delivery checklist started
│          
├─ 02:00 — Pre-Delivery Review
│          ├─ Self-Review Protocol (Section 8)
│          │  ├─ Time: 120 min (within expected 90-120)
│          │  ├─ Tests: Real execution (logs attached)
│          │  └─ Context: Verified in HEARTBEAT.md
│          │
│          ├─ Automated Checks (Section 9)
│          │  ├─ validate-delivery.sh: ✅ PASS
│          │  ├─ Code-to-docs ratio: 45% (✅ >30%)
│          │  └─ Test logs: 3 files (✅ present)
│          │
│          └─ 0 red flags detected
│          
└─ 02:05 — Delivery
           ├─ COMPLETION.md with evidence bundle
           ├─ Real execution logs showing spawned sessions
           ├─ Screenshots of heartbeat integration
           └─ Ready for production (no rework needed)
```

**Benefits:**
- Caught "fast build" issue at 25% checkpoint
- Prevented simulated tests (Section 5 ban)
- Verified execution context early (Section 6)
- Delivered complete, working implementation
- No adversarial review needed (passed automated checks)

### Metrics Comparison

| Metric | Without Gates | With Gates | Improvement |
|--------|---------------|------------|-------------|
| Time to first delivery | 6 min | 120 min | -95% (but actually complete) |
| Rework cycles | 1+ | 0 | 100% reduction |
| Red flags at review | 3 | 0 | 100% reduction |
| Evidence quality | Poor (simulated) | High (real logs) | Significantly better |
| Integration verified | No | Yes | 100% improvement |
| Production-ready | No | Yes | 100% improvement |
| Total time to working solution | 6 min + rework (unknown) | 120 min | Faster to done-done |

### Cost-Benefit Analysis

**Without Quality Gates:**
- Upfront time: Very fast (6 min)
- Hidden costs: Adversarial review, rework, delayed deployment
- Risk: High (simulated tests, unclear context)
- Confidence: Low (needs verification)

**With Quality Gates:**
- Upfront time: Longer (120 min)
- Hidden costs: None (complete on first try)
- Risk: Low (real tests, verified context)
- Confidence: High (self-verified, automated checks)

**ROI:**
- For tasks that need rework: **Massive savings** (prevents entire rework cycle)
- For tasks done right first time: **Small overhead** (checkpoints + validation)
- For critical infrastructure: **Essential** (prevents production issues)

---

## Usage Examples

### Example 1: Starting a New Task

```bash
# 1. Calculate complexity
# Task: Add KeepTradeCut API integration
# Factors: New integration (3) + Testing (1) + Multi-file (2) = 6 points
# Expected: 60-90 min

# 2. Create task brief
mkdir -p tasks/TASK-042
cat > tasks/TASK-042/TASK-042.md <<EOF
# TASK-042: KeepTradeCut API Integration

**Start Time:** $(date -Iseconds)
**Complexity Score:** 6 points
**Expected Duration:** 60-90 min
**Execution Context:** Node.js service (backend API)

## Success Criteria
- [ ] Fetch player values from KeepTradeCut API
- [ ] Cache responses (Redis, 1 hour TTL)
- [ ] Handle rate limits gracefully
- [ ] Integration tests with real API calls

## Test Plan
- [ ] API call succeeds and returns valid data
- [ ] Cache hit returns cached data (no API call)
- [ ] Rate limit triggers backoff
- [ ] Invalid player ID returns error

## Evidence Required
- [ ] API response logs
- [ ] Cache hit/miss logs
- [ ] Rate limit test log
- [ ] Integration test results
EOF

# 3. Record start state
date -Iseconds > tasks/TASK-042/start-time.txt
git rev-parse HEAD > tasks/TASK-042/start-commit.txt

# 4. Begin implementation
echo "✅ Task brief created. Starting implementation..."
```

### Example 2: Running Checkpoints

```bash
# At 25% mark (~15 min for 60-min task)
echo "📍 25% Checkpoint"
git log --oneline --since="$(cat tasks/TASK-042/start-time.txt)"
# Expect: At least 1 commit with code changes

find . -name "*.js" -newer tasks/TASK-042/start-time.txt
# Expect: At least 1 JS file modified

test -f tasks/TASK-042/evidence/logs/first-test.log
# Expect: First test log exists

# If any check fails → PAUSE and reassess
```

### Example 3: Pre-Delivery Validation

```bash
# Collect evidence
./scripts/collect-evidence.sh TASK-042

# Run automated validation
./scripts/validate-delivery.sh TASK-042

# If validation passes:
# - Create COMPLETION.md
# - Package evidence bundle
# - Commit and push

# If validation fails:
# - Review red flags
# - Address issues
# - Re-run validation
```

### Example 4: Handling Fast Build

```bash
# Task completed in 30 min (expected 60-90 min)
# Variance: 50% faster → AUTO-FLAG

# Create justification
cat > tasks/TASK-042/FAST-BUILD-JUSTIFICATION.md <<EOF
## Fast Build Justification — TASK-042

**Expected:** 60-90 min based on 6 points complexity
**Actual:** 30 min
**Variance:** 50% faster than minimum expected

### Why So Fast?

- [x] **Leveraged existing infrastructure**
  - Infrastructure: Existing Redis cache layer (tasks/TASK-015)
  - Infrastructure: Existing HTTP client with retry (tasks/TASK-022)
  - Only needed to: Add KeepTradeCut-specific endpoint wrapper
  
- [x] **Reused existing code/patterns**
  - Reused: API client pattern from Sleeper integration
  - Adaptation required: Minimal (same REST pattern)
  - Lines reused vs new: ~80% reused, ~20% new

### Evidence This Is Complete

- [x] All success criteria met (see TASK-042.md)
- [x] Real tests executed (logs in evidence/logs/)
- [x] Integration verified (backend API responds correctly)
- [x] Code-to-docs ratio: 62% (target: >30%)

**Validation:** ./scripts/validate-delivery.sh TASK-042 → ✅ PASS
EOF

# Proceed with delivery (justification documented)
```

---

## Summary

**Quality Gates prevent red flags by:**

1. **Pre-Task Gates:** Set clear expectations (time, context, tests) before starting
2. **Mid-Task Gates:** Catch issues early (25%, 50%, 75% checkpoints)
3. **Pre-Delivery Gates:** Verify completeness before claiming done
4. **Fast Build Detection:** Auto-flag suspiciously fast completion
5. **Test Simulation Ban:** Enforce real execution, ban "test mode"
6. **Context Verification:** Test in target context, not standalone
7. **Proof of Work:** Collect evidence continuously (logs, commits, screenshots)
8. **Self-Review:** Agent self-audits before delivery
9. **Automated Checks:** Scripts catch red flags automatically
10. **Workflow Integration:** Clear escalation paths and decision points

**Result:**
- Red flags caught **during** implementation, not **after** delivery
- Adversarial review becomes validation, not discovery
- Higher quality, less rework, faster time-to-production

---

**Maintained by:** Rush (TitleRun Owner/Operator)  
**Version:** 1.0  
**Last Updated:** 2026-03-02  
**Next Review:** After 10 tasks using this system (collect metrics, optimize thresholds)
