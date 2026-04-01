# Reminder: Provision Redis for TitleRun

**Date:** Friday, April 4th, 2026 @ 9:00 PM EDT  
**For:** Taylor

---

## What to Do

Provision Redis on Railway for the TitleRun BullMQ job queue.

### Steps (2 minutes)

1. **Go to Railway dashboard:**  
   https://railway.app/project/selfless-peace

2. **Add Redis:**
   - Click "New" (top right)
   - Select "Database"
   - Choose "Add Redis"

3. **Done!**
   - Railway auto-adds `REDIS_URL` to titlerun-api
   - Service restarts automatically (~30 seconds)
   - BullMQ worker starts on restart

---

## Why This Is Needed

**Current status (as of March 31, 2026):**
- ✅ BullMQ code is deployed to production
- ✅ All critical bugs fixed (15 issues)
- ❌ Worker can't start without Redis

**What happens after Redis is provisioned:**
- BullMQ worker starts automatically
- Background job queue becomes operational
- Value engine refreshes run async (not blocking API)
- Admin dashboard available at: https://api.titlerun.co/api/admin/queues/ui

---

## After Provisioning

**Verify it works:**
```bash
# Check worker started
curl https://api.titlerun.co/api/admin/queues/ui
# Should see Bull Board dashboard (not 404)

# Check Redis connection
railway logs --service titlerun-api | grep "BullMQ"
# Should see: "✅ BullMQ worker started"
```

---

## Context

**What was deployed (March 31, 2026):**
- BullMQ job queue implementation
- Sleeper graph crawler (Week 1)
- 15 critical bug fixes
- Migration files (043, 045, 046)

**Commit:** f3f64d3 (currently live in production)

**What's still pending:**
1. Redis provisioning (this reminder)
2. Migration 040 application (for crawler tables)

---

## Cost

**Redis on Railway:** ~$5/mo  
Initial size: 256MB  
Typical usage: <100MB  
**Estimated:** $1-2/mo

---

**Questions?** Check the full deployment docs:
- `~/Documents/Claude Cowork Business/titlerun-api/DEPLOYMENT-NEXT-STEPS.md`
- `~/Documents/Claude Cowork Business/titlerun-api/REDIS-PROVISION-STEPS.md`

**Location of this reminder:**
`~/.openclaw/workspace/reminders/2026-04-04-redis-provision.md`
