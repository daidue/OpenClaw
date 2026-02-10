# Scanner Architecture

Multi-strategy Polymarket scanner design for detecting trading opportunities.

## Strategy Types

### 1. NegRisk Multi-Outcome Arbitrage
**Signal:** Sum of all outcome prices < $0.98 in markets with 3+ outcomes.

```python
# For each NegRisk market (neg_risk=true on Gamma API):
total_cost = sum(best_ask for each outcome)
if total_cost < 0.98:
    profit = (1.0 - total_cost) * num_shares
```

- 73% of all Polymarket arbitrage ($29M) comes from NegRisk
- 29× more capital efficient than binary arbitrage
- Requires simultaneous execution across all outcomes
- Use PuLP/OR-Tools for optimal subset arbitrage

### 2. News-Driven Opportunities
**Signal:** Breaking news not yet reflected in market prices (15-60 min window).

```
News detected → Extract entities → Match to markets → AI assesses impact → Trade if delta > threshold
```

- Monitor: Brave Search API (1 req/s), RSS feeds, Twitter
- AI prompt: "Given [news], what's the new fair probability for [market]? Current: X%"
- Best for: political markets, economic data releases
- Rate limit AI calls to ~100 assessments/hour

### 3. Cross-Market Correlation
**Signal:** Logically linked markets with contradictory pricing.

```
If P(A) implies P(B), but market has P(A) > P(B) → arbitrage
Example: "Trump wins election" at 55% but "Trump wins primary" at 52% → buy primary
```

- Build correlation graph with networkx
- Use category + keyword overlap for automated matching
- AI-assisted discovery for new correlation pairs
- Scan every 15 minutes

### 4. New Market Detection
**Signal:** Markets < 24h old with thin liquidity and wide spreads.

```python
if market.created_at > now - 24h and market.volume < 10_000:
    ai_fair_price = assess_with_ai(market)
    if abs(ai_fair_price - market.price) > 0.15:
        flag_opportunity(market)
```

- Liquidity thresholds: volume < $10K = "thin", spread > 10¢ = "inefficient"
- AI base-rate analysis catches overconfident early traders

### 5. AI Probability Analysis
**Signal:** Market price diverges >20% from AI-assessed fair probability.

- Gather: market question, current price, recent news, historical data
- Ensemble approach: multiple models, average predictions
- Calibrate over time: track AI predictions vs outcomes
- Run hourly on top 20 markets, weekly full scan

## Data Schema (SQLite)

```sql
CREATE TABLE markets (
    market_id TEXT PRIMARY KEY,
    condition_id TEXT, question TEXT, market_type TEXT,
    first_seen TEXT, last_updated TEXT, volume REAL,
    liquidity_score REAL, active BOOLEAN
);

CREATE TABLE opportunities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    strategy TEXT,  -- 'negrisk_arb', 'news_driven', 'cross_market', 'new_market', 'ai_probability'
    market_ids TEXT,  -- JSON array
    description TEXT, expected_profit REAL, capital_required REAL,
    roi REAL, confidence TEXT, created_at TEXT, expires_at TEXT, status TEXT
);

CREATE TABLE ai_assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    market_id TEXT, market_question TEXT, current_price REAL,
    ai_fair_price REAL, divergence REAL, confidence TEXT,
    reasoning TEXT, timestamp TEXT, model_used TEXT
);

CREATE TABLE news_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT, headline TEXT, url TEXT, summary TEXT,
    related_markets TEXT, impact_score REAL, processed BOOLEAN
);
```

## Scheduling

| Task | Frequency | Purpose |
|------|-----------|---------|
| NegRisk scan | 5 min | Multi-outcome arbitrage |
| New market check | 5 min | Fresh markets |
| News monitoring | 5 min | Event detection |
| Cross-market | 15 min | Correlation violations |
| AI bulk assessment | 1 hour | Fundamental mispricing |
| Correlation discovery | Weekly | New market relationships |

## Project Structure

```
scanner/
├── core/
│   ├── database.py          # SQLite wrapper with upsert, query helpers
│   ├── api_client.py        # Polymarket CLOB + Gamma client (async, rate-limited)
│   └── models.py            # Market, Opportunity, AIAssessment dataclasses
├── strategies/
│   ├── base_strategy.py     # Abstract: scan(markets) → List[Opportunity]
│   ├── negrisk_arb.py       # Sum-of-outcomes < threshold
│   ├── cross_market.py      # Correlation graph + price consistency
│   ├── news_driven.py       # News → AI → opportunity pipeline
│   └── ai_probability.py    # Fundamental mispricing detection
├── services/
│   ├── news_monitor.py      # Brave Search polling + entity extraction
│   ├── ai_assessor.py       # OpenClaw/LLM integration for probability assessment
│   └── correlation_builder.py
└── scanners/
    └── orchestrator.py      # APScheduler-based main loop
```

## API Client Pattern

```python
class PolymarketAPIClient:
    CLOB_BASE = "https://clob.polymarket.com"
    GAMMA_BASE = "https://gamma-api.polymarket.com"
    
    async def get_markets(self, limit=100, offset=0) -> List[Dict]:
        """CLOB API - paginated, filter closed markets"""
    
    async def get_orderbook(self, token_id: str) -> Dict:
        """Returns {bids: [{price, size}], asks: [{price, size}]}"""
    
    async def get_negrisk_markets(self) -> List[Dict]:
        """Gamma API with neg_risk=true filter"""
    
    # Rate limit: exponential backoff on 429, ~5 req/s safe
    # Cache market list (5 min TTL), fetch orderbooks on demand
```

## Market Compression Timeline

| Period | Spread Levels | Action |
|--------|--------------|--------|
| Now (2026) | 10-15¢ flagship | Maximum extraction window |
| +6 months | 3-5¢ flagship | 50-70% degradation |
| +12 months | 0.5-2¢ | Retail extinct on major markets |

ICE's $2B investment signals institutional HFT entry. Deploy aggressively before compression.
