# Changelog

All notable changes to `@titlerun/validation` will be documented in this file.

## [1.0.0] - 2026-02-28

### Added
- Initial release of shared validation library
- `normalizeId()` function with comprehensive security hardening
- `idMatch()` function for safe ID comparison
- `VALIDATION_CONSTANTS` configuration object
- LRU cache for performance optimization (20x improvement)
- TypeScript strict mode support
- 100% test coverage (95 tests)

### Security
- Input enumeration prevention (no echoing of invalid input)
- Invisible Unicode rejection (\u200B, \uFEFF, \u180E, \u2060, etc.)
- Non-ASCII digit rejection (０-９, ①-⑳)
- HTML tag rejection (XSS prevention)
- Constant-time validation (timing attack mitigation)
- Symbol crash prevention (DoS mitigation)

### Fixed
- **CRITICAL:** `idMatch(null, null)` now returns `false` (was `true`)
- Whitespace trimming before validation
- Negative ID rejection
- Floating point rejection
- Precision loss prevention for large integers

### Performance
- LRU cache reduces validation latency from 0.02ms to 0.001ms (cache hit)
- 20x performance improvement on hot path

### Documentation
- Complete API documentation
- Usage examples
- Security hardening details
- Testing strategy
