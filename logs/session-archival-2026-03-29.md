# Session Archival Report — 2026-03-29 04:00 AM

## Summary
**Status:** ⚠️ WARNING — Total size exceeds 200MB threshold

## Size Analysis
| Agent | Size |
|-------|------|
| main | 144M |
| dev | 118M |
| researcher | 46M |
| titlerun | 2.3M (was 3.3M) |
| polymarket | 2.4M |
| commerce | 1.6M |
| rush | 4K |
| **TOTAL** | **~314MB** |

## Compression Results
- **Files compressed:** 11
- **Space saved:** ~1MB (titlerun: 3.3M → 2.3M)
- **Compression ratios:** 52.5% - 92.2%

### Files Compressed
1. dev/b0590d8f-7d93-479b-8711-08920c0faa51.jsonl (70.4%)
2. titlerun/b195307e-2e98-41e0-b211-f9518b796903.jsonl (87.6%)
3. titlerun/2e33e938-e3bc-4065-a00b-7d783b531620.jsonl (66.5%)
4. titlerun/ca7b95df-5c1f-45c7-ad6d-9ea570183176.jsonl (80.9%)
5. titlerun/68d1e63f-351f-4ffb-bcf5-a15999ce8fcd.jsonl (67.2%)
6. titlerun/78f79093-c370-4535-993e-434beb2ffd71.jsonl (78.8%)
7. titlerun/23d9fd12-e92d-4942-ba5b-ddd8ae538158.jsonl (92.2%)
8. titlerun/26b4bd8a-a0a5-4ac0-8b1e-6fb25118a186.jsonl (81.8%)
9. titlerun/10b4d89e-1952-429d-856f-8d809e4b1f61.jsonl (52.6%)
10. titlerun/90cef7f6-1ef9-460c-b076-a162ef839ad8.jsonl (67.7%)
11. titlerun/304efbf8-8540-443b-b35b-991f50f46182.jsonl (52.5%)

## Recommendations
**ACTION REQUIRED:** Total session storage (314MB) exceeds 200MB threshold.

**Primary culprits:**
- main agent: 144MB (45% of total)
- dev agent: 118MB (37% of total)

**Suggested actions:**
1. Compress more aggressive: all files >7 days old
2. Consider purging old dev/researcher sessions (ephemeral sub-agents)
3. Implement session rotation policy (keep last 30 days, compress older)

**Next archival:** 2026-04-05 (weekly schedule)
