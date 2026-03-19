/**
 * Tests for costTracker.js (C3)
 */
const costTracker = require('../costTracker');

describe('CostTracker', () => {
  beforeEach(() => {
    // Reset the memory ledger
    costTracker._memoryLedger = {
      date: new Date().toISOString().slice(0, 10),
      total: 0,
    };
  });

  describe('checkBudget', () => {
    test('allows costs within budget', async () => {
      const result = await costTracker.checkBudget(0.01);
      expect(result).toBe(true);
    });

    test('throws when cost cap would be exceeded', async () => {
      // Simulate spending close to cap
      costTracker._memoryLedger.total = 24.99;

      await expect(costTracker.checkBudget(0.02)).rejects.toThrow('Daily cost cap reached');
    });

    test('throws error with COST_CAP_EXCEEDED code', async () => {
      costTracker._memoryLedger.total = 25.00;

      try {
        await costTracker.checkBudget(0.01);
        fail('Should have thrown');
      } catch (err) {
        expect(err.code).toBe('COST_CAP_EXCEEDED');
        expect(err.currentCost).toBe(25.00);
      }
    });

    test('allows exact cap usage', async () => {
      costTracker._memoryLedger.total = 24.00;
      const result = await costTracker.checkBudget(1.00);
      expect(result).toBe(true);
    });
  });

  describe('recordMemoryCost', () => {
    test('accumulates costs', () => {
      costTracker.recordMemoryCost(1.00);
      costTracker.recordMemoryCost(0.50);
      expect(costTracker._getMemoryCost()).toBe(1.50);
    });

    test('resets on new day', () => {
      costTracker._memoryLedger = {
        date: '2020-01-01', // Old date
        total: 100,
      };
      costTracker.recordMemoryCost(0.50);
      expect(costTracker._getMemoryCost()).toBe(0.50);
    });
  });

  describe('getBudgetStatus', () => {
    test('returns correct budget status', async () => {
      costTracker._memoryLedger.total = 12.50;
      const status = await costTracker.getBudgetStatus();
      expect(parseFloat(status.currentCost)).toBe(12.50);
      expect(status.dailyCap).toBe(25.00);
      expect(parseFloat(status.remaining)).toBe(12.50);
      expect(status.percentUsed).toBe('50.0');
      expect(status.isOverBudget).toBe(false);
    });
  });

  describe('getTodayCost (no DB)', () => {
    test('uses memory fallback when no DB provided', async () => {
      costTracker._memoryLedger.total = 5.00;
      const cost = await costTracker.getTodayCost(null);
      expect(cost).toBe(5.00);
    });
  });
});
