# Weather Market Trading

Trade Polymarket weather markets using NOAA forecast data as an information edge.

## The Edge

1. **Data asymmetry** — NOAA 48-72h forecasts are highly accurate; most traders check weather casually
2. **Bucket arbitrage** — Multi-outcome temperature markets have structural mispricing between adjacent ranges
3. **Latency arbitrage** — NOAA updates every 6h; markets lag 5-30 minutes

**Edge half-life:** ~3-6 months from viral exposure (989K views on @0xMovez post, Feb 2026). Focus on less-popular cities and combine multiple weather models.

## Proven Results

| Trader | Strategy | Result | Win Rate |
|--------|----------|--------|----------|
| 0xf2e346ab | Bucket arbitrage (London only) | $204 → $24K | 73% over 1,300 trades |
| Hans323 | Latency arbitrage (multi-city) | $1.1M+ profit | 51% over 2,600 trades |

## NOAA API Integration

**Base URL:** `https://api.weather.gov` — Free, no API key, User-Agent header required.

### Workflow

```python
# 1. Grid lookup (cache indefinitely — grids don't change)
GET /points/{lat},{lon}
→ returns gridId, gridX, gridY, forecastHourly URL

# 2. Hourly forecast (cache 30 min)
GET /gridpoints/{office}/{gridX},{gridY}/forecast/hourly
→ returns periods[]: {startTime, temperature, temperatureUnit, probabilityOfPrecipitation}

# 3. Compare to market prices, calculate edge
```

**Rate limits:** ~1 req/s, retry on 429 with exponential backoff. 12 calls/day at 2h intervals is well within limits.

**Coverage:** US cities via NOAA. For international: UK Met Office (London), KMA (Seoul), MGM (Ankara).

### City Coordinates (Top Markets)

| City | Lat | Lon | Grid Office |
|------|-----|-----|-------------|
| NYC | 40.7128 | -74.0060 | OKX |
| Chicago | 41.8781 | -87.6298 | LOT |
| Atlanta | 33.7490 | -84.3880 | FFC |
| Dallas | 32.7767 | -96.7970 | FWD |
| Miami | 25.7617 | -80.1918 | MFL |
| Seattle | 47.6062 | -122.3321 | SEW |

## Signal Generation

### Probability Calculation

For temperature threshold markets ("Will NYC high exceed 50°F?"):

```python
import math

def prob_above_threshold(predicted_temp, threshold, confidence):
    """Normal distribution model for temperature uncertainty"""
    std_dev = 3.0 * (1.0 - confidence) + 1.0  # Higher confidence = tighter distribution
    z = (threshold - predicted_temp) / (std_dev * math.sqrt(2))
    return 0.5 * (1 - math.erf(z))

# For range markets ("50-52°F"):
def prob_in_range(predicted, low, high, confidence):
    std_dev = 3.0 * (1.0 - confidence) + 1.0
    def cdf(x): return 0.5 * (1 + math.erf((x - predicted) / (std_dev * math.sqrt(2))))
    return cdf(high) - cdf(low)
```

### Confidence Scoring

Weighted blend (0-1 scale):

| Component | Weight | Scoring |
|-----------|--------|---------|
| NOAA confidence | 35% | Use NOAA's own confidence value (default 0.7) |
| Forecast horizon | 25% | 0-24h: 1.0, 24-48h: 0.9, 48-72h: 0.8, 72-120h: 0.6 |
| Market liquidity | 20% | $50K+: 1.0, $20K: 0.9, $10K: 0.8, $5K: 0.7, <$1K: 0.3 |
| Edge size | 20% | 30%+: 1.0, 20%: 0.9, 15%: 0.8, 10%: 0.7, 5%: 0.3 |

**Minimum thresholds:** edge > 10%, confidence > 0.45, liquidity > $1K.

## Bucket Arbitrage (The $24K Strategy)

Multi-outcome temperature markets where only ONE bucket wins:

1. Identify probability distributions across adjacent buckets
2. Find buckets priced below NOAA-implied probability (buy YES)
3. Hedge by buying NO on neighboring ranges
4. Only one resolves YES → profit if correctly priced

**Key insight:** Market makers struggle to price 10+ simultaneous outcomes efficiently. Adjacent buckets often have irrational relative probabilities.

## Simmer SDK

**What:** AI-native trading SDK by Spartan Labs for Polymarket execution.

**Architecture:** `Agent → Simmer SDK → Simmer API → Polymarket CLOB`

**Two custody modes:**
- Simmer-managed wallet (easy setup, **they hold your keys** — custody risk)
- External wallet (you hold keys via `SIMMER_PRIVATE_KEY` env var — recommended)

**Limits:** $100/trade, $500/day (request increase from Simmer).

**Pre-built skills:** `simmer-weather` (2h cron), `simmer-copytrading` (4h), `simmer-signalsniper` (15 min).

## Market Resolution

- UMA Optimistic Oracle: proposer posts $750 bond → 2h challenge window → resolves
- Data source: official weather services (NOAA, Met Office)
- Dispute: goes to UMA token holder vote (rare for weather — objective data)

## Bot Architecture (Weather Bot)

```
bot.py (orchestrator)
├── src/noaa/
│   ├── client.py       # Async NOAA API with caching + rate limiting
│   ├── parser.py       # Raw API → NOAAForecast models
│   └── cities.py       # City coordinates + grid mappings
├── src/polymarket/
│   ├── client.py       # CLOB + Gamma API client
│   └── parser.py       # Raw API → PolymarketMarket models
├── src/signals/
│   ├── engine.py       # NOAA vs market → TradingSignal generation
│   └── scoring.py      # Confidence scoring (4-component weighted)
├── src/trading/
│   ├── executor.py     # Order placement + position management
│   └── risk.py         # Circuit breakers, exposure limits, stop-losses
└── src/database.py     # Trade logging, risk metrics, P&L tracking
```

**Key models:** NOAAForecast (temp, confidence, horizon), PolymarketMarket (prices, liquidity, type), TradingSignal (edge, direction, confidence, recommended_size).
