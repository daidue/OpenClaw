<!-- Summary: Pre-deploy checklist (code quality, tests, DB changes) and post-deploy verification steps.
     Read when: About to deploy to production or verifying a deployment. -->

# TitleRun Deployment Checklist

## Pre-Deploy (MUST complete all before pushing to main)

### Code Quality
- [ ] All existing tests pass (`npm test`)
- [ ] New code has tests (80%+ coverage target)
- [ ] No hardcoded secrets, API keys, or credentials in code
- [ ] No `console.log` left in production paths (use proper logger)
- [ ] Linting passes (`npm run lint`)

### Database
- [ ] Migration file created (`migrations/YYYYMMDD_description.sql`)
- [ ] Migration tested locally (up AND down/rollback)
- [ ] No destructive operations without backup confirmation
- [ ] Indexes added for new query patterns
- [ ] FK constraints with `ON DELETE CASCADE` where appropriate

### API Changes
- [ ] Response format follows `{ success: true, data: {} }` convention
- [ ] Auth middleware applied to all protected routes
- [ ] Rate limiting configured for external API calls
- [ ] Error responses include meaningful messages
- [ ] New endpoints documented in route file header comment

### Frontend Changes
- [ ] Components follow existing naming conventions
- [ ] Design tokens used (no hardcoded colors/spacing)
- [ ] Mobile responsive (test at 375px width)
- [ ] Loading states and error states implemented
- [ ] Lazy loading for new pages

### Scraper Changes
- [ ] Anti-detection measures in place (see `references/scraper-template.md`)
- [ ] Circuit breaker configured
- [ ] Kill switch implemented
- [ ] Rate limiting configured (≤1 req/sec per source)
- [ ] Schema validation on responses
- [ ] Fallback behavior when source is unavailable

## Deploy

```bash
# Backend (Railway — auto-deploys on push to main)
git add .
git commit -m "[Sprint X] description"
git push origin main

# Verify deployment
curl https://titlerun-api.railway.app/api/health

# Frontend (Vercel — auto-deploys on push to main)
# Same git push triggers Vercel build
```

## Post-Deploy (within 10 minutes)

- [ ] Health endpoint responds 200
- [ ] Key API routes return expected data
- [ ] No new errors in Railway logs (`railway logs`)
- [ ] Frontend loads without console errors
- [ ] New feature accessible and functional

## Rollback

```bash
# Immediate rollback
git revert HEAD
git push origin main

# Database rollback (if migration applied)
# Run the down migration manually via Railway console

# If Railway deploy is stuck
railway down
railway up
```

## PR Template

```markdown
## [Sprint X] Title

### What
[1-2 sentences: what this PR does]

### Why
[Business context: which sprint task, which feature]

### How
[Technical approach: new services, modified files, data flow]

### Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] Edge cases covered: [list them]

### Migration
- [ ] No migration needed
- [ ] Migration included: `migrations/YYYYMMDD_description.sql`
- [ ] Rollback tested

### Checklist
- [ ] Deployment checklist completed
- [ ] Sprint tracking updated in WORKQUEUE.md
```
