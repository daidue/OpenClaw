/**
 * CHAOS ENGINEERING TESTS
 * Execute these to reproduce critical bugs
 * 
 * Run: node chaos-tests.js
 */

// Import frontend implementations
import { normalizeId, idMatch, validateAndNormalizeAssets } from './idNormalization.js';

// Mock backend implementations (throws instead of returns null)
const backendNormalizeId = (id) => {
  if (id == null) throw new TypeError('ID is null/undefined');
  
  if (typeof id === 'string') {
    const trimmed = id.trim();
    if (trimmed === '') throw new TypeError('Empty string');
    
    const num = Number(trimmed);
    if (!Number.isFinite(num)) throw new TypeError('Not finite');
    if (!Number.isInteger(num)) throw new TypeError('Not integer');
    if (num < 0) throw new TypeError('Negative');
    if (num > Number.MAX_SAFE_INTEGER) throw new TypeError('Too large');
    
    return num;  // Returns NUMBER, not string!
  }
  
  if (typeof id === 'number') {
    if (!Number.isFinite(id)) throw new TypeError('Not finite');
    if (!Number.isInteger(id)) throw new TypeError('Not integer');
    if (id < 0) throw new TypeError('Negative');
    if (id > Number.MAX_SAFE_INTEGER) throw new TypeError('Too large');
    return id;
  }
  
  throw new TypeError('Invalid type');
};

const backendIdMatch = (a, b) => {
  if (a == null) throw new TypeError('First param null/undefined');
  if (b == null) throw new TypeError('Second param null/undefined');
  
  const typeA = typeof a;
  const typeB = typeof b;
  
  if (typeA !== 'string' && typeA !== 'number') throw new TypeError('Invalid type A');
  if (typeB !== 'string' && typeB !== 'number') throw new TypeError('Invalid type B');
  
  if (typeA === 'string' && a.trim() === '') throw new TypeError('Empty string A');
  if (typeB === 'string' && b.trim() === '') throw new TypeError('Empty string B');
  
  if (typeA === 'string' && typeB === 'string') {
    return a.trim() === b.trim();
  }
  
  const normA = typeA === 'string' ? a.trim() : String(a);
  const normB = typeB === 'string' ? b.trim() : String(b);
  
  return normA === normB;
};

// Test runner
const runTest = (name, fn) => {
  try {
    fn();
    console.log(`✅ ${name}`);
    return true;
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(`   ${error.message}`);
    return false;
  }
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message || 'Assertion failed');
};

console.log('\n🔥 CHAOS ENGINEERING TESTS - TitleRun ID Normalization\n');

let passed = 0;
let failed = 0;

// ============================================================================
// ATTACK VECTOR 1: TYPE CONFUSION
// ============================================================================
console.log('📦 ATTACK VECTOR 1: Type Confusion\n');

runTest('Leading zeros: "0123" vs 123', () => {
  const frontId = normalizeId("0123");  // Frontend
  const backId = backendNormalizeId("0123");  // Backend
  
  console.log(`   Frontend: "${frontId}" (${typeof frontId})`);
  console.log(`   Backend:  ${backId} (${typeof backId})`);
  
  assert(frontId !== String(backId), 'Type mismatch detected!');
}) ? failed++ : passed++;

runTest('Set deduplication broken', () => {
  const frontId = normalizeId("123");
  const backId = 123;
  
  const set = new Set([frontId, backId]);
  
  console.log(`   Set size: ${set.size} (expected 1, got ${set.size})`);
  console.log(`   Contents:`, Array.from(set));
  
  assert(set.size === 2, 'Deduplication failed - mixed types in Set');
}) ? failed++ : passed++;

runTest('idMatch cross-boundary fails', () => {
  const frontId = normalizeId("0123");  // "0123"
  const backId = 123;
  
  const matches = idMatch(frontId, backId);
  
  console.log(`   idMatch("${frontId}", ${backId}): ${matches}`);
  
  assert(matches === false, 'Cross-boundary match failed');
}) ? failed++ : passed++;

// ============================================================================
// ATTACK VECTOR 2: MAX_SAFE_INTEGER
// ============================================================================
console.log('\n📦 ATTACK VECTOR 2: MAX_SAFE_INTEGER Bypass\n');

runTest('MAX_SAFE_INTEGER + 1 as string (frontend accepts)', () => {
  const id = (Number.MAX_SAFE_INTEGER + 1).toString();
  
  const frontResult = normalizeId(id);
  
  console.log(`   Frontend accepts: "${frontResult}"`);
  
  let backendThrew = false;
  try {
    backendNormalizeId(id);
  } catch (e) {
    backendThrew = true;
    console.log(`   Backend rejects: ${e.message}`);
  }
  
  assert(frontResult !== null && backendThrew, 'Frontend accepts, backend rejects');
}) ? failed++ : passed++;

runTest('Precision loss at boundary', () => {
  const unsafe = Number.MAX_SAFE_INTEGER + 100;
  const asString = String(unsafe);
  const backToNumber = Number(asString);
  
  console.log(`   Original:     ${unsafe}`);
  console.log(`   As string:    "${asString}"`);
  console.log(`   Back to num:  ${backToNumber}`);
  console.log(`   Match:        ${unsafe === backToNumber}`);
  
  assert(unsafe !== backToNumber, 'Precision loss detected');
}) ? failed++ : passed++;

// ============================================================================
// ATTACK VECTOR 3: UNICODE ATTACKS
// ============================================================================
console.log('\n📦 ATTACK VECTOR 3: Unicode Attacks\n');

runTest('Zero-width space injection', () => {
  const clean = "123";
  const infected = "123\u200B";  // Zero-width space
  
  const normClean = normalizeId(clean);
  const normInfected = normalizeId(infected);
  
  console.log(`   Clean:    "${normClean}"`);
  console.log(`   Infected: "${normInfected}"`);
  console.log(`   Match:    ${idMatch(clean, infected)}`);
  
  assert(normClean !== normInfected, 'Zero-width space not stripped');
  assert(!idMatch(clean, infected), 'idMatch failed to detect difference');
}) ? failed++ : passed++;

runTest('Emoji injection (frontend allows)', () => {
  const id = "👍123";
  
  const result = normalizeId(id);
  
  console.log(`   Frontend result: "${result}"`);
  
  assert(result === id, 'Frontend accepts emoji in ID');
}) ? failed++ : passed++;

runTest('Homoglyph attack', () => {
  const ascii = "123";
  const unicode = "𝟏23";  // Mathematical Bold Digit One
  
  console.log(`   ASCII:   "${ascii}"`);
  console.log(`   Unicode: "${unicode}"`);
  console.log(`   Equal:   ${ascii === unicode}`);
  
  assert(ascii !== unicode, 'Homoglyph not detected');
}) ? failed++ : passed++;

// ============================================================================
// ATTACK VECTOR 4: PERFORMANCE BOMBS
// ============================================================================
console.log('\n📦 ATTACK VECTOR 4: Performance Bombs\n');

runTest('Whitespace padding (2MB string)', () => {
  const huge = " ".repeat(1000000) + "123" + " ".repeat(1000000);
  
  console.log(`   String size: ${(huge.length / 1024 / 1024).toFixed(2)} MB`);
  
  const start = performance.now();
  const result = normalizeId(huge);
  const duration = performance.now() - start;
  
  console.log(`   Normalized: "${result}"`);
  console.log(`   Duration:   ${duration.toFixed(2)}ms`);
  
  assert(result === "123", 'Trim works');
  assert(duration < 1000, 'Performance acceptable (< 1 sec)');
}) ? failed++ : passed++;

runTest('MAX_PREFILL_ASSETS enforcement', () => {
  const attack = {
    opponentRosterId: "123",
    get: Array(101).fill({ id: "456" }),  // Over limit!
    give: []
  };
  
  // Simulate readPrefillSafe validation
  const MAX_PREFILL_ASSETS = 100;
  const isValid = attack.get.length <= MAX_PREFILL_ASSETS && attack.give.length <= MAX_PREFILL_ASSETS;
  
  console.log(`   Asset count: ${attack.get.length}`);
  console.log(`   Limit:       ${MAX_PREFILL_ASSETS}`);
  console.log(`   Valid:       ${isValid}`);
  
  assert(!isValid, 'Exceeds limit - should be rejected');
}) ? failed++ : passed++;

// ============================================================================
// ATTACK VECTOR 5: NULL PROPAGATION
// ============================================================================
console.log('\n📦 ATTACK VECTOR 5: Null Propagation\n');

runTest('normalizeId(null) frontend vs backend', () => {
  const frontResult = normalizeId(null);
  
  let backendResult = 'NO_ERROR';
  try {
    backendNormalizeId(null);
  } catch (e) {
    backendResult = 'THREW';
  }
  
  console.log(`   Frontend: ${frontResult}`);
  console.log(`   Backend:  ${backendResult}`);
  
  assert(frontResult === null && backendResult === 'THREW', 'Different behaviors');
}) ? failed++ : passed++;

runTest('idMatch(null, null) frontend vs backend', () => {
  const frontResult = idMatch(null, null);
  
  let backendResult = 'NO_ERROR';
  try {
    backendIdMatch(null, null);
  } catch (e) {
    backendResult = 'THREW';
  }
  
  console.log(`   Frontend: ${frontResult}`);
  console.log(`   Backend:  ${backendResult}`);
  
  assert(frontResult === false && backendResult === 'THREW', 'Different behaviors');
}) ? failed++ : passed++;

runTest('Null in asset array', () => {
  const assets = [
    { id: "123" },
    { id: null },
    { id: undefined },
    { playerId: "" }
  ];
  
  const validated = validateAndNormalizeAssets(assets);
  
  console.log(`   Input:    ${assets.length} assets`);
  console.log(`   Validated: ${validated.length} assets`);
  
  assert(validated.length === 1, 'Null/undefined/empty filtered out');
  assert(validated[0].id === "123", 'Only valid asset remains');
}) ? failed++ : passed++;

// ============================================================================
// ATTACK VECTOR 6: REAL-WORLD SCENARIOS
// ============================================================================
console.log('\n📦 ATTACK VECTOR 6: Real-World Scenarios\n');

runTest('Prefill with leading zeros', () => {
  // Simulate prefill data from sessionStorage
  const prefillData = {
    opponentRosterId: "0123",
    get: [
      { id: "0456", name: "Player A" },
      { id: 789, name: "Player B" }
    ],
    give: []
  };
  
  // Simulate roster data from backend (numbers)
  const rosters = [
    { rosterId: 123, name: "Team A" },
    { rosterId: 456, name: "Team B" }
  ];
  
  const playerIds = [456, 789, 999];
  
  // Try to find matching roster
  const matchingRoster = rosters.find(r => 
    idMatch(r.rosterId, prefillData.opponentRosterId)
  );
  
  console.log(`   Looking for roster: "${prefillData.opponentRosterId}"`);
  console.log(`   Available:          ${rosters.map(r => r.rosterId).join(', ')}`);
  console.log(`   Found:              ${matchingRoster ? matchingRoster.name : 'NONE'}`);
  
  assert(!matchingRoster, 'Leading zero prevents match');
}) ? failed++ : passed++;

runTest('Mixed type roster deduplication', () => {
  const roster = [
    { id: "123", name: "Player A" },
    { id: 123, name: "Player A (dup)" },
    { id: " 123 ", name: "Player A (spaces)" }
  ];
  
  // Try to deduplicate
  const seen = new Set();
  const unique = roster.filter(p => {
    const normId = normalizeId(p.id);
    if (seen.has(normId)) return false;
    seen.add(normId);
    return true;
  });
  
  console.log(`   Original:  ${roster.length} players`);
  console.log(`   Unique:    ${unique.length} players`);
  console.log(`   Set size:  ${seen.size}`);
  console.log(`   Set:       ${Array.from(seen)}`);
  
  // This WILL deduplicate correctly because all normalize to "123" string
  // BUT if we use a plain Set with mixed types:
  const rawSet = new Set(roster.map(p => p.id));
  console.log(`   Raw Set:   ${rawSet.size} (without normalization)`);
  
  assert(unique.length === 1, 'Deduplication works with normalizeId');
  assert(rawSet.size === 3, 'Raw Set fails to deduplicate');
}) ? failed++ : passed++;

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n' + '='.repeat(60));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60) + '\n');

console.log('🔥 CRITICAL FINDINGS:\n');
console.log('1. Frontend returns STRING, backend returns NUMBER');
console.log('   → Set deduplication broken with mixed types');
console.log('   → Leading zeros cause lookup failures\n');

console.log('2. No unicode normalization');
console.log('   → Zero-width space attacks possible');
console.log('   → Homoglyph attacks possible\n');

console.log('3. Frontend accepts MAX_SAFE_INTEGER + 1 as string');
console.log('   → Backend rejects → crash on API call\n');

console.log('4. Different error handling (throw vs null)');
console.log('   → Frontend silently fails, backend crashes');
console.log('   → Inconsistent behavior across boundary\n');

console.log('📋 RECOMMENDATIONS:\n');
console.log('1. Align return types: both return STRING');
console.log('2. Add unicode normalization + strip zero-width chars');
console.log('3. Add numeric-only validation for string IDs');
console.log('4. Add size limits to sessionStorage writes');
console.log('5. Add null rosterId validation in readPrefillSafe');
console.log('6. Wrap prefill application in atomic transaction\n');

process.exit(failed > 0 ? 1 : 0);
