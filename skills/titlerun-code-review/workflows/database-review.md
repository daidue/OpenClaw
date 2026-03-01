# Database Schema Review Workflow

**Loaded when:** Prisma schema files detected (`.prisma` extension)

---

## Cognitive Frameworks to Load

**Always load these before starting review:**

```markdown
Load ../../cognitive-profiles/google-sre-performance.md
Load ../references/tech-stack.md (Prisma section)
```

**Note:** Security and UX profiles NOT loaded for database reviews (performance-focused only)

---

## Review Sequence (Execute in Order)

### Step 1: Schema Performance Review

**1.1 Index Analysis**

**For each model:**

Check: **Do ALL foreign keys have indexes?**

```prisma
// BAD: Missing index
model Trade {
  userId Int
  user User @relation(fields: [userId], references: [id])
}

// GOOD: Explicit index
model Trade {
  userId Int
  user User @relation(fields: [userId], references: [id])
  
  @@index([userId])
}
```

**For each query pattern:**

Check: **Are frequently queried fields indexed?**

```prisma
// If we query by leagueId often:
model Trade {
  leagueId Int
  
  @@index([leagueId])  // Required for performance
}
```

**Impact quantification:**
- "Without index: full table scan at X records"
- "At 10K records: Y ms → Z ms with index (A× faster)"

**Severity:**
- Missing index on foreign key: HIGH
- Missing index on frequent query field: HIGH
- Composite index opportunity: MEDIUM

---

**1.2 Relationship Cardinality**

Check: **Are one-to-many relationships defined correctly?**

```prisma
// User has many trades
model User {
  trades Trade[]
}

model Trade {
  userId Int
  user User @relation(fields: [userId], references: [id])
}
```

**Watch for:**
- Unbounded one-to-many (user with 100K trades → memory issue)
- N+1 query patterns from missing includes

---

**1.3 Data Types**

Check: **Are data types appropriate?**

```prisma
// BAD: String for numeric data
model Player {
  age String  // Should be Int!
}

// BAD: No precision for decimals
model Trade {
  value Float  // Should be Decimal for money!
}

// GOOD
model Player {
  age Int
}

model Trade {
  value Decimal @db.Decimal(10, 2)
}
```

**Severity:**
- Wrong type for money (Float): HIGH (precision loss)
- Wrong type for numeric (String): MEDIUM (can't sort/compare properly)
- Missing length constraints: LOW

---

### Step 2: Migration Safety Check

**2.1 Destructive Operations**

**CRITICAL: Flag ALL destructive operations**

```prisma
// CRITICAL: Data loss
- model OldTable { ... }  // Dropping table
- field String             // Dropping column
```

**Required for destructive migrations:**
1. Explicit data migration plan
2. Rollback strategy documented
3. Backup verified before apply

**If destructive migration found:**
```
CRITICAL: Destructive migration — Data loss risk

File: prisma/migrations/XXXX/migration.sql
Operation: DROP TABLE / DROP COLUMN

Impact: 
Deletes X records permanently. No automatic rollback.

Required before merge:
1. Document data migration plan
2. Create rollback script
3. Verify backup exists
4. Test migration on staging with production data snapshot

Reference: Database migrations require extra care (HEARTBEAT.md)
```

---

**2.2 Schema Changes Impact**

**Check:** Does this migration require application code changes?

Examples:
- Renamed column → API must update all references
- New required field → API must provide value
- Removed field → API must remove all references

**If yes:**
```
HIGH: Schema change requires coordinated API deploy

Migration adds required field `X` to model `Y`.

Impact:
API will fail until updated to provide this field.

Required:
1. Update API code FIRST
2. Deploy API to staging
3. Run migration on staging
4. Test end-to-end
5. Deploy API to production BEFORE migration
```

---

**2.3 Migration Reversibility**

**Check:** Can this migration be rolled back?

```sql
-- GOOD: Reversible
ALTER TABLE trades ADD COLUMN notes TEXT;
-- Rollback: ALTER TABLE trades DROP COLUMN notes;

-- BAD: Not easily reversible
ALTER TABLE trades DROP COLUMN userId;
-- Rollback: Data is gone, can't restore relationship
```

**Severity:**
- Irreversible + destructive: CRITICAL
- Irreversible + additive: MEDIUM
- Reversible: (No finding, good)

---

### Step 3: Query Performance Patterns

**3.1 N+1 Prevention**

**Check:** Are includes defined for common access patterns?

```prisma
// If API often needs trades with players:
model Trade {
  players TradePlayer[]  // Include this by default
}
```

**If missing:** Flag as MEDIUM with suggestion

---

**3.2 Unbounded Queries**

**Check:** Are there relationships that could grow unbounded?

```prisma
// RISK: User could have 1M trades
model User {
  trades Trade[]
}
```

**Mitigation required:**
- Pagination on API endpoints
- Default LIMIT on queries
- Indexes for ordering

**If unbounded + no pagination:** Flag as HIGH

---

**3.3 Cascade Behavior**

**Check:** Are cascades defined correctly?

```prisma
model User {
  trades Trade[]
}

model Trade {
  userId Int
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Watch for:**
- `onDelete: Cascade` on critical data (could delete thousands of records)
- Missing cascade where expected (orphaned records)

**Severity:**
- Dangerous cascade (could delete production data): CRITICAL
- Missing cascade (creates orphans): MEDIUM

---

### Step 4: Prisma-Specific Best Practices

**Load:** `../references/tech-stack.md` (Prisma section)

**4.1 Naming Conventions**

Check:
- Models: PascalCase ✅
- Fields: camelCase ✅
- Tables: snake_case (if using `@@map`) ✅

**4.2 Required Fields**

Check:
- Are optional fields marked with `?`
- Are required fields without `?`
- Are defaults provided where appropriate?

**4.3 Unique Constraints**

Check:
- Email fields: `@unique`
- Composite unique keys: `@@unique([field1, field2])`

**4.4 Relations**

Check:
- Are both sides of relation defined?
- Are relation names clear?
- Are many-to-many using join tables?

---

## Output Format

**Collect all findings using:** `../templates/finding-template.md`

**Structure:**
```markdown
## Database Schema Review Results

**Files reviewed:** X migration files

**Findings by severity:**
- CRITICAL: X issues (BLOCK MERGE)
- HIGH: Y issues (FIX BEFORE DEPLOY)
- MEDIUM: Z issues
- LOW: W issues

### CRITICAL ISSUES

[Destructive migrations, dangerous cascades]

### HIGH ISSUES

[Missing indexes, irreversible changes, coordination required]

[etc.]
```

---

## Database-Specific Severity Guidelines

| Issue Type | Severity | Rationale |
|------------|----------|-----------|
| Destructive migration | CRITICAL | Permanent data loss risk |
| Dangerous cascade | CRITICAL | Could delete thousands of records |
| Missing index (foreign key) | HIGH | Unusable at scale (>1K records) |
| Wrong data type (money) | HIGH | Precision loss in production |
| Irreversible migration | HIGH | Can't roll back if issues |
| Schema/API coordination needed | HIGH | Deploy order matters |
| Missing index (query field) | MEDIUM | Performance degrades gradually |
| Unbounded query risk | MEDIUM | Memory issues at scale |
| Naming convention | LOW | Consistency, not breaking |

---

## Extra Care Requirements

**Database migrations require human confirmation for:**

1. **Destructive operations** (DROP TABLE, DROP COLUMN)
   - Human must verify backup exists
   - Rollback plan documented

2. **Production configuration changes**
   - Connection string changes
   - Database provider changes

3. **Coordinated deploys**
   - Schema change + API change must deploy in correct order

**Flag these with:**
```
⚠️ HUMAN CONFIRMATION REQUIRED

[Issue description]

Required before merge:
- [ ] Human reviewed migration
- [ ] Backup verified
- [ ] Rollback plan documented
- [ ] Staging tested with production snapshot
```

---

**Version:** 1.0.0  
**Last updated:** 2026-03-01
