# Changelog — TitleRun Code Review Skill

All notable changes to this skill will be documented in this file.

## [1.0.0] - 2026-02-12

### Added
- **Initial release** of TitleRun Code Review Expert Panel skill
- **10-expert panel** covering security, database, performance, API design, testing, domain logic, DevOps, data pipelines, Bayesian methods, and frontend/UX
- **Health scoring system** (0-100) with severity-based deductions
- **SKILL.md** — Complete skill definition with process, expert personas, output format, implementation notes
- **cron-config.json** — 3x daily automatic review jobs (10am, 3pm, 9pm EST)
- **HEARTBEAT-addition.md** — Integration instructions for Rush's workflow
- **run-review.sh** — Reference implementation script for commit fetching and file reading
- **README.md** — Comprehensive overview, setup, usage, troubleshooting
- **QUICK-REFERENCE.md** — Quick-reference card for Rush (score → action map, commands, checklist)
- **EXAMPLE-REVIEW.md** — Sample review output showing expected format and detail level
- **CHANGELOG.md** — This file

### Expert Panel Composition
1. Security Architect (Sarah Chen) — Auth, injection, secrets, rate limiting
2. Database Engineer (Marcus Rodriguez) — Query perf, N+1s, migrations, indexes
3. Node.js Performance Engineer (Priya Sharma) — Memory leaks, event loop, async patterns
4. API Design Specialist (Jordan Kim) — REST conventions, errors, schemas, versioning
5. Testing Engineer (Alex Thompson) — Coverage, edge cases, mocks, integration
6. Fantasy Sports Domain Expert (Dana Martinez) — Scoring, roster rules, trade fairness
7. DevOps/Reliability Engineer (Chris O'Brien) — Circuit breakers, retries, observability
8. Data Pipeline Architect (Taylor Nguyen) — Scraper resilience, freshness, caching
9. Bayesian/Statistical Methods Expert (Dr. Rebecca Singh) — Priors, posteriors, convergence
10. Frontend/UX Engineer (Jamie Park) — React perf, state, accessibility, UX

### Scoring System
- **Starting score:** 100
- **Critical Bug:** -15 per issue
- **Major Bug:** -8 per issue
- **Minor Bug:** -3 per issue
- **Security Issue:** -20 per issue
- **Improvements:** No deductions (recommendations only)

### Health Bands
- **90-100 🟢 Healthy** — Ship it
- **80-89 🟡 Needs Attention** — Fix Major+ this sprint
- **70-79 🟠 Concerning** — Fix Critical immediately
- **<70 🔴 Emergency** — STOP feature work

### Automation
- **3x daily cron jobs** — 10am, 3pm, 9pm EST
- **Self-triggered reviews** — After every 3+ commits by Rush
- **State management** — Tracks last review timestamp to avoid duplicates
- **Inbox integration** — Posts summaries to Jeff's inbox

### Token Budget
- **Target:** <10K tokens per review
- **Optimization:** Truncate files >500 lines, focus on changed lines, top 3 findings per expert

### Dependencies
- `gh` CLI authenticated as `daidue`
- Local clone of `daidue/titlerun-api` at `~/Desktop/titlerun-api`
- `titlerun-dev` skill (loaded for codebase context)

---

## Future Enhancements (Backlog)

### Potential Additions
- **Code complexity metrics** — Cyclomatic complexity, cognitive load scores
- **Dependency vulnerability scanning** — npm audit integration
- **Performance benchmarking** — Detect regressions in query times, API response times
- **Git blame integration** — Identify repeat offenders (patterns in commits)
- **Historical trend tracking** — Score over time, issue velocity, fix rate
- **Custom expert weights** — Adjust expert influence based on Rush's focus areas
- **Auto-fix suggestions** — Generate diff patches for common issues
- **IDE integration** — VSCode extension to run reviews locally before commit

### Potential Refinements
- **Dynamic expert selection** — Only invoke experts relevant to changed files (reduce token usage)
- **Severity calibration** — Adjust deduction values based on actual production impact
- **False positive tracking** — Log when Rush disagrees with findings, retrain experts
- **Multi-repo support** — Extend to `titlerun-app` (frontend) and `titlerun.co` (marketing site)

---

## Version History

| Version | Date | Key Changes |
|---------|------|-------------|
| 1.0.0 | 2026-02-12 | Initial release — 10-expert panel, 3x daily cron, Rush integration |

---

## Maintainers

- **Primary:** Jeff Daniels (product owner, infrastructure)
- **Primary User:** Rush (titlerun agent)
- **Built by:** dev agent (subagent for Jeff)

---

## License

Proprietary — Internal use only (TitleRun project)

---

**Last Updated:** 2026-02-12  
**Next Review:** Quarterly (May 2026) — Assess expert relevance, scoring accuracy, Rush's feedback
