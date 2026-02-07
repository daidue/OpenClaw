# Mission Control Enhancement Design Review

**Reviewer:** Fury (Research Agent)  
**Date:** 2026-02-07  
**Design Author:** Bolt  
**Overall Assessment:** ⚠️ **Good foundation with critical gaps**

---

## Executive Summary

The design is architecturally sound and demonstrates good engineering judgment. The core patterns (chokidar watcher, JSONL buffering, batch sync) are industry-standard and appropriate. **However, there are significant security, reliability, and operational gaps that must be addressed before deployment.**

**Critical Issues Found:** 4  
**Important Concerns:** 6  
**Nice-to-Have Improvements:** 3

---

## 1. Security Gaps 🔴

### Critical: Credential Management

**Issue:** The design relies on `NEXT_PUBLIC_CONVEX_URL` stored in `.env.local`, but:

1. **Background daemons can't access Next.js env vars** - LaunchAgents run in a different environment context and won't have access to `.env.local`
2. **NEXT_PUBLIC_ prefix is wrong** - This prefix means the var is exposed to the browser (public). Convex URL alone isn't sensitive, but the pattern is sloppy.
3. **No authentication specified** - The design doesn't explain how the daemons authenticate with Convex. Does Convex require auth tokens? Deploy keys? This is completely missing.

**Impact:** The daemons will fail to connect to Convex in production.

**Fix:**
```bash
# Create dedicated env file for daemons
# ~/.openclaw/mission-control.env
CONVEX_URL=https://zany-bulldog-639.convex.cloud
CONVEX_ADMIN_KEY=<admin_key_here>  # If required by Convex API
```

Update LaunchAgents:
```xml
<key>EnvironmentVariables</key>
<dict>
    <key>CONVEX_URL</key>
    <string>https://zany-bulldog-639.convex.cloud</string>
    <key>CONVEX_ADMIN_KEY</key>
    <string>...</string>
</dict>
```

### Important: File Permission Model

**Issue:** The design mentions permissions briefly but doesn't specify:

1. Who can read `activity.jsonl`? (Root? User only?)
2. What if OpenClaw runs as different user than Mission Control?
3. What sensitive data might leak into activity logs? (API keys, passwords in command args?)

**Recommendation:**
- Set strict permissions: `chmod 600 ~/.openclaw/activity.jsonl`
- Add sanitization to `logActivity()` - scrub known patterns (API keys, tokens, passwords)
- Document assumption that OpenClaw and Mission Control run as same user

### Important: Injection Risks

**Issue:** The `logActivity()` function accepts arbitrary `details` objects that are JSON-stringified directly into JSONL:

```javascript
fs.appendFileSync(ACTIVITY_LOG, JSON.stringify(event) + '\n', 'utf-8');
```

**Potential attack:**
- If `details` contains user input from OpenClaw (e.g., search query, file path), malicious input could:
  - Break JSONL parsing (embed newlines)
  - Cause JSON.parse() to fail downstream
  - Inject malicious payloads if details are ever rendered in UI without escaping

**Fix:**
- Validate/sanitize input before logging
- Use a schema validator (zod) for activity events
- Ensure UI properly escapes activity details when rendering

---

## 2. Reliability Concerns ⚠️

### Critical: Cursor Corruption

**Issue:** The activity sync daemon maintains a cursor file to track position in `activity.jsonl`:

```typescript
lastPosition = stats.size;
await saveCursor(lastPosition);
```

**Failure modes:**
1. **Concurrent writes** - If activity.jsonl is being written while sync reads, `stats.size` may not align with a newline boundary → next read starts mid-line → JSON.parse() fails → sync crashes
2. **Partial writes** - If OpenClaw crashes mid-write to activity.jsonl, the last line may be incomplete → same failure
3. **No recovery** - If cursor is saved but Convex mutation fails, events are lost permanently

**Impact:** Data loss and daemon crashes.

**Fix:**
```typescript
async function syncActivities() {
  try {
    const content = await readFile(ACTIVITY_LOG, 'utf-8');
    const lines = content.slice(lastPosition).split('\n');
    
    // IMPORTANT: Don't process last line if file doesn't end with \n
    // It might be incomplete due to concurrent write
    const completeLines = content.endsWith('\n') 
      ? lines.filter(Boolean)
      : lines.slice(0, -1).filter(Boolean);
    
    if (completeLines.length === 0) return;

    const events = [];
    for (const line of completeLines) {
      try {
        events.push(JSON.parse(line));
      } catch (parseError) {
        console.error('[ERROR] Malformed JSONL line:', line);
        // Skip bad line, continue processing
      }
    }
    
    if (events.length === 0) return;
    
    console.log(`[SYNC] Uploading ${events.length} activities`);
    await client.mutation(api.activities.ingest, { events });
    
    // ONLY update cursor AFTER successful mutation
    const newPosition = lastPosition + 
      completeLines.reduce((sum, line) => sum + line.length + 1, 0);
    lastPosition = newPosition;
    await saveCursor(lastPosition);
    
  } catch (error) {
    console.error('[ERROR] Activity sync failed:', error);
    // Don't update cursor on failure - retry next cycle
  }
}
```

### Important: File Watcher Race Conditions

**Issue:** The memory watcher uses:

```typescript
awaitWriteFinish: {
  stabilityThreshold: 500,
  pollInterval: 100,
}
```

**Edge cases:**
1. **Large file writes** - If OpenClaw writes a 10MB markdown file (e.g., dump of research), 500ms may not be enough
2. **Multiple rapid edits** - User saves file 3 times in 2 seconds → 3 separate Convex mutations → wasted API calls
3. **Vim/emacs swap files** - Some editors create temp files like `.file.md.swp` → might trigger watcher

**Fix:**
- Increase `stabilityThreshold` to 2000ms (2 seconds)
- Add debouncing at sync level (don't sync same file within 5 seconds)
- Explicitly ignore common temp file patterns:
  ```typescript
  ignored: ['**/.*.swp', '**/.*.tmp', '**/~*', '**/#*#']
  ```

### Important: No Health Checks

**Issue:** The LaunchAgents have `KeepAlive: true`, which restarts crashed daemons, but:

1. **Crash loops** - If daemon crashes immediately on start (e.g., Convex URL is wrong), LaunchAgent will restart it every second → infinite crash loop
2. **Silent failures** - If daemon runs but mutations fail silently, there's no alerting
3. **No startup validation** - Daemons don't verify Convex connectivity before entering main loop

**Fix:**
Add startup health check:
```typescript
async function validateConnection() {
  try {
    await client.query(api.memories.list, { limit: 1 });
    console.log('[OK] Connected to Convex');
  } catch (error) {
    console.error('[FATAL] Cannot connect to Convex:', error);
    process.exit(1); // Exit cleanly, let LaunchAgent backoff handle it
  }
}
```

Add throttling to LaunchAgent:
```xml
<key>ThrottleInterval</key>
<integer>60</integer>  <!-- Wait 60s between restarts -->
```

---

## 3. Token/Cost Efficiency ✅

**Assessment:** This is the strongest aspect of the design.

**Good decisions:**
- ✅ File watcher only syncs changed files (not full scans)
- ✅ Activity logging uses local buffer (no API overhead per action)
- ✅ Batch uploads (100 events at once)
- ✅ Cursor-based incremental processing

**Cost estimate:**
- Convex free tier: 1M rows/month, 1GB storage
- Expected usage: ~3,000 activity events/month, ~100 memory files
- Well within limits

**Minor optimization:**
Consider compressing large markdown files before upload:
```typescript
import { gzipSync } from 'zlib';

if (content.length > 50000) {
  await client.mutation(api.memories.upsert, {
    file: relativePath,
    content: gzipSync(content).toString('base64'),
    compressed: true,
    lastModified: stats.mtime.toISOString(),
  });
}
```

---

## 4. Integration Issues 🔴

### Critical: OpenClaw Hook Mechanism Undefined

**Issue:** The design assumes OpenClaw has a hook/plugin system to call `logActivity()`:

```javascript
// Example: Hook into OpenClaw's exec tool
const { logActivity } = require('./hooks/log-activity');
```

**Problem:** **Does OpenClaw have hooks?** The design doesn't verify this.

- If OpenClaw doesn't support hooks, the entire activity logging feature is blocked
- If it does, where do hooks run? (Same process? Subprocess?)
- What's the hook API? (Async? Sync?)
- How are hook errors handled?

**Action Required:**
1. **Verify OpenClaw supports plugins/hooks** - Check OpenClaw docs or source code
2. If yes, document the exact hook points and API
3. If no, propose alternative: patch OpenClaw source to add logging calls (much more invasive)

**Alternative if no hooks:**
Use `strace`/`fs.watch` to monitor OpenClaw's file writes and infer activity:
```typescript
// Watch OpenClaw's workspace for file creates
watcher.on('add', (filePath) => {
  logActivity('file_created', 'unknown', `Created ${filePath}`, { path: filePath });
});
```
Less precise but works without OpenClaw changes.

### Important: Convex Schema Missing

**Issue:** The design references mutations like `api.memories.upsert` and `api.activities.ingest` but doesn't define:

1. The Convex schema for `memories` and `activities` tables
2. The mutation implementations
3. Index requirements for queries

**Impact:** Can't validate if the design actually works with Convex.

**Required additions:**
```typescript
// convex/schema.ts
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  memories: defineTable({
    file: v.string(),           // Relative path
    content: v.string(),         // Full markdown content
    lastModified: v.string(),    // ISO timestamp
    compressed: v.optional(v.boolean()),
  }).index('by_file', ['file']),
  
  activities: defineTable({
    timestamp: v.string(),       // ISO timestamp
    type: v.string(),            // exec, write, search, etc.
    agent: v.string(),           // jeff, bolt, fury, etc.
    summary: v.string(),         // Human-readable summary
    details: v.any(),            // Arbitrary JSON
  }).index('by_timestamp', ['timestamp'])
    .index('by_agent', ['agent', 'timestamp']),
});

// convex/memories.ts
export const upsert = mutation({
  args: {
    file: v.string(),
    content: v.string(),
    lastModified: v.string(),
    compressed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('memories')
      .withIndex('by_file', (q) => q.eq('file', args.file))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert('memories', args);
    }
  },
});

// convex/activities.ts
export const ingest = mutation({
  args: {
    events: v.array(v.object({
      timestamp: v.string(),
      type: v.string(),
      agent: v.string(),
      summary: v.string(),
      details: v.any(),
    })),
  },
  handler: async (ctx, args) => {
    // Batch insert with deduplication
    for (const event of args.events) {
      // Check if event already exists (idempotency)
      const exists = await ctx.db
        .query('activities')
        .withIndex('by_timestamp', (q) => 
          q.eq('timestamp', event.timestamp)
        )
        .filter((q) => q.eq(q.field('summary'), event.summary))
        .first();
      
      if (!exists) {
        await ctx.db.insert('activities', event);
      }
    }
  },
});
```

---

## 5. Missing Features

### Important: Log Rotation

**Issue:** The design mentions log rotation as "optional" but `activity.jsonl` will grow unbounded:

- 100 events/day × 500 bytes = 50KB/day = 18MB/year
- If OpenClaw is heavily used (1000 events/day) → 180MB/year

**Recommendation:** Make log rotation **required**, not optional.

**Implementation:**
```bash
# Add to services/activity-sync.ts startup
async function rotateLogIfNeeded() {
  const stats = await stat(ACTIVITY_LOG);
  if (stats.size > 10 * 1024 * 1024) { // 10MB
    const archivePath = ACTIVITY_LOG.replace('.jsonl', `-${Date.now()}.jsonl`);
    await rename(ACTIVITY_LOG, archivePath);
    lastPosition = 0;
    await saveCursor(0);
    console.log(`[ROTATE] Archived log to ${archivePath}`);
  }
}
```

### Nice-to-Have: Structured Logging

**Issue:** Daemons log to stdout/stderr, which goes to `/tmp/memory-watcher.log`. This is hard to debug because:

1. No log levels (everything is `console.log`)
2. No structured format (mix of `[OK]`, `[ERROR]`, `[SYNC]` prefixes)
3. No timestamps (LaunchAgent doesn't add them)

**Recommendation:**
Use a real logger like `pino`:
```typescript
import pino from 'pino';

const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: false },
  },
});

logger.info({ file: relativePath, size: stats.size }, 'Syncing file');
logger.error({ error: err.message }, 'Sync failed');
```

### Nice-to-Have: Metrics/Observability

**Issue:** No way to monitor daemon health without tailing logs.

**Recommendation:**
- Export Prometheus metrics (or simple JSON stats endpoint)
- Track: files synced, events synced, errors, last successful sync time
- Mission Control dashboard could display these stats

---

## 6. Alternatives Considered

**The design evaluates alternatives well.** Key decisions:

| Decision | Chosen | Rejected | Assessment |
|----------|--------|----------|------------|
| Memory sync | Chokidar daemon | Cron job | ✅ Correct - real-time is valuable |
| Activity logging | JSONL buffer | Direct API calls | ✅ Correct - reliability > latency |
| Bulk sync | CLI tool | Part of watcher | ✅ Correct - separation of concerns |

**One alternative worth reconsidering:**

### Alternative: SQLite Instead of JSONL

**Proposal:** Use SQLite for activity log instead of JSONL:

```typescript
import Database from 'better-sqlite3';

const db = new Database('~/.openclaw/activity.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT,
    type TEXT,
    agent TEXT,
    summary TEXT,
    details TEXT,
    synced INTEGER DEFAULT 0
  )
`);

function logActivity(type, agent, summary, details = {}) {
  db.prepare(`
    INSERT INTO activities (timestamp, type, agent, summary, details)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    new Date().toISOString(),
    type,
    agent,
    summary,
    JSON.stringify(details)
  );
}

// Sync daemon
const unsyncedEvents = db.prepare('SELECT * FROM activities WHERE synced = 0').all();
await client.mutation(api.activities.ingest, { events: unsyncedEvents });
db.prepare('UPDATE activities SET synced = 1 WHERE synced = 0').run();
```

**Pros:**
- ✅ Atomic transactions (no cursor corruption)
- ✅ Built-in deduplication (no need for cursor file)
- ✅ Can query locally (`SELECT * FROM activities WHERE type = 'exec'`)
- ✅ Easier to handle rotation (just archive the .db file)

**Cons:**
- ❌ Slightly more complexity (SQLite dependency)
- ❌ Harder to inspect (can't just `tail -f activity.jsonl`)

**Verdict:** SQLite is worth considering if JSONL cursor issues prove difficult.

---

## 7. Operational Concerns

### Critical: No Rollback Plan

**Issue:** Once deployed, how do you undo it?

- If memory watcher causes performance issues, how do you stop it?
- If activity.jsonl fills up disk, how do you clear it?
- If Convex gets flooded with bad data, how do you purge it?

**Required:**
Document rollback procedure:

```bash
# Stop daemons
launchctl unload ~/Library/LaunchAgents/com.missioncontrol.*.plist

# Clear activity log
rm ~/.openclaw/activity.jsonl ~/.openclaw/.activity-cursor

# Purge Convex data (requires Convex CLI)
npx convex run memories:clear
npx convex run activities:clear
```

### Important: No Monitoring Dashboard

**Issue:** How do you know the daemons are working?

**Recommendation:**
Add a status page to Mission Control:

```tsx
// app/status/page.tsx
export default function StatusPage() {
  const lastMemorySync = useQuery(api.memories.getLastSync);
  const lastActivitySync = useQuery(api.activities.getLastSync);
  
  return (
    <div>
      <h1>System Status</h1>
      <div>
        <h2>Memory Watcher</h2>
        <p>Last sync: {lastMemorySync?.timestamp ?? 'Never'}</p>
        <p>Status: {isRecent(lastMemorySync) ? '✅ OK' : '❌ Stale'}</p>
      </div>
      <div>
        <h2>Activity Sync</h2>
        <p>Last sync: {lastActivitySync?.timestamp ?? 'Never'}</p>
        <p>Status: {isRecent(lastActivitySync) ? '✅ OK' : '❌ Stale'}</p>
      </div>
    </div>
  );
}
```

### Important: Deployment Complexity

**Issue:** Phase 2 requires manual LaunchAgent setup. This is error-prone.

**Recommendation:**
Add a setup script:

```bash
#!/bin/bash
# scripts/setup-daemons.sh

set -e

echo "Setting up Mission Control daemons..."

# Copy LaunchAgents
cp launchagents/*.plist ~/Library/LaunchAgents/

# Load daemons
launchctl load ~/Library/LaunchAgents/com.missioncontrol.memorywatcher.plist
launchctl load ~/Library/LaunchAgents/com.missioncontrol.activitysync.plist

echo "✅ Daemons installed and started"
echo "Check status: launchctl list | grep missioncontrol"
```

---

## Additional Risks Not Covered

### 1. Convex Rate Limiting

**Issue:** The design assumes Convex is always available, but what if:

- Convex imposes rate limits (e.g., 100 mutations/minute)?
- Network is down?
- Convex is under maintenance?

**Mitigation:**
- Add exponential backoff to mutation calls
- Queue failed mutations for retry
- Add circuit breaker pattern (stop retrying after N failures)

### 2. File Encoding Issues

**Issue:** The design assumes all `.md` files are UTF-8, but what if:

- A file has invalid UTF-8 (binary corruption)?
- A file uses a different encoding (Latin-1, UTF-16)?

**Mitigation:**
```typescript
try {
  const content = await readFile(filePath, 'utf-8');
} catch (error) {
  if (error.code === 'ERR_INVALID_ARG_VALUE') {
    logger.warn({ file: filePath }, 'Skipping non-UTF-8 file');
    return;
  }
  throw error;
}
```

### 3. Convex Storage Limits

**Issue:** Convex free tier has 1GB storage. If `memory/*.md` files total 1GB:

- Will the sync fail?
- Will Convex silently drop data?
- Will it require upgrade to paid plan?

**Mitigation:**
- Monitor total storage in Convex dashboard
- Add size limits to sync (skip files > 1MB)
- Add compression for large files

---

## Testing Gaps

**The design includes a testing checklist, but it's incomplete:**

**Missing tests:**
- [ ] Concurrent file write while watcher is syncing
- [ ] Malformed JSONL line in activity.jsonl
- [ ] Convex mutation fails (network error)
- [ ] LaunchAgent crash and restart
- [ ] Cursor file corruption
- [ ] File with invalid UTF-8
- [ ] File > 1MB
- [ ] 1000 events in activity.jsonl at once
- [ ] Two sync daemons running simultaneously (race condition)

**Recommendation:** Add integration test suite using Convex test environment.

---

## Final Recommendations

### Must Fix Before Deployment (Critical)

1. **✅ Clarify Convex authentication** - How do daemons auth with Convex?
2. **✅ Fix cursor corruption** - Use SQLite or improve JSONL cursor logic
3. **✅ Verify OpenClaw hook support** - Confirm activity logging is possible
4. **✅ Add Convex schema** - Define tables and mutations explicitly

### Should Fix (Important)

5. **⚠️ Add log rotation** - Don't let activity.jsonl grow unbounded
6. **⚠️ Add startup health checks** - Validate Convex connectivity before main loop
7. **⚠️ Improve error handling** - Add retries, backoff, circuit breakers
8. **⚠️ Add status dashboard** - Monitor daemon health from Mission Control
9. **⚠️ Sanitize activity details** - Scrub sensitive data before logging
10. **⚠️ Document rollback plan** - How to undo deployment

### Nice to Have (Optional)

11. **💡 Use structured logging** - Replace console.log with pino
12. **💡 Add metrics** - Track sync counts, errors, latency
13. **💡 Setup script** - Automate LaunchAgent installation

---

## Conclusion

**Overall Assessment:** ⚠️ **Conditionally approved with required changes**

The design demonstrates solid engineering fundamentals and makes good architectural choices. The patterns (file watcher, JSONL buffer, batch sync) are industry-standard and appropriate for the use case.

**However, the design has critical gaps in:**
- **Security:** Credential management for daemons
- **Reliability:** Cursor corruption, race conditions, error handling
- **Integration:** Unclear OpenClaw hook mechanism
- **Operations:** No monitoring, rollback, or deployment automation

**Verdict:**
- ✅ **Approve architecture** - The overall approach is sound
- ❌ **Block deployment** - Until critical issues (#1-4) are resolved
- ⚠️ **Recommend improvements** - Address important issues (#5-10) before production

**Estimated effort to address critical issues:** 4-6 hours  
**Estimated effort for full production-ready deployment:** 12-16 hours

---

**Next Steps:**

1. Bolt addresses critical issues (#1-4)
2. Fury re-reviews updated design
3. Implement Phase 1 with enhanced error handling
4. Deploy to production with monitoring in place

**Questions for Jeff:**
- What's your risk tolerance for Phase 1 deployment? (Test locally first, or YOLO to production?)
- Should we prioritize SQLite over JSONL for reliability?
- Do you want a monitoring dashboard in Mission Control, or is log tailing sufficient?

---

**Review complete. Standing by for next steps.**
