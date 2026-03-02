# Changelog

All notable changes to the Definition of Done skill.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) + [Semantic Versioning](https://semver.org/).

---

## [1.3.0] - 2026-03-02

### Added
- **Gate 0: package.json check** — Clear early failure when not in a Node.js project root (FIX-1)
- **--self-test mode** — Validates internal functions (jq, mktemp, backup dir creation) (FIX-7)
- **Inline documentation** — Added comments explaining warn_console_logs rationale, backup format, timeout fallback (FIX-6)

### Fixed
- **FIX_COUNT subshell bug** — Replaced `find | while` pipes with process substitution so fix counts are preserved (FIX-2)
- **shellcheck issues** — Fixed SC2086 (unquoted `$ret`), SC2162 (`read` without `-r`), SC2155 (declare/assign separately) (FIX-4)
- **Gate 4 error messages** — Now distinguishes peer dep warnings (non-blocking) from missing deps (critical) (FIX-5)
- **Build timeout message** — Suggests increasing timeout for legitimately slow builds (FIX-5)
- **Gate 1 error message** — Clearer remediation instructions (FIX-5)

### Changed
- **Removed dead code** — Unused `ISSUES=()` array, decorative while loop simplified to honest single-pass (FIX-3)
- **Version bump** — JSON output now reports v1.3.0
- **Check count** — 26 checks (added Gate 0)

### Audit Results
- **Before:** 78/100 (14 shellcheck findings)
- **After:** 95/100 (3 shellcheck findings, all info-level false positives)

---

## [1.1.0] - 2026-03-01

### Added
- **--json output mode** — Structured JSON for CI/CD pipelines (`--json` flag)
- **--fix auto-remediation** — Auto-fix 5 common issues before checking (`--fix` flag)
  - Fix 1: Remove .ts/.tsx extensions from imports in .js/.jsx files
  - Fix 2: Remove console.log statements (skips test files)
  - Fix 3: Remove trailing whitespace
  - Fix 4: ESLint --fix
  - Fix 5: Format package.json (sort keys, 2-space indent)
- **--dry-run mode** — Preview what --fix would change without modifying files
- **--env override** — Force environment (dev/staging/production)
- **11 new checks** (14 → 25 total):
  - Check 15: Trailing whitespace detection
  - Check 16: TODO/FIXME/HACK tracking (warn at >20)
  - Check 17: Large file detection (>100KB source files)
  - Check 18: .env file exposure (committed to git)
  - Check 19: Circular dependency detection (madge)
  - Check 20: Duplicate code detection (jscpd)
  - Check 21: Unused export detection (ts-prune)
  - Check 22: Environment variable documentation validation
  - Check 23: Bundle size check
  - Check 24: SQL injection risk detection
  - Check 25: XSS prevention (dangerouslySetInnerHTML/innerHTML)
- **Graceful degradation** — Optional tools (madge, jscpd, ts-prune) skip cleanly if not installed
- **Issue tracking** — Every check failure tracked with severity, file, line, message, and fix suggestion

### Fixed (5 HIGH Issues)
- **H1: Dropped meta-skill framing** — Repositioned as "production-ready pre-deployment automation" (was incorrectly claiming meta-skill status with only Layer 1)
- **H2: Removed broken cognitive profile paths** — Removed references to `../../cognitive-profiles/` that don't exist
- **H3: Removed fake require() integration examples** — All check modules had nonsensical `require('./checks/...').runAll()`. Replaced with real integration patterns using shell exec
- **H4: Fixed CHANGELOG check for main branch** — Now compares against last git tag (`git describe --tags --abbrev=0`) instead of `git diff main..HEAD` which is empty when on main
- **H5: Broadened exit code 2 (WARN) logic** — Previously barely reachable. Now: DEV any HIGH/MEDIUM → WARN; STAGING 1-3 HIGH or >2 MEDIUM → WARN; PRODUCTION >3 MEDIUM → WARN (HIGH still blocks)

### Changed
- Check count: 14 → 25 automated checks
- Script version: 1.0.1 → 1.1.0
- SKILL.md rewritten: cleaner, feature-focused, no meta-skill claims
- README.md rewritten: --json and --fix usage examples
- All documentation updated for v1.1.0

---

## [1.0.1] - 2026-03-01

### Fixed (Adversarial Audit Findings)

**Blockers Fixed:**
- B1: Honest check count — Updated from "93 checks" to "14 automated checks + 30 documented patterns"
- B2: Removed `set -e` — Explicit error handling via `if` blocks and `timeout` wrappers
- B3: Temp file cleanup — mktemp + trap EXIT

**Critical Issues Fixed:**
- C1: Improved TS/JS import regex (catches from/import()/require() patterns)
- C2: Timeout handling for all external commands
- C3: Cross-platform compatibility (macOS + Linux)
- C4: Removed Jest-specific `--passWithNoTests`

---

## [1.0.0] - 2026-03-01

### Added
- Initial release after 2026-03-01 production incident (login broken by TS/JS import mismatch)
- 14 automated checks + 30 documented patterns
- Progressive disclosure architecture
- Executable automation script
- Check modules: build-verification, code-quality, breaking-changes, database-sync
- Workflows: pre-deploy-checklist, automated-checks
- Exit codes: 0=PASS, 1=FAIL, 2=WARN

---

## Version History

| Version | Date | Score | Summary |
|---------|------|-------|---------|
| 1.1.0 | 2026-03-01 | ~95/100 | --json, --fix, 25 checks, 5 HIGH fixes |
| 1.0.1 | 2026-03-01 | ~83/100 | Audit fixes |
| 1.0.0 | 2026-03-01 | ~52/100 | Initial release |
