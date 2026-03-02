# Automated Checks Integration

**CI/CD and git hook automation guide**

---

## Integration Options

| Method | Trigger | Execution Time | Use Case |
|--------|---------|---------------|----------|
| Git pre-commit hook | Before commit | <30s (quick checks) | Catch issues early |
| Git pre-push hook | Before push | <2 min (full dev checks) | Last local gate |
| GitHub Actions | On PR / push | <5 min (comprehensive) | Team visibility |
| Railway deploy hook | Before build | <5 min (production) | Deployment gate |

---

## Option 1: Git Pre-Commit Hook (Fast Feedback)

**Setup:**
```bash
# Create hook file
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash

echo "Running quick pre-commit checks..."

# Quick checks only (TypeScript, lint)
npx tsc --noEmit --skipLibCheck || exit 1
npx eslint . --max-warnings 0 || exit 1

echo "✓ Pre-commit checks passed"
exit 0
EOF

chmod +x .git/hooks/pre-commit
```

**What it runs:**
- TypeScript compilation (5-10s)
- ESLint (5-10s)
- **Total:** <30s (fast enough for commit flow)

**Skips:**
- Build (too slow for commits)
- Tests (run on pre-push)
- Production checks (run on deploy)

**When to use:** Every commit (lightweight, fast feedback)

---

## Option 2: Git Pre-Push Hook (Full Local Gate)

**Setup:**
```bash
# Create hook file
cat > .git/hooks/pre-push << 'EOF'
#!/bin/bash

# Run full pre-deploy checks
./scripts/run-pre-deploy-checks.sh
exit $?
EOF

chmod +x .git/hooks/pre-push
```

**What it runs:**
- All quick fail gates
- Build verification
- Code quality checks
- Production checks (if pushing to main/staging)
- **Total:** <2 min for dev, <5 min for production

**Blocks push if:**
- Critical issues detected
- Production: High-severity issues detected
- Exit code 1 from checks script

**Bypass (emergency only):**
```bash
git push --no-verify
```

**When to use:** Before pushing to shared branches (main, staging)

---

## Option 3: GitHub Actions (Team Visibility)

**Setup:**

Create `.github/workflows/pre-deploy-checks.yml`:

```yaml
name: Pre-Deploy Checks

on:
  push:
    branches: [main, staging, develop]
  pull_request:
    branches: [main, staging]

jobs:
  deploy-checks:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          fetch-depth: 0  # Full history for git diff checks
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run pre-deploy checks
        run: ./scripts/run-pre-deploy-checks.sh
        env:
          CI: true
      
      - name: Upload failure report (if failed)
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: deploy-check-failures
          path: |
            tsc-errors.txt
            build-errors.txt
            eslint-errors.txt
            test-errors.txt
      
      - name: Comment PR with results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const exitCode = process.env.CHECK_EXIT_CODE;
            
            let body = '## Pre-Deploy Check Results\n\n';
            
            if (exitCode === '0') {
              body += '✅ **PASS** - All checks passed. Safe to deploy.\n';
            } else if (exitCode === '1') {
              body += '❌ **BLOCKED** - Critical issues detected.\n\n';
              body += 'See workflow logs for details.\n';
            } else if (exitCode === '2') {
              body += '⚠️ **WARNING** - Non-critical issues detected.\n\n';
              body += 'Review recommended before production deployment.\n';
            }
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            });
```

**What it does:**
- Runs on every push to main/staging/develop
- Runs on every PR to main/staging
- Blocks PR merge if checks fail (configure branch protection)
- Comments on PR with results
- Uploads failure artifacts for debugging

**Branch protection setup:**
```
Settings → Branches → main → Branch protection rules:
☑ Require status checks to pass before merging
☑ Pre-Deploy Checks
```

**When to use:** Team collaboration (multiple developers, PRs)

---

## Option 4: Railway Pre-Deploy Hook (Production Gate)

**Setup:**

Update `railway.json`:

```json
{
  "build": {
    "command": "./scripts/run-pre-deploy-checks.sh && npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE"
  }
}
```

**What it does:**
- Runs checks BEFORE build step
- Blocks deployment if checks fail
- Railway shows failure in deployment logs

**Failure handling:**
- Exit 1 → Deployment aborted
- Exit 0/2 → Deployment proceeds

**When to use:** Production deployments (Railway, Vercel, Netlify)

---

## Option 5: Hybrid Approach (Recommended)

**Best of all worlds:**

1. **Pre-commit hook:** Quick checks (TS, lint) — <30s
2. **Pre-push hook:** Full checks (build, tests) — <2 min
3. **GitHub Actions:** Team visibility + branch protection
4. **Railway hook:** Final production gate

**Setup script:**

Create `scripts/setup-git-hooks.sh`:

```bash
#!/bin/bash

echo "Setting up git hooks..."

# Pre-commit: Quick checks
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
echo "Running quick pre-commit checks..."
npx tsc --noEmit --skipLibCheck || exit 1
npx eslint . --max-warnings 0 || exit 1
echo "✓ Pre-commit checks passed"
EOF

# Pre-push: Full checks
cat > .git/hooks/pre-push << 'EOF'
#!/bin/bash
./scripts/run-pre-deploy-checks.sh
exit $?
EOF

chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/pre-push

echo "✓ Git hooks installed"
echo ""
echo "To skip hooks (emergency only): git push --no-verify"
```

**Run once per developer:**
```bash
./scripts/setup-git-hooks.sh
```

---

## Notification Integration

**Slack notifications (GitHub Actions):**

Add to `.github/workflows/pre-deploy-checks.yml`:

```yaml
      - name: Notify Slack on failure
        if: failure() && github.ref == 'refs/heads/main'
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "❌ Pre-deploy checks FAILED on main branch",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Pre-Deploy Checks Failed*\n\nBranch: main\nCommit: ${{ github.sha }}\n\n<${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View Logs>"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

**Telegram notifications (via OpenClaw):**

Add to `scripts/run-pre-deploy-checks.sh`:

```bash
# At end of script (if deployment blocked)
if [ $CRITICAL_COUNT -gt 0 ]; then
  # Send Telegram alert
  curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
    -d "chat_id=$TAYLOR_CHAT_ID" \
    -d "text=❌ DEPLOYMENT BLOCKED: $CRITICAL_COUNT critical issues detected in $BRANCH"
fi
```

---

## Performance Optimization

**Caching strategies:**

### 1. Cache node_modules (GitHub Actions)
```yaml
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'  # Automatic caching
```

### 2. Cache TypeScript builds
```bash
# Use tsc --incremental in pre-commit hook
npx tsc --incremental --noEmit --skipLibCheck
```

### 3. Parallel execution
```bash
# Run independent checks in parallel
(npx tsc --noEmit &)
(npx eslint . &)
(npm test &)
wait  # Wait for all to complete
```

**Time savings:**
- Sequential: 60s
- Parallel: 30s
- **50% faster**

---

## Monitoring & Metrics

**Track execution metrics:**

Create `scripts/record-metrics.sh`:

```bash
#!/bin/bash

METRICS_FILE="metrics/deploy-checks-$(date +%Y-%m).csv"

# Record: timestamp, branch, duration, critical, high, medium, low, exit_code
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),$BRANCH,$DURATION,$CRITICAL_COUNT,$HIGH_COUNT,$MEDIUM_COUNT,$LOW_COUNT,$EXIT_CODE" >> "$METRICS_FILE"
```

**Analyze monthly:**
```bash
# Average execution time
awk -F',' '{sum+=$3; count++} END {print "Avg duration:", sum/count "s"}' metrics/deploy-checks-2026-03.csv

# Issue breakdown
awk -F',' '{c+=$4; h+=$5; m+=$6; l+=$7} END {print "Critical:", c, "High:", h, "Medium:", m, "Low:", l}' metrics/deploy-checks-2026-03.csv
```

---

## Debugging Failed Checks

**View detailed logs:**

```bash
# TypeScript errors
cat tsc-errors.txt

# Build errors
cat build-errors.txt

# ESLint errors
cat eslint-errors.txt

# Test errors
cat test-errors.txt
```

**Common debugging commands:**

```bash
# Verbose TypeScript check
npx tsc --noEmit --extendedDiagnostics

# Verbose build
npm run build -- --verbose

# Verbose tests
npm test -- --verbose --no-coverage

# Check specific file
npx eslint src/stores/authStore.js
```

---

## Bypassing Checks (Emergency Only)

**When to bypass:**
- **Hotfix:** Critical production bug requiring immediate deploy
- **Revert:** Rolling back bad deploy
- **Infrastructure:** Non-code changes (DNS, env vars)

**How to bypass:**

```bash
# Git hooks
git push --no-verify

# GitHub Actions
Add [skip ci] to commit message:
git commit -m "Hotfix: Revert auth changes [skip ci]"

# Railway
Manually trigger deploy via dashboard (bypasses build command)
```

**IMPORTANT:** Document every bypass in CHANGELOG.md with justification

---

## Status Dashboard

**Create automated status page:**

`public/deploy-status.html`:

```html
<html>
<head><title>Deploy Status</title></head>
<body>
  <h1>Pre-Deploy Check Status</h1>
  <div id="status"></div>
  <script>
    fetch('https://api.github.com/repos/[owner]/[repo]/actions/workflows/pre-deploy-checks.yml/runs?per_page=10')
      .then(r => r.json())
      .then(data => {
        const status = data.workflow_runs[0].conclusion === 'success' ? '✅ PASS' : '❌ FAIL';
        document.getElementById('status').innerHTML = `<h2>${status}</h2>`;
      });
  </script>
</body>
</html>
```

---

**Status:** Production ready — Choose integration that fits your workflow ✅
