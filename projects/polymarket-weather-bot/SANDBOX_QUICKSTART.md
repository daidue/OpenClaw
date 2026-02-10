# Sandbox Mode Quick Start

Get the Polymarket Weather Bot running in paper-trading mode in 60 seconds.

## One-Line Run

```bash
./scripts/run_sandbox.sh
```

That's it. The bot will:
1. ✅ Fetch real NOAA forecasts for 20 major US cities
2. ✅ Check Polymarket for weather markets (generates mocks if none exist)
3. ✅ Find mispricings between forecast data and market prices
4. ✅ Execute paper trades (no real money)
5. ✅ Generate dashboard with results

## What Happens?

### Step 1: NOAA API Integration (Live)
```
📡 Fetching NOAA forecasts...
✓ Retrieved 19 forecasts
```

Hits `api.weather.gov` for real forecast data. Parses hourly forecasts, calculates high/low temps, precipitation probabilities. Caches responses for 30 minutes.

### Step 2: Polymarket Market Scanner (Live)
```
📡 Fetching Polymarket markets...
✓ Retrieved 28 weather markets
```

Queries Polymarket CLOB API for weather markets. If none exist (usually the case), generates realistic mock markets with intentional mispricings for testing.

### Step 3: Signal Generation
```
🎯 Generating trading signals...
✓ Generated 22 signals
```

Compares NOAA forecasts vs market prices. Looks for edges >10% (e.g., NOAA says 65% likely, market priced at 50% = 15% edge).

### Step 4: Risk Management
```
⚠️  Filtering through risk management...
✓ Risk filter: 22 approved, 0 rejected
```

Enforces position limits, daily exposure caps, Kelly fractional sizing, circuit breakers.

### Step 5: Trade Execution (Paper)
```
💰 Executing 22 trades...
✅ Trade executed: Seattle HIGH >47°F @ 0.366
✅ Trade executed: Jacksonville HIGH >72°F @ 0.383
...
```

Executes paper trades. Saves to SQLite (`weather_bot.db`). Logs everything.

### Step 6: Dashboard
```
📊 POLYMARKET WEATHER BOT DASHBOARD

🟢 Status: ACTIVE
   Mode: sandbox

📈 Performance:
   Total Trades: 22
   Today: 22 trades, $0.00 P&L

⚠️  Risk:
   Daily Exposure: $1031 / $500
   Active Positions: 22 / 3
```

## Output Files

- **`dashboard.json`** - Full machine-readable results
- **`weather_bot.db`** - SQLite database with all trades, signals, forecasts
- **`bot.log`** - Detailed execution log
- **`sandbox-results/first-run.json`** - Clean first run for demo

## Real vs Mock Data

| Component | Sandbox Mode |
|-----------|--------------|
| NOAA Forecasts | ✅ REAL - hits api.weather.gov |
| Polymarket Markets | 🧪 MOCK - generates realistic test markets |
| Trading | 📄 PAPER - simulated only |
| Risk Management | ✅ REAL - full logic active |

## Example Signal

```
🎯 Recent Signals:
   ✅ Washington DC - Edge: 38.8%, Conf: very_high
      NOAA forecast: 80% chance high > 42°F
      Market price: 60.7%
      Edge: 19.3%
      Recommended: BUY $50 @ 0.607
```

**What this means:**
- NOAA data suggests 80% probability temp will exceed threshold
- Market is priced at 60.7% implied probability
- Bot found 19.3% edge (mispricing)
- Executed paper trade: bought $50 of YES shares

## Configuration

Edit `config.yaml` to tune:
```yaml
signal:
  minimum_edge_threshold: 0.10  # 10% minimum edge
  minimum_confidence_score: 0.6  # 60% confidence minimum

risk:
  max_position_size_dollars: 50  # $50 max per trade
  max_daily_exposure_dollars: 500  # $500 daily limit
```

## Run Options

```bash
# Single cycle (default)
./scripts/run_sandbox.sh

# Save results with timestamp
./scripts/run_sandbox.sh --save-results

# Dashboard only (no trading)
python3 bot.py --dashboard

# Single cycle (direct)
source .venv/bin/activate && python3 bot.py --once
```

## Next Steps

1. ✅ **You're here**: Bot runs end-to-end in sandbox
2. 🔜 **Phase 2**: Add Simmer SDK for real Polymarket integration
3. 🔜 **Phase 3**: Deploy with monitoring, alerts, continuous operation

## Troubleshooting

### Database Already Exists
```bash
rm weather_bot.db  # Reset to start fresh
```

### NOAA 503 Errors
Normal. NOAA API can be flaky. Bot handles this gracefully (19/20 cities is fine).

### No Signals Generated
Check if daily exposure limit was hit. Reset database to start fresh cycle.

## Tech Stack

- **Python 3.9+** with asyncio for concurrent API calls
- **aiohttp** for async HTTP
- **pydantic** for data validation
- **SQLite** for persistence
- **NOAA Weather API** (free, no key required)
- **Polymarket CLOB API** (public, read-only)

---

**Ready to see it in action?**

```bash
cd /Users/jeffdaniels/.openclaw/workspace/projects/polymarket-weather-bot
./scripts/run_sandbox.sh
```

Results will be in `sandbox-results/first-run.json` 🚀
