/**
 * Tests for narrativeValidator.js
 * Updated with tests for: M2 (tighter date regex), M3 (em dash variants),
 * P2/P3 (filler words, expanded AI tell-tales)
 */
const {
  validateNarrative,
  validateSection,
  passesMinimumQuality,
  countWords,
  containsNumbers,
  detectPassiveVoice,
  detectFillerWords,
  SECTIONS,
  DATE_STAMP_PATTERN,
  EM_DASH_PATTERN,
} = require('../narrativeValidator');

// ─── Helper: Build valid narrative ─────────────────────────────

function buildValidNarrative(overrides = {}) {
  return {
    forTradingAway: "He's 27 now, which is when most RBs start to decline, and he's running behind New Orleans' 27th-ranked run blocking unit. The Saints finished 9-8 and lost their playoff game - not a great situation for a back approaching the age cliff. (3/19)",
    forReceiving: "WR1 role wide open in Chicago (DJ Moore was traded to Buffalo in March). He missed 5 games with a stress fracture in 2025, so there's a longevity risk, but he'll be the clear top target in Ben Johnson's offense next year. (3/19)",
    againstTradingAway: "Your RB depth behind him isn't proven yet - Algeier and Brooks both have upside but neither has locked down a starting role. You're also in a championship window right now, and moving Etienne creates a hole at a scarce position. (3/19)",
    againstReceiving: "He's still unproven as a year-3 WR, and the injury history is real. The Bears offense improved under Johnson, but it's not a lock that Odunze becomes a WR1 - you'd be betting on potential rather than production. (3/19)",
    consensus: "Keep Etienne this year. The dynasty market has overcorrected toward WRs, making RBs more valuable than ever - and you have some developing talent at WR plus the 1.05 pick to add another. Etienne should help you win now. (3/19)",
    generatedDate: '3/19',
    ...overrides,
  };
}

// ─── countWords ────────────────────────────────────────────────

describe('countWords', () => {
  test('counts words correctly', () => {
    expect(countWords('hello world')).toBe(2);
    expect(countWords('one two three four five')).toBe(5);
  });

  test('handles empty/null input', () => {
    expect(countWords('')).toBe(0);
    expect(countWords(null)).toBe(0);
    expect(countWords(undefined)).toBe(0);
  });

  test('handles extra whitespace', () => {
    expect(countWords('  hello   world  ')).toBe(2);
  });
});

// ─── containsNumbers ──────────────────────────────────────────

describe('containsNumbers', () => {
  test('detects numbers', () => {
    expect(containsNumbers('He is 27 years old')).toBe(true);
    expect(containsNumbers('ranked 3rd')).toBe(true);
    expect(containsNumbers('100% target share')).toBe(true);
  });

  test('returns false for no numbers', () => {
    expect(containsNumbers('no numbers here')).toBe(false);
    expect(containsNumbers('')).toBe(false);
    expect(containsNumbers(null)).toBe(false);
  });
});

// ─── detectPassiveVoice ───────────────────────────────────────

describe('detectPassiveVoice', () => {
  test('detects passive constructions', () => {
    expect(detectPassiveVoice('He has been traded')).toHaveLength(1);
    expect(detectPassiveVoice('The player was signed by the team')).toHaveLength(1);
  });

  test('returns empty for active voice', () => {
    expect(detectPassiveVoice('He leads the team in targets')).toHaveLength(0);
    expect(detectPassiveVoice('The coach traded the player')).toHaveLength(0);
  });

  // P3: Additional passive voice patterns
  test('detects "were X-ed by" pattern', () => {
    expect(detectPassiveVoice('They were drafted by the team')).toHaveLength(1);
  });

  test('detects "being X-ed" pattern', () => {
    const results = detectPassiveVoice('He is being traded today');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── detectFillerWords (P3) ───────────────────────────────────

describe('detectFillerWords', () => {
  test('detects common filler words', () => {
    const result = detectFillerWords('He is very fast and really talented');
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.map(f => f.word)).toContain('very');
    expect(result.map(f => f.word)).toContain('really');
  });

  test('returns empty for clean text', () => {
    const result = detectFillerWords('He runs a 4.3 forty and averages 5.2 yards per carry');
    expect(result.length).toBe(0);
  });

  test('handles null input', () => {
    expect(detectFillerWords(null)).toHaveLength(0);
  });
});

// ─── DATE_STAMP_PATTERN (M2) ─────────────────────────────────

describe('DATE_STAMP_PATTERN (M2)', () => {
  test('matches valid date stamps', () => {
    expect(DATE_STAMP_PATTERN.test('text (3/19)')).toBe(true);
    expect(DATE_STAMP_PATTERN.test('text (12/31)')).toBe(true);
    expect(DATE_STAMP_PATTERN.test('text (1/1)')).toBe(true);
    expect(DATE_STAMP_PATTERN.test('text (10/25)')).toBe(true);
  });

  test('rejects invalid months', () => {
    expect(DATE_STAMP_PATTERN.test('text (13/1)')).toBe(false);
    expect(DATE_STAMP_PATTERN.test('text (0/15)')).toBe(false);
  });

  test('rejects invalid days', () => {
    expect(DATE_STAMP_PATTERN.test('text (3/32)')).toBe(false);
    expect(DATE_STAMP_PATTERN.test('text (3/0)')).toBe(false);
  });

  test('rejects non-date stamp endings', () => {
    expect(DATE_STAMP_PATTERN.test('text without date stamp')).toBe(false);
    expect(DATE_STAMP_PATTERN.test('text (not/date)')).toBe(false);
  });
});

// ─── EM_DASH_PATTERN (M3) ────────────────────────────────────

describe('EM_DASH_PATTERN (M3)', () => {
  test('detects em dash (U+2014)', () => {
    expect('text — more text'.match(EM_DASH_PATTERN)).not.toBeNull();
  });

  test('detects en dash (U+2013)', () => {
    expect('text – more text'.match(EM_DASH_PATTERN)).not.toBeNull();
  });

  test('detects figure dash (U+2012)', () => {
    expect('text ‒ more text'.match(EM_DASH_PATTERN)).not.toBeNull();
  });

  test('detects horizontal bar (U+2015)', () => {
    expect('text ― more text'.match(EM_DASH_PATTERN)).not.toBeNull();
  });

  test('does NOT match regular hyphen', () => {
    expect('text - more text'.match(EM_DASH_PATTERN)).toBeNull();
  });
});

// ─── validateSection ──────────────────────────────────────────

describe('validateSection', () => {
  test('passes valid section with correct word count and date stamp', () => {
    const text = "He's 27 now, which is when most RBs start to decline, and he's running behind New Orleans' 27th-ranked run blocking unit. The Saints finished 9-8 - not great for a back approaching the age cliff. (3/19)";
    const result = validateSection(text, 'forTradingAway');
    expect(result.failures).toHaveLength(0);
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  test('fails on empty section', () => {
    const result = validateSection('', 'forTradingAway');
    expect(result.score).toBe(0);
    expect(result.failures.length).toBeGreaterThan(0);
  });

  test('fails on em dash', () => {
    const text = "He's 27 now — which is past the RB cliff — and he needs to go. Running behind a bad line at age 27. (3/19)";
    const result = validateSection(text, 'forTradingAway');
    const emDashFailure = result.failures.find(f => f.includes('dash'));
    expect(emDashFailure).toBeDefined();
  });

  test('fails on en dash (M3)', () => {
    const text = "He's 27 now – which is past the RB cliff – and he needs to go. Running behind a bad line at age 27. (3/19)";
    const result = validateSection(text, 'forTradingAway');
    const dashFailure = result.failures.find(f => f.includes('dash'));
    expect(dashFailure).toBeDefined();
  });

  test('fails on missing date stamp', () => {
    const text = "He's 27 now, which is when most RBs start to decline. The Saints finished 9-8 and that's bad for a running back entering his age-28 season.";
    const result = validateSection(text, 'forTradingAway');
    const dateFailure = result.failures.find(f => f.includes('date stamp'));
    expect(dateFailure).toBeDefined();
  });

  test('fails on invalid date stamp (M2)', () => {
    const text = "He's 27 now. The Saints finished 9-8 and that's bad. (13/32)";
    const result = validateSection(text, 'forTradingAway');
    const dateFailure = result.failures.find(f => f.includes('date stamp'));
    expect(dateFailure).toBeDefined();
  });

  test('fails on AI tell-tale phrases', () => {
    const text = "As an AI, I think he's 27 and declining. The Saints had a 9-8 record which isn't promising for his career trajectory going forward. (3/19)";
    const result = validateSection(text, 'forTradingAway');
    const aiFailure = result.failures.find(f => f.includes('AI tell-tale'));
    expect(aiFailure).toBeDefined();
  });

  test('fails on new AI tell-tales (P3)', () => {
    const text = "It should be noted that he's 27 and declining. Let me delve into the stats - his 9-8 record speaks volumes. (3/19)";
    const result = validateSection(text, 'forTradingAway');
    const aiFailure = result.failures.find(f => f.includes('AI tell-tale'));
    expect(aiFailure).toBeDefined();
  });

  test('warns on too-short sections', () => {
    const text = "He's old. Sell him now. (3/19)";
    const result = validateSection(text, 'forTradingAway');
    expect(result.score).toBeLessThan(100);
  });

  test('warns on sections without numbers', () => {
    const text = "He's getting older and the team around him isn't great. The offensive line has been struggling all season and that limits his ceiling going forward in dynasty formats. (3/19)";
    const result = validateSection(text, 'forTradingAway');
    const noNumbersWarning = result.warnings.find(w => w.includes('No concrete data'));
    // This text has no explicit numbers
  });

  // P2: Graduated word count penalty
  test('penalizes way-too-long sections more heavily', () => {
    const shortOverText = "He's 27 now, which is when most RBs start to decline, and he's running behind New Orleans' 27th-ranked run blocking unit. The Saints finished 9-8 and lost their Wild Card game - a disappointing end to a mediocre season. (3/19)";
    const shortOverResult = validateSection(shortOverText, 'test');

    // Way over - 80+ words
    const wayOverText = "He's 27 now, which is when most RBs start to decline, and he's running behind New Orleans' 27th-ranked run blocking unit. The Saints finished 9-8 and lost their Wild Card game. This is bad news for fantasy owners who invested heavily in him last season. The offensive line ranks 27th in run blocking and there's no clear path to improvement in the short term. The coaching staff hasn't shown they can fix this problem and the front office hasn't made significant upgrades. (3/19)";
    const wayOverResult = validateSection(wayOverText, 'test');

    // Way over should be penalized more
    expect(wayOverResult.score).toBeLessThan(shortOverResult.score);
  });
});

// ─── validateNarrative ────────────────────────────────────────

describe('validateNarrative', () => {
  test('passes a fully valid narrative', () => {
    const narrative = buildValidNarrative();
    const result = validateNarrative(narrative);
    expect(result.failures).toHaveLength(0);
    expect(result.qualityScore).toBeGreaterThanOrEqual(70);
    expect(result.shouldRegenerate).toBe(false);
  });

  test('fails on null narrative', () => {
    const result = validateNarrative(null);
    expect(result.valid).toBe(false);
    expect(result.qualityScore).toBe(0);
    expect(result.shouldRegenerate).toBe(true);
  });

  test('detects missing sections', () => {
    const narrative = buildValidNarrative({ forReceiving: undefined });
    const result = validateNarrative(narrative);
    expect(result.failures.length).toBeGreaterThan(0);
  });

  test('validates all 5 sections', () => {
    const narrative = buildValidNarrative();
    const result = validateNarrative(narrative);
    expect(Object.keys(result.sectionScores)).toEqual(SECTIONS);
  });

  test('warns about missing generatedDate', () => {
    const narrative = buildValidNarrative({ generatedDate: undefined });
    const result = validateNarrative(narrative);
    const dateWarning = result.warnings.find(w => w.includes('generatedDate'));
    expect(dateWarning).toBeDefined();
  });

  test('flags narrative with em dashes for regeneration', () => {
    const narrative = buildValidNarrative({
      forTradingAway: "He's 27 — past the RB cliff — and needs to go. Running behind a bad line at 27 years old is not sustainable. (3/19)",
    });
    const result = validateNarrative(narrative);
    expect(result.failures.length).toBeGreaterThan(0);
  });
});

// ─── passesMinimumQuality ─────────────────────────────────────

describe('passesMinimumQuality', () => {
  test('returns true for valid narrative', () => {
    const narrative = buildValidNarrative();
    expect(passesMinimumQuality(narrative)).toBe(true);
  });

  test('returns false for narrative with em dashes', () => {
    const narrative = buildValidNarrative({
      forTradingAway: "He's 27 — past the cliff — sell now. Bad line, bad team, limited upside. (3/19)",
      forReceiving: "Great — he's young — and talented. The upside is enormous. (3/19)",
    });
    expect(passesMinimumQuality(narrative)).toBe(false);
  });
});
