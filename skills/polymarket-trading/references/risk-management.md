# Risk Management

Position sizing, exposure limits, circuit breakers, and stop-loss rules for prediction market trading.

## Position Sizing: Kelly Criterion

```python
# Binary market Kelly:
odds = (1.0 - market_price) / market_price  # Payoff ratio
kelly_fraction = edge / odds

# Apply safety layers:
position = capital * kelly_fraction * fractional_kelly * confidence
position = clamp(position, min=10, max=max_position_size)

# Recommended fractional_kelly = 0.25 (quarter-Kelly)
# Full Kelly is optimal but has brutal drawdowns
```

**Why fractional Kelly:** Full Kelly maximizes long-run growth but can produce 50%+ drawdowns. Quarter-Kelly sacrifices ~25% of growth rate but dramatically reduces variance.

## Exposure Limits

| Limit | Value | Rationale |
|-------|-------|-----------|
| Max per trade | $100-2,000 (config) | Single-trade risk cap |
| Max daily exposure | $500-5,000 | Limits cumulative daily risk |
| Max correlated positions | 3-5 | Prevents sector concentration |
| Max capital deployed | 50% of portfolio | Always keep dry powder |
| Max per category | 20% of capital | No single-category blowup |
| Max per market | 10% of capital | Diversification floor |
| Minimum liquidity | $1,000-5,000 | Ensures executable exits |
| Minimum edge | 5-15% | Don't trade noise |
| Minimum confidence | 0.45-0.65 | Filter low-quality signals |

## Circuit Breakers

Automatic trading halt when performance degrades:

```python
class CircuitBreaker:
    lookback_trades = 20       # Evaluate last N trades
    min_win_rate = 0.45        # Halt if win rate drops below
    daily_loss_limit = 0.05    # Halt if down 5% in one day
    
    def check(self, metrics):
        if metrics.total_trades >= self.lookback_trades:
            if metrics.win_rate < self.min_win_rate:
                return True, f"Win rate {metrics.win_rate:.1%} below {self.min_win_rate:.1%}"
        if daily_pnl < -self.daily_loss_limit * capital:
            return True, "Daily loss limit hit"
        return False, None
```

**Reset conditions:** Manual review + 24h cooldown. Don't auto-reset.

## Stop-Loss Rules

| Trigger | Action | Applies To |
|---------|--------|-----------|
| Price moves 10%+ against | Full exit | All strategies |
| 48h with no price movement | 50% exit | Whale tailing |
| Whale closes position | Full exit | Whale tailing |
| Adverse news breaks | Full exit | All strategies |
| Market within 24h of close | Evaluate exit | All strategies |

## Risk Scoring Pipeline

For each signal before execution:

```
1. Circuit breaker check → halt if triggered
2. Daily exposure check → remaining_capacity >= required_capital?
3. Position size check → within max_position_size?
4. Correlated positions check → under max_correlated?
5. Liquidity check → market.liquidity >= minimum?
6. Edge check → signal.edge >= minimum_edge?
7. Confidence check → signal.confidence >= minimum_confidence?
→ ALL pass = execute | ANY fail = reject with reason
```

## Drawdown Expectations

| Win Rate | Max Drawdown (likely) | Assessment |
|----------|----------------------|------------|
| 70%+ | 10-20% | Excellent — scale up |
| 60-70% | 20-30% | Good — maintain |
| 55-60% | 30-40% | Marginal — review strategy |
| 50-55% | 40-50% | Edge eroding — reduce size |
| <50% | 50%+ → ruin | **Stop trading immediately** |

## Oracle Risk

- **UMA manipulation:** March 2025 saw $7M market manipulated via 25% voting power
- **Mitigation:** Exit subjective markets 48h before resolution; prefer objective outcomes (weather, economic data)
- **Weather markets:** Low oracle risk (objective temperature data from authoritative sources)

## Capital Allocation by Strategy

For a $10K portfolio:

| Strategy | Allocation | Max Per Trade | Rationale |
|----------|-----------|--------------|-----------|
| News-Driven | 40% ($4K) | $800 | Core edge, higher variance |
| Cross-Platform | 30% ($3K) | $600 | Reliable, lower risk |
| New Markets | 20% ($2K) | $400 | High upside, higher risk |
| NegRisk + Endgame | 10% ($1K) | $200 | Opportunistic |

## Profit Taking

- Withdraw 50% of profits monthly
- Never compound 100% (protects against drawdowns)
- Track cost basis for tax reporting (Polymarket doesn't issue 1099s)
