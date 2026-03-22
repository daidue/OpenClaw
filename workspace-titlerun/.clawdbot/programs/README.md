# TitleRun Autonomous Improvement Programs

This directory contains `improvement-program.md` files that guide autonomous overnight improvement loops, based on Karpathy's autoresearch pattern.

## How It Works

1. **Rush (or cron) triggers:** `bash scripts/auto-improve.sh <program-name>`
2. **Agent reads program:** `.clawdbot/programs/<program-name>.md`
3. **Autonomous loop:** Modify → test → evaluate → keep/discard (repeat 30-100x)
4. **Output:** PR with "🤖 AUTO-IMPROVE" label for human review

## Active Programs

| Program | Target | Metric | Status |
|---------|--------|--------|--------|
| `test-optimization.md` | Playwright tests | Test duration <10s | PILOT |
| `performance-api.md` | API response time | <200ms p95 | PLANNED |
| `performance-frontend.md` | Bundle size | <500KB gzipped | PLANNED |
| `accessibility.md` | Lighthouse score | >95 | PLANNED |

## Program Structure

Each `*.md` file contains:
- **Mission** — High-level goal
- **Scope** — Files agent can/cannot modify
- **Metrics** — What to optimize for
- **Constraints** — Hard limits (no new deps, no API changes)
- **Success Criteria** — When to stop iterating
- **Anti-patterns** — What NOT to do

## Safety Rules

1. **Human review required** — NO auto-merge, ever
2. **Scope isolation** — Agent can only touch files listed in program
3. **Rollback safety** — Every change is a Git commit
4. **Resource limits** — Max iterations, max runtime, max PR size
5. **Test gates** — All tests must pass before PR creation

## Usage

```bash
# Manual test run
bash scripts/auto-improve.sh test-optimization

# Overnight cron (Rush heartbeat triggers)
# Runs at 11pm EST, completes by 6am
```

## Logs

- **improvement-log.jsonl** — Structured experiment log
- **summary.md** — Human-readable summary per run
- **reports/** — Per-run detailed reports

## Full Documentation

See: `docs/AUTORESEARCH-WORKFLOW-DESIGN.md` (748 lines, comprehensive spec)
