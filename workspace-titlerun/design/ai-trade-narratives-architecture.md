# AI-Powered Trade Analysis Narratives — Production Architecture

**Author:** Rush (TitleRun Owner/Operator)  
**Date:** 2026-03-18  
**Status:** Design Complete — Ready for Implementation  
**Priority:** HIGH — Differentiating feature for April 15 launch  
**Corrected:** 5-part structure, 100% LLM-generated, quality-first  

---

## Executive Summary

Every Trade Finder recommendation gets a 5-part AI-generated narrative that reads like a dynasty fantasy expert wrote it. No templates. No fill-in-the-blank. Every narrative is unique, contextual, and opinionated — grounded in real NFL data, the user's specific roster, and league-wide trends.

**Quality bar:** If a user screenshots the analysis and posts it on r/DynastyFF, people should ask "who wrote this?" — not "what bot generated this?"

**Cost ceiling:** $5-10K/month at scale (1,000 daily users)  
**Latency target:** <3 seconds for top 5 trades (async generation + caching)  
**Coverage:** 100% of Trade Finder results get narratives  

---

## 1. The 5-Part Narrative Structure

Every trade narrative contains exactly 5 sections, each 2-3 sentences:

| # | Section | Purpose | Tone |
|---|---------|---------|------|
| 1 | **For Trading Away** [your player] | Compelling case to move your player | Persuasive — why selling is smart |
| 2 | **For Receiving** [their player] | Compelling case to acquire their player | Optimistic — why buying is smart |
| 3 | **Against Trading Away** [your player] | Risks/downsides of losing your player | Cautionary — what you'd miss |
| 4 | **Against Receiving** [their player] | Risks/downsides of acquiring their player | Skeptical — why the buy could fail |
| 5 | **Consensus** | Final recommendation considering full team context | Decisive — clear recommendation |

### Why 5 Parts, Not 4

The "Against Receiving" section is critical for trust. Without it, the analysis feels like a sales pitch for every trade. Users need to see that we've considered the downside of the acquisition too — not just the downside of selling. This mirrors how real dynasty analysts think: they weigh both sides of both players before making a call.

### Quality Examples

**Trade:** Travis Etienne (you own) ↔ Rome Odunze (you receive)

**1. For Trading Away Etienne:**
> Even though he just signed a top dollar RB contract, he's 27 on a good not great team. The Saints run blocking was second to last in the league last year. Additionally, RBs usually hit a cliff around this time, and so longevity is limited.

**2. For Receiving Odunze:**
> The upside with Odunze is there. Coming into his 3rd year as a high first round pick, DJ Moore was just traded to Buffalo, leaving Odunze, Burden and Loveland as the top receiving options. If he's going to fully break out, it will be this year and if he does, expect his value to skyrocket on the Ben Johnson led offense.

**3. Against Trading Away Etienne:**
> Your team doesn't have much depth behind him (Algeier & Brooks might not pan out), so it could be risky to send him away. Additionally we calculate that you're in a championship window, and there are options in the 2026 draft to get a receiver with your 1.05 pick that hopefully pans out.

**4. Against Receiving Odunze:**
> While the upside is there, Odunze is still unproven. Year 2 WRs have a wide range of outcomes, and the Bears offense could struggle despite Ben Johnson. You'd be banking on potential rather than production, and if he doesn't break out this year, his value could stagnate or even decline.

**5. Consensus:**
> Keep Etienne this year. The pendulum has swung so far in the direction of WRs, that RBs have now become the new coveted position group - you have some guys that could step up but Etienne should help you make a TitleRun this year!

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                     Trade Finder Flow                            │
│                                                                  │
│  findTrades()                                                    │
│    ├── Pass 1: Generate candidates (existing)                    │
│    ├── Pass 2: Deep analysis (existing)                          │
│    └── Pass 3: AI Narrative Generation ← NEW                    │
│          │                                                       │
│          ▼                                                       │
│    ┌─────────────────────────────────────┐                       │
│    │  narrativeGenerationService.js       │                       │
│    │  ─────────────────────────────────   │                       │
│    │  1. Check narrative cache            │                       │
│    │  2. Build context packet             │                       │
│    │  3. Call LLM (batch top 5-10)        │                       │
│    │  4. Parse + validate 5-part output   │                       │
│    │  5. Cache result                     │                       │
│    │  6. Return narratives                │                       │
│    └─────────┬───────────────────────────┘                       │
│              │                                                   │
│              ▼                                                   │
│    ┌─────────────────────────────────────┐                       │
│    │  Player Context Sources              │                       │
│    │  ─────────────────────────────────   │                       │
│    │  • player_context table (Tier 1-3)   │                       │
│    │  • Sleeper API (age, team, injury)   │                       │
│    │  • Roster analysis (depth, needs)    │                       │
│    │  • Championship equity calculator    │                       │
│    │  • League trend data                 │                       │
│    └─────────────────────────────────────┘                       │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Model

### Narrative Cache Table

This is the primary persistence layer. Narratives are expensive to generate ($0.02-0.05 each) so aggressive caching is essential.

```sql
-- ============================================================
-- Migration 003: AI Trade Narratives
-- Depends on: players table, player_context table (migration 002)
-- ============================================================

BEGIN;

-- ---------------------------------------------------------
-- 1. Narrative Cache — stores generated 5-part analyses
-- Key: give_player_ids + get_player_ids + team_context_hash
-- ---------------------------------------------------------
CREATE TABLE trade_narrative_cache (
  id                  BIGSERIAL PRIMARY KEY,
  
  -- Trade identity (what's being traded)
  give_player_ids     TEXT[] NOT NULL,           -- Sorted array of player IDs being given
  get_player_ids      TEXT[] NOT NULL,           -- Sorted array of player IDs being received
  
  -- Context fingerprint (when context changes, narrative must regenerate)
  team_context_hash   VARCHAR(64) NOT NULL,      -- SHA-256 of: roster depth + strategy + draft picks + needs
  
  -- The 5-part narrative
  narrative           JSONB NOT NULL,
  -- Structure:
  -- {
  --   "forTradingAway": "Even though he just signed...",
  --   "forReceiving": "The upside with Odunze is there...",
  --   "againstTradingAway": "Your team doesn't have much depth...",
  --   "againstReceiving": "While the upside is there, Odunze is still...",
  --   "consensus": "Keep Etienne this year...",
  --   "recommendAction": "KEEP" | "TRADE",
  --   "confidenceLevel": "high" | "medium" | "low"
  -- }
  
  -- Generation metadata
  model_used          VARCHAR(50) NOT NULL,       -- 'claude-sonnet-4-20250514', 'gpt-4o', etc.
  prompt_version      VARCHAR(20) NOT NULL,       -- 'v1.0', 'v1.1' — bump to invalidate cache
  generation_ms       INTEGER,                    -- How long LLM took
  input_tokens        INTEGER,                    -- For cost tracking
  output_tokens       INTEGER,                    -- For cost tracking
  
  -- Lifecycle
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at          TIMESTAMPTZ NOT NULL,        -- Default: created_at + 7 days
  access_count        INTEGER DEFAULT 0,           -- How often this was served from cache
  last_accessed_at    TIMESTAMPTZ,
  
  -- Composite unique: same trade + same context = same narrative
  CONSTRAINT uq_narrative_trade_context 
    UNIQUE (give_player_ids, get_player_ids, team_context_hash, prompt_version)
);

-- Fast lookups by trade pair
CREATE INDEX idx_narrative_players 
  ON trade_narrative_cache USING GIN (give_player_ids, get_player_ids);

-- Cleanup expired entries
CREATE INDEX idx_narrative_expires 
  ON trade_narrative_cache (expires_at) 
  WHERE expires_at < NOW();

-- Cost tracking queries
CREATE INDEX idx_narrative_created 
  ON trade_narrative_cache (created_at DESC);

-- ---------------------------------------------------------
-- 2. Narrative generation log — cost tracking + debugging
-- ---------------------------------------------------------
CREATE TABLE narrative_generation_log (
  id                  BIGSERIAL PRIMARY KEY,
  user_id             VARCHAR(50),                -- Who triggered this
  league_id           VARCHAR(50),
  trades_requested    INTEGER NOT NULL,            -- How many trades needed narratives
  trades_cached       INTEGER DEFAULT 0,           -- How many were cache hits
  trades_generated    INTEGER DEFAULT 0,           -- How many required LLM calls
  
  -- Cost
  total_input_tokens  INTEGER DEFAULT 0,
  total_output_tokens INTEGER DEFAULT 0,
  estimated_cost_usd  DECIMAL(6,4) DEFAULT 0,     -- e.g., 0.0350
  
  -- Performance
  total_duration_ms   INTEGER,
  model_used          VARCHAR(50),
  
  -- Errors
  errors              INTEGER DEFAULT 0,
  error_details       JSONB DEFAULT '[]',
  
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_narr_log_created ON narrative_generation_log(created_at DESC);
CREATE INDEX idx_narr_log_cost ON narrative_generation_log(estimated_cost_usd DESC);

-- ---------------------------------------------------------
-- 3. Player narrative context — enriched data for prompts
-- Extends player_context (migration 002) with narrative-specific fields
-- ---------------------------------------------------------
CREATE TABLE player_narrative_context (
  player_id           VARCHAR(20) NOT NULL REFERENCES players(sleeper_id) ON DELETE CASCADE,
  
  -- NFL Context (for narrative color)
  contract_status     VARCHAR(100),               -- "signed 4yr/$48M extension", "entering FA 2027"
  recent_transaction  TEXT,                        -- "DJ Moore traded to Buffalo (Mar 2026)"
  coaching_context    TEXT,                        -- "Ben Johnson hired as HC, pass-heavy scheme"
  target_competition  TEXT,                        -- "Competes with Burden, Loveland for targets"
  team_quality        VARCHAR(50),                 -- "contender", "rebuilding", "good not great"
  oline_rank          SMALLINT,                    -- 1-32 (1 = best)
  oline_context       VARCHAR(100),               -- "2nd-to-last in run blocking (2025)"
  
  -- Dynasty-specific
  breakout_year       BOOLEAN DEFAULT FALSE,       -- Is this a typical breakout year? (Year 3 WR, Year 2 TE)
  age_cliff_risk      BOOLEAN DEFAULT FALSE,       -- RB 27+, WR 31+, QB 35+
  sell_high_reason     TEXT,                        -- "Career year on bad team, regression likely"
  buy_low_reason       TEXT,                        -- "Suppressed by injury, talent still elite"
  
  -- League Trend Context
  positional_scarcity  VARCHAR(20),                -- "increasing", "stable", "decreasing"
  market_trend         TEXT,                        -- "RB values rising as scarcity increases"
  
  -- Source + freshness
  last_manual_update   TIMESTAMPTZ,                -- When a human last curated this
  auto_updated_at      TIMESTAMPTZ DEFAULT NOW(),  -- When pipeline last refreshed
  
  PRIMARY KEY (player_id)
);

CREATE INDEX idx_pnc_updated ON player_narrative_context(auto_updated_at);

COMMIT;
```

### Rollback

```sql
BEGIN;
DROP TABLE IF EXISTS narrative_generation_log;
DROP TABLE IF EXISTS trade_narrative_cache;
DROP TABLE IF EXISTS player_narrative_context;
COMMIT;
```

---

## 4. Context Packet Assembly

The LLM is only as good as the context we feed it. This is the most important part of the system — garbage in, garbage out.

### What the LLM Needs (Per Trade)

```javascript
/**
 * Context packet assembled for each trade before sending to LLM.
 * This is the "research brief" the AI analyst reads before writing.
 *
 * @typedef {Object} TradeContextPacket
 */
const examplePacket = {
  // ── Trade Structure ──
  trade: {
    give: [
      {
        name: 'Travis Etienne',
        position: 'RB',
        age: 27,
        nflTeam: 'NO',
        value: 5200,
        rank: 'RB12',
        yearsExp: 5,
      }
    ],
    get: [
      {
        name: 'Rome Odunze',
        position: 'WR',
        age: 23,
        nflTeam: 'CHI',
        value: 5800,
        rank: 'WR18',
        yearsExp: 2,
      }
    ]
  },

  // ── Player NFL Context (from player_narrative_context + player_context) ──
  playerContext: {
    'Travis Etienne': {
      contractStatus: 'Signed 4yr/$48M extension (2025)',
      teamQuality: 'Good not great — 9-8 last year',
      olineContext: 'Run blocking ranked 31st in 2025',
      ageClifRisk: true,
      positionalScarcity: 'increasing',
      marketTrend: 'RB values rising as league shifts back toward positional scarcity',
      recentTransaction: null,
      coachingContext: 'Dennis Allen fired, Kellen Moore promoted to HC',
      targetCompetition: null, // N/A for RBs
      breakoutYear: false,
      injuryStatus: 'Active',
    },
    'Rome Odunze': {
      contractStatus: 'Rookie deal through 2027 (5th year option available)',
      teamQuality: 'Rebuilding but improving',
      olineContext: 'Pass protection ranked 18th in 2025',
      ageClifRisk: false,
      positionalScarcity: 'stable',
      marketTrend: 'WR market cooling slightly after 2-year boom',
      recentTransaction: 'DJ Moore traded to Buffalo (Mar 2026)',
      coachingContext: 'Ben Johnson hired as HC — expected pass-heavy scheme',
      targetCompetition: 'Competes with Cole Kmet, Burden, Loveland for targets',
      breakoutYear: true, // Year 3 WR = typical breakout
      injuryStatus: 'Active',
    }
  },

  // ── User's Team Context ──
  userTeam: {
    strategy: 'contender',                   // contender | retooling | rebuilding
    championshipWindow: true,
    
    // Depth at the position being traded away
    depthAtGivePosition: {
      position: 'RB',
      starters: ['Travis Etienne'],
      backups: ['Tyler Allgeier', 'Tyjae Spears'],
      grade: 'B',
      depthVerdict: 'Thin — Allgeier and Spears are unproven as RB1s'
    },

    // Depth at the position being received
    depthAtGetPosition: {
      position: 'WR',
      starters: ['CeeDee Lamb', 'DK Metcalf'],
      backups: ['Rashid Shaheed', 'Quentin Johnston'],
      grade: 'B+',
      depthVerdict: 'Solid top-end but no clear WR3'
    },

    // Draft capital
    draftPicks: ['2026 1.05', '2026 2.08', '2026 3.05'],
    relevantDraftContext: 'Strong 2026 WR class — could address WR need at 1.05',

    // League-relative standing
    leagueRank: 3,           // Out of 12 teams by total roster value
    leagueSize: 12,
    scoringFormat: 'PPR',
    superflex: true,
  },

  // ── League-Wide Trends ──
  leagueTrends: {
    rbVsWrMarket: 'RB scarcity increasing — values have risen 15% in 6 months as league overinvested in WR',
    currentMeta: 'Positional pendulum swinging back toward RBs after 2 years of WR dominance',
    rookieDraftStrength: '2026 class is WR-heavy — good year to draft WR, bad year to buy one at peak'
  }
};
```

### Context Assembly Service

```javascript
// src/services/narrativeContextService.js

/**
 * Assembles the context packet for a trade narrative.
 * Pulls from multiple sources to build the "research brief" for the LLM.
 */

const sleeperService = require('./sleeperService');
const rosterAnalysisService = require('./rosterAnalysisService');
const logger = require('../utils/logger').child({ service: 'narrative-context' });

/**
 * Build context packet for a single trade.
 * 
 * @param {Object} trade - { give: Asset[], get: Asset[] }
 * @param {Object} myTeam - Enriched team object from Trade Finder
 * @param {Object} leagueSettings - { superflex, scoringFormat, teamCount, ... }
 * @param {Object} enrichedTeams - All teams in league (for relative ranking)
 * @param {Object} playerContextData - From player_narrative_context + player_context tables
 * @returns {Object} TradeContextPacket
 */
function buildContextPacket(trade, myTeam, leagueSettings, enrichedTeams, playerContextData) {
  const allPlayers = [...trade.give, ...trade.get].filter(a => a.type === 'player');
  
  // Player-level context
  const playerContext = {};
  for (const player of allPlayers) {
    const ctx = playerContextData[player.id] || {};
    playerContext[player.name] = {
      contractStatus: ctx.contract_status || inferContractStatus(player),
      teamQuality: ctx.team_quality || 'Unknown',
      olineContext: ctx.oline_context || null,
      ageClifRisk: ctx.age_cliff_risk || isAgeClifRisk(player),
      positionalScarcity: ctx.positional_scarcity || 'stable',
      marketTrend: ctx.market_trend || null,
      recentTransaction: ctx.recent_transaction || null,
      coachingContext: ctx.coaching_context || null,
      targetCompetition: ctx.target_competition || null,
      breakoutYear: ctx.breakout_year || isBreakoutYear(player),
      injuryStatus: player.injuryStatus || ctx.injury_status || 'Active',
      sellHighReason: ctx.sell_high_reason || null,
      buyLowReason: ctx.buy_low_reason || null,
    };
  }

  // User team context
  const givePositions = [...new Set(trade.give.filter(a => a.type === 'player').map(a => a.position))];
  const getPositions = [...new Set(trade.get.filter(a => a.type === 'player').map(a => a.position))];
  
  const depthAtGivePosition = givePositions.map(pos => buildDepthContext(pos, myTeam, trade.give));
  const depthAtGetPosition = getPositions.map(pos => buildDepthContext(pos, myTeam, trade.get));

  // League rank
  const sortedTeams = [...enrichedTeams].sort((a, b) => b.totalValue - a.totalValue);
  const leagueRank = sortedTeams.findIndex(t => t.rosterId === myTeam.rosterId) + 1;

  // Draft picks (from myTeam if available)
  const draftPicks = (myTeam.draftPicks || []).map(p => p.label || `${p.season} Round ${p.round}`);

  return {
    trade: {
      give: trade.give.map(formatAssetForPrompt),
      get: trade.get.map(formatAssetForPrompt),
    },
    playerContext,
    userTeam: {
      strategy: myTeam.detectedStrategy || 'unknown',
      championshipWindow: myTeam.detectedStrategy === 'contender',
      depthAtGivePosition: depthAtGivePosition[0] || null,
      depthAtGetPosition: depthAtGetPosition[0] || null,
      draftPicks,
      relevantDraftContext: buildDraftContext(draftPicks, getPositions),
      leagueRank,
      leagueSize: leagueSettings.teamCount || 12,
      scoringFormat: leagueSettings.scoringFormat || 'PPR',
      superflex: leagueSettings.superflex || false,
    },
    leagueTrends: getLeagueTrends(), // Refreshed weekly
  };
}

function formatAssetForPrompt(asset) {
  if (asset.type === 'pick') {
    return {
      type: 'pick',
      name: asset.name,
      value: asset.value,
      season: asset.season,
      round: asset.round,
    };
  }
  return {
    type: 'player',
    name: asset.name,
    position: asset.position,
    age: asset.age,
    nflTeam: asset.team,
    value: asset.value,
    yearsExp: asset.yearsExp || estimateYearsExp(asset.age, asset.position),
  };
}

function buildDepthContext(position, team, tradeAssets) {
  const posPlayers = (team.players || [])
    .filter(p => p.position === position)
    .sort((a, b) => b.value - a.value);
  
  const tradingAway = new Set(tradeAssets.filter(a => a.type === 'player').map(a => String(a.id)));
  const starters = posPlayers.filter(p => !tradingAway.has(String(p.playerId))).slice(0, 2);
  const backups = posPlayers.filter(p => !tradingAway.has(String(p.playerId))).slice(2, 4);
  
  const grade = team.positionGrades?.[position] || 'C';
  
  let depthVerdict;
  if (posPlayers.length <= 2) {
    depthVerdict = `Thin — only ${posPlayers.length} rostered ${position}s`;
  } else if (backups.every(p => p.value < 2000)) {
    depthVerdict = `Top-heavy — backups are low-value`;
  } else {
    depthVerdict = `Solid depth with ${posPlayers.length} rostered ${position}s`;
  }

  return {
    position,
    starters: starters.map(p => p.name),
    backups: backups.map(p => p.name),
    grade,
    depthVerdict,
  };
}

function isAgeClifRisk(player) {
  if (player.position === 'RB' && (player.age || 25) >= 27) return true;
  if (player.position === 'WR' && (player.age || 25) >= 30) return true;
  if (player.position === 'QB' && (player.age || 25) >= 35) return true;
  if (player.position === 'TE' && (player.age || 25) >= 30) return true;
  return false;
}

function isBreakoutYear(player) {
  const yearsExp = player.yearsExp || estimateYearsExp(player.age, player.position);
  if (player.position === 'WR' && yearsExp === 3) return true;  // Year 3 WR breakout
  if (player.position === 'TE' && yearsExp === 3) return true;  // Year 3 TE breakout
  if (player.position === 'QB' && yearsExp === 2) return true;  // Year 2 QB leap
  return false;
}

function estimateYearsExp(age, position) {
  // Rough estimate: drafted at 21-22
  const draftAge = position === 'QB' ? 22 : 21;
  return Math.max(1, (age || 25) - draftAge);
}

function inferContractStatus(player) {
  const yearsExp = estimateYearsExp(player.age, player.position);
  if (yearsExp <= 4) return 'On rookie contract';
  if (yearsExp === 5) return 'Approaching free agency or 5th-year option';
  return 'Veteran contract';
}

function buildDraftContext(picks, getPositions) {
  if (!picks || picks.length === 0) return null;
  const hasFirstRound = picks.some(p => p.includes('Round 1') || p.includes('1.'));
  if (hasFirstRound && getPositions.length > 0) {
    return `Has early draft capital — could draft a ${getPositions[0]} instead of trading for one`;
  }
  return null;
}

/**
 * League-wide trends — refreshed weekly by data pipeline.
 * Hardcoded for MVP, moves to DB in Phase 2.
 */
function getLeagueTrends() {
  // TODO: Move to league_trends table, refreshed weekly by pipeline
  return {
    rbVsWrMarket: 'RB scarcity increasing as league overinvested in WR over past 2 years',
    currentMeta: 'Positional pendulum swinging back toward RBs — dynasty managers hoarding RB depth',
    rookieDraftStrength: '2026 rookie class is deep at WR, shallow at RB — good year to draft WR'
  };
}

/**
 * Generate a hash of the user's team context for cache keying.
 * When team context changes (roster move, trade, draft), cache invalidates.
 */
function hashTeamContext(myTeam, trade) {
  const crypto = require('crypto');
  const contextString = JSON.stringify({
    rosterId: myTeam.rosterId,
    playerIds: (myTeam.players || []).map(p => p.playerId).sort(),
    strategy: myTeam.detectedStrategy,
    totalValue: myTeam.totalValue,
    giveIds: trade.give.map(a => a.id).sort(),
    getIds: trade.get.map(a => a.id).sort(),
  });
  return crypto.createHash('sha256').update(contextString).digest('hex');
}

module.exports = {
  buildContextPacket,
  hashTeamContext,
  isAgeClifRisk,
  isBreakoutYear,
  getLeagueTrends,
  // Exported for testing
  buildDepthContext,
  formatAssetForPrompt,
};
```

---

## 5. LLM Prompt Engineering

### The System Prompt (Cached — Never Changes Per Request)

```
SYSTEM_PROMPT (const — cached across all requests):

You are a dynasty fantasy football expert analyst. You write trade analysis for dynasty league managers.

VOICE & STYLE:
- Write like a knowledgeable friend explaining a trade over beers, not like a textbook
- Be opinionated — take a stance, don't hedge everything
- Use specific facts (ages, rankings, team names, coaching names) — never be vague
- Sound human: contractions, casual phrasing, occasional emphasis
- Max 3 sentences per section — be punchy, not verbose
- Never use: "it's worth noting", "it should be noted", "in conclusion"
- Never use exclamation marks except in the Consensus section (max 1)
- Never start two sections with the same word
- Reference the user's specific team context (depth, window, draft picks) — this is personalized analysis, not generic takes

PROHIBITED PATTERNS:
- No hedging words more than once per section ("could", "might", "may", "potentially")
- No AI-sounding phrases: "it's important to consider", "there are several factors", "on the other hand"
- No generic advice: "do your own research", "it depends on your situation"
- No mentioning that you are an AI or that this analysis is AI-generated
- No disclaimers or caveats about data accuracy
- Do not repeat the same point across multiple sections — each section must add NEW information

OUTPUT FORMAT:
Return a JSON object with exactly these keys:
{
  "forTradingAway": "2-3 sentences...",
  "forReceiving": "2-3 sentences...",
  "againstTradingAway": "2-3 sentences...",
  "againstReceiving": "2-3 sentences...",
  "consensus": "2-3 sentences...",
  "recommendAction": "TRADE" or "KEEP",
  "confidenceLevel": "high" or "medium" or "low"
}

Return ONLY the JSON object. No markdown, no code fences, no explanation.
```

### The User Prompt (Dynamic — Changes Per Trade)

```
USER_PROMPT (dynamic — constructed per trade):

TRADE PROPOSAL:
User trades away: {givePlayersSummary}
User receives: {getPlayersSummary}

---

PLAYER CONTEXT:

{For each player in give + get:}
{playerName} ({position}, Age {age}, {nflTeam}):
- Contract: {contractStatus}
- NFL Team: {teamQuality}
{if olineContext:}- O-Line: {olineContext}
{if coachingContext:}- Coaching: {coachingContext}
{if recentTransaction:}- Recent: {recentTransaction}
{if targetCompetition:}- Target Competition: {targetCompetition}
{if breakoutYear:}- Breakout Window: Year {yearsExp} — typical breakout year for {position}
{if ageClifRisk:}- Age Concern: Approaching {position} age cliff
{if injuryStatus != 'Active':}- Injury: {injuryStatus} — {injuryNotes}
{if sellHighReason:}- Sell Signal: {sellHighReason}
{if buyLowReason:}- Buy Signal: {buyLowReason}

---

USER'S TEAM CONTEXT:
- Team strategy: {strategy} ({championshipWindow ? "in championship window" : "building for future"})
- League rank: {leagueRank} of {leagueSize} ({scoringFormat}{superflex ? ", Superflex" : ""})
{For each depthAtGivePosition:}
- {position} depth (TRADING FROM): {starters.join(', ')} as starters, {backups.join(', ')} behind them. Grade: {grade}. {depthVerdict}
{For each depthAtGetPosition:}
- {position} depth (TRADING FOR): {starters.join(', ')} as starters, {backups.join(', ')} behind them. Grade: {grade}. {depthVerdict}
{if draftPicks.length > 0:}- Draft picks: {draftPicks.join(', ')}
{if relevantDraftContext:}- Draft note: {relevantDraftContext}

---

LEAGUE TRENDS:
- {rbVsWrMarket}
- {currentMeta}
- {rookieDraftStrength}

---

Write the 5-part trade analysis. Remember:
- "For Trading Away" argues why SELLING {givePrimaryName} is smart
- "For Receiving" argues why BUYING {getPrimaryName} is smart
- "Against Trading Away" argues why KEEPING {givePrimaryName} is safer
- "Against Receiving" argues why {getPrimaryName} might disappoint
- "Consensus" weighs everything and gives a clear TRADE or KEEP recommendation, referencing the user's specific team situation

Each section: 2-3 sentences. Be specific. Be opinionated. Sound human.
```

### Multi-Trade Batch Prompt

For efficiency, we batch up to 5 trades into a single LLM call:

```
USER_PROMPT (batch — up to 5 trades):

Analyze the following {N} trade proposals for the same user. Generate a separate 5-part analysis for each.

USER'S TEAM CONTEXT (applies to all trades):
{teamContext — same as above, written once}

LEAGUE TRENDS (applies to all trades):
{leagueTrends — same as above, written once}

---

TRADE 1:
User trades away: {trade1.give}
User receives: {trade1.get}

Player Context:
{trade1.playerContext}

---

TRADE 2:
User trades away: {trade2.give}
User receives: {trade2.get}

Player Context:
{trade2.playerContext}

---

{...up to Trade 5}

---

Return a JSON array with {N} objects, one per trade, in the same order.
Each object has: forTradingAway, forReceiving, againstTradingAway, againstReceiving, consensus, recommendAction, confidenceLevel.

CRITICAL: Each trade's analysis must be UNIQUE — do not reuse phrases across trades. Each trade has different players and different dynamics.
```

---

## 6. Narrative Generation Service

```javascript
// src/services/narrativeGenerationService.js

/**
 * AI Trade Narrative Generation Service
 * 
 * Generates 5-part trade analysis narratives using LLM.
 * All narratives are LLM-generated — no templates.
 * 
 * Architecture:
 * 1. Check cache (DB-backed, 7-day TTL)
 * 2. Batch uncached trades (up to 5 per LLM call)
 * 3. Generate via Claude/GPT-4
 * 4. Validate output structure
 * 5. Cache results
 * 6. Return narratives
 */

const logger = require('../utils/logger').child({ service: 'narrative-gen' });
const { buildContextPacket, hashTeamContext } = require('./narrativeContextService');

// ─── Configuration ─────────────────────────────────────────────

const CONFIG = {
  // LLM Settings
  model: process.env.NARRATIVE_MODEL || 'claude-sonnet-4-20250514',
  maxTokens: 1500,          // Per trade (~300 tokens per section × 5)
  temperature: 0.8,         // Higher = more creative, varied output
  promptVersion: 'v1.0',    // Bump to invalidate all cached narratives
  
  // Batching
  maxBatchSize: 5,          // Max trades per LLM call
  batchTimeoutMs: 15000,    // Max wait for batch LLM response
  
  // Cache
  cacheTTLDays: 7,          // How long narratives stay cached
  
  // Cost tracking
  inputTokenCostPer1K: 0.003,   // Claude Sonnet input
  outputTokenCostPer1K: 0.015,  // Claude Sonnet output
  
  // Fallback
  maxRetries: 2,
  retryDelayMs: 1000,
};

// ─── System Prompt (constant — maximizes prompt caching) ───────

const SYSTEM_PROMPT = `You are a dynasty fantasy football expert analyst. You write trade analysis for dynasty league managers.

VOICE & STYLE:
- Write like a knowledgeable friend explaining a trade over beers, not like a textbook
- Be opinionated — take a stance, don't hedge everything
- Use specific facts (ages, rankings, team names, coaching names) — never be vague
- Sound human: contractions, casual phrasing, occasional emphasis
- Max 3 sentences per section — be punchy, not verbose
- Never use: "it's worth noting", "it should be noted", "in conclusion"
- Never use exclamation marks except in the Consensus section (max 1)
- Never start two sections with the same word
- Reference the user's specific team context (depth, window, draft picks) — this is personalized analysis, not generic takes

PROHIBITED PATTERNS:
- No hedging words more than once per section ("could", "might", "may", "potentially")
- No AI-sounding phrases: "it's important to consider", "there are several factors", "on the other hand"
- No generic advice: "do your own research", "it depends on your situation"
- No mentioning that you are an AI or that this analysis is AI-generated
- No disclaimers or caveats about data accuracy
- Do not repeat the same point across multiple sections — each section must add NEW information

OUTPUT FORMAT:
Return a JSON object (or array of objects for batch requests) with exactly these keys:
{
  "forTradingAway": "2-3 sentences...",
  "forReceiving": "2-3 sentences...",
  "againstTradingAway": "2-3 sentences...",
  "againstReceiving": "2-3 sentences...",
  "consensus": "2-3 sentences...",
  "recommendAction": "TRADE" or "KEEP",
  "confidenceLevel": "high" or "medium" or "low"
}

Return ONLY valid JSON. No markdown, no code fences, no explanation.`;

// ─── Core Generation ───────────────────────────────────────────

/**
 * Generate narratives for a list of trades.
 * Handles caching, batching, and fallbacks.
 * 
 * @param {Array} trades - Trade objects from deepAnalyze (with give/get arrays)
 * @param {Object} myTeam - Enriched team object
 * @param {Array} enrichedTeams - All league teams
 * @param {Object} leagueSettings - League configuration
 * @param {Object} options - { db, playerContextData }
 * @returns {Map<string, Object>} Map of tradeId → narrative object
 */
async function generateNarratives(trades, myTeam, enrichedTeams, leagueSettings, options = {}) {
  const startTime = Date.now();
  const { db, playerContextData = {} } = options;
  
  const results = new Map();
  const uncachedTrades = [];
  
  // 1. Check cache for each trade
  for (const trade of trades) {
    const cacheKey = buildCacheKey(trade, myTeam);
    
    if (db) {
      const cached = await getCachedNarrative(db, cacheKey);
      if (cached) {
        results.set(trade.id, cached);
        continue;
      }
    }
    
    uncachedTrades.push({ trade, cacheKey });
  }
  
  logger.info('Narrative cache check', {
    total: trades.length,
    cached: results.size,
    toGenerate: uncachedTrades.length,
  });
  
  if (uncachedTrades.length === 0) {
    logGenerationStats(db, trades.length, results.size, 0, 0, 0, 0, Date.now() - startTime);
    return results;
  }
  
  // 2. Build context packets for uncached trades
  const contextPackets = uncachedTrades.map(({ trade }) => 
    buildContextPacket(
      { give: trade.give, get: trade.get },
      myTeam,
      leagueSettings,
      enrichedTeams,
      playerContextData
    )
  );
  
  // 3. Batch generate (up to CONFIG.maxBatchSize per LLM call)
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  
  for (let i = 0; i < uncachedTrades.length; i += CONFIG.maxBatchSize) {
    const batchTrades = uncachedTrades.slice(i, i + CONFIG.maxBatchSize);
    const batchContexts = contextPackets.slice(i, i + CONFIG.maxBatchSize);
    
    try {
      const { narratives, inputTokens, outputTokens } = await callLLM(batchContexts, myTeam, leagueSettings);
      totalInputTokens += inputTokens;
      totalOutputTokens += outputTokens;
      
      // Map results back to trades
      for (let j = 0; j < batchTrades.length; j++) {
        const { trade, cacheKey } = batchTrades[j];
        const narrative = narratives[j];
        
        if (narrative && validateNarrative(narrative)) {
          results.set(trade.id, narrative);
          
          // Cache the result
          if (db) {
            await cacheNarrative(db, cacheKey, narrative, {
              model: CONFIG.model,
              promptVersion: CONFIG.promptVersion,
              inputTokens: Math.round(inputTokens / batchTrades.length),
              outputTokens: Math.round(outputTokens / batchTrades.length),
            });
          }
        } else {
          // Validation failed — use graceful fallback
          logger.warn('Narrative validation failed', { tradeId: trade.id });
          results.set(trade.id, buildFallbackNarrative(trade));
        }
      }
    } catch (err) {
      logger.error('LLM batch generation failed', { error: err.message, batch: i });
      
      // Fallback for entire batch
      for (const { trade } of batchTrades) {
        results.set(trade.id, buildFallbackNarrative(trade));
      }
    }
  }
  
  const durationMs = Date.now() - startTime;
  logGenerationStats(
    db, trades.length, trades.length - uncachedTrades.length,
    uncachedTrades.length, totalInputTokens, totalOutputTokens,
    estimateCost(totalInputTokens, totalOutputTokens), durationMs
  );
  
  return results;
}

// ─── LLM Call ──────────────────────────────────────────────────

/**
 * Call the LLM to generate narratives for a batch of trades.
 * Supports Claude (Anthropic) and GPT-4 (OpenAI) — configurable.
 */
async function callLLM(contextPackets, myTeam, leagueSettings) {
  const userPrompt = buildBatchUserPrompt(contextPackets, myTeam, leagueSettings);
  
  let response;
  let inputTokens = 0;
  let outputTokens = 0;
  
  for (let attempt = 0; attempt <= CONFIG.maxRetries; attempt++) {
    try {
      if (CONFIG.model.startsWith('claude')) {
        response = await callClaude(userPrompt, inputTokens, outputTokens);
      } else {
        response = await callOpenAI(userPrompt);
      }
      
      inputTokens = response.inputTokens || 0;
      outputTokens = response.outputTokens || 0;
      
      // Parse JSON response
      const parsed = parseNarrativeResponse(response.text, contextPackets.length);
      return { narratives: parsed, inputTokens, outputTokens };
      
    } catch (err) {
      if (attempt < CONFIG.maxRetries) {
        logger.warn('LLM call failed, retrying', { attempt, error: err.message });
        await sleep(CONFIG.retryDelayMs * (attempt + 1));
      } else {
        throw err;
      }
    }
  }
}

async function callClaude(userPrompt) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  
  const response = await client.messages.create({
    model: CONFIG.model,
    max_tokens: CONFIG.maxTokens * 5, // Batch of up to 5
    temperature: CONFIG.temperature,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });
  
  return {
    text: response.content[0].text,
    inputTokens: response.usage?.input_tokens || 0,
    outputTokens: response.usage?.output_tokens || 0,
  };
}

async function callOpenAI(userPrompt) {
  const OpenAI = require('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: CONFIG.maxTokens * 5,
    temperature: CONFIG.temperature,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
  });
  
  return {
    text: response.choices[0].message.content,
    inputTokens: response.usage?.prompt_tokens || 0,
    outputTokens: response.usage?.completion_tokens || 0,
  };
}

// ─── Prompt Building ───────────────────────────────────────────

function buildBatchUserPrompt(contextPackets, myTeam, leagueSettings) {
  const teamContext = buildTeamContextBlock(contextPackets[0]?.userTeam || {});
  const trendContext = buildTrendContextBlock(contextPackets[0]?.leagueTrends || {});
  
  let prompt = '';
  
  if (contextPackets.length === 1) {
    // Single trade — simpler prompt
    prompt = buildSingleTradePrompt(contextPackets[0], teamContext, trendContext);
  } else {
    // Batch — shared context + per-trade details
    prompt = `Analyze the following ${contextPackets.length} trade proposals for the same user. Generate a separate 5-part analysis for each.\n\n`;
    prompt += `USER'S TEAM CONTEXT (applies to all trades):\n${teamContext}\n\n`;
    prompt += `LEAGUE TRENDS (applies to all trades):\n${trendContext}\n\n`;
    prompt += '---\n\n';
    
    contextPackets.forEach((ctx, i) => {
      prompt += buildTradeBlock(ctx, i + 1);
      prompt += '\n---\n\n';
    });
    
    prompt += `Return a JSON array with ${contextPackets.length} objects, one per trade, in order.\n`;
    prompt += 'Each object has: forTradingAway, forReceiving, againstTradingAway, againstReceiving, consensus, recommendAction, confidenceLevel.\n\n';
    prompt += 'CRITICAL: Each trade\'s analysis must be UNIQUE — do not reuse phrases across trades.';
  }
  
  return prompt;
}

function buildSingleTradePrompt(ctx, teamContext, trendContext) {
  const trade = ctx.trade;
  const giveSummary = trade.give.map(a => `${a.name} (${a.position}, Age ${a.age}, ${a.nflTeam})`).join(', ');
  const getSummary = trade.get.map(a => `${a.name} (${a.position}, Age ${a.age}, ${a.nflTeam})`).join(', ');
  
  let prompt = `TRADE PROPOSAL:\nUser trades away: ${giveSummary}\nUser receives: ${getSummary}\n\n`;
  prompt += '---\n\nPLAYER CONTEXT:\n\n';
  
  for (const [name, pCtx] of Object.entries(ctx.playerContext)) {
    prompt += buildPlayerContextBlock(name, pCtx);
    prompt += '\n';
  }
  
  prompt += `---\n\nUSER'S TEAM CONTEXT:\n${teamContext}\n\n`;
  prompt += `---\n\nLEAGUE TRENDS:\n${trendContext}\n\n`;
  prompt += '---\n\n';
  
  const givePrimary = trade.give.find(a => a.type === 'player')?.name || 'your player';
  const getPrimary = trade.get.find(a => a.type === 'player')?.name || 'their player';
  
  prompt += `Write the 5-part trade analysis. Remember:\n`;
  prompt += `- "For Trading Away" argues why SELLING ${givePrimary} is smart\n`;
  prompt += `- "For Receiving" argues why BUYING ${getPrimary} is smart\n`;
  prompt += `- "Against Trading Away" argues why KEEPING ${givePrimary} is safer\n`;
  prompt += `- "Against Receiving" argues why ${getPrimary} might disappoint\n`;
  prompt += `- "Consensus" weighs everything and gives a clear TRADE or KEEP recommendation, referencing the user's specific team situation\n\n`;
  prompt += 'Each section: 2-3 sentences. Be specific. Be opinionated. Sound human.';
  
  return prompt;
}

function buildTradeBlock(ctx, tradeNum) {
  const trade = ctx.trade;
  const giveSummary = trade.give.map(a => `${a.name} (${a.position}, Age ${a.age}, ${a.nflTeam})`).join(', ');
  const getSummary = trade.get.map(a => `${a.name} (${a.position}, Age ${a.age}, ${a.nflTeam})`).join(', ');
  
  let block = `TRADE ${tradeNum}:\n`;
  block += `User trades away: ${giveSummary}\nUser receives: ${getSummary}\n\n`;
  block += 'Player Context:\n';
  
  for (const [name, pCtx] of Object.entries(ctx.playerContext)) {
    block += buildPlayerContextBlock(name, pCtx);
  }
  
  return block;
}

function buildPlayerContextBlock(name, ctx) {
  let block = `${name}:\n`;
  if (ctx.contractStatus) block += `- Contract: ${ctx.contractStatus}\n`;
  if (ctx.teamQuality) block += `- NFL Team: ${ctx.teamQuality}\n`;
  if (ctx.olineContext) block += `- O-Line: ${ctx.olineContext}\n`;
  if (ctx.coachingContext) block += `- Coaching: ${ctx.coachingContext}\n`;
  if (ctx.recentTransaction) block += `- Recent: ${ctx.recentTransaction}\n`;
  if (ctx.targetCompetition) block += `- Target Competition: ${ctx.targetCompetition}\n`;
  if (ctx.breakoutYear) block += `- Breakout Window: Entering typical breakout year for position\n`;
  if (ctx.ageClifRisk) block += `- Age Concern: Approaching age cliff for position\n`;
  if (ctx.injuryStatus && ctx.injuryStatus !== 'Active') block += `- Injury: ${ctx.injuryStatus}\n`;
  if (ctx.sellHighReason) block += `- Sell Signal: ${ctx.sellHighReason}\n`;
  if (ctx.buyLowReason) block += `- Buy Signal: ${ctx.buyLowReason}\n`;
  return block;
}

function buildTeamContextBlock(team) {
  let block = `- Strategy: ${team.strategy || 'unknown'}`;
  if (team.championshipWindow) block += ' (in championship window)';
  block += '\n';
  block += `- League rank: ${team.leagueRank || '?'} of ${team.leagueSize || 12} (${team.scoringFormat || 'PPR'}${team.superflex ? ', Superflex' : ''})\n`;
  
  if (team.depthAtGivePosition) {
    const d = team.depthAtGivePosition;
    block += `- ${d.position} depth (TRADING FROM): ${d.starters?.join(', ') || 'none'} as starters`;
    if (d.backups?.length) block += `, ${d.backups.join(', ')} behind them`;
    block += `. Grade: ${d.grade}. ${d.depthVerdict}\n`;
  }
  
  if (team.depthAtGetPosition) {
    const d = team.depthAtGetPosition;
    block += `- ${d.position} depth (TRADING FOR): ${d.starters?.join(', ') || 'none'} as starters`;
    if (d.backups?.length) block += `, ${d.backups.join(', ')} behind them`;
    block += `. Grade: ${d.grade}. ${d.depthVerdict}\n`;
  }
  
  if (team.draftPicks?.length) block += `- Draft picks: ${team.draftPicks.join(', ')}\n`;
  if (team.relevantDraftContext) block += `- Draft note: ${team.relevantDraftContext}\n`;
  
  return block;
}

function buildTrendContextBlock(trends) {
  let block = '';
  if (trends.rbVsWrMarket) block += `- ${trends.rbVsWrMarket}\n`;
  if (trends.currentMeta) block += `- ${trends.currentMeta}\n`;
  if (trends.rookieDraftStrength) block += `- ${trends.rookieDraftStrength}\n`;
  return block;
}

// ─── Response Parsing & Validation ─────────────────────────────

const REQUIRED_FIELDS = [
  'forTradingAway',
  'forReceiving',
  'againstTradingAway',
  'againstReceiving',
  'consensus',
];

function parseNarrativeResponse(text, expectedCount) {
  // Strip markdown code fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  
  const parsed = JSON.parse(cleaned);
  
  if (expectedCount === 1) {
    // Single trade — expect object
    return [parsed];
  }
  
  // Batch — expect array
  if (!Array.isArray(parsed)) {
    // Sometimes LLM wraps in { trades: [...] } or similar
    const values = Object.values(parsed);
    if (values.length === 1 && Array.isArray(values[0])) {
      return values[0];
    }
    throw new Error('Expected array response for batch generation');
  }
  
  return parsed;
}

function validateNarrative(narrative) {
  // Check all required fields exist and are strings
  for (const field of REQUIRED_FIELDS) {
    if (!narrative[field] || typeof narrative[field] !== 'string') {
      logger.warn('Missing narrative field', { field });
      return false;
    }
    // Check minimum length (at least 50 chars per section)
    if (narrative[field].length < 50) {
      logger.warn('Narrative section too short', { field, length: narrative[field].length });
      return false;
    }
    // Check maximum length (cap at 500 chars per section — ~3 sentences)
    if (narrative[field].length > 600) {
      logger.warn('Narrative section too long, truncating', { field, length: narrative[field].length });
      // Truncate to last complete sentence within 500 chars
      narrative[field] = truncateToSentence(narrative[field], 500);
    }
  }
  
  // Validate recommendAction
  if (narrative.recommendAction && !['TRADE', 'KEEP'].includes(narrative.recommendAction)) {
    narrative.recommendAction = 'KEEP'; // Default to conservative
  }
  
  // Validate confidenceLevel
  if (narrative.confidenceLevel && !['high', 'medium', 'low'].includes(narrative.confidenceLevel)) {
    narrative.confidenceLevel = 'medium';
  }
  
  return true;
}

function truncateToSentence(text, maxLen) {
  if (text.length <= maxLen) return text;
  const truncated = text.slice(0, maxLen);
  const lastPeriod = truncated.lastIndexOf('.');
  if (lastPeriod > maxLen * 0.6) {
    return truncated.slice(0, lastPeriod + 1);
  }
  return truncated + '...';
}

/**
 * Fallback narrative when LLM fails.
 * Uses the existing tradeFinderService narrative data to build a simple version.
 * Still personalized — just less polished.
 */
function buildFallbackNarrative(trade) {
  const givePrimary = trade.give?.find(a => a.type === 'player');
  const getPrimary = trade.get?.find(a => a.type === 'player');
  const giveName = givePrimary?.name || 'your player';
  const getName = getPrimary?.name || 'their player';
  const givePos = givePrimary?.position || '?';
  const getPos = getPrimary?.position || '?';
  const giveAge = givePrimary?.age || '?';
  const getAge = getPrimary?.age || '?';
  
  return {
    forTradingAway: `At ${giveAge}, ${giveName} may be approaching a value peak — selling now locks in current value. Moving from a position of depth at ${givePos} can strengthen your roster elsewhere.`,
    forReceiving: `${getName} at ${getPos} adds upside to your roster. At ${getAge}, there's runway for value growth in dynasty.`,
    againstTradingAway: `Losing ${giveName} creates a gap at ${givePos} that your backups may not fill. Consider whether your depth truly supports this move.`,
    againstReceiving: `${getName} carries risk — value projections can shift quickly, and acquiring at current price means paying for projected upside rather than proven production.`,
    consensus: `This trade has real merit on both sides. Review your ${givePos} depth chart carefully before pulling the trigger — the decision hinges on whether your backups can step up.`,
    recommendAction: 'KEEP',
    confidenceLevel: 'low',
    _isFallback: true,
  };
}

// ─── Cache Operations ──────────────────────────────────────────

function buildCacheKey(trade, myTeam) {
  const giveIds = trade.give.map(a => String(a.id)).sort();
  const getIds = trade.get.map(a => String(a.id)).sort();
  const contextHash = hashTeamContext(myTeam, { give: trade.give, get: trade.get });
  
  return {
    givePlayerIds: giveIds,
    getPlayerIds: getIds,
    teamContextHash: contextHash,
    promptVersion: CONFIG.promptVersion,
  };
}

async function getCachedNarrative(db, cacheKey) {
  try {
    const result = await db.query(
      `SELECT narrative, id FROM trade_narrative_cache 
       WHERE give_player_ids = $1 
         AND get_player_ids = $2 
         AND team_context_hash = $3
         AND prompt_version = $4
         AND expires_at > NOW()
       LIMIT 1`,
      [cacheKey.givePlayerIds, cacheKey.getPlayerIds, cacheKey.teamContextHash, cacheKey.promptVersion]
    );
    
    if (result.rows.length > 0) {
      // Update access stats (fire-and-forget)
      db.query(
        `UPDATE trade_narrative_cache 
         SET access_count = access_count + 1, last_accessed_at = NOW() 
         WHERE id = $1`,
        [result.rows[0].id]
      ).catch(() => {}); // Non-critical
      
      return result.rows[0].narrative;
    }
    
    return null;
  } catch (err) {
    logger.warn('Cache read failed', { error: err.message });
    return null;
  }
}

async function cacheNarrative(db, cacheKey, narrative, meta) {
  try {
    const expiresAt = new Date(Date.now() + CONFIG.cacheTTLDays * 24 * 60 * 60 * 1000);
    
    await db.query(
      `INSERT INTO trade_narrative_cache 
         (give_player_ids, get_player_ids, team_context_hash, narrative, 
          model_used, prompt_version, generation_ms, input_tokens, output_tokens, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (give_player_ids, get_player_ids, team_context_hash, prompt_version)
       DO UPDATE SET 
         narrative = EXCLUDED.narrative,
         model_used = EXCLUDED.model_used,
         generation_ms = EXCLUDED.generation_ms,
         input_tokens = EXCLUDED.input_tokens,
         output_tokens = EXCLUDED.output_tokens,
         expires_at = EXCLUDED.expires_at,
         created_at = NOW()`,
      [
        cacheKey.givePlayerIds, cacheKey.getPlayerIds, cacheKey.teamContextHash,
        JSON.stringify(narrative), meta.model, CONFIG.promptVersion,
        meta.generationMs || null, meta.inputTokens || 0, meta.outputTokens || 0,
        expiresAt
      ]
    );
  } catch (err) {
    logger.warn('Cache write failed', { error: err.message });
  }
}

// ─── Cost Tracking ─────────────────────────────────────────────

function estimateCost(inputTokens, outputTokens) {
  return (
    (inputTokens / 1000) * CONFIG.inputTokenCostPer1K +
    (outputTokens / 1000) * CONFIG.outputTokenCostPer1K
  );
}

async function logGenerationStats(db, total, cached, generated, inputTokens, outputTokens, cost, durationMs) {
  logger.info('Narrative generation complete', {
    total, cached, generated, inputTokens, outputTokens,
    estimatedCost: `$${cost.toFixed(4)}`,
    durationMs,
  });
  
  if (db) {
    try {
      await db.query(
        `INSERT INTO narrative_generation_log 
           (trades_requested, trades_cached, trades_generated, 
            total_input_tokens, total_output_tokens, estimated_cost_usd,
            total_duration_ms, model_used)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [total, cached, generated, inputTokens, outputTokens, cost, durationMs, CONFIG.model]
      );
    } catch (err) {
      logger.warn('Failed to log generation stats', { error: err.message });
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Cache Maintenance ─────────────────────────────────────────

/**
 * Clean up expired narratives. Run daily via cron.
 */
async function cleanExpiredCache(db) {
  try {
    const result = await db.query(
      `DELETE FROM trade_narrative_cache WHERE expires_at < NOW()`
    );
    logger.info('Cache cleanup complete', { deleted: result.rowCount });
    return result.rowCount;
  } catch (err) {
    logger.error('Cache cleanup failed', { error: err.message });
    return 0;
  }
}

/**
 * Get cost report for a time period.
 */
async function getCostReport(db, days = 30) {
  const result = await db.query(
    `SELECT 
       DATE(created_at) as date,
       SUM(trades_requested) as total_trades,
       SUM(trades_cached) as cache_hits,
       SUM(trades_generated) as llm_calls,
       SUM(estimated_cost_usd) as daily_cost,
       ROUND(AVG(total_duration_ms)) as avg_duration_ms
     FROM narrative_generation_log
     WHERE created_at > NOW() - INTERVAL '${days} days'
     GROUP BY DATE(created_at)
     ORDER BY date DESC`
  );
  
  return {
    daily: result.rows,
    totals: {
      totalCost: result.rows.reduce((s, r) => s + parseFloat(r.daily_cost), 0),
      totalTrades: result.rows.reduce((s, r) => s + parseInt(r.total_trades), 0),
      cacheHitRate: result.rows.reduce((s, r) => s + parseInt(r.cache_hits), 0) /
        Math.max(1, result.rows.reduce((s, r) => s + parseInt(r.total_trades), 0)),
    }
  };
}

module.exports = {
  generateNarratives,
  cleanExpiredCache,
  getCostReport,
  CONFIG,
  // Exported for testing
  validateNarrative,
  parseNarrativeResponse,
  buildFallbackNarrative,
  buildBatchUserPrompt,
  SYSTEM_PROMPT,
};
```

---

## 7. Integration with Trade Finder

### Injection Point

The narrative generation plugs into `tradeFinderService.js` as a **Pass 3** after the existing deep analysis (Pass 2).

```javascript
// In tradeFinderService.js — findTrades() function
// After: let trades = await deepAnalyze(topCandidates, ...)
// Before: results are cached and returned

// ── Pass 3: AI Narrative Generation ──────────────────
const narrativeService = require('./narrativeGenerationService');

// Generate AI narratives for top trades (all of them)
try {
  const narratives = await narrativeService.generateNarratives(
    trades,
    myTeam,
    enrichedTeams,
    leagueSettings,
    {
      db: options.db || null,
      playerContextData: options.playerContextData || {},
    }
  );
  
  // Attach narratives to trade results
  for (const trade of trades) {
    const aiNarrative = narratives.get(trade.id);
    if (aiNarrative) {
      trade.aiAnalysis = {
        forTradingAway: aiNarrative.forTradingAway,
        forReceiving: aiNarrative.forReceiving,
        againstTradingAway: aiNarrative.againstTradingAway,
        againstReceiving: aiNarrative.againstReceiving,
        consensus: aiNarrative.consensus,
        recommendAction: aiNarrative.recommendAction,
        confidenceLevel: aiNarrative.confidenceLevel,
        isFallback: aiNarrative._isFallback || false,
      };
    }
  }
} catch (err) {
  logger.error('AI narrative generation failed — trades returned without narratives', {
    error: err.message
  });
  // Trades still return — just without aiAnalysis field
  // Frontend handles missing aiAnalysis gracefully
}
```

### Updated Trade Response Shape

```javascript
// Each trade in the response now includes:
{
  id: 'tf_1710801234_abc123',
  opponent: { /* ... */ },
  give: [ /* ... */ ],
  get: [ /* ... */ ],
  scores: { overall, fairness, myImprovement, acceptance, dynastyOutlook },
  impact: { lineupChange, rankChange, winsChange, primaryBenefit },
  
  // EXISTING: Template-based narrative (kept for backward compat)
  narrative: {
    headline: 'Upgrade: Get Rome Odunze (WR) for Travis Etienne',
    whyGoodForYou: ['...'],
    whyTheyAccept: ['...'],
    keyRisk: '...',
    tldr: '...'
  },
  
  // NEW: AI-generated 5-part analysis
  aiAnalysis: {
    forTradingAway: 'Even though he just signed a top dollar RB contract...',
    forReceiving: 'The upside with Odunze is there...',
    againstTradingAway: 'Your team doesn\'t have much depth behind him...',
    againstReceiving: 'While the upside is there, Odunze is still unproven...',
    consensus: 'Keep Etienne this year...',
    recommendAction: 'KEEP',
    confidenceLevel: 'high',
    isFallback: false,
  },
  
  positionalUpgrade: { /* ... */ },
  coachingTip: '...',
  // ... rest of existing fields
}
```

---

## 8. Frontend Integration

### New Component: `TradeAIAnalysis`

The 5-part narrative displays as an expandable section within the existing Trade Insights modal.

```
┌─────────────────────────────────────────────────────────────┐
│  🧠 Expert Analysis                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  FOR TRADING AWAY ETIENNE                          ▾       │
│  ──────────────────────────────────────────────────          │
│  Even though he just signed a top dollar RB contract,       │
│  he's 27 on a good not great team. The Saints run           │
│  blocking was second to last in the league last year.       │
│  Additionally, RBs usually hit a cliff around this time,    │
│  and so longevity is limited.                               │
│                                                             │
│  FOR RECEIVING ODUNZE                              ▾       │
│  ──────────────────────────────────────────────────          │
│  The upside with Odunze is there. Coming into his 3rd       │
│  year as a high first round pick, DJ Moore was just         │
│  traded to Buffalo, leaving Odunze, Burden and Loveland     │
│  as the top receiving options...                            │
│                                                             │
│  AGAINST TRADING AWAY ETIENNE                      ▸       │
│  (tap to expand)                                            │
│                                                             │
│  AGAINST RECEIVING ODUNZE                          ▸       │
│  (tap to expand)                                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  💡 CONSENSUS                                       │    │
│  │  Keep Etienne this year. The pendulum has swung so  │    │
│  │  far in the direction of WRs, that RBs have now     │    │
│  │  become the new coveted position group...            │    │
│  │                                                     │    │
│  │  Recommendation: KEEP  |  Confidence: High          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Display Rules

| Section | Default State | Styling |
|---------|--------------|---------|
| For Trading Away | **Expanded** | Green left border — bullish on selling |
| For Receiving | **Expanded** | Green left border — bullish on buying |
| Against Trading Away | **Collapsed** | Amber left border — caution |
| Against Receiving | **Collapsed** | Amber left border — caution |
| Consensus | **Always expanded** | Blue card with emphasis — hero conclusion |

### Why Collapse the "Against" Sections?

1. **Progressive disclosure** — Most users want the positive case first
2. **Reduces cognitive overload** — 5 paragraphs at once is too much
3. **"Against" sections are the trust builders** — users who expand them are more engaged and more likely to act
4. **Matches the 3-2-1 hierarchy** from the Trade Insights modal spec: glance → scan → explore

### Mobile Layout

On mobile (<768px), all 5 sections stack vertically in a single column:

```
┌─────────────────────────────────┐
│  🧠 Expert Analysis             │
├─────────────────────────────────┤
│  FOR TRADING AWAY ETIENNE    ▾  │
│  [expanded content]             │
├─────────────────────────────────┤
│  FOR RECEIVING ODUNZE        ▾  │
│  [expanded content]             │
├─────────────────────────────────┤
│  AGAINST TRADING AWAY        ▸  │
├─────────────────────────────────┤
│  AGAINST RECEIVING           ▸  │
├─────────────────────────────────┤
│  💡 CONSENSUS                   │
│  [always expanded, blue card]   │
│  KEEP  |  High Confidence       │
└─────────────────────────────────┘
```

---

## 9. Caching Strategy

### Cache Layers

```
Layer 1: In-Memory LRU (per-process)
├── Key: tradeId (within current findTrades session)
├── TTL: Duration of request
├── Purpose: Avoid duplicate work within single request
│
Layer 2: Database Cache (PostgreSQL)
├── Key: give_player_ids + get_player_ids + team_context_hash + prompt_version
├── TTL: 7 days
├── Purpose: Cross-user, cross-session narrative reuse
│
Layer 3: Redis (Future — Phase 2)
├── Key: Same as Layer 2
├── TTL: 24 hours (hot cache)
├── Purpose: Sub-10ms reads for popular trades
```

### What Invalidates Cache?

| Event | Invalidation Scope |
|-------|--------------------|
| User makes a roster move | `team_context_hash` changes → cache miss (new narrative) |
| Prompt version bump | All cached narratives expire (new `prompt_version`) |
| Player NFL transaction | `player_narrative_context` updates → context changes → new hash |
| 7 days pass | TTL expiration |
| Coach/scheme change | Context pipeline updates player row → downstream hash change |

### Cache Hit Rate Projections

| Scenario | Expected Hit Rate | Why |
|----------|------------------|-----|
| Same user, same day, same roster | ~95% | Context hash unchanged |
| Same user, after roster move | 0% | Context hash changed |
| Different user, same trade pair | ~60% | Different team context |
| After prompt version bump | 0% | All invalidated |
| Week 1 (cold start) | ~10% | Building cache |
| Steady state (week 4+) | ~50-65% | Popular player pairs cached |

### Cost Impact of Caching

| Cache Hit Rate | Monthly Cost (1K daily users × 20 trades) | Savings |
|---------------|-------------------------------------------|---------|
| 0% (no cache) | ~$9,000 | Baseline |
| 30% | ~$6,300 | 30% |
| 50% | ~$4,500 | 50% |
| 65% | ~$3,150 | 65% |
| 80% | ~$1,800 | 80% |

**Target: 50-65% cache hit rate → $3K-$5K/month**

---

## 10. Cost Analysis

### Per-Request Breakdown

```
Single trade narrative (Claude Sonnet):
  Input:  ~1,200 tokens (system prompt + context packet)
  Output: ~600 tokens (5 sections × ~120 tokens each)
  Cost:   $0.003/1K input + $0.015/1K output
        = $0.0036 + $0.009 = $0.0126 per trade

Batch of 5 trades (Claude Sonnet):
  Input:  ~3,500 tokens (shared context + 5 trade blocks)
  Output: ~3,000 tokens (5 × 600)
  Cost:   $0.0105 + $0.045 = $0.0555 per batch ($0.0111 per trade)
  Savings: 12% vs individual calls (shared system prompt + team context)
```

### Monthly Projections

| Scale | Trades/Day | Cache Hit | LLM Calls/Day | Daily Cost | Monthly Cost |
|-------|-----------|-----------|---------------|------------|-------------|
| Launch (100 users) | 2,000 | 30% | 1,400 | $15.54 | $466 |
| Growth (500 users) | 10,000 | 50% | 5,000 | $55.50 | $1,665 |
| Scale (1,000 users) | 20,000 | 60% | 8,000 | $88.80 | $2,664 |
| Peak (2,000 users) | 40,000 | 65% | 14,000 | $155.40 | $4,662 |

**Well within the $5-10K/month ceiling at all projected scales.**

### Cost Optimization Levers

1. **Batch aggressively** — 5 trades per call saves 12% on input tokens
2. **Cache aggressively** — 65% hit rate cuts costs by 65%
3. **Model selection** — Claude Sonnet ($0.013/trade) vs GPT-4o-mini ($0.003/trade) for lower tiers
4. **Prompt compression** — Minimize context for players with sparse data
5. **Tiered generation** — Top 5 trades get full context, trades 6-20 get lighter context
6. **Output token limit** — Hard cap at 150 tokens/section prevents runaway costs

---

## 11. Performance Architecture

### Latency Budget

```
findTrades() total latency budget: 5-8 seconds

Current (without narratives):
  Pass 1 (candidate generation):  ~500ms
  Pass 2 (deep analysis):         ~2,000ms
  Total:                          ~2,500ms

With narratives:
  Pass 1:                         ~500ms
  Pass 2:                         ~2,000ms
  Pass 3 (narrative generation):  ~2,500ms (async, overlapped)
  Total:                          ~5,000ms (narratives generated in parallel with response prep)
```

### Async Strategy: Generate-Then-Hydrate

For the best UX, narratives are generated **asynchronously** after the initial Trade Finder response:

```
Request comes in
    │
    ├── Pass 1 + Pass 2 (existing) → Return trades immediately
    │                                 (without aiAnalysis field)
    │
    └── Pass 3: Narrative generation starts in background
         │
         ├── Check cache → instant for hits
         ├── Batch LLM calls for misses → 2-3 sec
         └── Results available via polling endpoint
              │
              └── GET /api/trade-finder/:requestId/narratives
                  Returns: { tradeId → aiAnalysis } map
```

### New Endpoint: `GET /api/trade-finder/:requestId/narratives`

```javascript
// Polling endpoint — frontend calls this after initial trade results load
router.get('/api/trade-finder/:requestId/narratives', async (req, res) => {
  const { requestId } = req.params;
  
  // Check if narratives are ready
  const narratives = narrativeCache.get(requestId);
  
  if (!narratives) {
    return res.status(202).json({ 
      status: 'generating',
      message: 'AI analysis in progress...',
      retryAfterMs: 1000,
    });
  }
  
  return res.json({
    status: 'complete',
    narratives, // Map of tradeId → aiAnalysis
  });
});
```

### Frontend Polling UX

```
1. Trade Finder results load immediately (2.5 sec)
   - All scores, rankings, existing narratives visible
   - "Expert Analysis" section shows shimmer/skeleton

2. Frontend polls /narratives endpoint every 1 second
   - First poll (1 sec later): likely 202 "generating"
   - Second poll (2 sec later): likely 200 with results (cache hits)
   - Third poll (3 sec later): remaining results arrive

3. Narratives fade in as they arrive
   - Each trade card's "Expert Analysis" section populates
   - Smooth height animation as content appears
   - No layout shift — skeleton reserves the space
```

---

## 12. Data Pipeline

### Daily Update Job: Player Narrative Context

```
Schedule: 8:00 AM ET daily (before peak usage)
Runtime: ~5-10 minutes
Source: Sleeper API (primary) + manual curation

Flow:
  1. Fetch /players/nfl from Sleeper (bulk, no rate limit)
  2. For each rostered player (across all active leagues):
     a. Update injury_status, nfl_team, position
     b. Derive age_cliff_risk from position + age
     c. Derive breakout_year from position + years_exp
     d. Update target_competition from depth chart data
  3. Apply manual overrides from player_narrative_context
     (coaching changes, recent transactions, team quality)
  4. Log update stats to context_update_log
```

### Manual Curation Workflow

Some context requires human curation (or a secondary LLM pass):

| Data Point | Automation Level | Update Frequency |
|-----------|-----------------|------------------|
| Age, position, NFL team | Fully automated (Sleeper) | Daily |
| Injury status | Fully automated (Sleeper) | Daily |
| Age cliff / breakout | Fully automated (rules) | Daily |
| Contract status | Semi-auto (derive from Sleeper years_exp) | Weekly |
| Team quality | Manual or LLM-curated | Weekly |
| O-line ranking | Manual (from TeamRankings) | Post-season |
| Coaching context | Manual or LLM-curated (from news) | As needed |
| Recent transactions | Semi-auto (Sleeper transactions API) | Daily |
| Target competition | Manual or LLM-curated | Weekly |
| Market trends | Manual or LLM-curated | Weekly |

### LLM-Assisted Curation (Phase 2)

For fields that need human-quality judgment (team quality, coaching context, target competition), run a weekly LLM batch:

```
Weekly Pipeline (Sunday 6 AM ET):
  1. Fetch top 200 dynasty-relevant players
  2. For each: gather latest news, depth charts, transaction data
  3. Send batch to LLM: "Update these player context fields based on current NFL news"
  4. Write updates to player_narrative_context
  5. Invalidate affected narrative caches

Cost: ~$5-10/week (200 players × short prompt)
```

---

## 13. Testing Strategy

### Unit Tests

```javascript
// src/services/__tests__/narrativeGenerationService.test.js

describe('narrativeGenerationService', () => {
  describe('validateNarrative', () => {
    it('accepts valid 5-part narrative', () => { /* ... */ });
    it('rejects narrative with missing fields', () => { /* ... */ });
    it('rejects narrative with sections < 50 chars', () => { /* ... */ });
    it('truncates sections > 500 chars to last sentence', () => { /* ... */ });
    it('defaults recommendAction to KEEP if invalid', () => { /* ... */ });
  });
  
  describe('parseNarrativeResponse', () => {
    it('parses single JSON object', () => { /* ... */ });
    it('parses JSON array for batch', () => { /* ... */ });
    it('strips markdown code fences', () => { /* ... */ });
    it('handles wrapped { trades: [...] } format', () => { /* ... */ });
    it('throws on invalid JSON', () => { /* ... */ });
  });
  
  describe('buildFallbackNarrative', () => {
    it('generates valid 5-part fallback from trade data', () => { /* ... */ });
    it('sets isFallback flag', () => { /* ... */ });
    it('handles missing player data gracefully', () => { /* ... */ });
  });
  
  describe('buildBatchUserPrompt', () => {
    it('builds single-trade prompt for 1 context packet', () => { /* ... */ });
    it('builds batch prompt for 5 context packets', () => { /* ... */ });
    it('includes all player context fields when present', () => { /* ... */ });
    it('omits null/missing context fields', () => { /* ... */ });
  });
});

// src/services/__tests__/narrativeContextService.test.js

describe('narrativeContextService', () => {
  describe('buildContextPacket', () => {
    it('assembles complete context from trade + team data', () => { /* ... */ });
    it('handles multi-player trades', () => { /* ... */ });
    it('includes draft pick context', () => { /* ... */ });
  });
  
  describe('isAgeClifRisk', () => {
    it('flags RBs 27+', () => { /* ... */ });
    it('flags WRs 30+', () => { /* ... */ });
    it('does not flag young players', () => { /* ... */ });
  });
  
  describe('isBreakoutYear', () => {
    it('flags Year 3 WRs', () => { /* ... */ });
    it('flags Year 3 TEs', () => { /* ... */ });
    it('flags Year 2 QBs', () => { /* ... */ });
  });
  
  describe('hashTeamContext', () => {
    it('produces same hash for same context', () => { /* ... */ });
    it('produces different hash when roster changes', () => { /* ... */ });
  });
});
```

### Integration Tests

```javascript
describe('Narrative Integration', () => {
  it('generates narratives for real trade data and validates all 5 sections', async () => {
    // Uses mock LLM client that returns realistic JSON
  });
  
  it('handles LLM failure gracefully with fallback narratives', async () => {
    // LLM throws → every trade still has aiAnalysis (with _isFallback: true)
  });
  
  it('caches narratives and serves from cache on second call', async () => {
    // Call 1: generates (cache miss)
    // Call 2: same trade + context → cache hit
  });
  
  it('invalidates cache when team context changes', async () => {
    // Call 1: generates
    // Modify roster → different context hash
    // Call 2: cache miss → regenerates
  });
});
```

### Quality Evaluation

Monthly manual review of 20 random narratives scored on:

| Criterion | Weight | Pass Threshold |
|-----------|--------|---------------|
| Factual accuracy | 30% | All facts correct |
| Natural language (not robotic) | 25% | 8/10 rating |
| Personalization (mentions user's team) | 20% | References roster/picks/window |
| Balance (not one-sided) | 15% | Both sides represented fairly |
| Actionable consensus | 10% | Clear TRADE/KEEP with reasoning |

**Target: 85%+ average score across all criteria.**

---

## 14. Implementation Timeline

### Week 1: Foundation (12-15 hours)
- [ ] Database migration (trade_narrative_cache, narrative_generation_log, player_narrative_context)
- [ ] `narrativeContextService.js` — context packet assembly
- [ ] `narrativeGenerationService.js` — core generation + caching + validation
- [ ] Unit tests for both services
- [ ] Environment setup (ANTHROPIC_API_KEY, NARRATIVE_MODEL)

### Week 2: Integration + Prompt Tuning (10-12 hours)
- [ ] Integrate Pass 3 into `tradeFinderService.js`
- [ ] Build async polling endpoint
- [ ] Prompt engineering iteration (run 50 test trades, evaluate output)
- [ ] Tune temperature, max_tokens, batch size
- [ ] Integration tests

### Week 3: Data Pipeline + Frontend (8-10 hours)
- [ ] Daily Sleeper data pipeline for player_narrative_context
- [ ] Manual curation workflow (admin script to update player context)
- [ ] Frontend `TradeAIAnalysis` component
- [ ] Expand/collapse behavior, styling, mobile layout
- [ ] Loading states (shimmer skeleton)

### Week 4: Polish + Launch (5-8 hours)
- [ ] Cost monitoring dashboard (daily cost, cache hit rate)
- [ ] Cache cleanup cron job
- [ ] Quality evaluation (manual review of 20 narratives)
- [ ] Performance testing at scale (simulate 100 concurrent users)
- [ ] Launch behind feature flag → gradual rollout

**Total: ~35-45 hours**

---

## 15. Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| LLM API downtime | Medium | HIGH | Fallback narratives (still personalized, just shorter). Trades work without narratives. |
| Cost overrun | Low | Medium | Daily cost alerts. Auto-disable if >$500/day. Cache aggressively. |
| Low quality output | Medium | HIGH | Prompt version iteration. Monthly quality reviews. A/B test different models. |
| Hallucinated facts | Medium | HIGH | Context packet provides ALL facts — LLM shouldn't need to make anything up. Validation checks for known-bad patterns. |
| Slow response time | Low | Medium | Async generation. Frontend shows trades immediately, narratives stream in. |
| Cache bloat | Low | Low | 7-day TTL + daily cleanup cron. Estimated max: ~50K rows (~5MB). |
| Prompt injection via player names | Low | Medium | `sanitizeName()` already strips HTML/special chars. Context packet uses cleaned data. |

---

## 16. Success Metrics

| Metric | Target | How Measured |
|--------|--------|-------------|
| Narrative quality (human eval) | 8+/10 average | Monthly review of 20 random narratives |
| User engagement with narratives | >40% expand "Against" sections | Frontend analytics |
| Cost per user per month | <$5 | narrative_generation_log aggregation |
| Cache hit rate | >50% | narrative_generation_log |
| Latency (narrative available) | <5 sec from trade results | Frontend timing |
| Zero hallucinated facts | 100% accuracy on verifiable claims | Monthly audit |
| "This analysis is helpful" | >70% positive | In-app feedback button |

---

## Appendix A: Model Selection

| Model | Quality | Cost/Trade | Latency | Recommendation |
|-------|---------|-----------|---------|----------------|
| Claude Opus | 10/10 | $0.075 | 5-8 sec | Too expensive + slow for every trade |
| **Claude Sonnet** | **8.5/10** | **$0.013** | **2-3 sec** | **Primary — best quality/cost ratio** |
| Claude Haiku | 6/10 | $0.001 | 0.5 sec | Too generic — sounds robotic |
| GPT-4o | 8/10 | $0.015 | 2-4 sec | Backup model if Claude is down |
| GPT-4o-mini | 6.5/10 | $0.003 | 1-2 sec | Future: lower tiers or non-premium users |

**Decision: Claude Sonnet (primary) with GPT-4o (fallback).**

Sonnet hits the quality bar — narratives sound human, use specific facts, and maintain the opinionated tone Taylor wants. Haiku and 4o-mini produce output that sounds too generic. Opus is overkill for 2-3 sentence sections.

---

## Appendix B: Draft Pick Handling in Narratives

When trades include draft picks, the narrative must address them naturally:

**User trading away a 1st round pick:**
> "You're giving up the 1.05 in a loaded 2026 WR class — that's a real asset. But if your window is now, draft picks are lottery tickets you can't start."

**User receiving a 1st round pick:**
> "Adding a 2027 1st gives you future ammunition. If your rebuild is on track, this pick could be the centerpiece of a package deal next year."

The context packet includes draft pick data, and the prompt instructs the LLM to reference them when relevant.

---

_Architecture designed for best-in-class trade analysis. No templates. No shortcuts. Every narrative written fresh by AI with full context._
