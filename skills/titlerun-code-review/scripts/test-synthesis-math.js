#!/usr/bin/env node

/**
 * test-synthesis-math.js - Unit tests for weighted scoring formulas
 * 
 * Verifies that all 2/3 reviewer scenarios produce correct weight adjustments
 * that sum to exactly 100.00%.
 */

const assert = require('assert');

const original = {security: 40, performance: 35, ux: 25};

function adjustWeights(missing) {
  const remaining = Object.entries(original)
    .filter(([k, v]) => k !== missing)
    .reduce((sum, [k, v]) => sum + v, 0);
  
  const adjusted = {};
  Object.entries(original)
    .filter(([k, v]) => k !== missing)
    .forEach(([k, v]) => {
      adjusted[k] = Math.round((v / remaining) * 10000) / 100;  // Round to 2 decimals
    });
  
  return adjusted;
}

// Test all scenarios
const tests = [
  {missing: 'security', expected: {performance: 58.33, ux: 41.67}},
  {missing: 'performance', expected: {security: 61.54, ux: 38.46}},
  {missing: 'ux', expected: {security: 53.33, performance: 46.67}}
];

let passed = 0;
let failed = 0;

console.log('Running weighted scoring math tests...\n');

tests.forEach(test => {
  const result = adjustWeights(test.missing);
  
  let testPassed = true;
  
  // Verify values
  Object.entries(test.expected).forEach(([k, v]) => {
    if (result[k] !== v) {
      console.error('❌ FAIL: ' + k + ' weight incorrect for missing ' + test.missing);
      console.error('   Expected: ' + v + '%');
      console.error('   Got: ' + result[k] + '%');
      testPassed = false;
      failed++;
    }
  });
  
  // Verify sum = 100
  const sum = Object.values(result).reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 100) >= 0.01) {
    console.error('❌ FAIL: Sum must equal 100, got ' + sum + ' for missing ' + test.missing);
    testPassed = false;
    failed++;
  }
  
  if (testPassed) {
    console.log('✅ PASS: missing ' + test.missing + ' → ' + JSON.stringify(result));
    console.log('   Sum: ' + sum + '%');
    passed++;
  }
});

console.log('\n' + '='.repeat(60));
console.log('Test Results: ' + passed + ' passed, ' + failed + ' failed');
console.log('='.repeat(60));

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\n✅ All synthesis math tests passed!');
  process.exit(0);
}
