# Database Migration Sync Verification

**Purpose:** Ensure database schema and migrations are in sync

**Execution time:** 5-15 seconds

**Criticality:** CRITICAL — Prevents schema drift and deployment failures

---

## Check 1: Migration-Schema Sync

**Command:**
```bash
# Generate schema from migrations
npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma \
  --script > migration-drift.sql

# Check if drift detected (file not empty)
if [ -s migration-drift.sql ]; then
  echo "ERROR: Schema drift detected - migrations don't match schema"
  cat migration-drift.sql
  exit 1
fi
```

**What it catches:**
- Schema changes without migrations (manual DB edits)
- Migrations out of sync with Prisma schema
- Missing migrations for schema changes

**Example failure:**
```sql
-- Migration drift detected:

-- AlterTable
ALTER TABLE "User" ADD COLUMN "phoneNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");
```

**Severity:** CRITICAL

**Issue:** Schema has changes not captured in migration files

**Fix:**
```bash
# Generate new migration
npx prisma migrate dev --name add_phone_number

# OR reset and regenerate migrations
npx prisma migrate reset
npx prisma migrate dev
```

---

## Check 2: Pending Migrations

**Command:**
```bash
# Check if there are unapplied migrations
npx prisma migrate status > migration-status.txt

if grep -q "Following migration have not yet been applied" migration-status.txt; then
  echo "ERROR: Pending migrations detected"
  cat migration-status.txt
  exit 1
fi
```

**What it catches:**
- New migration files not applied to database
- Deployment will fail if migrations not run

**Example failure:**
```
Following migrations have not yet been applied:

20260301120000_add_phone_number
20260301130000_add_user_preferences

To apply migrations, run: npx prisma migrate deploy
```

**Severity:** CRITICAL (deployment will fail)

**Fix:**
```bash
# Apply migrations
npx prisma migrate deploy

# OR in production: use Railway migration command
railway run npx prisma migrate deploy
```

---

## Check 3: Migration Conflicts

**Command:**
```bash
# Check for multiple migration files with same timestamp
find prisma/migrations -name "*.sql" | \
  sed 's/.*\/\([0-9]*\)_.*/\1/' | \
  sort | uniq -d > duplicate-migrations.txt

if [ -s duplicate-migrations.txt ]; then
  echo "ERROR: Duplicate migration timestamps detected"
  cat duplicate-migrations.txt
  exit 1
fi
```

**What it catches:**
- Concurrent migrations from multiple developers
- Git merge conflicts in migration folder

**Example failure:**
```
ERROR: Duplicate migration timestamps detected:

20260301120000 (2 files):
  - 20260301120000_add_phone_number/migration.sql
  - 20260301120000_add_email_verified/migration.sql
```

**Severity:** CRITICAL

**Fix:**
```bash
# Manually resolve conflict (choose one, rename other)
# OR regenerate migrations:
npx prisma migrate reset
npx prisma migrate dev
```

---

## Check 4: Migration Rollback Plan

**Command:**
```bash
# Check if latest migration has rollback script
latest_migration=$(ls -t prisma/migrations | head -n 1)

if [ ! -f "prisma/migrations/$latest_migration/rollback.sql" ]; then
  echo "WARNING: No rollback script for latest migration"
  echo "Migration: $latest_migration"
  echo "Add rollback.sql for production safety"
fi
```

**What it catches:**
- Missing rollback scripts (can't undo failed migrations)
- Production risk (no recovery plan)

**Severity:** HIGH (recommended for production)

**Fix:**
```bash
# Create rollback script
cat > prisma/migrations/$latest_migration/rollback.sql << 'EOF'
-- Rollback for: add_phone_number

ALTER TABLE "User" DROP COLUMN "phoneNumber";
DROP INDEX "User_phoneNumber_key";
EOF
```

---

## Check 5: Data Migration Validation

**Command:**
```bash
# Check if migration includes data changes (not just schema)
latest_migration=$(ls -t prisma/migrations | head -n 1)

if grep -q "UPDATE\|DELETE\|INSERT" "prisma/migrations/$latest_migration/migration.sql"; then
  echo "WARNING: Data migration detected - requires manual review"
  echo "Migration: $latest_migration"
  echo "Verify data changes are safe and reversible"
fi
```

**What it catches:**
- Risky data migrations (data loss potential)
- Need for manual review before production

**Example warning:**
```
WARNING: Data migration detected

Migration: 20260301120000_normalize_emails
Contains: UPDATE "User" SET email = LOWER(email);

Impact: All user emails will be lowercased
Risk: Potential duplicate emails if case-sensitive uniqueness assumed
Review: Verify no duplicate emails exist before deploying
```

**Severity:** HIGH (requires manual approval)

**Fix:** Review data migration logic, add validation checks

---

## Check 6: Foreign Key Constraints

**Command:**
```bash
# Verify foreign key constraints are valid
npx prisma validate

# Check for orphaned records (referential integrity)
psql $DATABASE_URL -c "
  SELECT conname, conrelid::regclass, confrelid::regclass
  FROM pg_constraint
  WHERE contype = 'f'
  AND NOT EXISTS (
    SELECT 1 FROM pg_class WHERE oid = confrelid
  );
" > orphaned-constraints.txt

if [ -s orphaned-constraints.txt ]; then
  echo "ERROR: Orphaned foreign key constraints detected"
  cat orphaned-constraints.txt
  exit 1
fi
```

**What it catches:**
- Broken foreign key relationships
- References to non-existent tables

**Severity:** CRITICAL

**Fix:** Remove invalid constraints or restore missing tables

---

## Check 7: Migration Size Check

**Command:**
```bash
# Check if migration file is suspiciously large
latest_migration=$(ls -t prisma/migrations | head -n 1)
migration_size=$(wc -c < "prisma/migrations/$latest_migration/migration.sql")

if [ $migration_size -gt 100000 ]; then
  echo "WARNING: Large migration detected ($migration_size bytes)"
  echo "Migration: $latest_migration"
  echo "Large migrations can cause deployment timeouts"
  echo "Consider splitting into multiple smaller migrations"
fi
```

**What it catches:**
- Large migrations (deployment timeout risk)
- Massive data changes (performance impact)

**Severity:** MEDIUM (warning, not blocking)

**Fix:** Split large migration into smaller chunks

---

## Check 8: Production DB Backup Verification

**Command:**
```bash
# Check if recent backup exists (for production deployments)
if [ "$CRITICALITY" == "PRODUCTION" ]; then
  backup_age=$(railway db:backups list --json | jq -r '.[0].created_at')
  backup_timestamp=$(date -d "$backup_age" +%s)
  current_timestamp=$(date +%s)
  age_hours=$(( (current_timestamp - backup_timestamp) / 3600 ))
  
  if [ $age_hours -gt 24 ]; then
    echo "ERROR: No recent DB backup (last backup $age_hours hours ago)"
    echo "Create backup before deploying with migrations"
    exit 1
  fi
fi
```

**What it catches:**
- Missing recent backups (no recovery option)
- Deployment risk without safety net

**Severity:** CRITICAL (for production)

**Fix:**
```bash
# Create backup
railway db:backup create

# Wait for completion
railway db:backups list
```

---

## Verification Output Format

```json
{
  "check": "database-sync",
  "status": "FAIL",
  "duration_ms": 8200,
  "checks_run": 8,
  "checks_passed": 6,
  "checks_failed": 2,
  "errors": [
    {
      "severity": "CRITICAL",
      "check_id": "migration-schema-drift",
      "issue": "Schema changes not captured in migrations",
      "drift_sql": "ALTER TABLE \"User\" ADD COLUMN \"phoneNumber\" TEXT;",
      "impact": "Deployment will fail - schema expects column that doesn't exist in database",
      "fix": "Generate migration: npx prisma migrate dev --name add_phone_number",
      "fix_command": "npx prisma migrate dev --name add_phone_number"
    },
    {
      "severity": "CRITICAL",
      "check_id": "pending-migrations",
      "pending_count": 2,
      "pending_migrations": [
        "20260301120000_add_phone_number",
        "20260301130000_add_user_preferences"
      ],
      "impact": "Database schema out of sync - app will crash on startup",
      "fix": "Apply migrations: npx prisma migrate deploy",
      "fix_command": "npx prisma migrate deploy"
    }
  ]
}
```

---

## Performance Notes

**Typical execution times:**

| Check | Time |
|-------|------|
| Migration-schema sync | 2-5s |
| Pending migrations | 1-2s |
| Migration conflicts | <1s |
| Rollback plan | <1s |
| Data migration check | <1s |
| Foreign keys | 1-3s |
| Migration size | <1s |
| Backup verification | 2-5s |
| **Total** | **7-18s** |

---

## Integration with Main Orchestrator

**Called from SKILL.md Step 4 (only for PRODUCTION/STAGING):**

```javascript
// Load this file
const dbSyncChecks = require('./checks/database-sync.md')

// Execute all checks
const results = await dbSyncChecks.runAll()

// Aggregate results
if (results.errors.some(e => e.severity === 'CRITICAL')) {
  console.log('❌ DEPLOYMENT BLOCKED: Database migration issues detected')
  console.log('Fix migration issues before deploying to prevent data loss')
  process.exit(1)
}
```

---

## Pre-Deployment Database Checklist

**Before deploying with migrations:**

- [ ] Recent backup exists (<24h old)
- [ ] Migrations applied to staging environment first
- [ ] Data migration tested with production-like data volume
- [ ] Rollback script tested and verified
- [ ] Migration execution time measured (ensure <5 min)
- [ ] Foreign key constraints validated
- [ ] No orphaned records detected
- [ ] Schema drift resolved

**If ANY box unchecked → DO NOT DEPLOY**

---

**Status:** Production ready — Prevents schema drift disasters ✅
