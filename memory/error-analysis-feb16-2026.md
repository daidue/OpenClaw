# Error Analysis: Feb 16, 2026 (Peak Day)

**Total errors:** 2,190 on Feb 16 (record development day: 2,746 messages, 1,267 tool calls)

## Breakdown by Category

| Error Type | Count | % | Severity | Root Cause |
|-----------|-------|---|----------|------------|
| Memory context overflow | 1,096 | 50% | **CRITICAL** | Sessions running too long without compaction |
| Read tool missing path | 696 | 32% | **MAJOR** | Sub-agents calling `read()` without `path` parameter |
| Tool execution failures | 300+ | 14% | MINOR | Git clone conflicts, file not found errors |
| Gateway timeouts | 33 | 2% | MAJOR | System overload from heavy sub-agent spawning |
| Diagnostic lane waits | 20 | 1% | MINOR | Queue congestion |

## Detailed Analysis

### 1. Memory Context Overflow (50% of errors)
**Error:** `Input is longer than the context size. Try to increase the context size or use another model that supports longer contexts.`

**Pattern:** Continuous failures throughout the day, ~1 per minute during peak hours

**Root Cause:**
- Feb 16 was the massive TitleRun build day (60+ sub-agents, 30K lines of code, $700-1000 tokens)
- Long-running sessions exceeded model context windows
- Memory sync attempted to write deltas but conversation history was too large
- No proactive compaction triggered

**Impact:**
- Memory not being saved properly
- Conversation history loss
- Increased token costs (re-processing same context)

**Fix:**
1. **Proactive compaction:** Trigger auto-compaction at 75% of context window (not 100%)
2. **Sub-agent hygiene:** Each sub-agent should write memory flush before exit
3. **Session splitting:** For multi-hour build sessions, force context reset every 2 hours
4. **Model selection:** Use extended context models (Opus 200K) for build days

### 2. Read Tool Missing Path (32% of errors)
**Error:** `read tool called without path: toolCallId=toolu_...`

**Pattern:** 696 instances, clustered around 00:42 UTC (peak build hour)

**Root Cause:**
- Sub-agents calling `read({ })` or `read()` without `path` parameter
- Likely from agents asking "can you read this file?" without providing the path
- May indicate prompt confusion about tool signature

**Impact:**
- Tool call fails silently
- Agent doesn't get file contents it needs
- Retry loops waste tokens

**Fix:**
1. **Tool call validation:** Gateway should reject malformed read calls with clear error message
2. **Agent training:** Update agent prompts to always include `path` in read calls
3. **Skill updates:** Review skill docs that reference read tool, ensure examples are correct
4. **Logging improvement:** Log the agent ID + conversation context when this happens to identify which agents need retraining

### 3. Git Clone Conflicts (14% of errors)
**Error:** `fatal: destination path 'titlerun-api' already exists and is not an empty directory`

**Pattern:** Repeated git clone attempts to same directory

**Root Cause:**
- Sub-agents trying to clone repos without checking if they already exist
- Likely from "setup fresh environment" instructions that don't account for persistent workspace

**Impact:**
- Failed setup steps
- Agent confusion about workspace state
- Unnecessary error noise

**Fix:**
1. **Idempotent clone helper:** Create `smart-clone.sh` script that checks for existing repo before cloning
2. **Workspace context:** Agent prompts should include "current repos in workspace" context
3. **Sub-agent templates:** Update spawn templates to use `cd existing-repo || git clone ...` pattern

### 4. Gateway Timeouts (2% of errors)
**Error:** `gateway timeout after 60000ms`

**Pattern:** 33 instances, mostly during peak sub-agent spawning hours

**Root Cause:**
- System overload from 60+ concurrent sub-agents
- Queue congestion (lane wait times up to 294 seconds)
- 60-second timeout too short for complex operations during high load

**Impact:**
- Failed announcements (sub-agents can't report completion)
- Lost results
- User-facing "stuck" feeling

**Fix:**
1. **Increase timeout:** 60s → 120s for announcement operations
2. **Sub-agent throttling:** Limit to 10 concurrent sub-agents during build sessions
3. **Priority lanes:** Separate lanes for user-facing vs background work
4. **Resource monitoring:** Alert when queue wait times exceed 60s

## Memory Search Under-Utilization

**Problem:** Only 6 memory searches for entire week (10,837 messages)

**Expected:** ~100-200 searches per week for typical development work

**Root Cause Analysis:**
1. **Agents not following memory discipline** - `memory_search` should be mandatory before answering questions about:
   - Prior work/decisions
   - Technical patterns
   - User preferences
   - Known issues
2. **Prompt erosion** - Memory search instructions may have been removed or diluted in agent SOUL.md files
3. **No enforcement** - No automated check that agents searched memory before responding
4. **Short-term memory bias** - Agents relying on conversation context instead of institutional memory

**Impact:**
- Repeated mistakes (same bugs fixed multiple times)
- Lost institutional knowledge
- Inconsistent decisions
- Token waste (re-deriving answers that were already documented)

**Proposed Fixes:**

### Immediate (This Week)
1. **Restore memory discipline in all agent SOUL.md files:**
   ```markdown
   ## Memory Recall (MANDATORY)
   Before answering ANY question about:
   - Prior work, decisions, or patterns
   - User preferences or history
   - Known issues or anti-patterns
   - Technical architecture
   
   YOU MUST:
   1. Run memory_search with relevant query
   2. Use memory_get to pull specific lines
   3. If search returns 0 results, state "I checked memory, found nothing"
   4. Cite source when using memory snippets (Source: path#line)
   ```

2. **Add memory search to heartbeat protocol:**
   ```
   Every heartbeat MUST include:
   - memory_search query: "actionable items" OR "blockers" OR today's date
   - Check for stale tasks, unresolved decisions, forgotten action items
   ```

3. **Audit all agent configurations:**
   - Jeff (main): MEMORY.md + PORTFOLIO-MEMORY.md
   - Rush (titlerun): workspace-titlerun/MEMORY.md
   - Grind (commerce): workspace-commerce/MEMORY.md
   - Edge (polymarket): workspace-polymarket/MEMORY.md

### Medium-Term (Next 2 Weeks)
4. **Memory search analytics:**
   - Track search frequency per agent per day
   - Alert when agent goes 24h without a memory search
   - Weekly report: "memory utilization score" per agent

5. **Automated memory hygiene:**
   - Daily cron: Extract action items from daily notes → `ACTION_ITEMS.md`
   - Weekly cron: Consolidate decisions → `DECISIONS.md` with date index
   - Monthly cron: Archive old daily notes, update MEMORY.md with key learnings

6. **Memory quality gates:**
   - Before shipping features: "Did you check MEMORY.md for anti-patterns?"
   - Before making decisions: "Did you search for prior similar decisions?"
   - Before fixing bugs: "Did you check if this was fixed before?"

### Long-Term (Post-Launch)
7. **Semantic memory clustering:**
   - Automatically detect repeated patterns in daily notes
   - Surface to agents: "This is the 3rd time you've fixed X, consider documenting the root cause"

8. **Cross-agent memory sharing:**
   - Create `memory/shared/` directory for cross-business learnings
   - Example: "All agents: browser tab discipline" should be global, not per-agent

9. **Memory-first onboarding:**
   - New agents must read MEMORY.md, PORTFOLIO-MEMORY.md, and last 7 days of daily notes BEFORE first action
   - Test: Ask agent "What did we learn last week?" - should cite specific sources

## Recommendations

### Immediate Actions (This Session)
- [x] Document error analysis
- [ ] Update HEARTBEAT.md for all agents to include mandatory memory_search
- [ ] Create `scripts/memory-audit.sh` to detect low memory search usage
- [ ] Add memory discipline section to SOUL.md for all active agents

### This Week
- [ ] Review all 129 errors from Feb 15-22, not just Feb 16
- [ ] Implement read tool validation in gateway (reject calls without path)
- [ ] Create `smart-clone.sh` helper script
- [ ] Add proactive compaction triggers (75% context threshold)

### Before March 1 Launch
- [ ] Memory search analytics dashboard
- [ ] Automated action item extraction
- [ ] Sub-agent throttling (max 10 concurrent)
- [ ] Gateway timeout increase (60s → 120s)

---

**Bottom Line:**
- **Feb 16 errors:** System stress from heavy development, not fundamental architecture issues
- **Memory under-utilization:** Process discipline problem, easily fixable with mandatory search prompts
- **Both are solvable:** Fixes are operational (better prompts, monitoring, throttling), not code rewrites

**Priority:** Fix memory discipline FIRST (highest ROI, prevents future errors)

**Next:** Update all agent SOUL.md files with mandatory memory search protocol
