# MEMORY.md - Long-Term Memory

_Curated knowledge that persists across sessions. Updated as we learn together._

---

## About Taylor (My Human)

- **Name:** Taylor
- **Age:** Early 30s
- **Location:** East Coast (EST timezone)
- **Current Job:** Director of Digital Customer Acquisition (corporate retail)
- **Goal:** Escape corporate, build financial freedom through business ventures
- **Wife:** Yes
- **Dog:** Lola 🐕
- **Telegram:** @GreggButTheGIsSilent (user ID: 5742924372)
- **GitHub:** daidue

### Interests
NFL, boxing, fitness, cooking, traveling, photography, Pokemon cards, fishing, time with wife & Lola

---

## About Me (Jeff Daniels)

- **Name:** Jeff Daniels (given by Taylor, 2026-02-05)
- **Machine:** Mac mini (Jeff's Mac mini)
- **Timezone:** America/New_York (EST) — matching Taylor

---

## Our Partnership

Established **2026-02-05**. We're business partners — equals working to create outcomes that better us both, intellectually and financially.

**My role:** Solely focused on maximizing profits for our ventures (legally). Action-oriented, optimistic, tenacious. A conductor of expert agents.

**Our style:** Direct communication, get stuff done, have a great time doing it.

---

## Infrastructure (Mac Mini)

- **OpenClaw:** Running as LaunchAgent, gateway on 127.0.0.1:18789
- **Security:** FileVault ON, Firewall ON, permissions hardened (2026-02-05)
- **Git backup:** Auto-push every 10 min to `git@github.com:daidue/OpenClaw.git`
- **Memory:** QMD backend with local embeddings (no API needed)
- **SSH key:** ed25519, added to GitHub (2026-02-05)
- **Telegram:** Connected, bot token configured, paired with Jeff (user 5742924372)
- **Web Search:** Brave API enabled (2,000 queries/month free tier)
- **Heartbeat:** Every 30 min, active hours 8am-10pm EST
- **Browser:** Managed Brave profile (orange-tinted), persistent sessions
- **X.com:** @JeffDanielsB4U (browser automation)
- **Gmail:** jeffdanielsbymail@gmail.com (browser automation)

## Scheduled Jobs

- **Morning standup:** Daily 8:30am EST — overnight summary to Telegram
- **Evening check-in:** Daily 8:00pm EST (moved from 9pm) — day recap + overnight queue
- **Security audit:** Sundays 9am EST (healthcheck:security-audit)
- **Update check:** Daily 8am EST (healthcheck:update-status)
- **Fury heartbeat:** Every 15 min at :02, :17, :32, :47 (fury-heartbeat)

## Audience Building — Nate Calloway

- **Pseudonym:** Nate Calloway (@NateCallowayHQ on X) — handle confirmed available
- **Brand:** "Director + AI Agent" hybrid — Nate provides strategy, Jeff executes 24/7
- **Platform priority:** X/Twitter → TikTok/Reels (faceless) → Newsletter (Substack) → avoid LinkedIn
- **Reply strategy:** 40-50/day, 2-3 min delays, 30+ target accounts, 6 frameworks
- **Newsletter:** "The Operator's Log" — weekly Substack
- **OPSEC:** Separate email (ProtonMail), phone (Google Voice), browser profile. Wyoming LLC for payments.
- **Content:** 10 posts written, posting schedule mapped (Day 2-17)
- **All files:** `projects/audience-building/`

## Polymarket Scanner v2

- **Location:** `~/polymarket-arb/v2/` — 11 Python modules, 3K+ lines
- **Strategies:** NegRisk, new/thin markets, volume spikes, price movements, resolution proximity, news monitor, AI assessment
- **Performance:** Full scan 500 markets in 1.2 seconds (parallelized)
- **Whale tracking:** WebSocket monitor needed (persistent, not cron). APIs expose wallet addresses + trade sizes.
- **Insider scoring:** 0-100 based on new wallet, timing, size vs liquidity, clustering, contrarian
- **Existing tools:** Polywhaler, PolyAlertHub, Betmoar
- **Research:** `research/polymarket-strategy-overhaul.md`, `research/polymarket-scanner-architecture.md`, `research/polymarket-whale-tracking.md`

## ClawHub Skills

- **First skill:** Email Sequence Generator ($29) — built, ready to ship
- **Location:** `projects/clawhub-skills/email-sequence-generator/`
- **5 sequence types:** Welcome, Sales, Onboarding, Re-engagement, Cart Abandonment

## Daily Operating Rhythm

| Time | Event |
|------|-------|
| 8:30 AM | Morning standup (Telegram) |
| Daytime | Interactive work with Taylor |
| 9:00 PM | Evening planning (Telegram) |
| 10 PM - 8 AM | Night shift — light async work |

**Overnight work types:** Research, drafting, organizing, analysis (token-light)
**Not overnight:** Heavy generation, external actions, anything needing approval

## Multi-Agent Squad

| Agent | Role | Model | Heartbeat |
|-------|------|-------|-----------|
| main (Jeff) | Squad Lead | claude-opus-4-5 | 30 min |
| researcher (Fury) | Deep Research | claude-sonnet-4-5 | 15 min |
| content (Nova) | Content & Social | claude-sonnet-4-5 | 15 min |
| dev (Bolt) | Coding & Technical | claude-sonnet-4-5 | 15 min |

---

## Key Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-05 | Local embeddings over API | Privacy + no ongoing API cost |
| 2026-02-05 | QMD for document search | BM25 + vectors + reranking, fully local |

---

## Lessons Learned

_(To be updated as we work together)_

---

## Active Projects

### Freelance Invoice Tracker — Notion Template ($27)
- **Status:** Launch-ready. All assets, copy, and marketplace submissions prepared.
- **Price:** $27 (changed from $37 — expert panel said too high for cold traffic)
- **Location:** Taylor's Notion (API-built) + assets at `~/Desktop/Invoice-Tracker-Launch/`
- **Lite version:** Free PWYW on Gumroad for lead gen (page `30104dbe-0785-812f-be10-f8f8d33019c1`)
- **What it is:** Complete freelance business toolkit in Notion — invoices, clients, time tracking, expenses, 8 views, 3 automation buttons, contract template, tax guide, email scripts, follow-up scripts, pricing guide
- **Differentiator:** $37 once vs $288-1,308/yr for SaaS. Works on Notion Free plan. $115 perceived value.
- **Expert panel:** 10 simulated experts (Poulin, Frank, Wiebe, Sethi, etc.) scored 3 rounds: 73→88.4→93.2
- **Sales assets ready:** Gumroad listing v2, 3 Reddit posts, Twitter thread, email sequence, Product Hunt kit, video script
- **Remaining:** Record video walkthrough, deploy to Gumroad, visual polish, free Lite version for lead gen
- **Research:** 6 deep research docs in `workspace/research/invoice-tracker-*.md`
- **Pricing strategy:** $27 permanent (was $37), free Lite version as PWYW lead magnet
- **Revenue target:** 50-100 sales month 1 ($1,350-2,700)
- **GTM channels (priority order):** Notion Gallery → Pinterest+Tailwind → Gumroad Discover → Etsy → Reddit (Month 2)
- **Product Hunt: DEAD for templates** (stopped featuring them 2024) — removed from plan
- **Pinterest case study:** $0→$1,400/mo in 6 months with Tailwind automation

---

_Last updated: 2026-02-05_
