# Test Setup Guide - TitleRun Bug Fix Tests

## Quick Start

### 1. Install Test Framework

```bash
npm install --save-dev vitest @vitest/ui
```

### 2. Update package.json

Add test scripts:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:watch": "vitest --watch"
  }
}
```

### 3. Create Vitest Config (Optional)

Create `vitest.config.js`:

```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom', // For React component tests
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.spec.js',
        '**/*.test.js'
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90
      }
    }
  }
});
```

### 4. Replace Placeholder Functions

The test file includes placeholder functions that need to be replaced with actual implementations:

```javascript
// Replace these in titlerun-bugfix-tests.spec.js:

// Import actual functions instead:
import { 
  getPlayerRank,
  idMatch,
  useLeaguematesPrefill,
  validatePlayerId,
  getAssetId 
} from '../src/utils'; // adjust path as needed
```

### 5. Run Tests

```bash
# Run all tests
npm test

# Run with UI (browser-based test runner)
npm run test:ui

# Run with coverage report
npm run test:coverage

# Run in watch mode (re-runs on file changes)
npm run test:watch
```

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Generate coverage
        run: npm run test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### Pre-commit Hook

Create `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm test -- --run
```

Install Husky:

```bash
npm install --save-dev husky
npx husky install
npx husky add .husky/pre-commit "npm test -- --run"
```

## Test Organization

### File Structure

```
src/
├── utils/
│   ├── getPlayerRank.js
│   ├── idMatch.js
│   ├── useLeaguematesPrefill.js
│   ├── validatePlayerId.js
│   └── getAssetId.js
tests/
├── titlerun-bugfix-tests.spec.js  (main test suite)
├── integration/                    (future integration tests)
└── e2e/                           (future end-to-end tests)
```

### Naming Conventions

- Test files: `*.spec.js` or `*.test.js`
- Test suites: `describe('Component/Function Name', ...)`
- Test cases: `it('should [expected behavior]', ...)`

## Coverage Requirements

Aim for:
- **90%+ line coverage**
- **90%+ function coverage**
- **85%+ branch coverage**
- **90%+ statement coverage**

View coverage report:
```bash
npm run test:coverage
# Open coverage/index.html in browser
```

## Debugging Tests

### VS Code Integration

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["test", "--", "--run"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Run Single Test

```bash
# Run only tests matching pattern
npm test -- --grep "Fix #1"

# Run single file
npm test titlerun-bugfix-tests.spec.js
```

### Debug Specific Test

```javascript
// Add .only to run just one test
it.only('should handle null values', () => {
  // This test will run in isolation
});
```

## Common Issues & Solutions

### Issue: sessionStorage not available in test environment

**Solution:** Mock it in setup:

```javascript
beforeEach(() => {
  global.sessionStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  };
});
```

### Issue: React hooks can't be tested outside components

**Solution:** Use `@testing-library/react-hooks`:

```bash
npm install --save-dev @testing-library/react-hooks
```

```javascript
import { renderHook } from '@testing-library/react-hooks';

it('should use hook', () => {
  const { result } = renderHook(() => useLeaguematesPrefill('league123'));
  expect(result.current).toEqual([]);
});
```

### Issue: Tests fail due to async timing

**Solution:** Use async/await or done callback:

```javascript
it('should handle async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBe('expected');
});
```

## Maintenance Checklist

- [ ] Update tests when adding new features
- [ ] Review coverage report weekly
- [ ] Run tests before every commit
- [ ] Update mocks when dependencies change
- [ ] Add tests for every bug fix
- [ ] Refactor tests to reduce duplication
- [ ] Document test patterns for team

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Jest Matchers Reference](https://jestjs.io/docs/expect) (compatible with Vitest)

---

**Last Updated:** 2026-02-28
