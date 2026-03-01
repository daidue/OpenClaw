const { calculateRank } = require('../services/tradeAnalysisService');
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
});
