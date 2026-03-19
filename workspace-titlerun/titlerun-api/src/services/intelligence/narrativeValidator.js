/**
 * Narrative Validator
 *
 * Post-generation quality control for AI trade narratives.
 * Validates word count, voice, date stamps, and data density.
 * Returns a quality score (0-100) and list of warnings/failures.
 *
 * Quality Score:
 *   100    = Perfect, passes all checks
 *   80-99  = Minor warnings (acceptable)
 *   60-79  = Multiple warnings (review recommended)
 *   <60    = Failed validation (regenerate)
 *
 * @module narrativeValidator
 */

const logger = require('../../utils/logger').child({ service: 'narrative-validator' });

// ─── Validation Constants ──────────────────────────────────────

const SECTIONS = ['forTradingAway', 'forReceiving', 'againstTradingAway', 'againstReceiving', 'consensus'];
const WORD_COUNT_MIN = 25;
const WORD_COUNT_TARGET_MIN = 30;
const WORD_COUNT_TARGET_MAX = 50;
const WORD_COUNT_MAX = 60;

// Em dash variants to detect
const EM_DASH_PATTERN = /[\u2014\u2013\u2012]/g;  // —, –, ‒

// AI tell-tale phrases (case-insensitive)
const AI_TELLTALES = [
  'as an ai',
  'i think',
  'it seems',
  'in my opinion',
  'i believe',
  'it\'s worth noting',
  'it\'s important to note',
  'in conclusion',
  'overall,',
  'in summary',
  'let me',
  'i would say',
  'arguably',
  'needless to say',
  'it goes without saying',
  'at the end of the day',
];

// Date stamp pattern: (M/DD) or (MM/DD)
const DATE_STAMP_PATTERN = /\(\d{1,2}\/\d{1,2}\)\s*$/;

// Passive voice indicators (simplified detection)
const PASSIVE_INDICATORS = [
  /\bis\s+being\b/i,
  /\bwas\s+being\b/i,
  /\bhas\s+been\b/i,
  /\bhad\s+been\b/i,
  /\bwill\s+be\s+\w+ed\b/i,
  /\bcan\s+be\s+\w+ed\b/i,
  /\bis\s+\w+ed\s+by\b/i,
  /\bwas\s+\w+ed\s+by\b/i,
];

// ─── Validation Functions ──────────────────────────────────────

/**
 * Count words in a text string.
 */
function countWords(text) {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Check if text contains numbers (concrete data).
 */
function containsNumbers(text) {
  if (!text) return false;
  // Match standalone numbers, percentages, ordinals
  return /\d+/.test(text);
}

/**
 * Check for passive voice constructions.
 */
function detectPassiveVoice(text) {
  if (!text) return [];
  const found = [];
  for (const pattern of PASSIVE_INDICATORS) {
    const match = text.match(pattern);
    if (match) {
      found.push(match[0]);
    }
  }
  return found;
}

/**
 * Validate a single narrative section.
 *
 * @param {string} text - The section text
 * @param {string} sectionName - Name of the section (for logging)
 * @returns {{ score: number, warnings: string[], failures: string[] }}
 */
function validateSection(text, sectionName) {
  const warnings = [];
  const failures = [];
  let score = 100;

  // 1. Check section exists and is non-empty
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    failures.push(`${sectionName}: Section is empty`);
    return { score: 0, warnings, failures };
  }

  // 2. Word count validation
  const wordCount = countWords(text);
  if (wordCount < WORD_COUNT_MIN) {
    failures.push(`${sectionName}: Too short (${wordCount} words, min ${WORD_COUNT_MIN})`);
    score -= 30;
  } else if (wordCount < WORD_COUNT_TARGET_MIN) {
    warnings.push(`${sectionName}: Slightly short (${wordCount} words, target ${WORD_COUNT_TARGET_MIN}-${WORD_COUNT_TARGET_MAX})`);
    score -= 10;
  } else if (wordCount > WORD_COUNT_MAX) {
    warnings.push(`${sectionName}: Too long (${wordCount} words, max ${WORD_COUNT_MAX})`);
    score -= 15;
  } else if (wordCount > WORD_COUNT_TARGET_MAX) {
    warnings.push(`${sectionName}: Slightly long (${wordCount} words, target ${WORD_COUNT_TARGET_MIN}-${WORD_COUNT_TARGET_MAX})`);
    score -= 5;
  }

  // 3. Em dash detection (FAIL)
  const emDashes = text.match(EM_DASH_PATTERN);
  if (emDashes) {
    failures.push(`${sectionName}: Em dash detected (${emDashes.length} found) - use regular dashes (-) instead`);
    score -= 20;
  }

  // 4. Date stamp validation (FAIL if missing)
  if (!DATE_STAMP_PATTERN.test(text.trim())) {
    failures.push(`${sectionName}: Missing date stamp - must end with (M/DD) format`);
    score -= 15;
  }

  // 5. AI tell-tale detection (FAIL)
  const textLower = text.toLowerCase();
  for (const phrase of AI_TELLTALES) {
    if (textLower.includes(phrase)) {
      failures.push(`${sectionName}: AI tell-tale detected: "${phrase}"`);
      score -= 20;
      break; // Only penalize once
    }
  }

  // 6. Concrete data check (WARN if no numbers)
  if (!containsNumbers(text)) {
    warnings.push(`${sectionName}: No concrete data (numbers, stats, ages) found`);
    score -= 10;
  }

  // 7. Passive voice detection (WARN)
  const passiveInstances = detectPassiveVoice(text);
  if (passiveInstances.length > 1) {
    warnings.push(`${sectionName}: Multiple passive constructions detected: ${passiveInstances.join(', ')}`);
    score -= 5;
  }

  return { score: Math.max(0, score), warnings, failures };
}

/**
 * Validate a complete 5-part narrative.
 *
 * @param {object} narrative - The narrative object with 5 sections
 * @returns {{
 *   valid: boolean,
 *   qualityScore: number,
 *   warnings: string[],
 *   failures: string[],
 *   sectionScores: object,
 *   shouldRegenerate: boolean
 * }}
 */
function validateNarrative(narrative) {
  if (!narrative || typeof narrative !== 'object') {
    return {
      valid: false,
      qualityScore: 0,
      warnings: [],
      failures: ['Narrative is null or not an object'],
      sectionScores: {},
      shouldRegenerate: true,
    };
  }

  const allWarnings = [];
  const allFailures = [];
  const sectionScores = {};
  let totalScore = 0;

  // Validate each section
  for (const section of SECTIONS) {
    const result = validateSection(narrative[section], section);
    sectionScores[section] = result.score;
    totalScore += result.score;
    allWarnings.push(...result.warnings);
    allFailures.push(...result.failures);
  }

  // Check all sections exist
  const missingSections = SECTIONS.filter(s => !narrative[s]);
  if (missingSections.length > 0) {
    allFailures.push(`Missing sections: ${missingSections.join(', ')}`);
  }

  // Check generatedDate exists
  if (!narrative.generatedDate) {
    allWarnings.push('Missing generatedDate field');
  }

  // Calculate overall quality score (average of section scores)
  const qualityScore = Math.round(totalScore / SECTIONS.length);
  const valid = allFailures.length === 0;
  const shouldRegenerate = qualityScore < 60;

  if (shouldRegenerate) {
    logger.warn('[NarrativeValidator] Narrative below quality threshold', {
      qualityScore,
      failures: allFailures.length,
      warnings: allWarnings.length,
    });
  }

  return {
    valid,
    qualityScore,
    warnings: allWarnings,
    failures: allFailures,
    sectionScores,
    shouldRegenerate,
  };
}

/**
 * Quick check if a narrative passes minimum quality bar.
 * Used for cache-or-regenerate decisions.
 */
function passesMinimumQuality(narrative) {
  const result = validateNarrative(narrative);
  return result.qualityScore >= 60 && result.failures.length === 0;
}

module.exports = {
  validateNarrative,
  validateSection,
  passesMinimumQuality,
  countWords,
  containsNumbers,
  detectPassiveVoice,
  // Constants (for testing)
  SECTIONS,
  WORD_COUNT_MIN,
  WORD_COUNT_TARGET_MIN,
  WORD_COUNT_TARGET_MAX,
  WORD_COUNT_MAX,
  AI_TELLTALES,
};
