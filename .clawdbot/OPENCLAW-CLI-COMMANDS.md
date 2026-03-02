# OpenClaw CLI Commands (Verified)

## Available Commands (from openclaw --help)

**Core Commands:**
- `gateway *` - Run, inspect, and query the WebSocket Gateway
- `agent` - Run one agent turn via the Gateway
- `agents *` - Manage isolated agents (workspaces, auth, routing)
- `sessions *` - List stored conversation sessions
- `channels *` - Manage connected chat channels
- `message *` - Send, read, and manage messages
- `cron *` - Manage cron jobs via the Gateway scheduler
- `memory *` - Search and reindex memory files
- `skills *` - List and inspect available skills
- `nodes *` - Manage gateway-owned node pairing and node commands
- `browser *` - Manage OpenClaw's dedicated browser
- `config *` - Non-interactive config helpers
- Plus many more...

## What's NOT Available ❌

**Subagent Management Commands:**
- `openclaw subagents spawn` - **Does NOT exist**
- `openclaw subagents list` - **Does NOT exist**  
- `openclaw subagents steer` - **Does NOT exist**
- `openclaw subagents kill` - **Does NOT exist**

**Session Management Commands:**
- `openclaw sessions spawn` - **Does NOT exist**
- `openclaw sessions send` - **Does NOT exist** (for subagents)
- `openclaw sessions list` - EXISTS but lists stored conversations, not active subagents

## Key Insight 💡

**Subagent management is an INTERNAL TOOL only available to running agents.**

The CLI has NO subagent commands because:
1. Subagents are runtime constructs managed by agents during execution
2. Humans don't directly spawn/manage subagents
3. Agents orchestrate subagents using internal tools (tool calls)
4. The CLI is for human operators, not agent-to-agent orchestration

## Implication for Architecture

```
┌──────────────────────────────────────────┐
│ CLI (openclaw command)                   │
│ - Gateway control                        │
│ - Channel management                     │
│ - Message sending                        │
│ - Cron jobs                              │
│ - Config/setup                           │
│ ❌ NO SUBAGENT MANAGEMENT                │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ Running Agent (Internal Tools)           │
│ - subagents(action="list")               │
│ - subagents(action="spawn") — MAYBE?     │
│ - subagents(action="steer")              │
│ - subagents(action="kill")               │
│ ✅ SUBAGENT ORCHESTRATION HERE           │
└──────────────────────────────────────────┘
```

## Architecture Decision

**ALL spawning logic must live in HEARTBEAT.md (agent code), not bash scripts.**

Bash scripts can:
- ✅ Scan GitHub for issues
- ✅ Validate inputs
- ✅ Write .task files
- ✅ Use `gh` CLI
- ✅ Use `openclaw message` CLI

Bash scripts CANNOT:
- ❌ Spawn subagents
- ❌ List active subagents
- ❌ Steer/kill subagents
- ❌ Access any internal orchestration tools
