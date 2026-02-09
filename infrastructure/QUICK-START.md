# QUICK START GUIDE

**5 minutes to production-ready infrastructure**

---

## Step 1: Deploy (2 min)

```bash
cd /Users/jeffdaniels/.openclaw/workspace/infrastructure
chmod +x deploy.sh
./deploy.sh
```

This creates all directories, sets permissions, and validates the setup.

---

## Step 2: Install Cron (30 sec)

```bash
# Install the cron schedule
crontab cron/infrastructure.cron

# Verify it's installed
crontab -l | grep infrastructure
```

You should see ~12 cron jobs scheduled.

---

## Step 3: Health Check (30 sec)

```bash
python3 common/health_check.py
```

**Expected output:**
```
✓ Vector Memory: Index size: X KB
✓ Hourly Summaries: Last update X minutes ago
✓ Feedback System: X feedback entries
✓ Cron System: X jobs ran recently
✓ Disk Space: X GB free

Overall Status: HEALTHY
```

---

## Step 4: Test Voice Pipeline (Optional - 2 min)

```bash
# Place a voice note in incoming directory
# (any .mp3, .m4a, .ogg, or .wav file)
cp /path/to/voice-note.mp3 ../voice/incoming/

# Wait 15 minutes for cron, or manually trigger:
python3 voice-pipeline/transcribe.py
python3 voice-pipeline/extract-priorities.py
python3 voice-pipeline/update-priorities.py

# Check results
cat ../voice/transcripts/*.txt
cat ../PRIORITIES.md
```

---

## Step 5: Monitor (Ongoing)

```bash
# Watch logs in real-time
tail -f ../logs/cron/*.log

# Check health every hour
watch -n 3600 python3 common/health_check.py

# Manual backup anytime
python3 common/backup.py all
```

---

## What's Running?

Once cron is installed, these run automatically:

| Component | Schedule | What It Does |
|-----------|----------|--------------|
| Hourly Summarizer | Every hour, 8am-10pm | Parses session activity |
| Compaction Check | Every 30 min | Detects context window resets |
| Signal Detector | Every 2 hours | Finds patterns across agents |
| Daily Sync | 9pm daily | Aggregates all learnings |
| Decision Analysis | 11pm daily | Analyzes feedback patterns |
| Mistake Tracker | 11:30pm daily | Tracks rejection patterns |
| Weekly Synthesis | Sundays 10pm | Meta-learning extraction |
| Voice Pipeline | Every 15 min | Transcribe & extract |
| Backups | 2am daily | Automated backups |

---

## Troubleshooting

### "Cron jobs not running"
```bash
# Check cron is installed
crontab -l

# Check logs exist
ls -l ../logs/cron/

# Manually run a component
python3 context-retention/hourly-summarizer.py
```

### "Vector memory error"
```bash
# Check index exists
ls -lh ../memory/vector/

# Restore from backup
python3 common/backup.py restore <backup-path>
```

### "Disk space warning"
```bash
# Check usage
python3 common/health_check.py

# Clean old backups (auto-cleanup after 7 days)
rm -rf ../backups/infrastructure/vector-memory/2026-01-*
```

---

## Files & Locations

```
infrastructure/
├── README.md              ← Full documentation
├── EXPERT-REVIEW.md       ← 10-expert analysis
├── FIX-LOG.md            ← All fixes documented
├── DEPLOYMENT-STATUS.md  ← Current status
├── QUICK-START.md        ← This file
├── deploy.sh             ← Deployment script
├── requirements.txt      ← Dependencies
└── cron/                 ← Cron definitions

workspace/
├── memory/
│   ├── hourly/          ← Hourly summaries
│   ├── weekly/          ← Weekly synthesis
│   └── vector/          ← FAISS index
├── feedback/            ← Decision logs
├── voice/
│   ├── incoming/        ← Drop voice notes here
│   ├── transcripts/     ← Transcription output
│   └── extractions/     ← Extracted priorities
├── logs/
│   ├── cron/           ← Cron job logs
│   └── health/         ← Health check history
└── backups/            ← Automated backups
```

---

## Next Steps

After running for 24 hours:

1. ✅ Review logs: `tail -f ../logs/cron/*.log`
2. ✅ Check health: `python3 common/health_check.py`
3. ✅ Review expert feedback: `cat EXPERT-REVIEW.md`
4. 📋 Plan Phase 2 (tests, OpenClaw integration)

---

## Support

**Documentation:** README.md (comprehensive)  
**Expert Review:** EXPERT-REVIEW.md (detailed analysis)  
**Fix Log:** FIX-LOG.md (all changes documented)  

**Questions?** Read the docs or ask Bolt (dev agent).

---

**That's it. You're production-ready.** 🚀
