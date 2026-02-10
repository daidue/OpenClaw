---
name: polymarket-trading
description: Polymarket prediction market trading strategies, scanning, and execution. Use when analyzing prediction markets, building trading bots, evaluating arbitrage opportunities, tracking whale activity, weather market trading, cross-platform arbitrage (Kalshi), or designing market scanners. Covers weather trading with NOAA data, whale/insider detection, multi-strategy scanning, risk management, and position sizing.
---

# Polymarket Trading

Operational knowledge for prediction market trading — strategies, scanning, execution, and risk management.

## Quick Start

**Core loop** for any Polymarket trading system:

```
SCAN markets → SCORE opportunities → FILTER by risk → SIZE positions → EXECUTE → MONITOR
```

## Strategy Menu (Pick Your Edge)

| Strategy | Edge Source | Speed Needed | Capital | When It Works |
|----------|-----------|-------------|---------|---------------|
| **Weather/NOAA** | Data asymmetry | 2h cycles | $500-5K | Active weather markets |
| **News-Driven** | AI analysis speed | 5-15 min | $5-20K | Breaking news events |
| **NegRisk Arb** | Math (multi-outcome) | 1-5 min | $5-30K | 4+ outcome markets |
| **Cross-Platform** | Platform fragmentation | 10-60 min | $10-50K | High-liquidity overlaps |
| **Whale Tailing** | Information asymmetry | 1-5 min | $1-10K | Large wallet activity |
| **Endgame** | Time value | 1h | $10-50K | Near-resolution markets |
| **New Market** | Thin liquidity | 30 min | $2-10K | Fresh market creation |

**What's dead:** Pure YES+NO arbitrage on liquid markets. HFT bots close gaps in milliseconds. Don't bother without sub-500ms infrastructure.

## APIs

**Polymarket:**
- CLOB: `https://clob.polymarket.com` — orderbooks, prices, trades (~10 req/s)
- Gamma: `https://gamma-api.polymarket.com` — metadata, NegRisk markets (~5 req/s)
- Data: `https://data-api.polymarket.com` — positions, holders, trade history
- WebSocket: `wss://ws-subscriptions-clob.polymarket.com` — real-time trades

**Kalshi:** `https://trading-api.kalshi.com/trade-api/v2` — JWT auth, 10-20 req/s

**NOAA:** `https://api.weather.gov` — free, ~1 req/s, User-Agent header required

## Key Patterns

### Signal Generation (Weather Example)
```
NOAA forecast → probability distribution → compare to market price → edge = |NOAA_prob - market_prob|
```
- Use normal distribution with std_dev = 3*(1-confidence)+1 for temperature uncertainty
- Entry threshold: edge > 10-15%
- Confidence scoring: weighted blend of forecast confidence (35%), horizon (25%), liquidity (20%), edge size (20%)

### Position Sizing (Kelly Criterion)
```
kelly_fraction = edge / odds
position = capital × kelly_fraction × fractional_kelly(0.25) × confidence
```
Cap at max_position_size. Floor at $10. Never risk >5% of capital per trade.

### Insider Scoring (0-100 scale)
Composite score from 11 factors — see [whale-tracking.md](references/whale-tracking.md):
- 70-100: Strong follow signal
- 50-69: Worth monitoring
- 30-49: Possibly informed
- 0-29: Normal activity

## Reference Guides

- **[Scanner Architecture](references/scanner-architecture.md)** — Multi-strategy scanner design, 5 strategy types, SQLite schema, cron scheduling
- **[Whale Tracking](references/whale-tracking.md)** — Wallet analysis, insider detection, tail trading, composite scoring model
- **[Weather Trading](references/weather-trading.md)** — NOAA integration, bucket arbitrage, Simmer SDK, city coverage
- **[Risk Management](references/risk-management.md)** — Kelly criterion, circuit breakers, exposure limits, stop-losses
- **[Cross-Platform Arbitrage](references/cross-platform.md)** — Kalshi API, market matching, fee analysis, spread detection
