# Breaking Changes Detection

**Purpose:** Detect API changes that break backward compatibility

**Execution time:** 10-30 seconds

**Criticality:** HIGH — Prevents breaking production apps without version bump

---

## Check 1: API Contract Validation

**Command:**
```bash
# Compare current API routes with last deployed version
git diff main..HEAD -- "src/api/**/*.ts" > api-changes.diff

# Parse route definitions and compare
npx extract-api-routes src/api > current-routes.json
git show main:api-routes.json > previous-routes.json
npx diff-api-routes previous-routes.json current-routes.json > breaking-changes.json
```

**What it catches:**
- Removed API endpoints (breaks clients)
- Changed request/response schemas (breaks clients)
- Removed required parameters (breaks existing calls)
- Changed response status codes (breaks error handling)

**Example failure:**
```json
{
  "breaking_changes": [
    {
      "type": "endpoint_removed",
      "endpoint": "POST /api/users/:id/settings",
      "severity": "CRITICAL",
      "impact": "Mobile app v1.2.3 depends on this endpoint (5K+ users)",
      "fix": "Add deprecation warning, maintain endpoint for 2 versions"
    },
    {
      "type": "schema_changed",
      "endpoint": "GET /api/trades",
      "field": "response.trades[].timestamp",
      "change": "number → ISO string",
      "severity": "HIGH",
      "impact": "Breaks timestamp parsing in web app",
      "fix": "Add new field 'timestampIso', keep 'timestamp' for backward compatibility"
    }
  ]
}
```

**Severity:** CRITICAL (removed endpoints), HIGH (schema changes)

**Fix:** Use API versioning (/api/v2/) or add deprecation warnings

---

## Check 2: Database Schema Changes

**Command:**
```bash
# Check if Prisma schema changed
git diff main..HEAD -- prisma/schema.prisma > schema-changes.diff

# If changed, verify backward compatibility
if [ -s schema-changes.diff ]; then
  npx prisma-schema-diff schema-changes.diff --check-breaking
fi
```

**What it catches:**
- Removed database columns (breaks running app instances)
- Changed column types (data migration required)
- Removed tables (breaks queries)
- Changed relationships (breaks joins)

**Example failure:**
```
BREAKING CHANGE DETECTED:

model User {
-  email String @unique
+  emailAddress String @unique
}

Impact: All queries using 'email' will fail
Fix: Add database migration + app-side field mapping for transition period
```

**Severity:** CRITICAL

**Fix:** Multi-phase migration (add new field, migrate data, remove old field)

---

## Check 3: Environment Variable Changes

**Command:**
```bash
# Compare .env.example changes
git diff main..HEAD -- .env.example > env-changes.diff

# Check for removed required variables
grep "^-" env-changes.diff | grep -v "^---" | cut -c2- > removed-vars.txt

# Check if removed vars are used in code
while read var; do
  var_name=$(echo $var | cut -d'=' -f1)
  if grep -r "process.env.$var_name" src/; then
    echo "BREAKING: $var_name removed but still used in code"
  fi
done < removed-vars.txt
```

**What it catches:**
- Removed environment variables (runtime crashes)
- Renamed environment variables (config breakage)
- Changed variable format (parsing errors)

**Example failure:**
```
BREAKING: VITE_API_BASE_URL removed but still used in code:
  src/utils/api.ts:5: const baseUrl = process.env.VITE_API_BASE_URL
  
Impact: App will fail to load in production (missing config)
Fix: Add migration guide to CHANGELOG, provide backward compatibility
```

**Severity:** CRITICAL

**Fix:** Maintain old var names or provide automatic migration

---

## Check 4: Public API Function Signatures

**Command:**
```bash
# Extract public API signatures using TypeScript
npx ts-api-extractor src/index.ts --output current-api.json

# Compare with previous version
git show main:public-api.json > previous-api.json
npx diff-api-signatures previous-api.json current-api.json > signature-changes.json
```

**What it catches:**
- Changed function signatures (breaks consumers)
- Removed exported functions (breaks imports)
- Changed return types (breaks type expectations)

**Example failure:**
```json
{
  "breaking_changes": [
    {
      "function": "createUser",
      "change": "Signature changed",
      "old": "createUser(email: string): Promise<User>",
      "new": "createUser(email: string, role: string): Promise<User>",
      "severity": "HIGH",
      "impact": "All existing createUser() calls missing required 'role' parameter",
      "fix": "Make 'role' optional with default: createUser(email: string, role: string = 'user')"
    }
  ]
}
```

**Severity:** HIGH

**Fix:** Make new parameters optional or use function overloads

---

## Check 5: Dependency Breaking Changes

**Command:**
```bash
# Check for major version updates in package.json
git diff main..HEAD -- package.json | grep "^\+.*:" | grep -v "^+++" > added-deps.txt

# Extract major version changes
while read line; do
  pkg=$(echo $line | cut -d'"' -f2)
  new_ver=$(echo $line | cut -d'"' -f4)
  
  # Check if major version increased
  old_ver=$(git show main:package.json | jq -r ".dependencies[\"$pkg\"] // .devDependencies[\"$pkg\"]")
  
  new_major=$(echo $new_ver | cut -d'.' -f1 | tr -d '^~')
  old_major=$(echo $old_ver | cut -d'.' -f1 | tr -d '^~')
  
  if [ "$new_major" -gt "$old_major" ]; then
    echo "BREAKING: $pkg upgraded from $old_ver to $new_ver (major version change)"
    echo "  Check CHANGELOG: https://github.com/[org]/$pkg/releases"
  fi
done < added-deps.txt
```

**What it catches:**
- Major dependency updates (breaking API changes)
- Removed dependencies (runtime errors)

**Severity:** HIGH (requires migration testing)

**Fix:** Review dependency CHANGELOG, test thoroughly before deploying

---

## Check 6: Version Bump Verification

**Command:**
```bash
# Check if package.json version bumped
current_version=$(jq -r .version package.json)
previous_version=$(git show main:package.json | jq -r .version)

if [ "$current_version" == "$previous_version" ]; then
  # Version not bumped - check if breaking changes detected
  if [ -s breaking-changes.json ]; then
    echo "ERROR: Breaking changes detected but version not bumped"
    echo "Current: $current_version"
    echo "Required: Increment major or minor version"
    exit 1
  fi
fi
```

**What it catches:**
- Breaking changes without version bump
- Violates semantic versioning

**Severity:** HIGH

**Fix:**
```bash
# For breaking changes: increment major version
npm version major

# For new features: increment minor version
npm version minor

# For bug fixes: increment patch version
npm version patch
```

---

## Check 7: CHANGELOG Entry Verification

**Command:**
```bash
# Check if CHANGELOG.md updated
git diff main..HEAD -- CHANGELOG.md > changelog-changes.diff

if [ ! -s changelog-changes.diff ]; then
  echo "WARNING: No CHANGELOG entry for this release"
  echo "Add entry documenting changes, especially breaking changes"
fi

# Check if breaking changes documented
if [ -s breaking-changes.json ]; then
  if ! grep -q "BREAKING" changelog-changes.diff; then
    echo "ERROR: Breaking changes detected but not documented in CHANGELOG"
    exit 1
  fi
fi
```

**What it catches:**
- Missing release notes
- Undocumented breaking changes

**Severity:** HIGH (required for major releases)

**Fix:** Add CHANGELOG entry with migration guide

---

## Verification Output Format

```json
{
  "check": "breaking-changes",
  "status": "FAIL",
  "duration_ms": 12500,
  "checks_run": 7,
  "checks_passed": 5,
  "checks_failed": 2,
  "errors": [
    {
      "severity": "CRITICAL",
      "check_id": "api-contract-violation",
      "endpoint": "POST /api/users/:id/settings",
      "change": "Endpoint removed",
      "impact": "Mobile app v1.2.3 depends on this endpoint (5K+ users will experience failures)",
      "fix": "Restore endpoint with deprecation warning, maintain for 2 versions (v1.3.0 + v1.4.0)",
      "migration_guide": "Update mobile app to use new endpoint: POST /api/users/:id/preferences"
    },
    {
      "severity": "HIGH",
      "check_id": "version-not-bumped",
      "current_version": "1.2.5",
      "required_version": "1.3.0 or 2.0.0",
      "issue": "Breaking changes detected but version not bumped",
      "fix": "Run: npm version minor (or major if API contract broken)",
      "fix_command": "npm version minor && git push --tags"
    }
  ]
}
```

---

## Performance Notes

**Typical execution times:**

| Check | Time |
|-------|------|
| API contract | 3-8s |
| Database schema | 2-5s |
| Env var changes | 1-2s |
| Function signatures | 3-6s |
| Dependency changes | 2-4s |
| Version bump | <1s |
| CHANGELOG check | <1s |
| **Total** | **12-27s** |

---

## Integration with Main Orchestrator

**Called from SKILL.md Step 4 (only for PRODUCTION/STAGING):**

```javascript
// Load this file
# Integration: ./scripts/run-pre-deploy-checks.sh --json | jq .status

// Aggregate results
if (results.errors.some(e => e.severity === 'CRITICAL')) {
  console.log('❌ DEPLOYMENT BLOCKED: Breaking changes detected without migration plan')
  process.exit(1)
}
```

---

## Exemptions (When to Skip)

Skip breaking changes check if:
- Deploying to DEVELOPMENT environment (not production)
- Version is pre-1.0.0 (API not stable yet)
- Explicit override flag: `--allow-breaking-changes` (with justification in commit message)

**Example override:**
```bash
./scripts/run-pre-deploy-checks.sh --allow-breaking-changes \
  --reason "Emergency security patch, coordinated breaking change with mobile team"
```

---

**Status:** Production ready — Prevents unintentional API breakage ✅
