# Bayesian Value Engine Framework — Quick Reference

## Confidence Score (Smooth Functions)
```javascript
confidence_source = 30 × (source_count / max_sources)^0.5    // Diminishing returns
confidence_agreement = 30 × max(0, 1 - CV/0.4)               // Linear decay
confidence_diversity = 20 × (type_count / max_types)          // Linear
confidence_freshness = 20 × exp(-avg_staleness / 72)          // Exponential (72h half-life)
```

## Correlation Penalty
```javascript
function correlationPenalty(rho) {
  return Math.sqrt(1 - rho * rho);  // Range [0, 1]
}
// DP↔FP: rho=0.94 → penalty=0.342
// DTC↔FTC: rho=0.78 → penalty=0.626
// DD↔KTC: rho=0.72 → penalty=0.694
```

## Bayesian Weight Computation
```
Step 1: Beta posterior accuracy per source — Beta(alpha, beta) from trade outcomes
Step 2: Correlation penalties — sqrt(1 - rho²) for correlated pairs
Step 3: Freshness weights — exp(-0.693 × staleness_hours / half_life_hours)
Step 4: Final weight = accuracy_mean × correlation_penalty × freshness, normalized to sum=1
Step 5: Aggregation — Weighted Median (primary), Hodges-Lehmann (secondary)
Step 6: Uncertainty — Bayesian Credible Intervals from posterior SD
```

## Confidence Labels
| Score | Label |
|-------|-------|
| 80-100 | ELITE |
| 60-79 | HIGH |
| 40-59 | MODERATE |
| 20-39 | LOW |
| 0-19 | SPECULATIVE |

## GATE Criterion
Bayesian must beat heuristic by ≥3% RMSE on backtest or REVERT to heuristic.

## Full Example
See `research/value-engine-data-panel.md` Appendix C for complete worked computation.
