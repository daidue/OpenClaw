# CLAUDE.md - TitleRun API

This document provides guidance for AI assistants working on the TitleRun API codebase.

## Shared Libraries

### @titlerun/validation

**When to use:** All ID validation, input sanitization

**Installation:** `npm link @titlerun/validation`

**Examples:**
```javascript
const { normalizeId } = require('@titlerun/validation');

// Validate user/player/trade IDs
const userId = normalizeId(req.params.userId);  // Throws if invalid

// Returns normalized number or null
const optionalId = normalizeId(req.query.id);  // null for undefined
```

**Coverage:** 142 tests, 99.28% coverage

**Anti-pattern:** Manual Number.isFinite/isInteger checks
- ❌ Don't: `if (!Number.isInteger(id)) throw new Error(...)`
- ✅ Do: `const id = normalizeId(req.params.id);`

**Enforcement:** ESLint will flag manual validation

## Library-First Development

**Before adding validation logic:**
1. Check: Does @titlerun/validation support this?
2. If NO: Extend library FIRST (add to validation package)
3. Then: Import from library in application code

**Never:**
- Write inline validation in route handlers
- Copy-paste validation across files
- Create util functions for validation (should be in library)
