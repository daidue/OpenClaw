# OpenClaw Internal Tools Available to Agents

## Spawning & Orchestration

### subagents - Manage spawned subagents
**Actions:**
- `list` - List recent subagents
  - Parameters: recentMinutes (optional)
  - Returns: List of subagent sessions with status
- `kill` - Terminate a subagent
  - Parameters: target (session key or label)
- `steer` - Send corrective message to running subagent
  - Parameters: target (session key or label), message

**Example Usage:**
```
subagents(action="list", recentMinutes=1440)
subagents(action="kill", target="test-spawn")
subagents(action="steer", target="gh-titlerun-api-123", message="Focus on the auth bug first")
```

## What I CANNOT Do from Bash

❌ **No CLI equivalents exist for subagent management**
- No `openclaw subagents spawn` command
- No `openclaw subagents list` command
- No `openclaw subagents steer` command

**Key Insight:**
Subagent management is an INTERNAL TOOL only available to running agents.
Bash scripts have NO ACCESS to these tools.
ALL subagent spawning must happen inside agent code (HEARTBEAT.md).

## Critical Distinction

| What | Where | How |
|------|-------|-----|
| Spawn subagents | Inside running agent code | `subagents` tool (via tool call) |
| Prepare task data | Bash scripts | File operations, GitHub CLI |
| Manage sessions | Inside running agent code | `subagents` tool |
| CLI commands | Terminal/bash | `openclaw gateway`, `openclaw help`, etc. |

## Architecture Implication

```
┌─────────────────────────────────┐
│ Running Agent (Rush)            │
│ - Has access to subagents tool  │
│ - Can spawn/list/kill/steer     │
│ - Reads prepared tasks          │
│ - Makes spawning decisions      │
└─────────────────────────────────┘
           ▲
           │ reads task files
           │
┌─────────────────────────────────┐
│ Bash Scripts                    │
│ - NO access to subagents tool   │
│ - CAN scan GitHub               │
│ - CAN write .task files         │
│ - CANNOT spawn agents           │
└─────────────────────────────────┘
```
