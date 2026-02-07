# OpenClaw Activity Integration Research

**Status:** ✅ Complete  
**Date:** February 5, 2026  
**Researcher:** Fury (Subagent)

---

## Executive Summary

Mission Control **can** capture OpenClaw activity through three approaches:
1. **Watch session transcripts** (simplest, works today)
2. **Custom hook** (most robust, requires TypeScript)
3. **Plugin with background service** (most flexible, requires more setup)

**Recommended:** Start with transcript watching, migrate to hooks for production.

---

## What's Actually Possible

### 1. Hooks System

OpenClaw has a built-in **event-driven hooks system** that can listen to:

- `command` events - When `/new`, `/reset`, `/stop` are issued
- `command:new`, `command:reset`, `command:stop` - Specific command events
- `agent:bootstrap` - Before workspace bootstrap files are injected
- `gateway:startup` - When the Gateway starts
- `tool_result_persist` - Transform tool results before they're written to session transcript

**Hook Structure:**
```
my-hook/
├── HOOK.md          # Metadata + documentation
└── handler.ts       # Handler implementation
```

**Hook Handler Example:**
```typescript
import type { HookHandler } from "../../src/hooks/hooks.js";

const myHandler: HookHandler = async (event) => {
  if (event.type !== "command" || event.action !== "new") {
    return;
  }

  console.log(`[my-hook] New command triggered`);
  console.log(`  Session: ${event.sessionKey}`);
  console.log(`  Timestamp: ${event.timestamp.toISOString()}`);

  // Your custom logic here

  // Optionally send message to user
  event.messages.push("✨ My hook executed!");
};

export default myHandler;
```

**Hook Discovery Locations** (in order of precedence):
1. `<workspace>/hooks/` - Per-agent, highest precedence
2. `~/.openclaw/hooks/` - User-installed, shared across workspaces
3. `<openclaw>/dist/hooks/bundled/` - Shipped with OpenClaw

**Bundled Hooks Available:**
- `boot-md` - Runs BOOT.md on gateway startup
- `command-logger` - Logs all command events to `~/.openclaw/logs/commands.log`
- `session-memory` - Saves session context to memory when `/new` is issued
- `soul-evil` - Swaps SOUL.md with SOUL_EVIL.md during purge window

### 2. Session Transcripts

All agent activity is logged to:
```
~/.openclaw/agents/*/sessions/*.jsonl
```

**Format:** JSONL (one JSON object per line)

**Example Entry Types:**
```json
{"type": "session", "id": "...", "timestamp": "...", "cwd": "...", "version": "..."}
{"type": "message", "id": "...", "parentId": "...", "timestamp": "...", "message": {...}}
{"type": "toolResult", "toolCallId": "...", "toolName": "exec", "content": [...]}
{"type": "thinking", "thinking": "...", "thinkingSignature": "..."}
{"type": "customType", "customType": "openclaw.cache-ttl", "data": {...}}
```

**Key Properties:**
- `type` - Entry type (`session`, `message`, `toolResult`, `thinking`, `customType`)
- `id` - Unique entry identifier
- `parentId` - Links to previous entry
- `timestamp` - ISO 8601 timestamp

**File Location Pattern:**
- Main agent: `~/.openclaw/agents/main/sessions/*.jsonl`
- Subagents: `~/.openclaw/agents/researcher/sessions/*.jsonl` (etc.)

### 3. Plugin System

OpenClaw plugins can register:
- **Gateway RPC methods** - `api.registerGatewayMethod(name, handler)`
- **Background services** - `api.registerService({ id, start, stop })`
- **Agent tools** - Custom tools that appear in the agent's toolkit
- **CLI commands** - `api.registerCli(callback)`

**Plugin Structure:**
```typescript
export default function register(api) {
  // Register a background service
  api.registerService({
    id: "activity-logger",
    start: () => {
      // Start polling or watching
    },
    stop: () => {
      // Clean up
    }
  });

  // Register RPC method Mission Control can call
  api.registerGatewayMethod("activity.getRecent", ({ respond }) => {
    const events = getRecentEvents();
    respond(true, events);
  });
}
```

---

## Recommended Approach

### Option 1: Watch Session Transcripts (START HERE)

**How It Works:**
1. Mission Control uses Node.js `fs.watch()` or `chokidar` to watch session transcript files
2. Parse new lines as they're appended (JSONL format)
3. Extract relevant events (tool calls, commands, messages)
4. Update Mission Control UI with activity feed

**Implementation Sketch:**
```javascript
const chokidar = require('chokidar');
const readline = require('readline');
const fs = require('fs');

const watcher = chokidar.watch('~/.openclaw/agents/*/sessions/*.jsonl', {
  persistent: true,
  ignoreInitial: true
});

watcher.on('change', (path) => {
  const stream = fs.createReadStream(path);
  const rl = readline.createInterface({ input: stream });
  
  rl.on('line', (line) => {
    const entry = JSON.parse(line);
    
    if (entry.type === 'message' && entry.message?.role === 'assistant') {
      logActivity({
        type: 'assistant_message',
        timestamp: entry.timestamp,
        content: entry.message.content
      });
    }
    
    if (entry.type === 'toolResult') {
      logActivity({
        type: 'tool_call',
        timestamp: entry.timestamp,
        tool: entry.toolName,
        result: entry.content
      });
    }
  });
});
```

**Pros:**
- ✅ No OpenClaw modifications needed
- ✅ Works today
- ✅ Simple to implement
- ✅ Can parse full history on startup

**Cons:**
- ❌ May miss events if file isn't flushed immediately
- ❌ Requires parsing JSONL
- ❌ File watching can be resource-intensive

### Option 2: Custom Hook (PRODUCTION)

**How It Works:**
1. Create a hook in `~/.openclaw/workspace/hooks/mission-control-logger/`
2. Hook listens to `command` and `tool_result_persist` events
3. Writes events to a dedicated log file or database that Mission Control can read

**Hook Structure:**
```
~/.openclaw/workspace/hooks/mission-control-logger/
├── HOOK.md
└── handler.ts
```

**HOOK.md:**
```yaml
---
name: mission-control-logger
description: "Log OpenClaw activity for Mission Control"
metadata:
  openclaw:
    emoji: "🎯"
    events: ["command", "agent:bootstrap"]
---

# Mission Control Activity Logger

Logs OpenClaw activity to a dedicated file for Mission Control consumption.
```

**handler.ts:**
```typescript
import type { HookHandler } from "../../src/hooks/hooks.js";
import fs from "fs/promises";
import path from "path";

const LOG_PATH = path.join(process.env.HOME!, ".openclaw/logs/mission-control-activity.jsonl");

const handler: HookHandler = async (event) => {
  const logEntry = {
    type: "activity",
    subtype: event.type,
    action: event.action,
    sessionKey: event.sessionKey,
    timestamp: event.timestamp.toISOString(),
    details: {
      commandSource: event.context.commandSource,
      senderId: event.context.senderId
    }
  };

  await fs.appendFile(LOG_PATH, JSON.stringify(logEntry) + "\n");
};

export default handler;
```

**Enable the hook:**
```bash
openclaw hooks enable mission-control-logger
```

**Pros:**
- ✅ Clean integration
- ✅ Captures events as they happen
- ✅ Can format events specifically for Mission Control
- ✅ Runs inside OpenClaw process (no polling)

**Cons:**
- ❌ Requires TypeScript knowledge
- ❌ Need to restart Gateway after changes
- ❌ Limited to events OpenClaw exposes

### Option 3: Plugin with Background Service (ADVANCED)

**How It Works:**
1. Create a plugin that registers a background service
2. Service polls session transcripts or listens to internal events
3. Exposes RPC methods Mission Control can call via WebSocket

**Plugin Structure:**
```typescript
export default function register(api) {
  let recentEvents = [];
  let watchInterval;

  api.registerService({
    id: "mission-control-service",
    start: () => {
      api.logger.info("Mission Control service started");
      
      // Poll for new events every 5 seconds
      watchInterval = setInterval(() => {
        const events = parseRecentTranscripts();
        recentEvents = events;
      }, 5000);
    },
    stop: () => {
      api.logger.info("Mission Control service stopped");
      clearInterval(watchInterval);
    }
  });

  // RPC method Mission Control can call
  api.registerGatewayMethod("missionControl.getActivity", ({ respond }) => {
    respond(true, {
      events: recentEvents,
      timestamp: new Date().toISOString()
    });
  });
}
```

**Pros:**
- ✅ Full control over data format
- ✅ Can add features over time
- ✅ Mission Control can query on-demand
- ✅ Can provide aggregated stats

**Cons:**
- ❌ More complex setup
- ❌ Requires plugin development
- ❌ Need to manage plugin updates

---

## Implementation Guidance

### Quick Start (15 minutes)

1. **Use the bundled `command-logger` hook:**
   ```bash
   openclaw hooks enable command-logger
   ```

2. **Watch the command log:**
   ```bash
   tail -f ~/.openclaw/logs/commands.log
   ```

3. **Parse in Mission Control:**
   ```javascript
   const logFile = "~/.openclaw/logs/commands.log";
   const stream = fs.createReadStream(logFile);
   const rl = readline.createInterface({ input: stream });
   
   rl.on('line', (line) => {
     const event = JSON.parse(line);
     console.log(`Command: ${event.action} at ${event.timestamp}`);
   });
   ```

### Production Setup (1-2 hours)

1. **Create custom hook** (see Option 2 above)

2. **Mission Control reads dedicated log:**
   ```javascript
   chokidar.watch("~/.openclaw/logs/mission-control-activity.jsonl")
     .on('change', () => {
       // Read new lines and update UI
     });
   ```

3. **Enable on workspace bootstrap:**
   ```json
   // ~/.openclaw/openclaw.json
   {
     "hooks": {
       "internal": {
         "enabled": true,
         "entries": {
           "mission-control-logger": { "enabled": true }
         }
       }
     }
   }
   ```

### Advanced Setup (3-5 hours)

1. **Create plugin** (see Option 3 above)

2. **Install plugin:**
   ```bash
   openclaw plugins install ./mission-control-plugin
   ```

3. **Mission Control calls RPC:**
   ```javascript
   const gateway = new WebSocket("ws://localhost:18789");
   
   gateway.send(JSON.stringify({
     method: "missionControl.getActivity",
     params: {}
   }));
   ```

---

## Code Snippets

### Example: Parse Session Transcript

```javascript
const fs = require('fs');
const readline = require('readline');

async function parseSession(sessionPath) {
  const fileStream = fs.createReadStream(sessionPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const events = [];

  for await (const line of rl) {
    const entry = JSON.parse(line);
    
    if (entry.type === 'message' && entry.message?.role === 'assistant') {
      events.push({
        type: 'assistant_response',
        timestamp: entry.timestamp,
        content: extractTextContent(entry.message.content)
      });
    }
    
    if (entry.type === 'toolResult') {
      events.push({
        type: 'tool_execution',
        timestamp: entry.timestamp,
        tool: entry.toolName,
        duration: entry.details?.durationMs
      });
    }
  }

  return events;
}

function extractTextContent(content) {
  if (Array.isArray(content)) {
    return content
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join('\n');
  }
  return content;
}
```

### Example: Hook that Writes to SQLite

```typescript
import type { HookHandler } from "../../src/hooks/hooks.js";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const DB_PATH = "/Users/jeffdaniels/.openclaw/mission-control.db";

const handler: HookHandler = async (event) => {
  const db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });

  await db.run(`
    CREATE TABLE IF NOT EXISTS activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      action TEXT,
      session_key TEXT,
      timestamp TEXT,
      details TEXT
    )
  `);

  await db.run(`
    INSERT INTO activity (type, action, session_key, timestamp, details)
    VALUES (?, ?, ?, ?, ?)
  `, [
    event.type,
    event.action,
    event.sessionKey,
    event.timestamp.toISOString(),
    JSON.stringify(event.context)
  ]);

  await db.close();
};

export default handler;
```

---

## Limitations & Considerations

### What You Can't Do

1. **Direct plugin-to-plugin communication** - Hooks run independently, no shared state
2. **Real-time streaming** - Hooks fire after events complete, not during
3. **Modify OpenClaw's core behavior** - Hooks observe, they don't control

### Performance

- **File watching** - Can use ~10-20MB RAM per watcher
- **Hook execution** - Adds <5ms per event in most cases
- **JSONL parsing** - Fast, but can slow down with large files (>100MB)

### Security

- **File permissions** - Ensure activity logs have correct permissions (600 or 700)
- **Sensitive data** - Session transcripts may contain API keys, tokens, etc.
- **Access control** - Mission Control should authenticate before accessing logs

---

## Next Steps

1. **Immediate (Day 1):**
   - Enable `command-logger` hook
   - Test watching the command log from Mission Control
   - Verify events are captured correctly

2. **Short-term (Week 1):**
   - Create custom hook for Mission Control-specific logging
   - Design activity log format (JSONL or SQLite)
   - Implement basic activity parsing in Mission Control

3. **Long-term (Month 1):**
   - Consider plugin approach if advanced features are needed
   - Add activity filtering and search
   - Implement real-time activity feed in Mission Control UI

---

## References

- **OpenClaw Hooks Documentation:** `/Users/jeffdaniels/openclaw/docs/hooks.md`
- **OpenClaw Plugins Documentation:** `/Users/jeffdaniels/openclaw/docs/plugin.md`
- **Session Transcript Location:** `~/.openclaw/agents/*/sessions/*.jsonl`
- **Bundled Hooks Source:** `/Users/jeffdaniels/openclaw/src/hooks/bundled/`

---

## Appendix: Transcript Entry Types

Based on analysis of actual session transcripts, here are the common entry types:

| Type | Description | Key Fields |
|------|-------------|------------|
| `session` | Session metadata | `id`, `timestamp`, `cwd`, `version` |
| `message` | Message from user or assistant | `role`, `content`, `api`, `model`, `usage` |
| `toolResult` | Result of tool execution | `toolCallId`, `toolName`, `content`, `details` |
| `thinking` | Internal reasoning (if enabled) | `thinking`, `thinkingSignature` |
| `customType` | Custom events | `customType`, `data` |

---

**End of Report**
