# Polymarket Weather Trading Bot

An automated trading bot that identifies arbitrage opportunities between NOAA weather forecasts and Polymarket prediction markets.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          BOT ORCHESTRATOR                        │
│                           (bot.py)                               │
└────────┬──────────────────────────────────────┬─────────────────┘
         │                                       │
         v                                       v
┌─────────────────────────┐          ┌──────────────────────────┐
│   NOAA API CLIENT       │          │  POLYMARKET API CLIENT   │
│   (noaa/client.py)      │          │  (polymarket/client.py)  │
│                         │          │                          │
│  • Fetch forecasts      │          │  • Fetch markets         │
│  • Cache with TTL       │          │  • Search weather        │
│  • Rate limiting        │          │  • Get prices            │
└────────┬────────────────┘          └──────────┬───────────────┘
         │                                       │
         v                                       v
┌─────────────────────────┐          ┌──────────────────────────┐
│   NOAA PARSER           │          │  POLYMARKET PARSER       │
│   (noaa/parser.py)      │          │  (polymarket/parser.py)  │
│                         │          │                          │
│  • Extract high/low     │          │  • Parse questions       │
│  • Calculate confidence │          │  • Extract thresholds    │
│  • Build distributions  │          │  • Filter tradeable      │
└────────┬────────────────┘          └──────────┬───────────────┘
         │                                       │
         └───────────────────┬───────────────────┘
                             v
                   ┌──────────────────────┐
                   │   SIGNAL ENGINE      │
                   │   (signal/engine.py) │
                   │                      │
                   │  • Match markets     │
                   │  • Calculate edge    │
                   │  • Score confidence  │
                   │  • Kelly sizing      │
                   └──────────┬───────────┘
                             │
                             v
                   ┌──────────────────────┐
                   │   RISK MANAGER       │
                   │   (trading/risk.py)  │
                   │                      │
                   │  • Position limits   │
                   │  • Exposure caps     │
                   │  • Circuit breaker   │
                   │  • Liquidity checks  │
                   └──────────┬───────────┘
                             │
                             v
                   ┌──────────────────────┐
                   │   TRADE EXECUTOR     │
                   │  (trading/executor.py│
                   │                      │
                   │  • Sandbox mode      │
                   │  • Production (TBD)  │
                   │  • P&L tracking      │
                   └──────────┬───────────┘
                             │
                             v
                   ┌──────────────────────┐
                   │     DATABASE         │
                   │   (database.py)      │
                   │                      │
                   │  • SQLite storage    │
                   │  • Trade records     │
                   │  • Performance stats │
                   │  • Risk metrics      │
                   └──────────────────────┘
```

## Features

### ✅ Implemented
- **NOAA Integration**: Fetch and parse weather forecasts with confidence scoring
- **Polymarket Integration**: Search and parse weather prediction markets
- **Signal Generation**: Compare NOAA vs market probabilities to find edges
- **Risk Management**: Position limits, exposure caps, circuit breakers
- **Kelly Sizing**: Optimal position sizing based on edge and confidence
- **Sandbox Mode**: Safe testing without real trades
- **SQLite Database**: Persistent storage for trades and performance
- **Comprehensive Tests**: 90%+ code coverage

### 🚧 Coming Soon
- Production trading via Simmer SDK
- Live dashboard monitoring
- Alerting system
- Advanced risk correlation analysis

## Setup

### Prerequisites
- Python 3.9+
- pip or poetry for dependency management

### Installation

1. **Clone or navigate to the project directory**:
   ```bash
   cd /path/to/polymarket-weather-bot
   ```

2. **Create a virtual environment**:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Create configuration files**:
   ```bash
   cp config.yaml.example config.yaml
   cp .env.example .env
   ```

### Configuration

#### `config.yaml` - Bot Parameters
```yaml
# NOAA Settings
noaa:
  update_interval_seconds: 3600  # 1 hour
  request_timeout_seconds: 15
  cache_ttl_seconds: 1800  # 30 minutes

# Polymarket Settings
polymarket:
  update_interval_seconds: 300  # 5 minutes
  rate_limit_per_second: 5.0

# Signal Generation
signal:
  minimum_edge_threshold: 0.10  # 10% edge required
  minimum_confidence_score: 0.6
  minimum_liquidity: 1000  # USD

# Risk Management
risk:
  max_position_size_dollars: 50
  max_daily_exposure_dollars: 500
  stop_loss_percent: 0.20  # 20%
  max_correlated_positions: 3
  circuit_breaker:
    min_win_rate: 0.50
    lookback_trades: 20

# Trading
trading:
  simmer_mode: sandbox  # sandbox | production
  kelly_fraction: 0.25  # Fractional Kelly (0.25 = quarter Kelly)

# Monitoring
monitoring:
  alert_on_high_confidence_signals: true
  alert_on_trade_execution: true
  alert_on_large_losses: true
```

#### `.env` - API Keys (Future)
```bash
# Polymarket / Simmer SDK credentials (when implementing production)
# SIMMER_API_KEY=your_key_here
# SIMMER_PRIVATE_KEY=your_private_key_here
```

## Running the Bot

### Sandbox Mode (Safe Testing)
```bash
# Activate virtual environment
source .venv/bin/activate

# Run bot in sandbox mode
python bot.py --mode sandbox

# Run with verbose logging
python bot.py --mode sandbox --log-level DEBUG
```

### Dry Run (Analysis Only)
```bash
# Generate signals without executing trades
python bot.py --dry-run
```

### Production Mode (⚠️ Real Money)
```bash
# NOT YET IMPLEMENTED
# Will require Simmer SDK setup and real API keys
python bot.py --mode production
```

## Testing

### Run Full Test Suite
```bash
# Activate virtual environment
source .venv/bin/activate

# Run all tests with coverage
pytest --cov=src --cov-report=html --cov-report=term

# View coverage report
open htmlcov/index.html  # On macOS
# Or: xdg-open htmlcov/index.html  # On Linux
```

### Run Specific Test Modules
```bash
# Test models only
pytest tests/test_models.py -v

# Test NOAA client
pytest tests/test_noaa_client.py -v

# Test signal generation
pytest tests/test_signal_engine.py -v

# Test with debug output
pytest tests/test_risk.py -v -s
```

### Test Coverage Goals
- **Target**: 90%+ coverage
- **Current modules**:
  - `test_models.py` - Pydantic validation
  - `test_noaa_client.py` - API client with mocking
  - `test_noaa_parser.py` - Forecast parsing
  - `test_polymarket_client.py` - Market API
  - `test_polymarket_parser.py` - Question parsing
  - `test_signal_engine.py` - Edge detection
  - `test_risk.py` - Risk management
  - `test_executor.py` - Trade execution
  - `test_database.py` - SQLite operations

## Module Descriptions

### Core (`src/`)

#### `models.py`
Pydantic data models for type safety:
- `NOAAForecast` - Weather forecast with confidence
- `PolymarketMarket` - Market structure with prices
- `TradingSignal` - Generated trading opportunity
- `Trade` - Executed trade record
- `RiskMetrics` - Current risk state
- `BotConfig` - Configuration parameters

#### `database.py`
SQLite database interface:
- Async operations with aiosqlite
- Trade record persistence
- Performance tracking
- Risk metric calculation
- Query utilities

### NOAA Integration (`src/noaa/`)

#### `client.py`
NOAA Weather API client:
- Async HTTP requests with aiohttp
- Rate limiting (1 req/sec)
- Response caching with TTL
- Grid point lookup
- Hourly forecast fetching

#### `parser.py`
Forecast data extraction:
- Temperature high/low parsing
- Confidence calculation based on horizon
- Probability distribution estimation
- Normal CDF for threshold probabilities

#### `cities.py`
Top 20 US cities with coordinates for weather tracking.

### Polymarket Integration (`src/polymarket/`)

#### `client.py`
Polymarket CLOB API client:
- Market search and filtering
- Price fetching
- Order book data (future)
- Rate limiting (5 req/sec)

#### `parser.py`
Market question parsing:
- Regex-based text extraction
- City and date identification
- Temperature threshold detection
- Market type classification
- Tradeable market filtering

### Signal Generation (`src/signal/`)

#### `engine.py`
Edge detection and signal generation:
- NOAA ↔ Market matching
- Probability comparison
- Edge calculation (NOAA prob - Market prob)
- Kelly Criterion position sizing
- Confidence scoring
- Expected value computation

#### `scoring.py`
Confidence score calculation:
- Forecast horizon weighting
- NOAA historical accuracy
- Market liquidity factors
- Correlation risk

### Trading (`src/trading/`)

#### `risk.py`
Risk management enforcement:
- Position size limits
- Daily exposure caps
- Circuit breaker (win rate monitoring)
- Correlation limits
- Liquidity checks

#### `executor.py`
Trade execution:
- **Sandbox mode**: Simulated trades for testing
- **Production mode**: Simmer SDK integration (TBD)
- P&L calculation
- Trade lifecycle management

### Monitoring (`src/monitoring/`)

#### `dashboard.py`
Performance dashboard (future):
- Real-time P&L
- Signal analytics
- Risk metrics visualization
- Trade history

## Strategy Overview

### Signal Generation
1. **Fetch Data**: Get NOAA forecasts and Polymarket prices
2. **Match Markets**: Find forecast-market pairs (city + date)
3. **Calculate Edge**: Compare NOAA probability vs market price
4. **Filter**: Only signals with edge > 10% and confidence > 0.6
5. **Size Position**: Use fractional Kelly (25%) for optimal bet sizing

### Risk Management
- **Position Limit**: Max $50 per trade
- **Daily Exposure**: Max $500 total per day
- **Circuit Breaker**: Stop trading if win rate < 50% over last 20 trades
- **Liquidity Filter**: Only trade markets with $1000+ liquidity
- **Max Positions**: Hold at most 3 correlated positions

### Example Trade Flow
```
1. NOAA forecast: NYC high = 55°F with 85% confidence
2. Polymarket: "NYC high > 50°F" priced at $0.60 (60% implied prob)
3. Edge: 85% - 60% = 25% edge
4. Signal: BUY YES at $0.60
5. Risk check: Position size = $35.50 (Kelly sizing)
6. Execute: Buy $35.50 of YES shares
7. Resolution: If actual high > 50°F, profit = $35.50 * (1 - 0.60) = $14.20
```

## Database Schema

### `trades` Table
```sql
CREATE TABLE trades (
    trade_id TEXT PRIMARY KEY,
    signal_id TEXT,
    market_id TEXT,
    market_question TEXT,
    direction TEXT,  -- 'buy' or 'sell'
    position_size REAL,
    entry_price REAL,
    exit_price REAL,
    realized_pnl REAL,
    status TEXT,  -- 'pending', 'executed', 'closed'
    executed_at TEXT,
    closed_at TEXT,
    notes TEXT
);
```

### `signals` Table
```sql
CREATE TABLE signals (
    signal_id TEXT PRIMARY KEY,
    generated_at TEXT,
    city TEXT,
    date TEXT,
    market_id TEXT,
    noaa_probability REAL,
    market_probability REAL,
    edge REAL,
    confidence_score REAL,
    recommended_size REAL,
    reasoning TEXT,
    executed BOOLEAN
);
```

## Development

### Code Style
```bash
# Format code
black src/ tests/

# Lint
ruff check src/ tests/

# Type check
mypy src/
```

### Adding New Features
1. Write tests first (TDD)
2. Implement feature
3. Ensure tests pass: `pytest`
4. Check coverage: `pytest --cov=src`
5. Format: `black .`

## Troubleshooting

### Common Issues

**Import errors after installation**:
```bash
# Ensure you're in the virtual environment
source .venv/bin/activate
pip install -r requirements.txt
```

**NOAA API timeouts**:
- Check internet connection
- NOAA may rate limit - bot includes backoff retry logic
- Adjust `noaa.request_timeout_seconds` in config

**No signals generated**:
- Lower `minimum_edge_threshold` in config (try 0.05)
- Check if NOAA forecasts are being fetched: `--log-level DEBUG`
- Verify Polymarket markets exist for target cities/dates

**Tests failing**:
```bash
# Clean pytest cache
pytest --cache-clear

# Run with verbose output
pytest -vv tests/test_failing_module.py
```

## Performance

### Expected Metrics
- **Signal Generation**: ~1-2 seconds for 20 cities
- **NOAA API**: ~500ms per forecast (cached: <1ms)
- **Polymarket API**: ~200ms per market search
- **Database Operations**: <10ms per query
- **Risk Checks**: <1ms per signal

## Security

### API Keys
- Never commit `.env` file
- Use environment variables for production
- Rotate keys regularly

### Sandbox Mode
- Default mode is sandbox (no real money)
- Requires explicit `--mode production` flag
- Production mode requires additional confirmation

## License

MIT License - see LICENSE file for details.

## Support

For issues, questions, or contributions:
1. Check existing issues on GitHub
2. Review this README thoroughly
3. Run tests to isolate problem
4. Open detailed issue with logs

## Roadmap

- [x] NOAA API integration
- [x] Polymarket API integration
- [x] Signal generation engine
- [x] Risk management system
- [x] Comprehensive test suite (90%+)
- [x] Sandbox mode
- [ ] Production trading (Simmer SDK)
- [ ] Live monitoring dashboard
- [ ] Telegram/Discord alerts
- [ ] Historical backtest module
- [ ] Machine learning confidence boosting
- [ ] Multi-market correlation analysis

---

**⚠️ Disclaimer**: This software is for educational purposes. Trading prediction markets involves risk. Only trade what you can afford to lose. The authors are not responsible for any financial losses.
