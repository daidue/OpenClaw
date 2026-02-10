# Cross-Platform Arbitrage (Polymarket ↔ Kalshi)

Exploit price discrepancies for identical events across prediction market platforms.

## Opportunity

Same event priced differently due to different user bases (crypto vs traditional finance), liquidity fragmentation, and information propagation speed.

- **Typical steady-state spread:** 0.5-2% (not profitable after fees)
- **During breaking news:** 3-10% spreads for 5-30 minutes
- **Minimum profitable spread:** ~3-4% (covers round-trip fees)

## Kalshi API

**Base:** `https://trading-api.kalshi.com/trade-api/v2`
**Auth:** JWT via `POST /login` with email + password (token ~24h expiry)
**SDK:** `pip install kalshi-python`

### Key Endpoints

```
GET /markets                           # List markets (limit 500, cursor pagination)
GET /markets/{ticker}                  # Market details
GET /markets/{ticker}/orderbook        # {yes: [[price, qty]], no: [[price, qty]]}
POST /portfolio/orders                 # Place order (ticker, type, side, count, price)
GET /portfolio/positions               # View positions
```

**Rate limits:** 10 req/s unauth, 20 req/s auth, 5 orders/s.

## Market Overlap

| Category | Overlap | Notes |
|----------|---------|-------|
| Politics/Elections | 60-70% | Best overlap, highest volume |
| Finance (Fed, GDP) | 30-40% | Kalshi more granular buckets |
| Weather | 20-30% | Temperature, hurricanes |
| Sports | 5-10% | Kalshi limited to major events |
| Crypto | 0% | Kalshi doesn't list crypto |

**Best targets:** Presidential elections ($100M+ combined), Fed rate decisions ($10-30M), major economic reports.

## Fee Comparison

**Polymarket:** Flat 2% on trade value (+ negligible Polygon gas)

**Kalshi:** 7% on expected profit = `|price - 50¢| × quantity × 0.07`
- Fees scale with distance from 50¢
- Near 50¢: low fees. Near 0¢/100¢: minimal fees
- Some events (elections): reduced 3-5% rates

### Round-Trip Example (Buy @ 60¢ on A, Sell @ 65¢ on B)

```
Buy Polymarket @ 60¢:  $60 + $1.20 fee = $61.20
Sell Kalshi @ 65¢:     $65 - $1.05 fee = $63.95
Net profit: $2.75 (4.6% ROI on $60)
```

## Market Matching

### Manual Mapping (Recommended Start)

```python
MARKET_MAPPINGS = {
    "0x12a3...": ("PRES-2024", "exact", 1.0),      # Presidential election
    "0x45b7...": ("RATE-MAR24-25", "exact", 1.0),   # Fed rate decision
    "0x78c9...": ("GDP-Q1-24", "close", 0.95),      # GDP (threshold differences)
}
```

Start with top 30-50 markets manually. Fuzzy matching (`fuzzywuzzy.token_sort_ratio > 85%`) as fallback.

### Spread Detection

```python
async def check_spread(poly_id, kalshi_ticker):
    poly_price, kalshi_price = await asyncio.gather(
        polymarket.get_price(poly_id),
        kalshi.get_price(kalshi_ticker)
    )
    spread = abs(poly_price - kalshi_price)
    
    # Calculate net profit after fees
    if poly_price < kalshi_price:  # Buy Poly, sell Kalshi
        buy_cost = poly_price * 1.02  # 2% Poly fee
        sell_recv = kalshi_price - kalshi_fee(kalshi_price)
        net = sell_recv - buy_cost
    else:
        buy_cost = kalshi_price + kalshi_fee(kalshi_price)
        sell_recv = poly_price * 0.98
        net = sell_recv - buy_cost
    
    return {"spread": spread, "net_profit_pct": net / min(poly_price, kalshi_price)}
```

## Polling Strategy

| Priority | Markets | Interval |
|----------|---------|----------|
| High (top 10) | Elections, Fed | 10 sec |
| Medium (11-30) | GDP, sports finals | 30 sec |
| Low (31+) | Everything else | 60 sec |

## Realistic Returns

| Scenario | Trades/Month | Avg Profit | Monthly ROI | Capital |
|----------|-------------|-----------|-------------|---------|
| Election season | 30-60 | $75-150 | 11-45% | $20K |
| Normal | 12-32 | $20-45 | 1.6-9.6% | $15K |
| Off-season | 0-8 | $15-30 | 0-1.6% | $15K |

**Break-even:** ~12-18 profitable trades/month to cover maintenance costs.

## Legal Considerations

- **Kalshi:** CFTC-regulated, US-legal, issues 1099s
- **Polymarket:** Offshore, US users officially banned (post-2022 CFTC settlement)
- **Arbitrage approach for US users:** Use Polymarket as read-only signal, trade only on Kalshi
- **Alternative:** Offshore entity structure or non-US partner for Polymarket leg

## Alternative Platforms (Signal Sources)

| Platform | Type | Use Case |
|----------|------|----------|
| Metaculus | Play-money | Calibration signal (highly accurate forecasters) |
| Manifold | Play-money | Leading indicator for emerging topics |
| PredictIt | Defunct (2025) | N/A |

Metaculus consensus diverging >10% from Polymarket price = potential inefficiency signal.
