const { performance } = require('perf_hooks');
const {
  calculateRank,
  preprocessRosters,
  MAX_TEAMS,
  MAX_ROSTER_SIZE,
} = require('../services/tradeAnalysisService');
const { ROSTER_MATCH_THRESHOLD, TEAM_NOT_FOUND } = require('../constants');
const BadRequestError = require('../errors/BadRequestError');

describe('calculateRank', () => {
  describe('FIX #1: Edge Cases', () => {
    test('should handle null/undefined players in user roster', () => {
      const userRoster = [1, null, 2, undefined, 3];
      const allRosters = [[1, 2, 3, 4, 5]];
      
      // Should filter out null/undefined and match with clean roster
      const rank = calculateRank(userRoster, allRosters);
      expect(rank).toBe(1); // 3/3 = 100% match
    });

    test('should handle null/undefined players in team roster', () => {
      const userRoster = [1, 2, 3];
      const allRosters = [[1, null, 2, undefined, 3, 4, 5]];
      
      const rank = calculateRank(userRoster, allRosters);
      expect(rank).toBe(1); // 3/3 = 100% match
    });

    test('should reject non-array user roster', () => {
      expect(() => {
        calculateRank('not-an-array', [[1, 2, 3]]);
      }).toThrow(BadRequestError);
      
      expect(() => {
        calculateRank('not-an-array', [[1, 2, 3]]);
      }).toThrow('userRoster must be an array');
    });

    test('should reject non-array allRosters', () => {
      expect(() => {
        calculateRank([1, 2, 3], 'not-an-array');
      }).toThrow(BadRequestError);
      
      expect(() => {
        calculateRank([1, 2, 3], 'not-an-array');
      }).toThrow('allRosters must be an array');
    });

    test('should reject non-array elements in allRosters', () => {
      const userRoster = [1, 2, 3];
      const allRosters = [[1, 2, 3], 'invalid-roster', [4, 5, 6]];
      
      expect(() => {
        calculateRank(userRoster, allRosters);
      }).toThrow(BadRequestError);
      
      expect(() => {
        calculateRank(userRoster, allRosters);
      }).toThrow('allRosters[1] must be an array');
    });

    test('should deduplicate IDs to prevent >100% match', () => {
      // User roster with duplicates
      const userRoster = [1, 1, 1, 2, 2, 3];
      const allRosters = [[1, 2, 3, 4, 5]];
      
      const rank = calculateRank(userRoster, allRosters);
      // After deduplication: [1, 2, 3]
      // Match: 3/3 = 100% (not 6/3 = 200%)
      expect(rank).toBe(1);
    });

    test('should return TEAM_NOT_FOUND when no roster meets threshold', () => {
      const userRoster = [1, 2, 3, 4, 5];
      const allRosters = [
        [6, 7, 8, 9, 10], // 0% match
        [1, 7, 8, 9, 10], // 20% match (< 70%)
      ];
      
      const rank = calculateRank(userRoster, allRosters);
      expect(rank).toBe(TEAM_NOT_FOUND);
    });

    test('should return TEAM_NOT_FOUND for empty user roster', () => {
      const userRoster = [];
      const allRosters = [[1, 2, 3]];
      
      const rank = calculateRank(userRoster, allRosters);
      expect(rank).toBe(TEAM_NOT_FOUND);
    });

    test('should return TEAM_NOT_FOUND when user roster only contains null/undefined', () => {
      const userRoster = [null, undefined, null];
      const allRosters = [[1, 2, 3]];
      
      const rank = calculateRank(userRoster, allRosters);
      expect(rank).toBe(TEAM_NOT_FOUND);
    });

    test('should skip empty team rosters', () => {
      const userRoster = [1, 2, 3];
      const allRosters = [
        [], // Empty
        [null, undefined], // Only null/undefined
        [1, 2, 3, 4, 5], // Valid match
      ];
      
      const rank = calculateRank(userRoster, allRosters);
      expect(rank).toBe(3); // Third roster (1-based index)
    });

    test('should return correct 1-based rank for exact threshold match', () => {
      const userRoster = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const allRosters = [
        [11, 12, 13, 14, 15], // 0% match
        [1, 2, 3, 4, 5, 6, 7, 20, 21, 22], // 70% match (exactly at threshold)
      ];
      
      const rank = calculateRank(userRoster, allRosters);
      expect(rank).toBe(2); // Second roster
    });

    test('should return first matching rank when multiple teams meet threshold', () => {
      const userRoster = [1, 2, 3];
      const allRosters = [
        [4, 5, 6], // 0% match
        [1, 2, 3, 4, 5], // 100% match
        [1, 2, 3, 6, 7], // 100% match
      ];
      
      const rank = calculateRank(userRoster, allRosters);
      expect(rank).toBe(2); // First matching team
    });

    test('should handle string and number IDs interchangeably', () => {
      const userRoster = ['1', '2', '3'];
      const allRosters = [[1, 2, 3, 4, 5]];
      
      const rank = calculateRank(userRoster, allRosters);
      // Note: This will return TEAM_NOT_FOUND because '1' !== 1
      // String/number comparison requires strict equality
      expect(rank).toBe(TEAM_NOT_FOUND);
    });

    test('should consistently return number type', () => {
      const userRoster = [1, 2, 3];
      const allRosters = [[1, 2, 3, 4, 5]];
      
      const rank = calculateRank(userRoster, allRosters);
      expect(typeof rank).toBe('number');
      expect(rank).toBe(1);
    });

    test('should consistently return number type when not found', () => {
      const userRoster = [99, 98, 97];
      const allRosters = [[1, 2, 3]];
      
      const rank = calculateRank(userRoster, allRosters);
      expect(typeof rank).toBe('number');
      expect(rank).toBe(TEAM_NOT_FOUND);
    });
  });

  describe('PERFORMANCE FIX: O(n²) → O(n) Set-Based Lookup', () => {
    test('should handle 100 teams with 20 players in <10ms', () => {
      const userRoster = Array.from({ length: 20 }, (_, i) => i + 1);
      const allRosters = Array.from({ length: 100 }, () =>
        Array.from({ length: 20 }, (_, i) => i + 100)
      );

      const start = performance.now();
      const rank = calculateRank(userRoster, allRosters);
      const duration = performance.now() - start;

      expect(rank).toBe(TEAM_NOT_FOUND); // No match expected
      expect(duration).toBeLessThan(10); // Should be <10ms with Set optimization
    });

    test('should scale linearly (10x teams = ~10x time, not 100x)', () => {
      const userRoster = Array.from({ length: 15 }, (_, i) => i + 1);

      // 10 teams
      const small = Array.from({ length: 10 }, () =>
        Array.from({ length: 15 }, (_, i) => i + 100)
      );
      const start1 = performance.now();
      calculateRank(userRoster, small);
      const time10 = performance.now() - start1;

      // 100 teams
      const large = Array.from({ length: 100 }, () =>
        Array.from({ length: 15 }, (_, i) => i + 100)
      );
      const start2 = performance.now();
      calculateRank(userRoster, large);
      const time100 = performance.now() - start2;

      // Should be ~10x (linear), not ~100x (quadratic)
      // Allow 15x variance for CI environment variability
      expect(time100 / time10).toBeLessThan(15);
    });

    test('should find match in large league efficiently', () => {
      const userRoster = [1, 2, 3, 4, 5];
      const allRosters = Array.from({ length: 100 }, (_, i) => {
        // Team 50 has matching roster
        if (i === 49) {
          return [1, 2, 3, 4, 5, 6, 7, 8];
        }
        return Array.from({ length: 10 }, (_, j) => (i + 1) * 100 + j);
      });

      const start = performance.now();
      const rank = calculateRank(userRoster, allRosters);
      const duration = performance.now() - start;

      expect(rank).toBe(50); // 50th team (1-based index)
      expect(duration).toBeLessThan(5); // Should be very fast
    });
  });

  describe('DOS PROTECTION: Max Size Validation', () => {
    test('should reject oversized user roster', () => {
      const oversized = Array(MAX_ROSTER_SIZE + 1).fill(1);
      const allRosters = [[1, 2, 3]];

      expect(() => calculateRank(oversized, allRosters))
        .toThrow(BadRequestError);

      expect(() => calculateRank(oversized, allRosters))
        .toThrow(`userRoster exceeds max size (${MAX_ROSTER_SIZE})`);
    });

    test('should reject too many teams', () => {
      const userRoster = [1, 2, 3];
      const tooManyTeams = Array(MAX_TEAMS + 1).fill([1, 2, 3]);

      expect(() => calculateRank(userRoster, tooManyTeams))
        .toThrow(BadRequestError);

      expect(() => calculateRank(userRoster, tooManyTeams))
        .toThrow(`allRosters exceeds max teams (${MAX_TEAMS})`);
    });

    test('should reject oversized team roster', () => {
      const userRoster = [1, 2, 3];
      const allRosters = [
        [1, 2, 3],
        Array(MAX_ROSTER_SIZE + 1).fill(1), // Oversized team roster
      ];

      expect(() => calculateRank(userRoster, allRosters))
        .toThrow(BadRequestError);

      expect(() => calculateRank(userRoster, allRosters))
        .toThrow(`allRosters[1] exceeds max roster size (${MAX_ROSTER_SIZE})`);
    });

    test('should accept max valid sizes', () => {
      const userRoster = Array(MAX_ROSTER_SIZE).fill(1);
      const allRosters = Array(MAX_TEAMS).fill(
        Array(MAX_ROSTER_SIZE).fill(100)
      );

      // Should NOT throw (exactly at max limits)
      const rank = calculateRank(userRoster, allRosters);
      expect(rank).toBe(TEAM_NOT_FOUND); // No match expected
    });
  });

  describe('PREPROCESSING: Set-Based Input', () => {
    test('should accept preprocessed Set arrays', () => {
      const userRoster = [1, 2, 3];
      const rawRosters = [
        [1, 2, 3, 4, 5],
        [6, 7, 8, 9, 10],
      ];

      const preprocessed = preprocessRosters(rawRosters);
      const rank = calculateRank(userRoster, preprocessed);

      expect(rank).toBe(1); // First roster matches
    });

    test('should produce same result with raw vs preprocessed rosters', () => {
      const userRoster = [5, 6, 7, 8, 9];
      const rawRosters = [
        [1, 2, 3, 4, 5],
        [5, 6, 7, 8, 9, 10],
        [11, 12, 13, 14, 15],
      ];

      const preprocessed = preprocessRosters(rawRosters);

      const rankRaw = calculateRank(userRoster, rawRosters);
      const rankPreprocessed = calculateRank(userRoster, preprocessed);

      expect(rankRaw).toBe(rankPreprocessed);
      expect(rankRaw).toBe(2); // Second roster matches
    });

    test('should handle null/undefined in preprocessed rosters', () => {
      const userRoster = [1, 2, 3];
      const rawRosters = [
        [1, null, 2, undefined, 3, 4, 5],
      ];

      const preprocessed = preprocessRosters(rawRosters);
      const rank = calculateRank(userRoster, preprocessed);

      expect(rank).toBe(1); // Match after filtering nulls
    });
  });

  describe('preprocessRosters helper', () => {
    test('should convert arrays to Sets', () => {
      const rosters = [
        [1, 2, 3],
        [4, 5, 6],
      ];

      const preprocessed = preprocessRosters(rosters);

      expect(preprocessed).toHaveLength(2);
      expect(preprocessed[0]).toBeInstanceOf(Set);
      expect(preprocessed[1]).toBeInstanceOf(Set);
    });

    test('should filter null/undefined during preprocessing', () => {
      const rosters = [
        [1, null, 2, undefined, 3],
      ];

      const preprocessed = preprocessRosters(rosters);

      expect(preprocessed[0].size).toBe(3); // Only [1, 2, 3]
      expect(preprocessed[0].has(null)).toBe(false);
      expect(preprocessed[0].has(undefined)).toBe(false);
    });

    test('should deduplicate during preprocessing', () => {
      const rosters = [
        [1, 1, 1, 2, 2, 3],
      ];

      const preprocessed = preprocessRosters(rosters);

      expect(preprocessed[0].size).toBe(3); // Deduplicated to [1, 2, 3]
    });

    test('should handle empty rosters', () => {
      const rosters = [
        [],
        [null, undefined],
        [1, 2, 3],
      ];

      const preprocessed = preprocessRosters(rosters);

      expect(preprocessed[0].size).toBe(0); // Empty
      expect(preprocessed[1].size).toBe(0); // Only nulls
      expect(preprocessed[2].size).toBe(3); // Valid
    });
  });

  describe('INTEGRATION: Real-World Scenarios', () => {
    test('should handle 32-team NFL fantasy league efficiently', () => {
      const userRoster = Array.from({ length: 15 }, (_, i) => i + 1);
      const allRosters = Array.from({ length: 32 }, (_, i) => {
        // Team 20 has matching roster
        if (i === 19) {
          return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
        }
        return Array.from({ length: 15 }, (_, j) => (i + 1) * 100 + j);
      });

      const start = performance.now();
      const rank = calculateRank(userRoster, allRosters);
      const duration = performance.now() - start;

      expect(rank).toBe(20); // 20th team
      expect(duration).toBeLessThan(5); // Should be <5ms for 32 teams
    });

    test('should handle partial roster match correctly', () => {
      const userRoster = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const allRosters = [
        [1, 2, 3, 4, 5, 6, 7, 20, 21, 22], // 70% match (exactly at threshold)
        [1, 2, 3, 30, 31, 32, 33, 34, 35, 36], // 30% match (below threshold)
      ];

      const rank = calculateRank(userRoster, allRosters);
      expect(rank).toBe(1); // First roster meets 70% threshold
    });

    test('should handle dynasty league with large rosters', () => {
      const userRoster = Array.from({ length: 50 }, (_, i) => i + 1);
      const allRosters = Array.from({ length: 12 }, (_, i) => {
        // Team 8 has matching roster
        if (i === 7) {
          return Array.from({ length: 60 }, (_, j) => j + 1);
        }
        return Array.from({ length: 50 }, (_, j) => (i + 1) * 100 + j);
      });

      const rank = calculateRank(userRoster, allRosters);
      expect(rank).toBe(8); // 8th team (all 50 players match)
    });
  });
});
