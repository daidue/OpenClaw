# Whale Tracking & Insider Detection

Track large Polymarket bets ($10K+), score insider probability, and tail informed wallets.

## Data Sources

| Source | Endpoint | Latency | Use |
|--------|----------|---------|-----|
| CLOB API | `GET /data/trades` | ~1s | Trade history by market/wallet |
| Data API | `GET /positions?user=`, `/holders?market=` | ~1s | Position tracking |
| WebSocket | `wss://ws-live-data.polymarket.com` | <1s | Real-time whale alerts |
| The Graph | GraphQL subgraph | ~5 min | Historical verification |

**Visible data:** wallet addresses (proxy), trade sizes, prices, timestamps, current positions, historical P&L.

**Not visible:** real identities, order intent before execution, information sources.

## Existing Tools

- **Polywhaler** (polywhaler.com) — #1 tracker, $10K+ alerts, insider detection
- **PolyAlertHub** — Telegram alerts, wallet watchlists, no wallet connection needed
- **HashDive** — "Smart Score" (-100 to +100), filters out market makers
- **Betmoar** — Trading terminal, $110M cumulative volume, position delta analysis

## Insider Scoring Model (0-100)

11 factors, raw max ~165 points, normalized to 0-100:

### Primary Factors

| Factor | Max Points | Signal |
|--------|-----------|--------|
| **Wallet age** | 35 | Brand new wallet + $50K+ first trade = 35 |
| **Cross-market pattern** | 25 | 4+ related markets in 1h = 25 |
| **Clustering** | 20 | 3+ wallets, same side, 6h window = 20 |
| **Trade velocity** | 20 | 3+ trades in 60s = 20 |
| **Wallet win rate** | 20 | 80%+ over 10+ bets = 20 |

### Secondary Factors

| Factor | Max Points | Signal |
|--------|-----------|--------|
| **Size vs liquidity** | 15 | $200K+ trade = 15 |
| **Price impact** | 15 | 5%+ market move = 15 |
| **Contrarian bet** | 12 | Against 80%+ consensus = 12 |
| **High conviction** | 8 | Buy at 75%+ or sell at 25%- = 8 |
| **Odd-hour trading** | 5 | 2-6 AM ET = 5 |
| **News timing** | 10 | (Future: retroactive boost if news breaks post-trade) |

### Score Interpretation

| Score | Action |
|-------|--------|
| 70-100 | **STRONG_FOLLOW** — Very high insider probability |
| 50-69 | **FOLLOW** — Worth tailing at reduced size |
| 30-49 | **MONITOR** — Interesting but not conclusive |
| 0-29 | **IGNORE** — Likely normal activity |

**Recommended alert threshold:** 65/100 (requires multiple strong signals, not just size).

### Wallet Classification

```python
# Market maker: balanced buy/sell (>70% ratio), 50+ diverse markets, 45-52% win rate
# Directional whale: skewed ratio (<40%), fewer large trades, concentrated categories, 55%+ win rate
# Only tail directional whales.
```

## Tail Trading Execution

### Speed Requirements

| Confidence | Entry Window | Reasoning |
|-----------|-------------|-----------|
| Score 70+ | 1-5 min | News may break within hours |
| Score 50-69 | 5-15 min | Time to verify wallet history |
| Score 30-49 | 30-60 min | Wait for confirmation |
| Tracked whale | 1-3 min | Proven track record = immediate |

### Position Sizing

**General rule:** Tail at 25-50% of whale's bet size, scaled to your capital.

```python
# Fractional Kelly for tail trades:
if confidence >= 70: estimated_win_prob = 0.70
elif confidence >= 50: estimated_win_prob = 0.60
else: estimated_win_prob = 0.55

kelly = (payout * win_prob - (1 - win_prob)) / payout
position = capital * kelly * 0.25  # Very conservative fractional Kelly
position = clamp(position, min=100, max=capital * 0.05)  # Never >5% of capital

# Adjustments:
# +50% size for proven whales (win_rate > 65%)
# -50% size if opposing whale activity detected
# -30% size if price already moved 5%+ from whale entry
```

### Risk Management

- **Stop-loss:** Exit if price moves 10%+ against you
- **Time stop:** Partial exit (50%) if no news within 48h
- **Whale exit:** Follow whale's close if detectable
- **Portfolio limits:** Max 10 positions, 50% capital deployed, 20% per category, 10% per market

## Red Flags (Insider Indicators)

1. **New wallet, large bet** — Created <30 days, <10 trades, single large position
2. **Timing anomaly** — Large bet 0-6 hours before major news
3. **Size vs liquidity** — Trade is 20%+ of open interest or 50%+ of daily volume
4. **Clustering** — 3+ different wallets, same side, 6-hour window
5. **Contrarian conviction** — Betting big against 85%+ consensus (and winning)
6. **Category switch** — Wallet that only does sports suddenly makes large political bet

## False Positive Filters

- Check if "news" was actually public before trade (search with timestamps)
- Verify wallet isn't known market maker or institutional account
- Confirm clustering isn't just natural response to public event
- Review long-term track record (not just recent hot streak)

## Historical Case: The 2024 Election Whale

- 4 accounts (Fredi9999, Theo4, PrincessCaro, Michie) = single French trader
- $45M deployed on Trump across 450+ transactions in 10 hours
- Moved market from ~50% to 67%
- Outcome: Trump won → ~$30M estimated profit
- Polymarket conclusion: "directional position based on personal views" (no insider evidence)

## Database Schema

```sql
CREATE TABLE tracked_wallets (
    address TEXT PRIMARY KEY, label TEXT, total_trades INTEGER,
    win_rate REAL, total_pnl REAL, smart_score INTEGER,
    is_market_maker BOOLEAN, alert_threshold REAL
);

CREATE TABLE insider_alerts (
    id INTEGER PRIMARY KEY, trade_id TEXT, wallet_address TEXT,
    market_id TEXT, alert_type TEXT, insider_score INTEGER,
    trade_value REAL, triggered_at TEXT, followed BOOLEAN
);

CREATE TABLE wallet_outcomes (
    wallet_address TEXT, market_id TEXT, side TEXT,
    entry_price REAL, resolved BOOLEAN, won BOOLEAN,
    PRIMARY KEY (wallet_address, market_id)
);
```
