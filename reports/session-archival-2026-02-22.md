# Session File Archival Report
**Date:** 2026-02-22 04:00 AM EST
**Job:** session-archival (cron)

## Summary
🔴 **Total size exceeds threshold** (288MB > 200MB limit)
✅ No files eligible for compression (all < 30 days old)

## Size Breakdown by Agent
| Agent | Size | % of Total |
|-------|------|-----------|
| main | 148MB | 51% |
| dev | 91MB | 32% |
| titlerun | 11MB | 4% |
| commerce | 5.8MB | 2% |
| researcher | 30MB | 10% |
| polymarket | 2.2MB | 1% |
| **TOTAL** | **288MB** | **100%** |

## Compression Results
- **Files compressed:** 0
- **Size before:** 288MB
- **Size after:** 288MB (no change)
- **Reason:** All session files are < 30 days old (oldest: Feb 10, 2026)

## Largest Session Files
| Size | Agent | Session File |
|------|-------|--------------|
| 19MB | main | eb8eff6b-5d93-43e4-8513-0f54525f070b.jsonl |
| 3.7MB | main | 94f35f2e-c8f4-4eae-bc3a-c5d1730419ab.jsonl |
| 3.2MB | titlerun | fb116ccd-c45c-4528-8f22-889db85b7bc4.jsonl |
| 2.8MB | main | 11a07ad6-425e-4e51-aa1e-908a2761a4e6.jsonl |
| 2.1MB | titlerun | 92d59186-898e-48cd-80bb-8f0cfd94ddef.jsonl |

Top 5 files: 30.8MB (11% of total)

## Analysis
- **All sessions are recent** (last 12 days of operation)
- **Main agent dominates** storage (148MB / 51%)
- **Single 19MB session** in main agent (Feb 13) — likely a long research or coordination session
- **No archival candidates** with current 30-day policy

## Recommendations

### Option 1: Reduce Threshold (Aggressive)
Change compression threshold from 30 days → 7 days.
- **Pros:** Would immediately compress ~250MB of files
- **Cons:** Reduces accessibility of recent sessions, may slow debugging

### Option 2: Session Rotation (Moderate)
Implement session limits per agent (e.g., keep only last 50 sessions, archive rest).
- **Pros:** Predictable storage, automatic cleanup
- **Cons:** Requires new cron logic

### Option 3: Accept Current Size (Conservative)
288MB is operational normal for a 6-agent portfolio over 12 days.
- **Pros:** No changes needed, all sessions accessible
- **Cons:** Will grow ~600MB/month at current rate

### Option 4: Compress Immediately (Manual)
Force-compress all files regardless of age.
- **Impact:** Would reduce ~288MB → ~30-50MB (gzip ratio ~10:1 for JSONL)
- **Trade-off:** All sessions require decompression to read

## Recommendation
**Option 3 (Accept)** — 288MB is reasonable for active operation. Re-evaluate if exceeds 500MB or spans >60 days.

If Taylor wants aggressive cleanup, **Option 1** (7-day threshold) is the fastest win.
