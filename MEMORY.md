# MEMORY.md - Long-Term Memory

_Curated essentials. Technical anti-patterns now live in repo CLAUDE.md files. Details in memory/ files and memory_search._

---

## About Taylor

- **Name:** Taylor | Early 30s | EST timezone
- **Job:** Director of Digital Customer Acquisition (corporate retail) — wants out
- **Goal:** Financial freedom through business ventures
- **Wife + Dog (Lola 🐕)** | NFL, boxing, fitness, cooking, travel, photography, Pokemon cards, fishing
- **Telegram:** @GreggButTheGIsSilent (user ID: 5742924372) | **GitHub:** daidue

## About Me (Jeff Daniels)

- Business partner to Taylor (named 2026-02-05). Mac mini, EST timezone.
- Portfolio Manager overseeing 3 businesses via Owner/Operator agents.

## Infrastructure

- **OpenClaw:** LaunchAgent, gateway 127.0.0.1:18789, version 2026.2.13
- **Git backup:** Auto-push every 10 min to `git@github.com:daidue/OpenClaw.git`
- **Browser:** Managed Brave profile (orange-tinted). X: @JeffDanielsB4U, Gmail: jeffdanielsbymail@gmail.com
- **Heartbeat:** Jeff 90m (Qwen 3 4B local triage), Rush 30m (Qwen 3 4B local triage, Opus for real work), Grind 30m (Sonnet), Edge cron-only
- **Jeff's Facebook:** https://www.facebook.com/profile.php?id=61587930220275
- **Claude Code settings:** `~/.claude/settings.json` — Agent Teams ON, autocompact 80%, output 64K, permission model (deny/ask/allow)
- **CLAUDE.md files:** Both `titlerun-api/CLAUDE.md` and `titlerun-app/CLAUDE.md` contain all technical anti-patterns and architecture docs. Update those, NOT this file, for code-level knowledge.

## Active Projects

- **Notion Templates:** PAUSED. Store: jeffthenotionguy.gumroad.com. Revenue: $0.
- **TitleRun:** Dynasty FF SaaS at app.titlerun.co (Cloudflare Pages + Railway API). 10-source Bayesian valuation (PROPRIETARY — never mention publicly). Core features deployed: Trade Engine, Trade Fairness, Report Cards, Onboarding, Redraft foundation, Pick Value Engine v2 (UTH-calibrated), TEP production-based valuation. Frontend tests: 318/319 (99.7%). **🔴 MARCH DEADLINE:** Wire redraft to real endpoints. Live Draft Companion = April.
- **Polymarket:** Weather trading bot built (186 tests passing). Phase 0 — no real money yet.
- **Landing page:** `daidue/titlerun-landing` repo. 95.5/100. Pending deploy to `titlerun.co`. MailerLite (account `2116834`, form `37189961`) wired.

## TitleRun Vision (Taylor, 2026-02-13)

- Hook = competing with friends, NOT data/AI
- Mutual benefit trade engine = priority #1
- 10-source proprietary valuation = SECRET
- Simple/clean design
- Live draft companion = killer feature
- **Values are NOT dollars** — scale 0-10,000+, never use $ signs

## Key Credentials

- **Gumroad store:** jeffthenotionguy.gumroad.com
- **Notion API (full toolkit):** ntn_A13042993971KB6Un1H68pxmicCZnILZy5iT6vrVvmE2Bm
- **Notion API (lite):** ntn_H1304299397b3eOQcbG4SWMqT97KuDCg02t1j45kyLK1Wg
- **Reddit:** u/JeffOnNotion (pw: aPCsv5g0yQ7Vw2nbm1bG)
- **Taylor's Sleeper:** taytwotime (user_id: 359116496808476672)
- **Cloudflare DNS:** `titlerun.co` zone `c9fe3271361553b91d5015d53287fe43`. NS: aisha/martin.ns.cloudflare.com
- **MailerLite:** Account `2116834`, form `37189961`. Free tier.

## TitleRun Mobile App (Taylor, 2026-02-20)
- **Goal:** Native iOS + Android apps for TitleRun. AFTER mWeb and Desktop are fully polished.
- **Tool:** App Store Connect CLI (`rudrankriyam/App-Store-Connect-CLI`) + OpenClaw skills (`rudrankriyam/app-store-connect-cli-skills`) for iOS submission automation.
- **Sequence:** mWeb → Desktop → iOS → Android. Don't jump ahead.

## Post-Launch Reminders (Taylor, 2026-02-20)
- **Taskmaster** (blader/taskmaster) — Claude Code stop hook. Prevents agents from quitting early. Back-pocketed: only applies to dev sub-agents, adversarial audits catch more.
- **Code Factory / Antfarm** (snarktank/antfarm) — Ryan Carson's multi-agent workflow system built for OpenClaw. 7-agent feature-dev, security-audit, bug-fix workflows. Back-pocketed: too structured for build phase, valuable once we have paying users and can't push broken code.
- **ai-pr-review** (snarktank/ai-pr-review) — GitHub Actions AI code review. Pairs with above.
- ⚠️ **REMIND TAYLOR on launch day.**

## Key Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-11 | Portfolio architecture (3 businesses) | 95.3/100 expert panel |
| 2026-02-11 | Etsy killed | $29 setup fee |
| 2026-02-13 | All crons → Sonnet | Token optimization (86→25/day target) |
| 2026-02-13 | TitleRun vision rewrite | Hook = competing with friends, NOT data/AI |
| 2026-02-14 | Grind + Edge PAUSED | Taylor: focus only on TitleRun |
| 2026-02-14 | Record build day | 60+ sub-agents, ~60 commits, ~30K lines, ~$700-1000 tokens |
| 2026-02-15 | Cloudflare Pages migration | $0/mo at any scale, replaces Vercel |
| 2026-02-15 | Live Draft Companion = parallel | Taylor overrode sequential recommendation |
| 2026-02-15 | Token burn accepted through March | Taylor OK with high spend |
| 2026-02-16 | Sub-agent code ALWAYS needs expert review | Phase 5: 72/100 with 5 criticals. Never ship without panel. |
| 2026-02-16 | Taylor wants production-grounded valuations | "Reputable, logical, something people understand." |
| 2026-02-17 | 60-hour rate limit outage | Heavy overnight work burned API credits. All crons failed Feb 17-19. |
| 2026-02-20 | Setup overhaul | CLAUDE.md in both repos, workspace cleanup (72 files archived), Claude Code settings, prompt cache optimization |

## Hard-Won Patterns (keep for Jeff/Rush context)

- **Sub-agent code always needs adversarial audit** — self-review bias produces inflated scores
- **Two analysis agents > one fix attempt** — competing hypotheses find bugs faster
- **Nested response envelope** — `response.data.data.X` pattern. #1 recurring frontend bug.
- **60-hour outage from heavy sub-agent spawning** — rate limits are real. Budget accordingly.
- **`.find()` without useMemo = new object every render** — caused mobile auto-refresh cascade
- **Request deduplication pattern** — `inflightRequests` Map prevents concurrent identical API calls
- **"Works in private, breaks in regular" = cache** — always check cache before debugging mobile bugs

---

_Last updated: 2026-02-20_
