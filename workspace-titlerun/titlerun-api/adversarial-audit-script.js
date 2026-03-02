/**
 * ADVERSARIAL AUDIT SCRIPT
 * Hostile code reviewer trying to break the security + performance fixes
 */

const { normalizeId, ValidationError } = require('./src/routes/tradeEngine');
const { calculateRank, preprocessRosters, MAX_TEAMS, MAX_ROSTER_SIZE } = require('./src/services/tradeAnalysisService');

const findings = {
  critical: [],
  high: [],
  medium: [],
  low: [],
  testGaps: [],
  passed: [],
};

function reportBug(severity, title, details) {
  findings[severity].push({ title, details });
  console.log(`  🔴 ${severity.toUpperCase()}: ${title}`);
  if (details) console.log(`      ${details}`);
}

function reportPass(title) {
  findings.passed.push(title);
  console.log(`  ✅ PASS: ${title}`);
}

function reportTestGap(title, details) {
  findings.testGaps.push({ title, details });
  console.log(`  ⚠️ TEST GAP: ${title}`);
  if (details) console.log(`      ${details}`);
}

console.log('🔴 ADVERSARIAL AUDIT — SYSTEMATIC ATTACK\n');
console.log('═'.repeat(60));

// ============================================================
// ATTACK VECTOR 1: Prototype Pollution Bypass
// ============================================================
console.log('\n📍 ATTACK 1: Prototype pollution bypass attempts\n');

const pollutionAttempts = [
  { desc: 'Constructor.prototype pollution', payload: { constructor: { prototype: { isAdmin: true } } } },
  { desc: '__proto__ pollution', payload: { __proto__: { isAdmin: true } } },
  { desc: 'Object.create pollution', payload: Object.create({ evil: true }) },
  { desc: 'Object with valueOf override', payload: { valueOf: () => 42 } },
  { desc: 'Object with toString override', payload: { toString: () => '42' } },
];

pollutionAttempts.forEach(({ desc, payload }) => {
  try {
    const result = normalizeId(payload);
    reportBug('critical', `${desc} BYPASSED security check`, `Accepted object input, returned: ${result}`);
  } catch (err) {
    if (err instanceof ValidationError) {
      reportPass(`${desc} - correctly blocked`);
    } else {
      reportBug('high', `${desc} - wrong error type`, `Got ${err.name} instead of ValidationError`);
    }
  }
});

// ============================================================
// ATTACK VECTOR 2: Type Coercion Exploits
// ============================================================
console.log('\n📍 ATTACK 2: Type coercion edge cases\n');

const typeCoercionTests = [
  { desc: 'Boolean true', input: true, shouldReject: true },
  { desc: 'Boolean false', input: false, shouldReject: true },
  { desc: 'Empty string', input: '', shouldReject: true },
  { desc: 'Whitespace string', input: '   ', shouldReject: true },
  { desc: 'Number wrapper object', input: new Number(42), shouldReject: true },
  { desc: 'String wrapper object', input: new String('42'), shouldReject: true },
  { desc: 'Array with number', input: [42], shouldReject: true },
  { desc: 'Symbol', input: Symbol('test'), shouldReject: true },
];

// Only test if BigInt is available
if (typeof BigInt !== 'undefined') {
  typeCoercionTests.push({ desc: 'BigInt', input: BigInt(42), shouldReject: true });
}

typeCoercionTests.forEach(({ desc, input, shouldReject }) => {
  try {
    const result = normalizeId(input);
    if (shouldReject) {
      reportBug('high', `${desc} was ACCEPTED`, `Should reject, got: ${result}`);
    } else {
      reportPass(`${desc} - correctly accepted`);
    }
  } catch (err) {
    if (shouldReject) {
      reportPass(`${desc} - correctly rejected`);
    } else {
      reportBug('medium', `${desc} - incorrectly rejected`, err.message);
    }
  }
});

// ============================================================
// ATTACK VECTOR 3: Log Injection / DoS via Logging
// ============================================================
console.log('\n📍 ATTACK 3: Log injection attempts\n');

const logInjectionPayloads = [
  { desc: 'Newline injection', payload: '\n[CRITICAL] Fake alert' },
  { desc: 'JSON injection', payload: '{"event": "fake_metric"}' },
  { desc: 'ANSI escape codes', payload: '\x1b[31mRed text\x1b[0m' },
  { desc: 'Null byte injection', payload: 'test\x00admin' },
  { desc: 'Unicode control chars', payload: 'test\u0000\u0001' },
];

logInjectionPayloads.forEach(({ desc, payload }) => {
  try {
    normalizeId(payload);
  } catch (err) {
    // Check if error message or logging properly sanitized (visual inspection)
    if (err.message.includes(payload.substring(0, 10))) {
      reportTestGap(`${desc} - input NOT truncated in error message`, 
        'Error messages should truncate/sanitize malicious input');
    } else {
      reportPass(`${desc} - input properly sanitized`);
    }
  }
});

// Check huge string truncation
try {
  normalizeId('A'.repeat(100000));
} catch (err) {
  if (err.message.length > 500) {
    reportBug('medium', 'Huge string NOT truncated in error message', 
      `Error message length: ${err.message.length} chars (DoS risk via logging)`);
  } else {
    reportPass('Huge string properly truncated');
  }
}

// ============================================================
// ATTACK VECTOR 4: DoS via Input Size
// ============================================================
console.log('\n📍 ATTACK 4: DoS protection validation\n');

// Test 1: Huge roster
try {
  const hugeRoster = Array(MAX_ROSTER_SIZE + 1).fill(1);
  calculateRank(hugeRoster, [[1, 2, 3]]);
  reportBug('critical', 'Huge roster ACCEPTED - DoS vulnerability', 
    `Accepted ${MAX_ROSTER_SIZE + 1} players (should reject)`);
} catch (err) {
  if (err.name === 'BadRequestError') {
    reportPass(`Huge roster blocked (${MAX_ROSTER_SIZE + 1} players)`);
  } else {
    reportBug('medium', 'Huge roster rejected with wrong error type', `Got ${err.name}`);
  }
}

// Test 2: Too many teams
try {
  calculateRank([1, 2, 3], Array(MAX_TEAMS + 1).fill([1, 2, 3]));
  reportBug('critical', 'Too many teams ACCEPTED - DoS vulnerability',
    `Accepted ${MAX_TEAMS + 1} teams (should reject)`);
} catch (err) {
  if (err.name === 'BadRequestError') {
    reportPass(`Too many teams blocked (${MAX_TEAMS + 1} teams)`);
  } else {
    reportBug('medium', 'Too many teams rejected with wrong error type', `Got ${err.name}`);
  }
}

// Test 3: Oversized team roster
try {
  calculateRank([1, 2, 3], [[1, 2], Array(MAX_ROSTER_SIZE + 1).fill(1)]);
  reportBug('critical', 'Oversized team roster ACCEPTED - DoS vulnerability',
    `Accepted team with ${MAX_ROSTER_SIZE + 1} players`);
} catch (err) {
  if (err.name === 'BadRequestError') {
    reportPass(`Oversized team roster blocked`);
  } else {
    reportBug('medium', 'Oversized team roster rejected with wrong error type');
  }
}

// ============================================================
// ATTACK VECTOR 5: Memory Leak Detection
// ============================================================
console.log('\n📍 ATTACK 5: Memory leak testing\n');

const initialMem = process.memoryUsage().heapUsed;

// Run 10K operations
for (let i = 0; i < 10000; i++) {
  try {
    normalizeId(i);
    normalizeId('invalid');
  } catch (err) {
    // Expected
  }
}

// Force GC if available
if (global.gc) {
  global.gc();
}

const finalMem = process.memoryUsage().heapUsed;
const leakMB = (finalMem - initialMem) / 1024 / 1024;

if (leakMB > 10) {
  reportBug('high', 'Potential memory leak detected',
    `${leakMB.toFixed(2)}MB growth after 10K operations`);
} else {
  reportPass(`No significant memory leak (${leakMB.toFixed(2)}MB delta)`);
}

// ============================================================
// ATTACK VECTOR 6: Edge Case Number Handling
// ============================================================
console.log('\n📍 ATTACK 6: Edge case number handling\n');

const numberEdgeCases = [
  { desc: 'MAX_SAFE_INTEGER', input: Number.MAX_SAFE_INTEGER, shouldAccept: true },
  { desc: 'MAX_SAFE_INTEGER + 1', input: Number.MAX_SAFE_INTEGER + 1, shouldAccept: false },
  { desc: 'MIN_SAFE_INTEGER', input: Number.MIN_SAFE_INTEGER, shouldAccept: false }, // Negative
  { desc: 'Number.EPSILON', input: Number.EPSILON, shouldAccept: false }, // Decimal
  { desc: '0.9999999999999999', input: 0.9999999999999999, shouldAccept: true }, // Rounds to 1
  { desc: '-0', input: -0, shouldAccept: true }, // Special case: -0 === 0
  { desc: 'Number.MAX_VALUE', input: Number.MAX_VALUE, shouldAccept: false }, // Way too big
  { desc: '1.0 (exactly)', input: 1.0, shouldAccept: true },
];

numberEdgeCases.forEach(({ desc, input, shouldAccept }) => {
  try {
    const result = normalizeId(input);
    if (shouldAccept) {
      reportPass(`${desc} - correctly accepted: ${result}`);
    } else {
      reportBug('high', `${desc} ACCEPTED when should reject`, `Got: ${result}`);
    }
  } catch (err) {
    if (!shouldAccept) {
      reportPass(`${desc} - correctly rejected`);
    } else {
      reportBug('medium', `${desc} - incorrectly rejected`, err.message.substring(0, 60));
    }
  }
});

// ============================================================
// ATTACK VECTOR 7: String Edge Cases
// ============================================================
console.log('\n📍 ATTACK 7: String edge case handling\n');

const stringEdgeCases = [
  { desc: 'Scientific notation "1e10"', input: '1e10', shouldAccept: true }, // Parses to 10000000000
  { desc: 'Hex "0x2A"', input: '0x2A', shouldAccept: true }, // Parses to 42
  { desc: 'Binary "0b101010"', input: '0b101010', shouldAccept: true }, // Parses to 42
  { desc: 'Octal "0o52"', input: '0o52', shouldAccept: true }, // Parses to 42
  { desc: 'Leading plus "+42"', input: '+42', shouldAccept: true },
  { desc: 'Leading zeros "00042"', input: '00042', shouldAccept: true },
  { desc: 'Whitespace in middle "4 2"', input: '4 2', shouldAccept: false },
  { desc: 'Unicode space "42\u00A0"', input: '42\u00A0', shouldAccept: true }, // Non-breaking space, trimmed
  { desc: 'Unicode digits "٤٢"', input: '٤٢', shouldAccept: false }, // Arabic numerals
  { desc: 'Roman numerals "XLII"', input: 'XLII', shouldAccept: false },
  { desc: 'Negative zero "-0"', input: '-0', shouldAccept: true }, // Special: -0 === 0
];

stringEdgeCases.forEach(({ desc, input, shouldAccept }) => {
  try {
    const result = normalizeId(input);
    if (shouldAccept) {
      reportPass(`${desc} - accepted: ${result}`);
    } else {
      reportBug('medium', `${desc} ACCEPTED when should reject`, `Got: ${result}`);
    }
  } catch (err) {
    if (!shouldAccept) {
      reportPass(`${desc} - correctly rejected`);
    } else {
      reportBug('medium', `${desc} - incorrectly rejected`, err.message.substring(0, 60));
    }
  }
});

// ============================================================
// ATTACK VECTOR 8: Performance Regression Edge Cases
// ============================================================
console.log('\n📍 ATTACK 8: Performance regression testing\n');

// Test worst-case scenario: no matches found (must scan all teams)
const userRoster = Array.from({ length: 20 }, (_, i) => i + 1);
const largeLeague = Array.from({ length: 1000 }, () =>
  Array.from({ length: 100 }, (_, i) => i + 1000)
);

const start = performance.now();
const rank = calculateRank(userRoster, largeLeague);
const duration = performance.now() - start;

if (duration > 50) {
  reportBug('high', 'Performance regression detected',
    `1000 teams × 100 players took ${duration.toFixed(2)}ms (should be <50ms)`);
} else {
  reportPass(`Large league performant: ${duration.toFixed(2)}ms`);
}

// Test with preprocessed rosters
const preprocessed = preprocessRosters(largeLeague);
const start2 = performance.now();
const rank2 = calculateRank(userRoster, preprocessed);
const duration2 = performance.now() - start2;

if (duration2 > duration) {
  reportBug('high', 'Preprocessed rosters SLOWER than raw',
    `Raw: ${duration.toFixed(2)}ms, Preprocessed: ${duration2.toFixed(2)}ms`);
} else {
  reportPass(`Preprocessed rosters faster: ${duration2.toFixed(2)}ms vs ${duration.toFixed(2)}ms`);
}

// ============================================================
// ATTACK VECTOR 9: Null/Undefined Handling Gaps
// ============================================================
console.log('\n📍 ATTACK 9: Null/undefined edge cases\n');

const nullTests = [
  { desc: 'null input', input: null, shouldReturnNull: true },
  { desc: 'undefined input', input: undefined, shouldReturnNull: true },
  { desc: 'NaN', input: NaN, shouldReject: true },
  { desc: 'Infinity', input: Infinity, shouldReject: true },
  { desc: '-Infinity', input: -Infinity, shouldReject: true },
];

nullTests.forEach(({ desc, input, shouldReturnNull, shouldReject }) => {
  try {
    const result = normalizeId(input);
    if (shouldReturnNull && result === null) {
      reportPass(`${desc} - correctly returns null`);
    } else if (shouldReturnNull && result !== null) {
      reportBug('high', `${desc} - should return null`, `Got: ${result}`);
    } else if (!shouldReject) {
      reportPass(`${desc} - accepted: ${result}`);
    } else {
      reportBug('high', `${desc} ACCEPTED when should reject`, `Got: ${result}`);
    }
  } catch (err) {
    if (shouldReject) {
      reportPass(`${desc} - correctly rejected`);
    } else {
      reportBug('medium', `${desc} - incorrectly rejected`, err.message);
    }
  }
});

// ============================================================
// ATTACK VECTOR 10: ValidationError vs TypeError Consistency
// ============================================================
console.log('\n📍 ATTACK 10: Error type consistency\n');

const errorTypeTests = [
  { desc: 'Invalid string', input: 'abc', expectedError: 'ValidationError' },
  { desc: 'Invalid number', input: -1, expectedError: 'ValidationError' },
  { desc: 'Invalid object', input: {}, expectedError: 'ValidationError' },
  { desc: 'Invalid array', input: [], expectedError: 'ValidationError' },
];

errorTypeTests.forEach(({ desc, input, expectedError }) => {
  try {
    normalizeId(input);
    reportBug('high', `${desc} did NOT throw error`, 'Should have thrown ValidationError');
  } catch (err) {
    if (err.name === expectedError) {
      reportPass(`${desc} - correct error type: ${expectedError}`);
    } else {
      reportBug('medium', `${desc} - wrong error type`, `Expected ${expectedError}, got ${err.name}`);
    }
    
    // Check if ValidationError has details property
    if (expectedError === 'ValidationError' && !err.details) {
      reportBug('low', `${desc} - ValidationError missing details property`);
    }
  }
});

// ============================================================
// ATTACK VECTOR 11: Concurrent Request Safety
// ============================================================
console.log('\n📍 ATTACK 11: Concurrent request testing\n');

Promise.all([
  Promise.resolve(normalizeId(42)),
  Promise.resolve(normalizeId('42')),
  Promise.resolve(normalizeId(null)),
  Promise.resolve(calculateRank([1, 2], [[1, 2, 3]])),
]).then(() => {
  reportPass('Concurrent calls - no race conditions');
}).catch(err => {
  reportBug('high', 'Race condition detected', err.message);
});

// ============================================================
// ATTACK VECTOR 12: Array/Set Conversion Bugs
// ============================================================
console.log('\n📍 ATTACK 12: Array/Set conversion edge cases\n');

// Test empty arrays/sets
try {
  const emptyResult = calculateRank([], [[1, 2, 3]]);
  if (emptyResult === -1) {
    reportPass('Empty user roster - correctly returns TEAM_NOT_FOUND');
  } else {
    reportBug('high', 'Empty user roster returned wrong value', `Got: ${emptyResult}`);
  }
} catch (err) {
  reportBug('medium', 'Empty user roster threw error', err.message);
}

// Test rosters with only nulls
try {
  const nullOnlyResult = calculateRank([null, null, null], [[1, 2, 3]]);
  if (nullOnlyResult === -1) {
    reportPass('Null-only roster - correctly returns TEAM_NOT_FOUND');
  } else {
    reportBug('high', 'Null-only roster returned wrong value', `Got: ${nullOnlyResult}`);
  }
} catch (err) {
  reportBug('medium', 'Null-only roster threw error', err.message);
}

// Test duplicate handling
try {
  const dupeResult = calculateRank([1, 1, 1, 2, 2], [[1, 2, 3]]);
  if (dupeResult === 1) {
    reportPass('Duplicate IDs - correctly deduplicated');
  } else {
    reportBug('high', 'Duplicate IDs not properly handled', `Got rank: ${dupeResult}`);
  }
} catch (err) {
  reportBug('medium', 'Duplicate IDs caused error', err.message);
}

// ============================================================
// SUMMARY
// ============================================================
setTimeout(() => {
  console.log('\n' + '═'.repeat(60));
  console.log('📊 ADVERSARIAL AUDIT SUMMARY\n');
  
  console.log(`🔴 CRITICAL: ${findings.critical.length} issues`);
  findings.critical.forEach(f => console.log(`   - ${f.title}`));
  
  console.log(`\n⚠️ HIGH: ${findings.high.length} issues`);
  findings.high.forEach(f => console.log(`   - ${f.title}`));
  
  console.log(`\n🟡 MEDIUM: ${findings.medium.length} issues`);
  findings.medium.forEach(f => console.log(`   - ${f.title}`));
  
  console.log(`\n🔵 LOW: ${findings.low.length} issues`);
  findings.low.forEach(f => console.log(`   - ${f.title}`));
  
  console.log(`\n📋 TEST GAPS: ${findings.testGaps.length} gaps`);
  findings.testGaps.forEach(f => console.log(`   - ${f.title}`));
  
  console.log(`\n✅ PASSED: ${findings.passed.length} checks`);
  
  const totalIssues = findings.critical.length + findings.high.length + 
                      findings.medium.length + findings.low.length;
  
  console.log(`\n📈 TOTAL ISSUES FOUND: ${totalIssues}`);
  console.log(`📋 TEST COVERAGE GAPS: ${findings.testGaps.length}`);
  console.log(`✅ SECURITY CHECKS PASSED: ${findings.passed.length}`);
  
  if (findings.critical.length > 0) {
    console.log('\n⛔ RECOMMENDATION: BLOCK DEPLOYMENT (Critical issues found)');
  } else if (findings.high.length > 0) {
    console.log('\n⚠️ RECOMMENDATION: FIX FIRST (High issues found)');
  } else if (totalIssues > 5) {
    console.log('\n🟡 RECOMMENDATION: FIX SOON (Multiple medium/low issues)');
  } else {
    console.log('\n✅ RECOMMENDATION: SHIP (Low risk, acceptable for production)');
  }
  
  console.log('\n' + '═'.repeat(60));
  
  // Export for detailed report
  global.auditFindings = findings;
  
}, 100);
