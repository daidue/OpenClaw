# TitleRun Validation Library - Operations Runbook
**Last Updated:** 2026-02-28  
**On-call Contact:** See PagerDuty rotation

---

## Quick Reference

| Issue | Page |
|-------|------|
| User can't add player to trade | [Invalid ID Errors](#invalid-id-errors) |
| 426 Upgrade Required spike | [Version Mismatch](#version-mismatch) |
| Migration script failed | [Migration Issues](#migration-issues) |
| High error rate after deploy | [Rollback Procedure](#rollback-procedure) |
| Validation endpoints slow | [Performance Issues](#performance-issues) |

---

## Common Issues

### Invalid ID Errors

**Symptoms:**
- User reports "Invalid player ID" or "Invalid request" error
- Cannot add player to trade
- Cannot search for player

**Debug Steps:**

1. **Check client-side metrics:**
   ```
   Analytics → validation.client_id_rejected
   Filter by: last 1 hour, group by reason
   ```
   - High `EMPTY_STRING` count → UX issue (input not validated)
   - High `OUT_OF_RANGE` → User entering invalid IDs
   - High `INVISIBLE_UNICODE_DETECTED` → Copy-paste from external site

2. **Get user's input:**
   - Ask user for screenshot
   - Check browser console logs (if user can provide)
   - Look for error code in screenshot

3. **Reproduce locally:**
   ```javascript
   import { normalizeId } from '@titlerun/validation';
   const result = normalizeId(userInput);
   console.log(result);  // null = invalid, number = valid
   ```

4. **If null:**
   - Explain to user why ID is invalid
   - Example: "Player IDs must be numbers between 0 and 9 quadrillion"

5. **If not null (bug in frontend):**
   - Check if frontend using correct normalizeId function
   - Check LaunchDarkly flag: is user in rollout group?
   - Escalate to engineering team

**Resolution:**
- User error: Explain correct format
- Bug: Create incident, rollback if widespread

---

### Version Mismatch

**Symptoms:**
- Spike in 426 Upgrade Required errors
- Users see "App update available. Please refresh."
- Analytics shows `validation.version_mismatch` events

**Root Causes:**

1. **Frontend deployed but backend stuck:**
   ```bash
   # Check backend version
   curl https://api.titlerun.com/api/health/validation
   # Returns: {"version": "0.9.0"}
   
   # Check frontend bundle
   # Look in browser DevTools → Sources → main.js
   # Search for: VALIDATION_VERSION
   # Shows: "1.0.0"
   
   # MISMATCH: Frontend 1.0.0, Backend 0.9.0
   ```

2. **Backend deployed but frontend cache stuck:**
   - CDN cached old frontend bundle
   - Users on old version trying to hit new backend

**Fix:**

**Option A: Rollback recent deploy**
```bash
# If backend is new version:
railway rollback titlerun-api --to <previous-commit>

# If frontend is new version:
vercel rollback titlerun-app --to <previous-deployment>
```

**Option B: Bust frontend cache**
```bash
# Force CDN to fetch new bundle
vercel purge titlerun-app
# OR
cloudflare-cli cache purge --all
```

**Option C: Emergency version override (last resort)**
```typescript
// In backend code, temporarily accept old version:
function isCompatible(clientVersion, serverVersion) {
  // TEMPORARY: Accept 0.9.0 for 24 hours during migration
  if (clientVersion === '0.9.0') return true;
  
  return clientVersion === serverVersion;
}
```

**Prevention:**
- Deploy backend FIRST, wait 10 minutes
- Then deploy frontend
- Monitor health check endpoint after each deploy

---

### Migration Issues

**Symptoms:**
- Migration script exited with error
- Some trades still have dirty data
- Users report "Invalid player ID" for existing trades

**Debug Steps:**

1. **Check migration logs:**
   ```bash
   cat migration-audit.log | tail -n 100
   # Shows last 100 records migrated
   ```

2. **Check for unfixable records:**
   ```bash
   cat migration-unfixable.json
   # Shows records that couldn't be normalized
   ```

3. **Count remaining dirty records:**
   ```sql
   SELECT COUNT(*) FROM trades 
   WHERE player_id != TRIM(player_id);
   -- Should be 0 after successful migration
   ```

**Rollback:**

```bash
# Option A: Rollback using audit log
node scripts/rollback-migration.js --audit-log migration-audit.log

# Option B: Restore database backup
railway db:restore titlerun-prod --backup <timestamp>
```

**Re-run migration:**

```bash
# 1. Fix root cause (check migration-unfixable.json)
# 2. Manually update unfixable records in DB
# 3. Re-run dry-run to verify
npm run migrate -- --dry-run

# 4. If dry-run passes (0 unfixable records):
npm run migrate -- --execute --confirmed
```

---

### Rollback Procedure

**When to rollback:**
- Error rate >0.5% for >5 minutes
- Users reporting widespread issues
- Support tickets spiking
- Any 500 errors related to validation

**Rollback Steps:**

**1. Backend Kill Switch (INSTANT)**
```bash
# In Railway dashboard:
# Environment Variables → USE_SHARED_VALIDATION
# Change: true → false
# Restart: ~30 seconds
```

**2. Frontend Kill Switch (5 seconds)**
```bash
# In LaunchDarkly dashboard:
# Flags → shared-validation-enabled
# Set: 0% rollout
# Propagates to all clients in <5 seconds
```

**3. Verify rollback:**
```bash
# Check metrics
# validation.legacy_normalization_total should spike
# validation.shared_normalization_total should drop to 0

# Check error rate
# Should drop to baseline within 2 minutes
```

**4. Incident response:**
- Create Slack thread in #incidents
- Notify team: "Validation library rolled back due to [reason]"
- Create GitHub issue with reproduction steps
- Schedule postmortem

---

### Performance Issues

**Symptoms:**
- `/api/trade` endpoints slow
- Validation taking >100ms (normally <1ms)
- High CPU usage on backend

**Debug Steps:**

1. **Check validation latency:**
   ```
   Grafana → validation.normalize_id_duration_ms
   P99 latency should be <1ms
   ```

2. **Check for DOS attack:**
   ```
   Grafana → validation.rate_limit_hit_total
   Spike = someone hitting rate limits
   ```

3. **Check for slow database:**
   ```sql
   -- Find slow queries related to validation
   SELECT query, mean_exec_time 
   FROM pg_stat_statements 
   WHERE query LIKE '%player_id%'
   ORDER BY mean_exec_time DESC;
   ```

**Fix:**

**Option A: Rate limit aggressive IPs**
```bash
# Add to nginx config:
limit_req_zone $binary_remote_addr zone=validation:10m rate=10r/s;

# OR in application code:
if (await rateLimiter.isBlocked(req.ip)) {
  return res.status(429).json({ error: 'Too many requests' });
}
```

**Option B: Scale backend**
```bash
railway scale titlerun-api --replicas 3
```

**Option C: Add caching**
```typescript
// Cache normalized IDs for 1 hour
const cacheKey = `normalized_id:${raw}`;
const cached = await redis.get(cacheKey);
if (cached) return parseInt(cached);

const normalized = normalizeId(raw);
await redis.setex(cacheKey, 3600, normalized);
return normalized;
```

---

## Health Checks

**Validation Library Health:**
```bash
curl https://api.titlerun.com/api/health/validation
```

**Expected response:**
```json
{
  "version": "1.0.0",
  "compatible_versions": ["1.0.0"],
  "status": "healthy",
  "timestamp": "2026-02-28T21:00:00Z"
}
```

**Monitoring dashboard:**
- Grafana: https://grafana.titlerun.com/d/validation
- LaunchDarkly: https://app.launchdarkly.com/titlerun/production/features/shared-validation-enabled

---

## Escalation

**Level 1 (On-call handles):**
- Individual user issues
- Minor version mismatches
- Rollback execution

**Level 2 (Page engineering team):**
- Error rate >1%
- Widespread user reports
- Migration failures
- Security incidents

**Level 3 (Page CTO):**
- Data loss
- Security breach
- Multi-hour outage

**Contacts:**
- On-call: See PagerDuty
- Engineering lead: @rush (Slack)
- Database admin: @ops-team (Slack)
- Security: security@titlerun.com

---

## Useful Commands

```bash
# Check backend version
railway logs titlerun-api --tail 100 | grep VALIDATION_VERSION

# Check LaunchDarkly rollout percentage
curl -H "Authorization: api-key-here" \
  https://app.launchdarkly.com/api/v2/flags/production/shared-validation-enabled

# Count validation errors in last hour
# (requires log aggregation tool like Datadog)
datadog-cli query "service:titlerun-api status:error validation" --time 1h

# Find users affected by validation errors
psql $DATABASE_URL -c "SELECT user_id, COUNT(*) FROM error_logs 
WHERE error_code LIKE 'VALIDATION_%' 
GROUP BY user_id ORDER BY COUNT DESC LIMIT 10;"
```

---

**Last reviewed:** 2026-02-28  
**Next review:** When validation library updates to v2.0.0
