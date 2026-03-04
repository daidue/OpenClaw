# Infrastructure Anti-Patterns
*Learned from 2026-03-03 deployment*

## Scripts

❌ `curl $API_URL/admin/query` — endpoint doesn't exist, fails silently
✅ `railway run psql -c "SELECT ..."` — Railway CLI, verified connection

❌ Hardcoded secrets: `TOKEN="abc123"` in scripts
✅ Environment variables: `${ADMIN_SECRET}` via Railway/dotenv

❌ Wrong git author: `developer@dynastyfolio.com` → Vercel deploy rejected
✅ Per-repo config: `git config user.email "taylorh1jr@gmail.com"`

## Deployment

❌ Auto-deploy main to production (broken PRs go live)
✅ Manual approval + staging test first, adversarial review gate

❌ Merge PRs based on builder self-report ("100% success!")
✅ Adversarial re-review validates fixes exist in actual code

❌ Push to GitHub, review immediately (stale code on remote)
✅ Wait for push confirmation OR check local branch state

## Migrations

❌ Code references `player_value_history` table — table doesn't exist in any migration
✅ Create migration file BEFORE writing code that queries the table

❌ Test path: `require('../src/services/...')` — module not found
✅ Verify import paths match Jest config: `src/tests/` vs `src/__tests__/`

## Agent Reliability

❌ Trust agent completion reports (5/5 fabricated "100% success")
✅ Verify with `git diff`, `ls -la`, `npm test` — trust code, not claims

❌ Mock tests hide missing backends: PR #8 frontend tests pass, endpoint 404s
✅ Integration tests hit real endpoints; mock only external APIs

❌ Agent writes function but never calls it (PR #10: perfect regex, never invoked)
✅ Require `grep -n "functionName"` proof of integration in completion report

## Security

❌ Fail-open: Sleeper API down → `catch(e) { next() }` → bypass auth
✅ Fail-closed: API error → `return res.status(503)` → deny access

❌ Plain-text token storage: `WHERE token = $1`
✅ Hash tokens (bcrypt) — DB compromise ≠ account takeover

❌ Different error codes leak state: `invalid_token` / `token_used` / `token_expired`
✅ Single generic response: `{ error: "invalid_or_expired_token" }`

## Quality Gates

❌ Builder → Merge (self-review bias: 100% reported, 0% actual)
✅ Builder → Adversarial → Fixer → Re-review → Merge (v4.0)

❌ `Map.keys().next().value` for "LRU" eviction — it's FIFO, not LRU
✅ Use `lru-cache` library OR track access timestamps per entry

❌ `setInterval(cleanup, 300000)` at module load — Jest hangs, memory leaks
✅ Export `startCleanup()`/`stopCleanup()` — clearable interval lifecycle
