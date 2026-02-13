<!-- Summary: Value engine sources, Bayesian framework, correlation penalties, and scraper anti-detection standards.
     Read when: Implementing value aggregation, adding new sources, or building/debugging scrapers. -->

# Value Engine Architecture

## Current (5 sources)
KTC, FantasyCalc, DynastyProcess, Dynasty Daddy, FantasyPros

## Target (10 sources) — See `research/value-engine-data-panel.md`
**Core 7:** KTC, FantasyCalc, DynastyProcess, Dynasty Daddy, FantasyPros, DTC, FTC
**Stretch 3:** UTH, DLF, AOD

## Bayesian Framework (MANDATORY)
All value aggregation uses:
- **Weighting:** Beta posterior per source, position-specific priors
- **Correlation penalties:** `penalty = sqrt(1 - rho²)` from measured Pearson correlations
- **Aggregation:** Primary = Weighted Median, Secondary = Hodges-Lehmann
- **Uncertainty:** Bayesian Credible Intervals from posterior SD
- **Confidence:** Smooth functions (sqrt source count, linear agreement, exponential freshness decay)
- **GATE:** Bayesian must beat heuristic by ≥3% RMSE on backtest or revert

Reference: `research/value-engine-data-panel.md` (Appendix C has full computation example)

## Key Correlations
| Pair | rho | Penalty | Reason |
|------|-----|---------|--------|
| DP↔FP | 0.94 | 0.342 | DP derived from FP ECR |
| DTC↔FTC | 0.78 | 0.626 | Same owner, shared algo |
| DD↔KTC | 0.72 | 0.694 | DD aggregates KTC |
| UTH↔all | 0.32-0.45 | ~0.89 | Most independent source |

## Scraper Standards (Anti-Detection)

All web scrapers MUST follow these principles:
1. **Randomized timing:** 2-8 second delays between requests (not uniform distribution — use normal/beta)
2. **Realistic fingerprints:** Canvas, WebGL, fonts match claimed browser
3. **Residential proxies:** For Cloudflare-protected sites (DLF)
4. **Session persistence:** Reuse cookies, look like a returning user
5. **Mouse/scroll simulation:** For browser automation scrapers
6. **User-agent rotation:** From real browser distribution (not random strings)
7. **TLS fingerprint matching:** Must match claimed browser version
8. **Circuit breaker per source:** If blocked, back off automatically (exponential)
9. **Kill switch per source:** Instant disable if legal concerns arise
10. **Rate limit compliance:** Never exceed 1 request/second to any single source
