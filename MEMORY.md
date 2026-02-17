# MEMORY.md - Long-Term Memory

_Curated essentials. Details in memory/ files and memory_search._

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
- **Heartbeat:** Jeff 90m, Rush 30m (Opus), Grind 30m (Sonnet), Edge cron-only
- **Jeff's Facebook:** https://www.facebook.com/profile.php?id=61587930220275

## Active Projects (details via memory_search)

- **Notion Templates:** PAUSED. Freelance Invoice Tracker ($27) + Lite (free). Store: jeffthenotionguy.gumroad.com. Revenue: $0.
- **🔴 TitleRun values are NOT dollars** — Proprietary scale 0-10,000+. NEVER use $ signs. Display "8,735" not "$8,735". (Taylor 2026-02-14)
- **✅ Value migration COMPLETE** — ALL backend files migrated (leaguemates.js, teams.js, ktcService.js, players.js). Final commit `5622574` migrated all 9 players.js endpoints. Frontend cleaned (commits `375e1e4`, `8e0fdde`, `c6f6a9d`). Types renamed `KTCTEPValues` → `TitleRunTEPValues`. Full code audit 92/100, 0 criticals. Error boundaries added (commit `d48b1cf`). PPG data fixed (5,201 rows). **Codebase is now fully source-agnostic.**
- **TitleRun:** Dynasty FF SaaS at app.titlerun.co (**now on Cloudflare Pages**, was Vercel). Value Engine (10 sources, Bayesian) + Report Card + Nav Overhaul all deployed. **Product vision rewritten 2026-02-13 evening** — see `workspace-titlerun/memory/2026-02-13-strategic-vision.md`. Core: competition with friends, mutual benefit trade engine, proprietary valuation (NEVER mention 10 sources publicly), simple/clean design, live draft companion. **Original valuation system PHASES 1-4 COMPLETE** — 3-layer Bayesian, 93/100 panel, 10,500+ lines, code reviewed to ~95/100. **Trade Engine COMPLETE** — backend 95/100 + frontend 95.5/100, deployed. **Trade Fairness COMPLETE** — backend 95/100 (8 dimensions) + frontend 96.7/100 (6 components), deployed. **Mobile Home v4 deployed** (96/100). **Sprint B COMPLETE** — Onboarding (built+reviewed, 88→95/100) + Redraft foundation (schema+strategy pattern+ROS pipeline). **Home page wired to real API** — standings, activity, trend endpoints (commits `cda659e`, `3155610`, `662f836`). News + Trade Builder QA fixes deployed. **Redraft frontend built** — LeagueTypeContext, RedraftToggle, ROS Rankings page, strategy-aware trade analysis (commit `973ea97`). **Redraft backend endpoints built** — 3 routes in redraft.js (commit `978ec4f`). **Trade sharing wired** — full flow from analyze→card→share→public view (commits `1089860`, `efb6a67`). **All missing routes fixed** — Terms, Privacy, Help, etc. (commit `9af413e`). **Clickthrough audit: 187 elements, 81% working.** **🔴 MARCH DEADLINE:** Wire redraft mock data to real endpoints. Live Draft Companion = April.
- **✅ Pick Valuation Phase 5 — ALL 5 ENHANCEMENTS SHIPPED** — Dynamic market-weighted values, projected pick tiers (Pythagorean), draft class quality multipliers, trade volume demand signals, league context multiplier. Expert panel R1: 72/100 (5 critical bugs), R2: 89/100 SHIP IT. Commit `404ec62` (fixes) + `ee66697` (docs). Key fix: N+1 batching (1,152 seq calls → 30 parallel = 30x faster).
- **✅ Team Health Real Calculations — SHIPPED** — Replaced `Math.random()` with deterministic scores (Roster 35%, Depth 20%, Youth 25%, Upside 20%). Draft picks factored in. Backend commit `ddf7add`, frontend `776af2f`.
- **Polymarket:** Weather trading bot built (186 tests passing). Edge researching. Phase 0 — no real money yet.
- **Live Draft Companion spec READY** — 95.9/100 panel, 8,500 words, 137-145h build estimate. Target April 2026.
- **Frontend tests: 318/319 passing (99.7%)** — MSW 2.x infrastructure fixed (custom Babel transform + polyfills for CRA 5.0.1).
- **Cloudflare Pages migration COMPLETE (2026-02-15)** — `app.titlerun.co` CNAME → `titlerun-app.pages.dev`. Repo: `daidue/titlerun-app`. Env: `REACT_APP_API_URL`, `NODE_VERSION=20`, `CI=TRUE`. Vercel kept as 7-day backup.
- **Landing page rebuilt (95.5/100)** — `daidue/titlerun-landing` repo. Single HTML, dark theme, competition hook. MailerLite placeholder. Pending deploy to `titlerun.co`.
- **🔴 Startup migration in `src/index.js` = ONLY way tables reach production** — Migration SQL files only run locally. Every new table MUST be added to startup migration block or production crashes.
- **🔴 New services MUST have graceful fallback** — If table doesn't exist, catch error and return safe default (e.g., multiplier = 1.0). Never let a missing table crash an entire endpoint.
- **✅ SF Value Pipeline Fix (2026-02-16, commit `ed5e87a`)** — `valuationService.getPlayerValues()` silently dropped isSuperflex flag → all syncs used 1QB values. Fixed: now uses `titlerun_values` as primary source with correct format. Josh Allen: 7,389→10,000 in SF.
- **✅ TEP Pipeline Populated (2026-02-16, commits `5706690` + direct SQL)** — TEP scraper never ran in production. Fixed dailyScraperService + seeded 2,019 titlerun_values rows (720 players × 3 TEP formats). TEP boost: TEs get 10-30% premium.
- **🔴 @12DudesDeep is TEP2 format** — `bonus_rec_te: 1.0` = 'extreme' → TE++ (~21% boost). NOT plain SF.
- **🔴 Crossroads of Twilight is plain 1QB** — no SUPER_FLEX, no TEP.
- **✅ Valuation Recalibration COMPLETE (2026-02-16)** — Pick base values reduced ~20% (late 1st: 6,000→4,800), safety clamp 1.5x→1.25x, league context 0.75-1.30→0.80-1.25, draft class 0.75-1.25→0.90-1.10. NEW `crossValidationService.js` (496 lines) enforces pick < player. Expert panel 91.4/100. Commit `bde43ab`. Audit found 2 criticals fixed in `47162c0`: trades.js `rawTotal += avgValue` bug (corrupted ALL trade evaluations with picks since launch), crossValidation missing `Number()` wrapping on 4 PostgreSQL reads.
- **✅ Value Touchpoint Audit COMPLETE (2026-02-16, commit `d11580b`)** — 27+ touchpoints audited, 10 fixed. `valuationService` now accepts `formatOverride` (tep/tep2/tep3). ALL `players.js` endpoints switched from `composite_value` to `titlerun_values`. Team sync/health endpoints TEP-aware. Leaguemates TEP-aware. Expert panel 86.5/100 (gaps: roster snapshots single-format, player_value_history no TEP columns, tradeAnalysisService uses hardcoded TEP multipliers).
- **🔴 `valuationService.getPlayerValues(playerIds, isSuperflex, formatOverride)`** — Now accepts optional format string ('tep', 'tep2', 'tep3') that overrides isSuperflex boolean. TEP format includes SF premium + TE boost.
- **🔴 TEP format priority** — If league is SF+TEP, use TEP format (not SF). TEP values already include the SF premium.
- **🔴 crossValidationService is dead code** — Defined but never called. Needs wiring into daily pipeline. Also has N+1 queries (9 sequential pick + 7 player queries).
- **🔴 N+1 in teams.js importDraftPicks** — 576 sequential DB calls per league sync. Needs batching.
- **🔴 trades.js pick evaluation was wrong since launch** — `rawTotal += avgValue` used last player's value for picks. Fixed commit `47162c0`. Integration testing gap — no test caught it.
- **🔴 Sleeper ID type mismatch = recurring pattern** — Sleeper IDs are numbers, frontend sends strings. Must use `String()` coercion on ALL comparisons. Hit 4+ times in Trade Builder alone.
- **Trade Builder: 8 fix rounds** — Relative URLs, PlayerSelector, draftPicks exclusion, rosterId types, leagueRosterId field, fetchRoster type coercion. Last fix: commit `bb7ca03` (2026-02-15).
- **MailerLite** — Account ID `2116834`, form `37189961`. All 3 landing page forms wired (AJAX submit). Free tier.
- **Cloudflare DNS** — `titlerun.co` zone on Cloudflare (free). NS: `aisha.ns.cloudflare.com` + `martin.ns.cloudflare.com`. Zone ID: `c9fe3271361553b91d5015d53287fe43`. CNAME flattening enables root domain → Pages.
- **Namecheap DNS decommissioned** — Nameservers pointed to Cloudflare as of 2026-02-15 ~21:37 EST.

## Key Credentials

- **Gumroad store:** jeffthenotionguy.gumroad.com
- **Notion API (full toolkit):** ntn_A13042993971KB6Un1H68pxmicCZnILZy5iT6vrVvmE2Bm
- **Notion API (lite):** ntn_H1304299397b3eOQcbG4SWMqT97KuDCg02t1j45kyLK1Wg
- **Reddit:** u/JeffOnNotion (pw: aPCsv5g0yQ7Vw2nbm1bG)
- **Taylor's Sleeper:** taytwotime (user_id: 359116496808476672)

## Key Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-11 | Portfolio architecture (3 businesses) | 95.3/100 expert panel |
| 2026-02-11 | Etsy killed | $29 setup fee |
| 2026-02-13 | All crons → Sonnet | Token optimization (86→25/day target) |
| 2026-02-13 | TitleRun vision rewrite | Hook = competing with friends, NOT data/AI. Mutual benefit trade engine priority #1. 10-source data is SECRET (proprietary only). Simple/clean design. Redraft toggle in onboarding. |
| 2026-02-13 | Mobile v3 scrapped | "Too busy" — Taylor. 3 design iterations killed in one day (v1 finance, v2 desktop paused, v3 mobile scrapped). |
| 2026-02-14 | Original valuation Phases 1-4 built | 10,500+ lines in one night. Code reviewed 82→95/100. |
| 2026-02-14 | Taylor's 5 risk decisions | MFL=backlog, pricing=defer, trade fairness=April must-ship, PFF=no (build our own), redraft=May-June not Q3. |
| 2026-02-14 | OpenClaw 2026.2.13 | Updated from 2026.2.12 per Taylor. |
| 2026-02-14 | Code review fixes committed by Rush | Commits 2744f65 + 8dd332f. All 3 criticals + 4 majors fixed. Score 82→~95. |
| 2026-02-14 | Taylor timeline acceleration | Trade fairness: full for MARCH (was basic April). Redraft: late MARCH (was May-June). "Greatest FF app in the world." |
| 2026-02-14 | Mobile Home v4 approved (96/100) | Simple, clean, competition-focused. Integrated into Vercel frontend. |
| 2026-02-14 | Trade Engine built + polished to 95/100 | 3,731 lines (backend+frontend). 68→80→95 across 3 review cycles. |
| 2026-02-14 | Trade Fairness system built | Backend 89.5→95/100 (commit 383aa38), Frontend 96.7/100 (commit 499def4). Both integrated + deployed. |
| 2026-02-14 | Sprint B built in parallel | 4 sub-agents + Rush built onboarding + redraft foundation simultaneously. Code review: 42→88/100. Lesson: parallel builds create integration debt. |
| 2026-02-14 | Value migration complete | ALL backend files + frontend migrated. players.js (commit `5622574`) was LAST file. Code audit 92/100, 0 criticals. |
| 2026-02-14 | Home page wired to real API | Standings, activity, trend endpoints. 3 criticals found + fixed (wrong columns, teamId mismatch, stale league IDs). |
| 2026-02-14 | Taylor QA session | Found KTC values still showing → full migration triggered. News field mapping fixed. Trade Builder selectors fixed. Endpoint alignment audited. |
| 2026-02-14 | Record build day | 60+ sub-agents, ~60 commits (30+ backend + 30+ frontend), ~30,000+ new lines. Estimated $700-1000+ tokens. |
| 2026-02-14 | Grind + Edge PAUSED | Taylor: "quit all Grind and Edge initiatives until further notice." All focus on TitleRun. Heartbeats already 0m, crons already disabled. |
| 2026-02-14 | Nested response envelope pattern | #1 recurring bug: backend `{success, data:{...}}` + axios `.data` = need `response.data.data.X`. Caused Trade Builder, home page, and multiple other bugs. |
| 2026-02-15 | Cloudflare Pages migration | app.titlerun.co moved from Vercel to Cloudflare Pages. $0/mo at any scale. DNS via Namecheap CNAME. |
| 2026-02-15 | Landing page rebuild ordered | Competition hook, MailerLite email capture, 95.5/100 expert panel. Repo: daidue/titlerun-landing. |
| 2026-02-15 | MailerLite for email marketing | Taylor signing up. Free tier. Auto welcome email + drip sequences for landing page signups. |
| 2026-02-15 | Live Draft Companion = PARALLEL | Taylor overrode Jeff's sequential recommendation. Build alongside redraft, not after. |
| 2026-02-15 | Token burn accepted through March | Taylor OK with high spend. Daily visibility in morning briefs. |
| 2026-02-14 | Security hardening | Helmet added (CSP, HSTS, X-Frame-Options). CORS fixed (requires explicit origin in production). Full audit: zero critical vulns. Commits `b12a97f` + `a967baa`. |
| 2026-02-14 | Console.log cleanup | 2,101 backend → Pino logger (commit `e41cd1b`). Frontend cleaned. Lesson: automated find/replace broke build (missing imports), needed fix agent. |
| 2026-02-14 | API contract documented | `dpm-app/API-CONTRACT-2026-02-14.md` — 20+ endpoints with exact response shapes. Single source of truth. |
| 2026-02-14 | Code review cycle | 73/100 → 68/100 (build broken) → fixed → targeting 90+. Three full reviews in one afternoon. |

| 2026-02-16 | Trade report card roster_ids bug | `Object.keys([6,12])` returns indices `["0","1"]` not values. `tradeInvolvesRoster` always returned false → 0 trade cards ever generated. |
| 2026-02-16 | Value discrepancy fix | Dashboard=players only (65K), Teams=stale snapshot+picks (104K). Created centralized teamValueCalculator. But sub-agent queried non-existent column → crashed production. |
| 2026-02-16 | draft_picks has NO composite_value | Uses `ktc_value`/`ktc_value_sf`/`estimated_value`. Sub-agent assumed column existed → production crash. Must verify schema. |
| 2026-02-16 | Admin security hardening | ADMIN_SECRET validation + rate limiting. Commit `3fe8708`. |
| 2026-02-16 | Performance optimization | Lazy loading auth pages: 150→108KB gzipped (30%). PWA icons created. |
| 2026-02-16 | Code review system verified | 3x daily working (7am/12pm/5pm). Midday was disabled, re-enabled. |
| 2026-02-16 | KTC purge from user-facing responses | Taylor: "huge issue." 5 alert messages, AI knowledge, backtest reports had competitor names. Commits `f91065f`, `9555404`, `1cc4c69`. |
| 2026-02-16 | Draft pick column audit COMPLETE | `draft_picks` + `draft_pick_values` have NO composite_value columns. 6 locations fixed across teams.js, trades.js, ktcService.js. Pattern: `COALESCE(NULLIF(ktc_value_sf,0), NULLIF(fc_value_sf,0), NULLIF(dp_value_sf,0), 0)`. |
| 2026-02-16 | Leaguemates already includes picks | `/api/leaguemates/:leagueId` calculates totalValue = playerValue + pickValue. But was using fallback estimates, not real DB values, due to getDraftPickValue() column bug. |
| 2026-02-16 | Pick Valuation Phase 5 shipped | All 5 enhancements live. Expert panel R1: 72→R2: 89. N+1 fix = 30x perf gain. Taylor: "ship it." |
| 2026-02-16 | Sub-agent code ALWAYS needs expert review | Phase 5 initial score 72/100 with 5 critical bugs proves pattern. Never ship without panel. |
| 2026-02-16 | Multiplicative compounding is intentional | Pick multipliers compound (league × tier × class × demand). Safety clamp 0.7x-1.5x prevents extremes. |
| 2026-02-16 | League format auto-detect shipped | Removed manual 1QB/SF toggle. Auto-detect from `roster_positions`. Leaguemates switched to `titlerun_values` table (format-aware). Frontend commit `075cb93`, backend `6985bf4`. Panel 96/100. |
| 2026-02-16 | Value source hierarchy = titlerun_values FIRST | Primary: `titlerun_values` (format-aware). Fallback: `composite_value`/`composite_value_sf` from `players` table. LeaguemateDetail was using wrong source → barely different SF values (42 pts on 109K). |
| 2026-02-16 | LeagueSettingsBadges component | Reusable at `src/components/reportCard/LeagueSettingsBadges.jsx`. Shows league size, SF/1QB, starters, PPR, TEP. Use on ALL league-contextual pages. |

---

_Last updated: 2026-02-16_
