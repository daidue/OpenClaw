# Sandbox Results

This directory contains output from sandbox mode test runs.

## Files

- **`first-run.json`** - Initial complete run demonstrating end-to-end functionality
- **`run_YYYYMMDD_HHMMSS.json`** - Timestamped runs from `./scripts/run_sandbox.sh --save-results`

## What's in the results?

Each JSON file contains:

- **Status**: Bot health, circuit breaker state, mode
- **Performance**: Win rate, P&L, trade counts
- **Risk Metrics**: Exposure, position limits, utilization
- **Active Positions**: All open paper trades
- **Recent Signals**: Last 10 trading signals generated
- **Recent Trades**: Last 10 executed trades

## Key Metrics to Look For

- **Edge %**: Difference between NOAA probability and market price (looking for >10%)
- **Confidence**: Signal strength (very_high = 90%+, high = 85%+)
- **Position Size**: Kelly-fractional sizing based on edge and confidence
- **Daily Exposure**: Running total (capped at $500 in sandbox config)

## Example Signal

```json
{
  "signal_id": "signal_abc123",
  "market": "Will NYC high exceed 50°F on Feb 11?",
  "direction": "buy",
  "edge": "15.2%",
  "confidence": "high",
  "recommended_size": 42.50
}
```

This means:
- NOAA forecasts 65% chance, market is priced at 50% → 15% edge
- Bot recommends buying $42.50 of YES shares
- High confidence = 85%+ reliability based on forecast horizon
