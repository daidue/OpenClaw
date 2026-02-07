# Mission Control Enhancement Design

**Author:** Bolt (Technical Agent)  
**Date:** 2026-02-07  
**Status:** Design Phase  

## Executive Summary

This document outlines the recommended architecture for three key enhancements to the Mission Control dashboard:

1. **Auto-sync memories** - Real-time markdown file watching and sync
2. **Activity logging** - OpenClaw action tracking to Convex
3. **Bulk sync** - One-time/periodic full workspace sync

**Recommended Stack:**
- **File watching:** Node.js daemon with chokidar (runs alongside Mission Control)
- **Activity logging:** JSONL buffer + periodic sync (reliable, token-efficient)
- **Bulk sync:** CLI tool + optional cron (on-demand + scheduled)

---

## 1. Auto-Sync Memories on File Change

### Recommended: Node.js File Watcher Daemon (chokidar)

**Architecture:**
```
┌─────────────────────┐
│ OpenClaw Workspace  │
│ ~/.openclaw/        │
│   workspace/*.md    │
│   memory/*.md       │
└──────┬──────────────┘
       │ file changes
       ↓
┌──────────────────────┐
│ Watcher Daemon       │
│ (chokidar + convex)  │
│ Runs as bg process   │
└──────┬───────────────┘
       │ calls mutation
       ↓
┌──────────────────────┐
│ Convex API           │
│ memories.upsert()    │
└──────────────────────┘
```

**Why This Approach:**
- **Real-time updates** - Dashboard shows changes within seconds
- **Reliable** - Runs continuously, no cron gaps
- **Token-efficient** - Only syncs changed files
- **Simple** - Leverages existing Convex mutations

**Implementation Steps:**

1. **Create watcher service** at `~/Projects/mission-control/services/memory-watcher.ts`:

```typescript
import { watchFile } from 'fs/promises';
import chokidar from 'chokidar';
import { readFile, stat } from 'fs/promises';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api';
import { join, relative } from 'path';
import { homedir } from 'os';

const WORKSPACE = join(homedir(), '.openclaw/workspace');
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;
const client = new ConvexHttpClient(CONVEX_URL);

// Watch patterns
const patterns = [
  join(WORKSPACE, '*.md'),
  join(WORKSPACE, 'memory/*.md'),
];

async function syncFile(filePath: string) {
  try {
    const content = await readFile(filePath, 'utf-8');
    const stats = await stat(filePath);
    const relativePath = relative(WORKSPACE, filePath);
    
    console.log(`[SYNC] ${relativePath}`);
    
    await client.mutation(api.memories.upsert, {
      file: relativePath,
      content,
      lastModified: stats.mtime.toISOString(),
    });
    
    console.log(`[OK] ${relativePath}`);
  } catch (error) {
    console.error(`[ERROR] ${filePath}:`, error);
  }
}

const watcher = chokidar.watch(patterns, {
  persistent: true,
  ignoreInitial: false, // Sync existing files on start
  awaitWriteFinish: {
    stabilityThreshold: 500, // Wait 500ms after last change
    pollInterval: 100,
  },
});

watcher
  .on('add', syncFile)
  .on('change', syncFile)
  .on('unlink', async (filePath) => {
    // Optional: handle deletions
    console.log(`[DELETE] ${filePath}`);
  })
  .on('ready', () => {
    console.log('[WATCHER] Ready - monitoring workspace files');
  })
  .on('error', (error) => {
    console.error('[WATCHER ERROR]:', error);
  });

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[WATCHER] Shutting down...');
  watcher.close();
  process.exit(0);
});
```

2. **Add dependencies** to `package.json`:

```json
{
  "dependencies": {
    "chokidar": "^4.0.3"
  },
  "scripts": {
    "watch:memories": "tsx services/memory-watcher.ts"
  }
}
```

3. **Create systemd service** (for auto-start on Mac/Linux):

```bash
# ~/Library/LaunchAgents/com.missioncontrol.memorywatcher.plist
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.missioncontrol.memorywatcher</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/npm</string>
        <string>run</string>
        <string>watch:memories</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/Users/jeffdaniels/Projects/mission-control</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/memory-watcher.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/memory-watcher.err</string>
</dict>
</plist>
```

4. **Start the service:**

```bash
cd ~/Projects/mission-control
npm install chokidar tsx
launchctl load ~/Library/LaunchAgents/com.missioncontrol.memorywatcher.plist
```

**Pros:**
- ✅ Real-time sync (< 1s latency)
- ✅ Only syncs changed files (token-efficient)
- ✅ Dashboard gets instant updates via Convex reactivity
- ✅ Simple error recovery (just restart the daemon)
- ✅ Works with existing Convex mutations

**Cons:**
- ❌ Requires background process (but lightweight)
- ❌ Need to manage daemon lifecycle
- ❌ Slightly more complex than cron

### Alternative: Periodic Cron Job

```bash
# Every 5 minutes
*/5 * * * * cd ~/Projects/mission-control && npm run sync:memories
```

**Pros:** Simple, no daemon
**Cons:** 5min delay, syncs all files every time (wasteful)

### Alternative: Convex HTTP Action (Pull Model)

Convex periodically fetches files from filesystem via HTTP action.

**Pros:** No external daemon
**Cons:** 
- Convex can't access local filesystem directly
- Would need intermediate API server anyway
- More complex than watcher

---

## 2. Activity Logging from OpenClaw → Convex

### Recommended: JSONL Buffer + Periodic Sync

**Architecture:**
```
┌─────────────────────┐
│ OpenClaw Agent      │
│ (actions)           │
└──────┬──────────────┘
       │ writes to
       ↓
┌─────────────────────┐
│ ~/.openclaw/        │
│ activity.jsonl      │
│ (append-only log)   │
└──────┬──────────────┘
       │ read every 30s
       ↓
┌─────────────────────┐
│ Sync Daemon         │
│ (reads new lines)   │
└──────┬──────────────┘
       │ batch insert
       ↓
┌─────────────────────┐
│ Convex activities   │
│ table               │
└─────────────────────┘
```

**Why This Approach:**
- **Reliable** - JSONL is crash-safe (append-only)
- **Token-efficient** - OpenClaw just writes to file (no API overhead)
- **Batched** - Sync daemon sends multiple events at once
- **Decoupled** - OpenClaw doesn't need Convex credentials
- **Simple** - Standard log pattern

**Implementation Steps:**

1. **OpenClaw Activity Logger** (add to OpenClaw config/hooks):

```javascript
// ~/.openclaw/hooks/log-activity.js
const fs = require('fs');
const path = require('path');
const os = require('os');

const ACTIVITY_LOG = path.join(os.homedir(), '.openclaw/activity.jsonl');

function logActivity(type, agent, summary, details = {}) {
  const event = {
    timestamp: new Date().toISOString(),
    type,
    agent,
    summary,
    details,
  };
  
  fs.appendFileSync(ACTIVITY_LOG, JSON.stringify(event) + '\n', 'utf-8');
}

// Export for use in OpenClaw hooks
module.exports = { logActivity };

// Example usage in OpenClaw:
// logActivity('exec', 'bolt', 'Ran npm install', { command: 'npm install' });
```

2. **Activity Sync Daemon** at `~/Projects/mission-control/services/activity-sync.ts`:

```typescript
import { readFile, writeFile, stat } from 'fs/promises';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api';
import { join, homedir } from 'path';

const ACTIVITY_LOG = join(homedir(), '.openclaw/activity.jsonl');
const CURSOR_FILE = join(homedir(), '.openclaw/.activity-cursor');
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;
const SYNC_INTERVAL = 30000; // 30 seconds

const client = new ConvexHttpClient(CONVEX_URL);

let lastPosition = 0;

async function loadCursor() {
  try {
    const cursor = await readFile(CURSOR_FILE, 'utf-8');
    lastPosition = parseInt(cursor, 10);
  } catch {
    lastPosition = 0;
  }
}

async function saveCursor(position: number) {
  await writeFile(CURSOR_FILE, position.toString(), 'utf-8');
}

async function syncActivities() {
  try {
    const stats = await stat(ACTIVITY_LOG);
    if (stats.size <= lastPosition) {
      // No new data
      return;
    }

    const content = await readFile(ACTIVITY_LOG, 'utf-8');
    const lines = content.slice(lastPosition).split('\n').filter(Boolean);
    
    if (lines.length === 0) return;

    const events = lines.map(line => JSON.parse(line));
    
    console.log(`[SYNC] Uploading ${events.length} activities`);
    
    await client.mutation(api.activities.ingest, { events });
    
    // Update cursor
    lastPosition = stats.size;
    await saveCursor(lastPosition);
    
    console.log(`[OK] Synced ${events.length} events`);
  } catch (error) {
    console.error('[ERROR] Activity sync failed:', error);
  }
}

async function main() {
  await loadCursor();
  console.log('[ACTIVITY SYNC] Starting (position:', lastPosition, ')');
  
  // Initial sync
  await syncActivities();
  
  // Periodic sync
  setInterval(syncActivities, SYNC_INTERVAL);
}

main();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('[ACTIVITY SYNC] Shutting down...');
  await saveCursor(lastPosition);
  process.exit(0);
});
```

3. **Add to package.json:**

```json
{
  "scripts": {
    "watch:activities": "tsx services/activity-sync.ts"
  }
}
```

4. **Create LaunchAgent:**

```xml
<!-- ~/Library/LaunchAgents/com.missioncontrol.activitysync.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.missioncontrol.activitysync</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/npm</string>
        <string>run</string>
        <string>watch:activities</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/Users/jeffdaniels/Projects/mission-control</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

5. **Integrate into OpenClaw** - Add logging calls to key OpenClaw events:

```javascript
// Example: Hook into OpenClaw's exec tool
const { logActivity } = require('./hooks/log-activity');

// After successful exec:
logActivity('exec', 'bolt', `Executed: ${command}`, {
  command,
  exitCode,
  duration: endTime - startTime,
});

// After file write:
logActivity('write', 'bolt', `Created ${filePath}`, {
  path: filePath,
  size: stats.size,
});

// After web search:
logActivity('search', 'jeff', `Searched: ${query}`, {
  query,
  resultCount: results.length,
});
```

**Pros:**
- ✅ Extremely reliable (JSONL is crash-safe)
- ✅ Token-efficient (no API overhead per action)
- ✅ Batched uploads (fewer Convex mutations)
- ✅ Decoupled (OpenClaw doesn't need Convex config)
- ✅ Easy to debug (inspect .jsonl file directly)
- ✅ Can replay/reprocess by resetting cursor

**Cons:**
- ❌ 30s sync delay (not real-time, but acceptable)
- ❌ Requires cursor management
- ❌ Log file grows unbounded (need rotation later)

### Alternative: Direct Convex API Calls

OpenClaw calls `activities.ingest()` directly after each action.

**Pros:** Real-time
**Cons:**
- Token overhead (API call per action)
- Requires Convex credentials in OpenClaw
- Less reliable (network failures = lost events)
- Tight coupling

### Alternative: OpenClaw Hook/Plugin

Create OpenClaw plugin that calls Convex mutation via hook.

**Pros:** Integrated with OpenClaw lifecycle
**Cons:**
- Same issues as direct API calls
- OpenClaw plugin API may not exist yet
- Less flexible

---

## 3. Bulk Sync All Workspace .md Files

### Recommended: CLI Tool + Optional Cron

**Architecture:**
```
┌─────────────────────┐
│ CLI Tool            │
│ npm run sync:all    │
└──────┬──────────────┘
       │ scans workspace
       ↓
┌─────────────────────┐
│ Batch all *.md      │
│ files in workspace  │
└──────┬──────────────┘
       │ batch mutation
       ↓
┌─────────────────────┐
│ Convex              │
│ memories.sync()     │
└─────────────────────┘
```

**Implementation Steps:**

1. **Create sync script** at `~/Projects/mission-control/scripts/sync-all-memories.ts`:

```typescript
import { readdirSync, statSync, readFileSync } from 'fs';
import { join, relative } from 'path';
import { homedir } from 'os';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api';

const WORKSPACE = join(homedir(), '.openclaw/workspace');
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;
const client = new ConvexHttpClient(CONVEX_URL);

function findMarkdownFiles(dir: string): string[] {
  const files: string[] = [];
  
  function walk(currentDir: string) {
    const entries = readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}

async function syncAll() {
  console.log('[SYNC] Scanning workspace for .md files...');
  
  const files = findMarkdownFiles(WORKSPACE);
  console.log(`[SYNC] Found ${files.length} markdown files`);
  
  const batch = files.map(filePath => {
    const content = readFileSync(filePath, 'utf-8');
    const stats = statSync(filePath);
    const relativePath = relative(WORKSPACE, filePath);
    
    return {
      file: relativePath,
      content,
      lastModified: stats.mtime.toISOString(),
    };
  });
  
  console.log('[SYNC] Uploading to Convex...');
  
  // Batch in chunks of 100 (Convex has limits)
  const CHUNK_SIZE = 100;
  for (let i = 0; i < batch.length; i += CHUNK_SIZE) {
    const chunk = batch.slice(i, i + CHUNK_SIZE);
    await client.mutation(api.memories.sync, { files: chunk });
    console.log(`[SYNC] Uploaded ${i + chunk.length}/${batch.length}`);
  }
  
  console.log('[OK] All files synced!');
}

syncAll().catch(console.error);
```

2. **Add to package.json:**

```json
{
  "scripts": {
    "sync:all": "tsx scripts/sync-all-memories.ts"
  }
}
```

3. **Manual usage:**

```bash
cd ~/Projects/mission-control
npm run sync:all
```

4. **Optional: Daily cron** (for keeping index fresh):

```bash
# Crontab entry - run at 3am daily
0 3 * * * cd ~/Projects/mission-control && npm run sync:all >> /tmp/memory-sync.log 2>&1
```

**Pros:**
- ✅ Simple, on-demand
- ✅ Full control over when it runs
- ✅ Good for initial sync or recovery
- ✅ Uses existing `memories.sync()` mutation
- ✅ Batched for efficiency

**Cons:**
- ❌ Manual trigger (unless cron)
- ❌ Full scan every time (but fast enough for ~100 files)

### Alternative: Part of File Watcher

The chokidar watcher already syncs all files on startup (`ignoreInitial: false`).

**Pros:** Automatic on daemon start
**Cons:** Tied to daemon lifecycle

---

## Deployment Strategy

### Phase 1: Initial Setup (Day 1)

1. Install dependencies:
   ```bash
   cd ~/Projects/mission-control
   npm install chokidar tsx
   ```

2. Create services:
   - `services/memory-watcher.ts`
   - `services/activity-sync.ts`
   - `scripts/sync-all-memories.ts`

3. Initial bulk sync:
   ```bash
   npm run sync:all
   ```

4. Test watchers manually:
   ```bash
   npm run watch:memories &
   npm run watch:activities &
   ```

### Phase 2: Production Deployment (Day 2)

1. Create LaunchAgents for auto-start
2. Load services:
   ```bash
   launchctl load ~/Library/LaunchAgents/com.missioncontrol.memorywatcher.plist
   launchctl load ~/Library/LaunchAgents/com.missioncontrol.activitysync.plist
   ```

3. Verify in Mission Control dashboard

### Phase 3: OpenClaw Integration (Day 3)

1. Create `~/.openclaw/hooks/log-activity.js`
2. Add logging calls to key OpenClaw actions
3. Test activity flow end-to-end

### Phase 4: Monitoring (Ongoing)

- Check logs: `/tmp/memory-watcher.log`, `/tmp/memory-watcher.err`
- Monitor Convex dashboard for mutation counts
- Set up alerts for sync failures (optional)

---

## Error Handling & Edge Cases

### File Watcher Failures

**Problem:** Daemon crashes
**Solution:** LaunchAgent with `KeepAlive: true` auto-restarts

**Problem:** Convex mutation fails
**Solution:** Log error, continue watching (don't crash)

### Activity Sync Failures

**Problem:** Network error during sync
**Solution:** Cursor not updated, retry next cycle (at-least-once delivery)

**Problem:** Malformed JSONL line
**Solution:** Skip line, log error, continue processing

### File Deletions

**Problem:** User deletes markdown file
**Solution:** 
- Option 1: Keep in Convex (archive)
- Option 2: Delete from Convex (add `memories.delete()` mutation)

**Recommendation:** Keep in Convex for now (searchable history)

---

## Performance Considerations

### Memory Watcher

- **File count:** ~20 files = negligible CPU/memory
- **Debounce:** 500ms stabilityThreshold prevents rapid-fire syncs
- **Network:** ~1KB per file = ~20KB per full sync

### Activity Sync

- **Log size:** Estimate 100 events/day × 500 bytes = 50KB/day
- **Rotation:** Implement log rotation after 1MB (optional)
  ```bash
  # Rotate activity.jsonl when > 1MB
  if [ $(wc -c < ~/.openclaw/activity.jsonl) -gt 1048576 ]; then
    mv ~/.openclaw/activity.jsonl ~/.openclaw/activity-$(date +%Y%m%d).jsonl
    # Reset cursor
    echo "0" > ~/.openclaw/.activity-cursor
  fi
  ```

### Bulk Sync

- **Time:** ~100 files × 10KB each = 1MB upload = ~2-3 seconds
- **Frequency:** Daily is sufficient (files don't change that often)

---

## Security Considerations

1. **Convex URL in env:**
   - Store `NEXT_PUBLIC_CONVEX_URL` in `.env.local`
   - Don't commit to git

2. **File permissions:**
   - `activity.jsonl` should be readable only by user
   - LaunchAgent logs may contain sensitive data

3. **API rate limits:**
   - Convex free tier: 1M rows/month
   - Estimate: 100 events/day × 30 = 3,000 rows/month (well under limit)

---

## Testing Checklist

### Memory Watcher

- [ ] Create new .md file → appears in dashboard
- [ ] Edit existing .md file → content updates in dashboard
- [ ] Delete .md file → handle gracefully (log, don't crash)
- [ ] Restart daemon → syncs all files on startup

### Activity Sync

- [ ] Write to activity.jsonl → appears in dashboard after 30s
- [ ] Write 10 events at once → batched correctly
- [ ] Restart sync daemon → resumes from cursor
- [ ] Delete cursor file → reprocesses all events (idempotent)

### Bulk Sync

- [ ] Run sync:all → all files in Convex
- [ ] Add new file, run sync:all → new file appears
- [ ] Edit file, run sync:all → content updated

---

## Future Enhancements

1. **Bidirectional sync** - Edit memories in dashboard, write back to filesystem
2. **Conflict resolution** - Handle simultaneous edits
3. **Selective sync** - Ignore certain files/folders
4. **Activity search** - Full-text search in activities table
5. **Real-time activity log** - WebSocket for sub-second updates
6. **File compression** - Gzip large markdown files before upload
7. **Incremental search index** - Only re-index changed content

---

## Conclusion

**Recommended Architecture:**

```
┌─────────────────────────────────────────────────┐
│ OpenClaw Workspace                              │
│   *.md files + activity.jsonl                   │
└───────┬─────────────────────────────────────┬───┘
        │                                     │
        ↓ file changes                        ↓ append events
┌───────────────────┐               ┌─────────────────────┐
│ Memory Watcher    │               │ Activity Sync       │
│ (chokidar)        │               │ (JSONL cursor)      │
└───────┬───────────┘               └─────────┬───────────┘
        │                                     │
        ↓ upsert                              ↓ batch ingest
┌─────────────────────────────────────────────────┐
│ Convex Backend                                  │
│   memories table + activities table             │
└───────┬─────────────────────────────────────────┘
        │
        ↓ reactive queries
┌───────────────────┐
│ Mission Control   │
│ Dashboard         │
└───────────────────┘
```

**Key Benefits:**

- ✅ Real-time memory sync (< 1s)
- ✅ Reliable activity logging (crash-safe JSONL)
- ✅ Token-efficient (only sync changes)
- ✅ Decoupled (services can restart independently)
- ✅ Simple to debug (logs and file inspection)
- ✅ Scalable (handles 1000s of files/events)

**Next Steps:**

1. Review this design with Jeff
2. Implement Phase 1 (local testing)
3. Deploy Phase 2 (LaunchAgents)
4. Integrate Phase 3 (OpenClaw hooks)

---

**Questions? Ask Bolt.** 🤖
