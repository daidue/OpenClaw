# CRITICAL FINDING: How Subagent Spawning Actually Works

## Test Results

✅ **Confirmed Working:**
```
subagents(action="list", recentMinutes=60)
```

Returns active and recent subagents with full status.

## Available Actions

Based on system prompt and testing:
- `subagents(action="list")` - ✅ Works
- `subagents(action="kill")` - Listed in system prompt
- `subagents(action="steer")` - Listed in system prompt
- `subagents(action="spawn")` - ❌ NOT listed in available actions

## Key Discovery

**The task description mentions `sessions_spawn` as an internal tool, but:**
1. It's NOT in my available tools list (I'm a subagent)
2. The `subagents` tool only has: list, kill, steer
3. No spawn action visible

**Two Possibilities:**

### Option A: Main Agents Have Different Tools
- Main agents (agent:main:main) may have access to `sessions_spawn` or additional subagents actions
- Subagents (like me) have restricted toolset
- This would make sense: only main agents should spawn, subagents should report back

### Option B: Spawning Mechanism Unknown
- The actual spawning mechanism may be:
  - A different tool name
  - Part of the ACP (Agent Control Protocol) system
  - Done via message passing to the gateway
  - Available only in certain contexts/modes

## Implication for Design

**Conservative Approach:**
1. Document that spawning mechanism is available to MAIN agents, not subagents
2. Design HEARTBEAT.md assuming Rush (main agent) has spawning capability
3. Test this when Rush actually runs
4. Bash scripts DEFINITELY cannot spawn (confirmed)

## What I CAN Document with Certainty

✅ **Confirmed:**
- `subagents(action="list")` works for monitoring
- `subagents(action="steer")` available for corrections
- `subagents(action="kill")` available for cleanup
- CLI has NO subagent commands
- Bash scripts have NO access to internal tools

❓ **Needs Testing by Main Agent:**
- Exact spawning mechanism (sessions_spawn? subagents spawn? other?)
- Required parameters
- Return values
- Error handling

## Recommended Architecture

Proceed with design assuming main agents can spawn (somehow), knowing:
1. Spawning must be in agent code (not bash)
2. Monitoring works via subagents list
3. Management works via steer/kill
4. Bash prepares data only

**Design will be valid regardless of exact spawning mechanism.**
