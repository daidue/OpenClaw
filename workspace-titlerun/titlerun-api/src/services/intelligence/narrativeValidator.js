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
 * Fixes applied:
 *   M2: Tightened date stamp regex to validate actual dates
 *   M3: Complete em dash/dash pattern (includes horizontal bar)
 *   P2/P3: Expanded AI tell-tales, better passive voice detection, word count tolerance
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

// M3 FIX: Complete em/en dash and related horizontal bar variants
const EM_DASH_PATTERN = /[\u2012\u2013\u2014\u2015]/g;  // ‒ (figure), – (en), — (em), ― (horizontal bar)

// P3: Expanded AI tell-tale phrases (case-insensitive)
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
  // P3: Additional AI tell-tales
  'it should be noted',
  'it bears mentioning',
  'without a doubt',
  'rest assured',
  'it cannot be overstated',
  'with that being said',
  'that being said',
  'having said that',
  'it\'s crucial to understand',
  'delve into',
  'navigate the',
  'landscape of',
  'in the realm of',
  'at the forefront',
  'game-changer',
  'unlock the potential',
];

// M2 FIX: Tighter date stamp pattern that validates actual month/day ranges
// Matches (1/1) through (12/31), rejects (13/32), (0/0), etc.
const DATE_STAMP_PATTERN = /\((1[0-2]|[1-9])\/(3[01]|[12]\d|[1-9])\)\s*$/;

// P3: Improved passive voice indicators
const PASSIVE_INDICATORS = [
  /\bis\s+being\b/i,
  /\bwas\s+being\b/i,
  /\bhas\s+been\b/i,
  /\bhad\s+been\b/i,
  /\bwill\s+be\s+\w+ed\b/i,
  /\bcan\s+be\s+\w+ed\b/i,
  /\bis\s+\w+ed\s+by\b/i,
  /\bwas\s+\w+ed\s+by\b/i,
  /\bwere\s+\w+ed\s+by\b/i,
  /\bbeing\s+\w+ed\b/i,
  /\bget\s+\w+ed\b/i,
  /\bgot\s+\w+ed\b/i,
];

// P3: Filler words that weaken writing
const FILLER_WORDS = [
  'very', 'really', 'quite', 'somewhat', 'rather', 'fairly',
  'basically', 'essentially', 'actually', 'literally',
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
 * P3: Detect filler words that weaken writing.
 */
function detectFillerWords(text) {
  if (!text) return [];
  const textLower = text.toLowerCase();
  const found = [];
  for (const filler of FILLER_WORDS) {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi');
    const matches = textLower.match(regex);
    if (matches && matches.length > 0) {
      found.push({ word: filler, count: matches.length });
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

  // 2. Word count validation (P2: more nuanced scoring)
  const wordCount = countWords(text);
  if (wordCount < WORD_COUNT_MIN) {
    failures.push(`${sectionName}: Too short (${wordCount} words, min ${WORD_COUNT_MIN})`);
    score -= 30;
  } else if (wordCount < WORD_COUNT_TARGET_MIN) {
    warnings.push(`${sectionName}: Slightly short (${wordCount} words, target ${WORD_COUNT_TARGET_MIN}-${WORD_COUNT_TARGET_MAX})`);
    score -= 10;
  } else if (wordCount > WORD_COUNT_MAX) {
    // P2: Graduated penalty for over-length
    const overBy = wordCount - WORD_COUNT_MAX;
    if (overBy > 20) {
      failures.push(`${sectionName}: Way too long (${wordCount} words, max ${WORD_COUNT_MAX})`);
      score -= 25;
    } else {
      warnings.push(`${sectionName}: Too long (${wordCount} words, max ${WORD_COUNT_MAX})`);
      score -= 15;
    }
  } else if (wordCount > WORD_COUNT_TARGET_MAX) {
    warnings.push(`${sectionName}: Slightly long (${wordCount} words, target ${WORD_COUNT_TARGET_MIN}-${WORD_COUNT_TARGET_MAX})`);
    score -= 5;
  }

  // 3. M3: Em dash detection (FAIL) - includes all dash variants
  const emDashes = text.match(EM_DASH_PATTERN);
  if (emDashes) {
    failures.push(`${sectionName}: Em/en dash detected (${emDashes.length} found) - use regular dashes (-) instead`);
    score -= 20;
  }

  // 4. M2: Date stamp validation with tighter regex
  if (!DATE_STAMP_PATTERN.test(text.trim())) {
    failures.push(`${sectionName}: Missing or invalid date stamp - must end with (M/DD) format`);
    score -= 15;
  }

  // 5. AI tell-tale detection (FAIL)
  const textLower = text.toLowerCase();
  const detectedTelltales = [];
  for (const phrase of AI_TELLTALES) {
    if (textLower.includes(phrase)) {
      detectedTelltales.push(phrase);
    }
  }
  if (detectedTelltales.length > 0) {
    failures.push(`${sectionName}: AI tell-tale detected: "${detectedTelltales[0]}"`);
    score -= 20;
    // P3: Additional penalty for multiple tell-tales
    if (detectedTelltales.length > 1) {
      score -= 5 * (detectedTelltales.length - 1);
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

  // 8. P3: Filler word detection (WARN)
  const fillerWords = detectFillerWords(text);
  if (fillerWords.length > 2) {
    warnings.push(`${sectionName}: Excessive filler words: ${fillerWords.map(f => f.word).join(', ')}`);
    score -= 3;
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
  detectFillerWords,
  // Constants (for testing)
  SECTIONS,
  WORD_COUNT_MIN,
  WORD_COUNT_TARGET_MIN,
  WORD_COUNT_TARGET_MAX,
  WORD_COUNT_MAX,
  AI_TELLTALES,
  DATE_STAMP_PATTERN,
  EM_DASH_PATTERN,
};
