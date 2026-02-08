# Polymarket Arbitrage Scanner v2 — Architecture Design

**Author:** Bolt (dev agent)  
**Date:** 2026-02-08  
**Status:** Design Phase  
**Current Code:** `~/polymarket-arb/`

---

## 1. Executive Summary

The current scanner only detects YES+NO sum arbitrage (when combined price < $0.98), which **rarely occurs** on liquid markets. This redesign implements 5 distinct strategies with AI integration, news monitoring, and multi-outcome support.

**Key Improvements:**
- ✅ Cross-market correlation detection
- ✅ News-driven opportunity spotting
- ✅ NegRisk multi-outcome arbitrage
- ✅ New/illiquid market monitoring
- ✅ AI probability assessment
- ✅ Event-driven architecture (not just polling)

---

## 2. Multi-Strategy Scanner Design

### Strategy 1: Cross-Market Arbitrage
**Goal:** Find correlated markets with pricing gaps

**How it works:**
1. Build a correlation graph of markets (e.g., "Will X win presidency?" correlates with "Will Y be VP?")
2. Track price divergences between logically linked outcomes
3. Flag when prices imply contradictory probabilities

**Example:**
```
Market A: "Will Biden win 2024?" → YES @ 65¢
Market B: "Will a Democrat win 2024?" → YES @ 60¢

❌ Logical error: Biden is a Democrat, so A→B implies P(B) ≥ P(A)
✅ Arbitrage: Buy B @ 60¢, sell A @ 65¢ (5¢ guaranteed if Biden wins)
```

**Implementation:**
- Use `networkx` to build market relationship graphs
- Store correlation pairs in SQLite: `market_correlations(market_a, market_b, relationship_type, confidence)`
- AI agent analyzes market pairs weekly to discover new correlations
- Scanner checks price consistency in real-time

**Challenges:**
- Requires deep market understanding (AI-assisted)
- Correlation changes over time (events can shift relationships)
- Complex to execute (may need multiple positions)

---

### Strategy 2: News-Driven Opportunities
**Goal:** Detect mispricing caused by breaking news that market hasn't priced in yet

**How it works:**
1. Monitor news feeds (Brave Search API, RSS) for events related to active markets
2. When breaking news drops, immediately check market prices
3. Use AI to assess: "Given this news, should the price be X or Y?"
4. Flag markets that haven't adjusted yet (arbitrage window: 1-30 minutes)

**Example:**
```
10:00 AM: Breaking news: "Major celebrity endorses Candidate X"
10:01 AM: Scanner checks "Will Candidate X win?" market → still at 45¢
10:02 AM: AI assessment: "This news is +8% favorable, price should be ~53¢"
10:03 AM: ✅ Alert: Buy opportunity before market reprices
```

**Implementation:**
- **News Sources:**
  - Brave Search API (search for market keywords every 5 min)
  - Twitter/X API (track relevant accounts) — requires setup
  - RSS feeds (Polymarket blog, major news outlets)
  
- **Trigger Flow:**
  ```
  News event detected → Extract entities/keywords → Match to active markets
  → AI analyzes impact → Compare to current price → Flag if delta > threshold
  ```

- **AI Integration:**
  - Use OpenClaw `exec` tool to spawn a reasoning agent
  - Agent prompt: "Given [news summary] about [market question], what's the new fair probability? Current market: X%. Provide: new_probability, confidence, reasoning"
  - Store in `news_events` table with timestamp, impact score

**Rate Limits:**
- Brave Search: 1 req/sec (60/min)
- Strategy: Batch 5-10 markets per search query

---

### Strategy 3: NegRisk Multi-Outcome Mispricing
**Goal:** Exploit markets with 3+ outcomes where probabilities don't sum to 100%

**How it works:**
1. Fetch NegRisk markets (multiple mutually exclusive outcomes)
2. Sum the best ask prices for ALL outcomes
3. If sum < $0.98, buy all outcomes (guaranteed profit)
4. **Advanced:** Detect partial arbitrage (e.g., outcomes A+B+C sum to 105%, but A+B sum to 95%)

**Example:**
```
Market: "Who will win the election?" (4 candidates)
- Candidate A: 35¢
- Candidate B: 30¢
- Candidate C: 25¢
- Candidate D: 8¢
Total: 98¢ → Buy all for 98¢, guaranteed $1.00 payout = 2¢ profit

Advanced:
If A+B+C = 95¢, and one MUST win → Arbitrage exists even without D
```

**Implementation:**
- Gamma API provides NegRisk markets: `/markets?neg_risk=true`
- For each market with >2 outcomes:
  - Fetch all orderbooks
  - Calculate sum of best asks
  - Check if sum < threshold (0.98)
  - **Bonus:** Use constraint solver (PuLP/OR-Tools) to find optimal subset arbitrage

**Data Structure:**
```python
{
  'market_id': 'abc123',
  'question': 'Who wins?',
  'outcomes': [
    {'name': 'A', 'token_id': 'x1', 'best_ask': 0.35},
    {'name': 'B', 'token_id': 'x2', 'best_ask': 0.30},
    ...
  ],
  'total_cost': 0.98,
  'strategy': 'negrisk_full' | 'negrisk_partial'
}
```

---

### Strategy 4: New Market Detection
**Goal:** Catch mispricing in newly created markets with thin liquidity

**How it works:**
1. Poll Gamma API every 5 minutes for newly created markets
2. Check liquidity (total volume, order book depth)
3. Flag markets with < $10K volume or wide spreads
4. AI assesses: "Is this price reasonable given base rates?"

**Why it works:**
- New markets = fewer participants = less efficient pricing
- Early traders often overshoot (overconfident)
- Low liquidity = wide spreads (25¢ bid vs 35¢ ask on a 30% event)

**Example:**
```
New market: "Will [obscure bill] pass Congress by March?"
- Current price: 70¢ YES
- AI assessment: "Historical pass rate for similar bills: 22%"
- ✅ Sell opportunity: Market is overpriced by ~48%
```

**Implementation:**
- Store last-seen market IDs in SQLite: `market_registry(market_id, first_seen, volume, last_checked)`
- On each scan:
  ```python
  new_markets = [m for m in all_markets if m.id not in registry]
  for market in new_markets:
      if market.volume < THIN_LIQUIDITY_THRESHOLD:
          ai_score = assess_fair_price(market)
          if abs(ai_score - market.price) > 0.15:  # 15% gap
              flag_opportunity(market)
  ```

**Liquidity Metrics:**
- Total volume < $10K = "thin"
- Spread > 10¢ = "inefficient"
- Order book depth < 100 shares at best bid/ask = "risky"

---

### Strategy 5: AI Probability Analysis
**Goal:** Use AI reasoning to identify fundamentally mispriced markets

**How it works:**
1. For each market, gather context:
   - Market question
   - Current price
   - Recent news (from Strategy 2)
   - Historical data (if available)
2. Prompt AI: "What's the fair probability for this event?"
3. Compare AI assessment to market price
4. Flag large divergences (>20%)

**Example:**
```
Market: "Will temperature exceed 100°F in NYC on July 15?"
- Current price: 45¢ (45% probability)
- AI reasoning:
  * Historical data: NYC hits 100°F on avg 0.8 days/year
  * July 15 is peak summer
  * Climate models predict cooler than avg summer
  * Fair probability: ~8%
- ✅ Sell opportunity: Market overpriced by 37%
```

**Implementation:**

**Lightweight Version (MVP):**
```python
async def ai_assess_market(market_question: str, current_price: float, news_context: str = ""):
    prompt = f"""
    Market Question: {market_question}
    Current Market Price: ${current_price:.2f} ({current_price*100:.0f}% implied probability)
    
    Recent News: {news_context or "None"}
    
    Task: Estimate the fair probability of this event occurring.
    Provide:
    1. fair_probability (0.0 to 1.0)
    2. confidence (low/medium/high)
    3. key_factors (bullet points)
    4. mispricing_severity (none/minor/moderate/severe)
    
    Output as JSON.
    """
    
    # Use OpenClaw to spawn reasoning agent
    result = subprocess.run(
        ['openclaw', 'agent', 'ask', '--json', prompt],
        capture_output=True, text=True
    )
    
    return json.loads(result.stdout)
```

**Full Version:**
- Integrate Perplexity API for real-time web research
- Build historical database of market outcomes vs AI predictions (calibration)
- Use ensemble of models (GPT-4, Claude, Gemini) and average predictions
- Weight by model track record on similar questions

**When to run:**
- **Hourly:** Top 20 markets by volume
- **On-trigger:** New markets, news events, large price movements
- **Weekly:** Full scan of all active markets (identify slow-moving mispricings)

**Data Storage:**
```sql
CREATE TABLE ai_assessments (
    id INTEGER PRIMARY KEY,
    market_id TEXT,
    market_question TEXT,
    current_price REAL,
    ai_fair_price REAL,
    confidence TEXT,
    reasoning TEXT,
    timestamp TEXT,
    model_used TEXT,
    news_context TEXT
);
```

---

## 3. Technical Architecture

### 3.1 API Integration

#### Polymarket APIs

**CLOB API** (`clob.polymarket.com`)
- **Purpose:** Order books, trades, market data
- **Endpoints:**
  - `GET /markets` — List markets (paginated)
  - `GET /book?token_id=X` — Orderbook for token
  - `GET /trades?market=X` — Recent trades
- **Rate Limits:** ~10 req/sec (undocumented, observed)
- **Strategy:** 
  - Cache market list (refresh every 5 min)
  - Batch orderbook requests (max 5 concurrent)
  - Use exponential backoff on 429 errors

**Gamma API** (`gamma-api.polymarket.com`)
- **Purpose:** Market metadata, NegRisk markets, volume stats
- **Endpoints:**
  - `GET /markets` — All markets with metadata
  - `GET /markets?neg_risk=true` — NegRisk markets only
  - `GET /events` — Grouped markets by event
- **Rate Limits:** ~5 req/sec
- **Strategy:** 
  - Use for market discovery + metadata
  - Use CLOB API for real-time pricing

#### News & Data APIs

**Brave Search API**
- **Purpose:** News monitoring for Strategy 2
- **Rate Limit:** 1 req/sec, 2K req/month (free tier)
- **Usage Pattern:**
  ```python
  # Every 5 minutes:
  for market in top_50_markets:
      keywords = extract_keywords(market.question)
      results = brave_search(keywords, freshness='pd')  # past day
      new_articles = filter_by_timestamp(results, last_scan_time)
      if new_articles:
          trigger_ai_assessment(market, new_articles)
  ```

**Perplexity API** (optional, for deep AI analysis)
- **Purpose:** Real-time web research for AI assessments
- **Rate Limit:** 50 req/min (paid)
- **Usage:** Only for high-confidence opportunities (pre-filter with local AI)

**Twitter/X API** (future enhancement)
- **Purpose:** Real-time event detection
- **Rate Limit:** Complex (varies by tier)
- **Setup Needed:** Developer account, bearer token

---

### 3.2 Data Storage

**Extend SQLite** (keep existing `paper_trades.csv` + `paper_summary.json` for now)

**New Tables:**

```sql
-- Market registry (dedupe, track first-seen)
CREATE TABLE markets (
    market_id TEXT PRIMARY KEY,
    condition_id TEXT,
    question TEXT,
    market_type TEXT,  -- 'binary', 'negrisk', 'scalar'
    first_seen TEXT,
    last_updated TEXT,
    volume REAL,
    liquidity_score REAL,
    active BOOLEAN
);

-- Cross-market correlations (Strategy 1)
CREATE TABLE market_correlations (
    id INTEGER PRIMARY KEY,
    market_a TEXT,
    market_b TEXT,
    relationship_type TEXT,  -- 'implies', 'mutually_exclusive', 'correlated'
    confidence REAL,  -- 0.0 to 1.0
    discovered_date TEXT,
    verified BOOLEAN,
    FOREIGN KEY (market_a) REFERENCES markets(market_id),
    FOREIGN KEY (market_b) REFERENCES markets(market_id)
);

-- News events (Strategy 2)
CREATE TABLE news_events (
    id INTEGER PRIMARY KEY,
    timestamp TEXT,
    headline TEXT,
    url TEXT,
    summary TEXT,
    related_markets TEXT,  -- JSON array of market IDs
    impact_score REAL,  -- -1.0 to 1.0 (negative = bearish, positive = bullish)
    processed BOOLEAN
);

-- AI assessments (Strategy 5)
CREATE TABLE ai_assessments (
    id INTEGER PRIMARY KEY,
    market_id TEXT,
    market_question TEXT,
    current_price REAL,
    ai_fair_price REAL,
    divergence REAL,  -- abs(current - fair)
    confidence TEXT,  -- 'low', 'medium', 'high'
    reasoning TEXT,
    news_context TEXT,
    timestamp TEXT,
    model_used TEXT,
    FOREIGN KEY (market_id) REFERENCES markets(market_id)
);

-- Opportunities (unified across all strategies)
CREATE TABLE opportunities (
    id INTEGER PRIMARY KEY,
    strategy TEXT,  -- 'cross_market', 'news_driven', 'negrisk', 'new_market', 'ai_probability'
    market_ids TEXT,  -- JSON array (multiple markets for cross-market arb)
    description TEXT,
    expected_profit REAL,
    capital_required REAL,
    roi REAL,
    confidence TEXT,
    created_at TEXT,
    expires_at TEXT,  -- opportunities decay (esp. news-driven)
    status TEXT,  -- 'active', 'executed', 'expired', 'invalid'
    execution_notes TEXT
);

-- Historical performance (calibration)
CREATE TABLE strategy_performance (
    id INTEGER PRIMARY KEY,
    strategy TEXT,
    date TEXT,
    opportunities_found INTEGER,
    opportunities_executed INTEGER,
    total_profit REAL,
    avg_roi REAL,
    win_rate REAL
);
```

**Why SQLite?**
- ✅ Embedded (no separate DB server)
- ✅ ACID transactions (safe concurrent access)
- ✅ Good enough for <1M rows
- ✅ Easy backups (single file)

**When to upgrade to PostgreSQL:**
- >100K markets tracked
- Need full-text search on news
- Multiple concurrent scanners

---

### 3.3 AI Integration via OpenClaw

**Architecture:**

```
Main Scanner (Python)
    ↓
    Spawns OpenClaw Agent (subprocess)
    ↓
    Agent reasoning + web search
    ↓
    Returns JSON result
    ↓
    Scanner stores in DB + flags opportunity
```

**Implementation Options:**

**Option 1: CLI Invocation (Simplest)**
```python
import subprocess
import json

def ai_assess_market(question: str, price: float, context: str = "") -> dict:
    prompt = f"""
    Polymarket Question: {question}
    Current Price: ${price:.2f}
    Context: {context}
    
    Assess the fair probability. Return JSON:
    {{
      "fair_price": 0.0-1.0,
      "confidence": "low|medium|high",
      "reasoning": "...",
      "mispricing": "none|minor|moderate|severe"
    }}
    """
    
    result = subprocess.run(
        ['openclaw', 'agent', 'ask', '--output', 'json', prompt],
        capture_output=True,
        text=True,
        timeout=30
    )
    
    return json.loads(result.stdout)
```

**Option 2: HTTP API (Future)**
- Run OpenClaw gateway as service
- POST requests to `http://localhost:8080/agent/invoke`
- Supports streaming, session persistence

**Option 3: Embedded Agent (Advanced)**
- Import OpenClaw SDK directly
- Run agents in-process
- Requires TypeScript/Node bridge or Python bindings

**For MVP: Use Option 1** (CLI invocation)

**Rate Limiting AI Calls:**
- Max 100 AI assessments/hour (cost control)
- Prioritize:
  1. News-triggered assessments (real-time)
  2. New markets (illiquid)
  3. High-volume markets (hourly)
  4. Full scan (weekly)

---

### 3.4 Cron Scheduling

**What runs when:**

| Task | Frequency | Trigger Type | Implementation |
|------|-----------|--------------|----------------|
| **Scan binary arbitrage** | Every 1 min | Cron | `scanner_binary.py` |
| **Scan NegRisk** | Every 5 min | Cron | `scanner_negrisk.py` |
| **Check new markets** | Every 5 min | Cron | `scanner_new_markets.py` |
| **News monitoring** | Every 5 min | Cron | `news_monitor.py` |
| **Cross-market analysis** | Every 15 min | Cron | `scanner_cross_market.py` |
| **AI bulk assessment** | Every 1 hour | Cron | `ai_bulk_assessor.py` |
| **News event processing** | Immediate | Event-driven | Triggered by `news_monitor.py` |
| **Correlation discovery** | Weekly | Cron | `correlation_builder.py` |
| **Performance report** | Daily | Cron | `generate_report.py` |

**Cron Setup** (`crontab -e`):
```bash
# Polymarket Scanner v2
*/1 * * * * cd ~/polymarket-arb && python scanner_binary.py >> logs/binary.log 2>&1
*/5 * * * * cd ~/polymarket-arb && python scanner_negrisk.py >> logs/negrisk.log 2>&1
*/5 * * * * cd ~/polymarket-arb && python scanner_new_markets.py >> logs/new.log 2>&1
*/5 * * * * cd ~/polymarket-arb && python news_monitor.py >> logs/news.log 2>&1
*/15 * * * * cd ~/polymarket-arb && python scanner_cross_market.py >> logs/cross.log 2>&1
0 * * * * cd ~/polymarket-arb && python ai_bulk_assessor.py >> logs/ai.log 2>&1
0 2 * * * cd ~/polymarket-arb && python generate_report.py >> logs/report.log 2>&1
0 3 * * 0 cd ~/polymarket-arb && python correlation_builder.py >> logs/correlation.log 2>&1
```

**Alternative: Single Orchestrator**
```python
# scanner_orchestrator.py
import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()

scheduler.add_job(scan_binary, 'interval', minutes=1)
scheduler.add_job(scan_negrisk, 'interval', minutes=5)
scheduler.add_job(news_monitor, 'interval', minutes=5)
# ... etc

scheduler.start()
asyncio.get_event_loop().run_forever()
```

---

## 4. Implementation Plan

### 4.1 What We Can Build in a Day (MVP)

**Goal:** Working multi-strategy scanner that beats current version

**Deliverables:**
1. ✅ **Strategy 3 (NegRisk)** — easiest to implement, clear arbitrage signal
2. ✅ **Strategy 4 (New Markets)** — simple liquidity filtering
3. ✅ **Unified opportunity logger** — extends paper trading tracker
4. ✅ **SQLite schema** — markets + opportunities tables

**Code to write:**
- `scanner_negrisk.py` (~150 lines)
- `scanner_new_markets.py` (~100 lines)
- `database.py` — SQLite wrapper (~200 lines)
- `opportunity_tracker.py` — extends paper trading (~100 lines)

**Testing:**
- Run against live API
- Verify NegRisk sum calculation
- Check new market detection (manual verification)

**End-of-day metric:** Scanner finds 2-5 NegRisk opportunities daily (even if small profit)

---

### 4.2 What We Can Build in a Week

**Goal:** Add AI assessment + news monitoring

**Deliverables:**
1. ✅ **Strategy 5 (AI Probability)** — OpenClaw integration
2. ✅ **Strategy 2 (News Monitoring)** — Brave Search integration
3. ✅ **News → AI → Opportunity pipeline**
4. ✅ **Cron orchestrator** — APScheduler
5. ✅ **Dashboard** — Simple web UI to view opportunities

**New code:**
- `ai_assessor.py` — OpenClaw wrapper (~150 lines)
- `news_monitor.py` — Brave Search polling (~200 lines)
- `news_processor.py` — Match news to markets (~150 lines)
- `orchestrator.py` — APScheduler setup (~100 lines)
- `dashboard.py` — Flask/FastAPI UI (~300 lines)

**AI Integration:**
```python
# ai_assessor.py
def assess_market_with_ai(market: dict, news_context: str = "") -> dict:
    """Use OpenClaw to assess market pricing"""
    prompt = build_assessment_prompt(market, news_context)
    result = call_openclaw_agent(prompt)
    
    assessment = {
        'market_id': market['id'],
        'current_price': market['price'],
        'ai_fair_price': result['fair_price'],
        'divergence': abs(market['price'] - result['fair_price']),
        'confidence': result['confidence'],
        'reasoning': result['reasoning']
    }
    
    db.save_assessment(assessment)
    
    if assessment['divergence'] > 0.15 and result['confidence'] == 'high':
        opportunity_tracker.log_opportunity(
            strategy='ai_probability',
            market=market,
            assessment=assessment
        )
    
    return assessment
```

**End-of-week metric:** 
- AI assesses 100+ markets/day
- News monitor finds 5-10 relevant articles/day
- Dashboard shows all opportunities in one place

---

### 4.3 What We Can Build in a Month

**Goal:** Full production system with cross-market arbitrage

**Deliverables:**
1. ✅ **Strategy 1 (Cross-Market)** — Correlation graph + arbitrage detection
2. ✅ **Backtesting framework** — Test strategies on historical data
3. ✅ **Auto-execution** — Paper trading → real trades (with human approval)
4. ✅ **Monitoring & alerts** — Telegram notifications, performance dashboard
5. ✅ **Calibration system** — Track AI prediction accuracy over time

**Advanced features:**
- **Correlation Discovery:**
  ```python
  # correlation_builder.py
  def discover_correlations():
      markets = db.get_all_active_markets()
      
      # Use AI to find relationships
      for i, market_a in enumerate(markets):
          for market_b in markets[i+1:]:
              if potentially_related(market_a, market_b):
                  relationship = ai_analyze_relationship(market_a, market_b)
                  if relationship['confidence'] > 0.7:
                      db.save_correlation(market_a, market_b, relationship)
  
  def detect_cross_market_arbitrage():
      correlations = db.get_verified_correlations()
      
      for corr in correlations:
          price_a = get_current_price(corr.market_a)
          price_b = get_current_price(corr.market_b)
          
          if corr.relationship == 'implies':
              # If A implies B, then P(A) <= P(B)
              if price_a > price_b + 0.05:  # 5% threshold
                  flag_arbitrage(corr, price_a, price_b)
  ```

- **Backtesting:**
  ```python
  # backtester.py
  def backtest_strategy(strategy_name: str, start_date: str, end_date: str):
      """Simulate strategy performance on historical data"""
      historical_markets = load_historical_data(start_date, end_date)
      portfolio = Portfolio(initial_capital=10000)
      
      for timestamp, market_state in historical_markets:
          opportunities = strategy.scan(market_state)
          for opp in opportunities:
              portfolio.execute(opp)
          
          # Fast-forward to resolution
          portfolio.resolve_expired_positions(timestamp)
      
      return portfolio.get_performance_metrics()
  ```

**End-of-month deliverables:**
- Fully automated scanner running 24/7
- Telegram alerts for high-confidence opportunities
- Weekly performance reports
- Backtested ROI estimates for each strategy

---

## 5. Python Libraries Needed

**Core:**
```bash
pip install aiohttp requests  # HTTP clients
pip install asyncio apscheduler  # Async + scheduling
pip install sqlite3  # Built-in, but explicit
pip install pandas numpy  # Data analysis
```

**News & Search:**
```bash
pip install feedparser  # RSS parsing
pip install newspaper3k  # Article extraction
pip install beautifulsoup4 lxml  # Web scraping
```

**AI & ML:**
```bash
# No external ML libs needed — use OpenClaw for AI
# Optional: sentence-transformers (for text similarity)
pip install sentence-transformers
```

**Graph Analysis (for correlations):**
```bash
pip install networkx matplotlib  # Graph algorithms + visualization
```

**Optimization (for NegRisk subset arbitrage):**
```bash
pip install pulp  # Linear programming
```

**Dashboard:**
```bash
pip install flask  # Simple web UI
pip install jinja2  # Templating
# OR: pip install fastapi uvicorn  # Modern async API
```

**Testing:**
```bash
pip install pytest pytest-asyncio  # Testing framework
pip install responses  # Mock HTTP requests
```

**Full `requirements.txt`:**
```
aiohttp==3.9.1
requests==2.31.0
apscheduler==3.10.4
pandas==2.1.4
numpy==1.26.2
feedparser==6.0.10
newspaper3k==0.2.8
beautifulsoup4==4.12.2
lxml==5.1.0
networkx==3.2.1
matplotlib==3.8.2
pulp==2.7.0
flask==3.0.0
jinja2==3.1.2
pytest==7.4.3
pytest-asyncio==0.21.1
responses==0.24.1
```

---

## 6. Code Skeleton

### 6.1 Project Structure

```
~/polymarket-arb/
├── config/
│   ├── __init__.py
│   ├── settings.py          # API keys, thresholds
│   └── strategies.yaml      # Strategy configs
├── core/
│   ├── __init__.py
│   ├── database.py          # SQLite wrapper
│   ├── api_client.py        # Polymarket API client
│   ├── models.py            # Data models (Market, Opportunity, etc.)
│   └── opportunity_tracker.py
├── strategies/
│   ├── __init__.py
│   ├── base_strategy.py     # Abstract base class
│   ├── binary_arb.py        # Original YES+NO strategy
│   ├── negrisk_arb.py       # Multi-outcome arbitrage
│   ├── cross_market.py      # Correlation-based
│   ├── news_driven.py       # Event-driven
│   └── ai_probability.py    # AI assessment
├── services/
│   ├── __init__.py
│   ├── news_monitor.py      # Brave Search integration
│   ├── ai_assessor.py       # OpenClaw integration
│   └── correlation_builder.py
├── scanners/
│   ├── __init__.py
│   ├── orchestrator.py      # Main scheduler
│   ├── binary_scanner.py
│   ├── negrisk_scanner.py
│   ├── new_market_scanner.py
│   └── cross_market_scanner.py
├── dashboard/
│   ├── app.py               # Flask/FastAPI app
│   ├── templates/
│   └── static/
├── scripts/
│   ├── backtest.py
│   ├── generate_report.py
│   └── seed_correlations.py
├── tests/
│   ├── test_strategies.py
│   ├── test_api_client.py
│   └── fixtures/
├── logs/
├── data/
│   └── scanner.db           # SQLite database
├── requirements.txt
├── README.md
└── scanner_wrapper.py       # Legacy (keep for reference)
```

---

### 6.2 Core Components

#### `core/database.py`

```python
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import List, Dict, Optional
import json

class Database:
    def __init__(self, db_path: str = "data/scanner.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(exist_ok=True)
        self._init_schema()
    
    @contextmanager
    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row  # Access columns by name
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
    
    def _init_schema(self):
        """Create tables if they don't exist"""
        with self.get_connection() as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS markets (
                    market_id TEXT PRIMARY KEY,
                    condition_id TEXT,
                    question TEXT,
                    market_type TEXT,
                    first_seen TEXT,
                    last_updated TEXT,
                    volume REAL,
                    liquidity_score REAL,
                    active BOOLEAN
                );
                
                CREATE TABLE IF NOT EXISTS opportunities (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    strategy TEXT,
                    market_ids TEXT,  -- JSON array
                    description TEXT,
                    expected_profit REAL,
                    capital_required REAL,
                    roi REAL,
                    confidence TEXT,
                    created_at TEXT,
                    expires_at TEXT,
                    status TEXT,
                    execution_notes TEXT
                );
                
                CREATE TABLE IF NOT EXISTS ai_assessments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    market_id TEXT,
                    market_question TEXT,
                    current_price REAL,
                    ai_fair_price REAL,
                    divergence REAL,
                    confidence TEXT,
                    reasoning TEXT,
                    news_context TEXT,
                    timestamp TEXT,
                    model_used TEXT
                );
                
                CREATE TABLE IF NOT EXISTS news_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT,
                    headline TEXT,
                    url TEXT,
                    summary TEXT,
                    related_markets TEXT,  -- JSON array
                    impact_score REAL,
                    processed BOOLEAN
                );
                
                CREATE TABLE IF NOT EXISTS market_correlations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    market_a TEXT,
                    market_b TEXT,
                    relationship_type TEXT,
                    confidence REAL,
                    discovered_date TEXT,
                    verified BOOLEAN
                );
                
                CREATE INDEX IF NOT EXISTS idx_opportunities_strategy ON opportunities(strategy);
                CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
                CREATE INDEX IF NOT EXISTS idx_news_processed ON news_events(processed);
            """)
    
    # Market operations
    def upsert_market(self, market: Dict):
        """Insert or update market"""
        with self.get_connection() as conn:
            conn.execute("""
                INSERT INTO markets (market_id, condition_id, question, market_type, 
                                   first_seen, last_updated, volume, liquidity_score, active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(market_id) DO UPDATE SET
                    last_updated = excluded.last_updated,
                    volume = excluded.volume,
                    liquidity_score = excluded.liquidity_score,
                    active = excluded.active
            """, (
                market['market_id'],
                market.get('condition_id'),
                market['question'],
                market['market_type'],
                market.get('first_seen'),
                market['last_updated'],
                market.get('volume', 0),
                market.get('liquidity_score', 0),
                market.get('active', True)
            ))
    
    def get_new_markets(self, since_hours: int = 24) -> List[Dict]:
        """Get markets created in the last N hours"""
        with self.get_connection() as conn:
            cursor = conn.execute("""
                SELECT * FROM markets 
                WHERE datetime(first_seen) > datetime('now', '-{} hours')
                AND active = 1
                ORDER BY first_seen DESC
            """.format(since_hours))
            return [dict(row) for row in cursor.fetchall()]
    
    # Opportunity operations
    def save_opportunity(self, opp: Dict) -> int:
        """Save a new opportunity, return ID"""
        with self.get_connection() as conn:
            cursor = conn.execute("""
                INSERT INTO opportunities (strategy, market_ids, description, 
                                         expected_profit, capital_required, roi,
                                         confidence, created_at, expires_at, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                opp['strategy'],
                json.dumps(opp['market_ids']),
                opp['description'],
                opp['expected_profit'],
                opp['capital_required'],
                opp['roi'],
                opp.get('confidence', 'medium'),
                opp['created_at'],
                opp.get('expires_at'),
                opp.get('status', 'active')
            ))
            return cursor.lastrowid
    
    def get_active_opportunities(self, strategy: Optional[str] = None) -> List[Dict]:
        """Get all active opportunities, optionally filtered by strategy"""
        with self.get_connection() as conn:
            if strategy:
                cursor = conn.execute(
                    "SELECT * FROM opportunities WHERE status = 'active' AND strategy = ? "
                    "ORDER BY created_at DESC",
                    (strategy,)
                )
            else:
                cursor = conn.execute(
                    "SELECT * FROM opportunities WHERE status = 'active' "
                    "ORDER BY created_at DESC"
                )
            
            opportunities = []
            for row in cursor.fetchall():
                opp = dict(row)
                opp['market_ids'] = json.loads(opp['market_ids'])
                opportunities.append(opp)
            return opportunities
    
    # AI assessment operations
    def save_ai_assessment(self, assessment: Dict):
        """Save AI assessment of a market"""
        with self.get_connection() as conn:
            conn.execute("""
                INSERT INTO ai_assessments (market_id, market_question, current_price,
                                           ai_fair_price, divergence, confidence,
                                           reasoning, news_context, timestamp, model_used)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                assessment['market_id'],
                assessment['market_question'],
                assessment['current_price'],
                assessment['ai_fair_price'],
                assessment['divergence'],
                assessment['confidence'],
                assessment['reasoning'],
                assessment.get('news_context', ''),
                assessment['timestamp'],
                assessment.get('model_used', 'claude-sonnet-4-5')
            ))
    
    # News operations
    def save_news_event(self, news: Dict):
        """Save a news event"""
        with self.get_connection() as conn:
            conn.execute("""
                INSERT INTO news_events (timestamp, headline, url, summary,
                                       related_markets, impact_score, processed)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                news['timestamp'],
                news['headline'],
                news['url'],
                news.get('summary', ''),
                json.dumps(news.get('related_markets', [])),
                news.get('impact_score', 0.0),
                news.get('processed', False)
            ))
    
    def get_unprocessed_news(self) -> List[Dict]:
        """Get news events that haven't been processed yet"""
        with self.get_connection() as conn:
            cursor = conn.execute(
                "SELECT * FROM news_events WHERE processed = 0 ORDER BY timestamp DESC"
            )
            events = []
            for row in cursor.fetchall():
                event = dict(row)
                event['related_markets'] = json.loads(event['related_markets'])
                events.append(event)
            return events
```

---

#### `core/api_client.py`

```python
import aiohttp
import asyncio
from typing import List, Dict, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class PolymarketAPIClient:
    """Unified client for Polymarket CLOB and Gamma APIs"""
    
    CLOB_BASE = "https://clob.polymarket.com"
    GAMMA_BASE = "https://gamma-api.polymarket.com"
    
    def __init__(self, rate_limit_per_sec: float = 5.0):
        self.rate_limit = rate_limit_per_sec
        self._last_request_time = 0
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def _rate_limit_wait(self):
        """Ensure we don't exceed rate limit"""
        now = asyncio.get_event_loop().time()
        time_since_last = now - self._last_request_time
        min_interval = 1.0 / self.rate_limit
        
        if time_since_last < min_interval:
            await asyncio.sleep(min_interval - time_since_last)
        
        self._last_request_time = asyncio.get_event_loop().time()
    
    async def _get(self, url: str, params: Dict = None) -> Optional[Dict]:
        """Rate-limited GET request"""
        await self._rate_limit_wait()
        
        try:
            async with self.session.get(url, params=params, timeout=15) as resp:
                if resp.status == 200:
                    return await resp.json()
                elif resp.status == 429:
                    logger.warning("Rate limited, backing off...")
                    await asyncio.sleep(5)
                    return await self._get(url, params)  # Retry
                else:
                    logger.error(f"API error: {resp.status} for {url}")
                    return None
        except Exception as e:
            logger.error(f"Request failed: {e}")
            return None
    
    # CLOB API methods
    async def get_markets(self, limit: int = 100, offset: int = 0) -> List[Dict]:
        """Fetch markets from CLOB API"""
        url = f"{self.CLOB_BASE}/markets"
        data = await self._get(url, {'limit': limit, 'offset': offset})
        
        if data and isinstance(data, dict):
            markets = data.get('data', [])
            # Filter out closed markets
            return [m for m in markets if not m.get('closed')]
        return []
    
    async def get_orderbook(self, token_id: str) -> Optional[Dict]:
        """Fetch orderbook for a specific token"""
        url = f"{self.CLOB_BASE}/book"
        return await self._get(url, {'token_id': token_id})
    
    async def get_trades(self, market_id: str, limit: int = 100) -> List[Dict]:
        """Fetch recent trades for a market"""
        url = f"{self.CLOB_BASE}/trades"
        data = await self._get(url, {'market': market_id, 'limit': limit})
        return data if data else []
    
    # Gamma API methods
    async def get_gamma_markets(self, limit: int = 100, closed: bool = False) -> List[Dict]:
        """Fetch markets from Gamma API (richer metadata)"""
        url = f"{self.GAMMA_BASE}/markets"
        params = {'limit': limit, 'closed': 'true' if closed else 'false'}
        return await self._get(url, params) or []
    
    async def get_negrisk_markets(self) -> List[Dict]:
        """Fetch NegRisk markets (multi-outcome)"""
        url = f"{self.GAMMA_BASE}/markets"
        data = await self._get(url, {'neg_risk': 'true'})
        return data if data else []
    
    async def get_market_metadata(self, market_id: str) -> Optional[Dict]:
        """Get detailed metadata for a specific market"""
        url = f"{self.GAMMA_BASE}/markets/{market_id}"
        return await self._get(url)
    
    # Utility methods
    def parse_best_prices(self, orderbook: Dict) -> tuple[Optional[float], Optional[float]]:
        """Extract best bid and ask from orderbook"""
        if not orderbook:
            return None, None
        
        try:
            bids = orderbook.get('bids', [])
            asks = orderbook.get('asks', [])
            
            best_bid = float(bids[0]['price']) if bids else None
            best_ask = float(asks[0]['price']) if asks else None
            
            return best_bid, best_ask
        except (KeyError, IndexError, ValueError):
            return None, None
    
    def calculate_liquidity_score(self, orderbook: Dict) -> float:
        """Calculate liquidity score (0-1) based on order book depth"""
        if not orderbook:
            return 0.0
        
        try:
            bids = orderbook.get('bids', [])
            asks = orderbook.get('asks', [])
            
            # Sum size of top 5 orders on each side
            bid_depth = sum(float(b.get('size', 0)) for b in bids[:5])
            ask_depth = sum(float(a.get('size', 0)) for a in asks[:5])
            
            total_depth = bid_depth + ask_depth
            
            # Normalize (100 shares = 0.5, 1000+ shares = 1.0)
            return min(1.0, total_depth / 1000)
        except:
            return 0.0
```

---

#### `core/models.py`

```python
from dataclasses import dataclass, field
from typing import List, Optional
from datetime import datetime
from enum import Enum

class MarketType(Enum):
    BINARY = "binary"
    NEGRISK = "negrisk"
    SCALAR = "scalar"

class StrategyType(Enum):
    BINARY_ARB = "binary_arb"
    NEGRISK_ARB = "negrisk_arb"
    CROSS_MARKET = "cross_market"
    NEWS_DRIVEN = "news_driven"
    AI_PROBABILITY = "ai_probability"
    NEW_MARKET = "new_market"

@dataclass
class Market:
    market_id: str
    question: str
    market_type: MarketType
    tokens: List[Dict] = field(default_factory=list)
    volume: float = 0.0
    liquidity_score: float = 0.0
    active: bool = True
    first_seen: Optional[datetime] = None
    last_updated: Optional[datetime] = None
    
    @classmethod
    def from_api_response(cls, data: Dict) -> 'Market':
        """Create Market from API response"""
        tokens = data.get('tokens', [])
        market_type = MarketType.NEGRISK if len(tokens) > 2 else MarketType.BINARY
        
        return cls(
            market_id=data.get('condition_id') or data.get('id'),
            question=data.get('question', 'Unknown'),
            market_type=market_type,
            tokens=tokens,
            volume=float(data.get('volume', 0)),
            active=not data.get('closed', False)
        )

@dataclass
class Opportunity:
    strategy: StrategyType
    market_ids: List[str]
    description: str
    expected_profit: float
    capital_required: float
    roi: float
    confidence: str = "medium"  # low, medium, high
    created_at: datetime = field(default_factory=datetime.now)
    expires_at: Optional[datetime] = None
    status: str = "active"  # active, executed, expired, invalid
    metadata: Dict = field(default_factory=dict)
    
    def to_dict(self) -> Dict:
        return {
            'strategy': self.strategy.value,
            'market_ids': self.market_ids,
            'description': self.description,
            'expected_profit': self.expected_profit,
            'capital_required': self.capital_required,
            'roi': self.roi,
            'confidence': self.confidence,
            'created_at': self.created_at.isoformat(),
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'status': self.status,
            **self.metadata
        }

@dataclass
class AIAssessment:
    market_id: str
    market_question: str
    current_price: float
    ai_fair_price: float
    confidence: str  # low, medium, high
    reasoning: str
    divergence: float = field(init=False)
    timestamp: datetime = field(default_factory=datetime.now)
    news_context: str = ""
    model_used: str = "claude-sonnet-4-5"
    
    def __post_init__(self):
        self.divergence = abs(self.current_price - self.ai_fair_price)
    
    def is_significant_mispricing(self, threshold: float = 0.15) -> bool:
        """Check if mispricing is significant enough to act on"""
        return self.divergence > threshold and self.confidence == "high"
```

---

#### `strategies/base_strategy.py`

```python
from abc import ABC, abstractmethod
from typing import List
from core.models import Opportunity, Market

class BaseStrategy(ABC):
    """Abstract base class for all arbitrage strategies"""
    
    def __init__(self, api_client, database, config: Dict = None):
        self.api = api_client
        self.db = database
        self.config = config or {}
    
    @abstractmethod
    async def scan(self, markets: List[Market]) -> List[Opportunity]:
        """Scan markets and return opportunities"""
        pass
    
    @abstractmethod
    def get_strategy_name(self) -> str:
        """Return strategy identifier"""
        pass
    
    def log_opportunity(self, opportunity: Opportunity):
        """Log opportunity to database"""
        self.db.save_opportunity(opportunity.to_dict())
        print(f"✅ Opportunity found: {opportunity.description}")
        print(f"   Expected profit: ${opportunity.expected_profit:.2f} ({opportunity.roi:.1f}% ROI)")
```

---

#### `strategies/negrisk_arb.py`

```python
from typing import List
from datetime import datetime, timedelta
from core.models import Opportunity, Market, StrategyType
from strategies.base_strategy import BaseStrategy

class NegRiskArbitrageStrategy(BaseStrategy):
    """Detect multi-outcome markets where sum of prices < $1.00"""
    
    def get_strategy_name(self) -> str:
        return "negrisk_arb"
    
    async def scan(self, markets: List[Market]) -> List[Opportunity]:
        """Scan for NegRisk arbitrage opportunities"""
        opportunities = []
        
        # Filter for multi-outcome markets
        negrisk_markets = [m for m in markets if len(m.tokens) > 2]
        
        print(f"Scanning {len(negrisk_markets)} NegRisk markets...")
        
        for market in negrisk_markets:
            opp = await self._check_market(market)
            if opp:
                opportunities.append(opp)
                self.log_opportunity(opp)
        
        return opportunities
    
    async def _check_market(self, market: Market) -> Optional[Opportunity]:
        """Check a single NegRisk market for arbitrage"""
        threshold = self.config.get('negrisk_threshold', 0.98)
        
        # Fetch orderbooks for all outcomes
        outcome_prices = []
        
        for token in market.tokens:
            orderbook = await self.api.get_orderbook(token['token_id'])
            _, ask = self.api.parse_best_prices(orderbook)
            
            if ask is None:
                return None  # Missing price data
            
            outcome_prices.append({
                'name': token.get('outcome', 'Unknown'),
                'token_id': token['token_id'],
                'price': ask
            })
        
        # Calculate total cost to buy all outcomes
        total_cost = sum(p['price'] for p in outcome_prices)
        
        if total_cost < threshold:
            spread = 1.0 - total_cost
            capital = total_cost * 100  # 100 shares
            profit = spread * 100
            roi = (profit / capital) * 100
            
            return Opportunity(
                strategy=StrategyType.NEGRISK_ARB,
                market_ids=[market.market_id],
                description=f"NegRisk: {market.question[:60]}...",
                expected_profit=profit,
                capital_required=capital,
                roi=roi,
                confidence="high",  # NegRisk arb is deterministic
                expires_at=datetime.now() + timedelta(hours=1),
                metadata={
                    'total_cost': total_cost,
                    'spread': spread,
                    'num_outcomes': len(outcome_prices),
                    'outcome_prices': outcome_prices
                }
            )
        
        return None
```

---

#### `services/ai_assessor.py`

```python
import subprocess
import json
from typing import Dict, Optional
from datetime import datetime
import logging
from core.models import AIAssessment

logger = logging.getLogger(__name__)

class AIAssessor:
    """Use OpenClaw agents to assess market probabilities"""
    
    def __init__(self, model: str = "claude-sonnet-4-5"):
        self.model = model
    
    async def assess_market(self, 
                          market_question: str,
                          current_price: float,
                          news_context: str = "") -> Optional[AIAssessment]:
        """Assess a market using AI reasoning"""
        
        prompt = self._build_prompt(market_question, current_price, news_context)
        
        try:
            # Call OpenClaw agent via CLI
            result = subprocess.run(
                ['openclaw', 'agent', 'ask', '--output', 'json', prompt],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode != 0:
                logger.error(f"OpenClaw agent failed: {result.stderr}")
                return None
            
            # Parse JSON response
            response = json.loads(result.stdout)
            
            return AIAssessment(
                market_id="",  # Will be set by caller
                market_question=market_question,
                current_price=current_price,
                ai_fair_price=response['fair_price'],
                confidence=response['confidence'],
                reasoning=response['reasoning'],
                news_context=news_context,
                model_used=self.model
            )
        
        except subprocess.TimeoutExpired:
            logger.error("AI assessment timed out")
            return None
        except json.JSONDecodeError:
            logger.error(f"Failed to parse AI response: {result.stdout}")
            return None
        except Exception as e:
            logger.error(f"AI assessment error: {e}")
            return None
    
    def _build_prompt(self, question: str, current_price: float, news_context: str) -> str:
        """Build the assessment prompt"""
        
        prompt = f"""You are a probability assessment expert analyzing a Polymarket prediction market.

**Market Question:** {question}

**Current Market Price:** ${current_price:.2f} ({current_price * 100:.0f}% implied probability)

"""
        
        if news_context:
            prompt += f"""**Recent News Context:**
{news_context}

"""
        
        prompt += """**Your Task:**
Assess the fair probability of this event occurring based on:
1. Base rates and historical precedent
2. Current available information
3. The news context (if provided)

**Output Format (JSON):**
```json
{
  "fair_price": <float 0.0-1.0>,
  "confidence": "<low|medium|high>",
  "reasoning": "<your analysis in 2-3 sentences>",
  "key_factors": ["<factor 1>", "<factor 2>", ...]
}
```

Be calibrated and conservative. If you're uncertain, say so.
"""
        
        return prompt
```

---

#### `services/news_monitor.py`

```python
import aiohttp
import asyncio
from typing import List, Dict
from datetime import datetime, timedelta
import logging
from core.database import Database

logger = logging.getLogger(__name__)

class NewsMonitor:
    """Monitor news sources for market-relevant events"""
    
    def __init__(self, database: Database, brave_api_key: str):
        self.db = database
        self.api_key = brave_api_key
        self.base_url = "https://api.search.brave.com/res/v1/web/search"
        self.last_scan_time = {}  # market_id -> last scan timestamp
    
    async def monitor_markets(self, markets: List[Dict]):
        """Monitor news for a list of markets"""
        
        print(f"Monitoring news for {len(markets)} markets...")
        
        async with aiohttp.ClientSession() as session:
            tasks = [self._check_market_news(session, market) for market in markets]
            results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out errors
        news_events = [r for r in results if r and not isinstance(r, Exception)]
        
        print(f"Found {len(news_events)} news events")
        
        # Save to database
        for event in news_events:
            self.db.save_news_event(event)
        
        return news_events
    
    async def _check_market_news(self, session: aiohttp.ClientSession, market: Dict) -> Optional[Dict]:
        """Check for news related to a specific market"""
        
        market_id = market['market_id']
        question = market['question']
        
        # Rate limit: don't scan same market more than once per 5 minutes
        last_scan = self.last_scan_time.get(market_id)
        if last_scan and (datetime.now() - last_scan) < timedelta(minutes=5):
            return None
        
        # Extract keywords from question
        keywords = self._extract_keywords(question)
        
        # Search for recent news
        params = {
            'q': keywords,
            'count': 5,
            'freshness': 'pd',  # past day
            'text_format': 'plain'
        }
        
        headers = {
            'Accept': 'application/json',
            'X-Subscription-Token': self.api_key
        }
        
        try:
            await asyncio.sleep(1)  # Rate limit: 1 req/sec
            
            async with session.get(self.base_url, params=params, headers=headers) as resp:
                if resp.status != 200:
                    logger.warning(f"Brave API error {resp.status} for market {market_id}")
                    return None
                
                data = await resp.json()
                results = data.get('web', {}).get('results', [])
                
                if not results:
                    return None
                
                # Get the most recent article
                article = results[0]
                
                # Check if we've seen this URL before
                # (TODO: implement deduplication)
                
                news_event = {
                    'timestamp': datetime.now().isoformat(),
                    'headline': article.get('title', 'No title'),
                    'url': article.get('url', ''),
                    'summary': article.get('description', ''),
                    'related_markets': [market_id],
                    'impact_score': 0.0,  # Will be assessed by AI
                    'processed': False
                }
                
                self.last_scan_time[market_id] = datetime.now()
                
                return news_event
        
        except Exception as e:
            logger.error(f"Error fetching news for {market_id}: {e}")
            return None
    
    def _extract_keywords(self, question: str) -> str:
        """Extract search keywords from market question"""
        # Simple version: remove common words
        stop_words = {'will', 'be', 'the', 'a', 'an', 'in', 'on', 'at', 'by', 'for'}
        
        words = question.lower().replace('?', '').split()
        keywords = [w for w in words if w not in stop_words]
        
        return ' '.join(keywords[:6])  # Max 6 keywords
```

---

#### `scanners/orchestrator.py`

```python
import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime
import logging
from typing import List

from core.database import Database
from core.api_client import PolymarketAPIClient
from strategies.negrisk_arb import NegRiskArbitrageStrategy
from strategies.ai_probability import AIProbabilityStrategy
from services.news_monitor import NewsMonitor
from services.ai_assessor import AIAssessor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ScannerOrchestrator:
    """Main orchestrator for all scanning strategies"""
    
    def __init__(self, config: Dict):
        self.config = config
        self.db = Database(config['db_path'])
        self.api = PolymarketAPIClient()
        self.news_monitor = NewsMonitor(self.db, config['brave_api_key'])
        self.ai_assessor = AIAssessor()
        
        # Initialize strategies
        self.strategies = {
            'negrisk': NegRiskArbitrageStrategy(self.api, self.db, config),
            'ai_probability': AIProbabilityStrategy(self.api, self.db, self.ai_assessor, config)
        }
        
        self.scheduler = AsyncIOScheduler()
    
    async def scan_binary_arbitrage(self):
        """Scan for binary YES+NO arbitrage (every 1 min)"""
        logger.info("Scanning binary arbitrage...")
        async with self.api:
            markets = await self.api.get_markets(limit=100)
            # TODO: Implement binary strategy
    
    async def scan_negrisk(self):
        """Scan NegRisk markets (every 5 min)"""
        logger.info("Scanning NegRisk arbitrage...")
        async with self.api:
            markets = await self.api.get_negrisk_markets()
            market_objs = [Market.from_api_response(m) for m in markets]
            await self.strategies['negrisk'].scan(market_objs)
    
    async def monitor_news(self):
        """Monitor news for all active markets (every 5 min)"""
        logger.info("Monitoring news...")
        async with self.api:
            markets = await self.api.get_markets(limit=50)
            await self.news_monitor.monitor_markets(markets)
    
    async def process_news_events(self):
        """Process unprocessed news events with AI (immediate)"""
        logger.info("Processing news events...")
        
        events = self.db.get_unprocessed_news()
        
        for event in events:
            # Get market details
            market_ids = event['related_markets']
            for market_id in market_ids:
                # TODO: Fetch market, assess with AI, create opportunity if mispriced
                pass
    
    async def ai_bulk_assessment(self):
        """Run AI assessment on top markets (every 1 hour)"""
        logger.info("Running AI bulk assessment...")
        async with self.api:
            markets = await self.api.get_markets(limit=20)
            # TODO: Assess with AI
    
    def start(self):
        """Start the orchestrator with scheduled jobs"""
        logger.info("Starting scanner orchestrator...")
        
        # Schedule jobs
        self.scheduler.add_job(self.scan_negrisk, 'interval', minutes=5)
        self.scheduler.add_job(self.monitor_news, 'interval', minutes=5)
        self.scheduler.add_job(self.ai_bulk_assessment, 'interval', hours=1)
        
        # Start scheduler
        self.scheduler.start()
        
        logger.info("Orchestrator started. Press Ctrl+C to exit.")
        
        try:
            asyncio.get_event_loop().run_forever()
        except (KeyboardInterrupt, SystemExit):
            logger.info("Shutting down...")
            self.scheduler.shutdown()


# Entry point
if __name__ == "__main__":
    import sys
    import os
    
    config = {
        'db_path': os.path.expanduser('~/polymarket-arb/data/scanner.db'),
        'brave_api_key': os.getenv('BRAVE_API_KEY', ''),
        'negrisk_threshold': 0.98,
        'min_profit': 0.02
    }
    
    if not config['brave_api_key']:
        logger.warning("BRAVE_API_KEY not set, news monitoring will be disabled")
    
    orchestrator = ScannerOrchestrator(config)
    orchestrator.start()
```

---

## 7. Summary & Next Steps

### What's Different from Current Scanner

| Feature | Current | New (v2) |
|---------|---------|----------|
| **Strategies** | 1 (binary YES+NO) | 5 (multi-strategy) |
| **Markets Supported** | Binary only | Binary + NegRisk + scalar |
| **News Integration** | None | Brave Search + RSS |
| **AI Analysis** | None | OpenClaw agents |
| **Data Storage** | CSV files | SQLite database |
| **Architecture** | Single script | Modular + orchestrator |
| **Scheduling** | Manual runs | Automated (APScheduler) |
| **Opportunity Types** | Sum arbitrage | Cross-market, news-driven, AI-assessed, liquidity gaps |

### MVP (1 Day) Checklist

- [ ] Implement `core/database.py`
- [ ] Implement `core/api_client.py`
- [ ] Implement `strategies/negrisk_arb.py`
- [ ] Test on live API
- [ ] Verify 2-5 opportunities found daily

### Week 1 Additions

- [ ] Implement `services/ai_assessor.py`
- [ ] Implement `services/news_monitor.py`
- [ ] Build `scanners/orchestrator.py`
- [ ] Set up Brave Search API
- [ ] Create simple Flask dashboard

### Month 1 Goals

- [ ] Implement cross-market correlation detection
- [ ] Build backtesting framework
- [ ] Add Telegram alerting
- [ ] Weekly performance reports
- [ ] Full production deployment

---

**Questions for Taylor:**

1. Do you have a Brave Search API key? (Free tier: 2K searches/month)
2. Should we start with the MVP (NegRisk + new markets) or go straight to AI integration?
3. What's your threshold for "worth executing"? (Currently $0.02 profit minimum)
4. Do you want Telegram alerts for opportunities, or just dashboard?
5. Any specific markets/categories to prioritize (politics, sports, crypto)?
