/**
 * Cost Tracker Service
 *
 * Enforces daily cost caps on LLM API usage.
 * Tracks spending per day and alerts at configurable thresholds.
 *
 * Daily cap: $25/day (configurable via NARRATIVE_DAILY_COST_CAP env var)
 * Alert threshold: 80% of daily cap
 *
 * @module costTracker
 */

const logger = require('../../utils/logger').child({ service: 'cost-tracker' });

const DAILY_COST_CAP = parseFloat(process.env.NARRATIVE_DAILY_COST_CAP || '25.00');
const ALERT_THRESHOLD = 0.80; // Alert at 80%

class CostTracker {
  constructor() {
    // In-memory fallback when DB is unavailable
    this._memoryLedger = {
      date: new Date().toISOString().slice(0, 10),
      total: 0,
    };
  }

  /**
   * Get today's total cost from database.
   * Falls back to in-memory tracking if DB unavailable.
   */
  async getTodayCost(db) {
    if (!db) return this._getMemoryCost();

    try {
      const result = await db.query(`
        SELECT COALESCE(SUM(cost_usd), 0) as total
        FROM narrative_generation_log
        WHERE created_at >= CURRENT_DATE
      `);
      return parseFloat(result.rows[0].total);
    } catch (err) {
      logger.warn(`[CostTracker] DB query failed, using memory fallback: ${err.message}`);
      return this._getMemoryCost();
    }
  }

  /**
   * Check if we're within budget for an estimated cost.
   * Throws if daily cap would be exceeded.
   *
   * @param {number} estimatedCost - Estimated cost in USD
   * @param {object} db - Database connection (optional)
   * @returns {boolean} true if within budget
   * @throws {Error} if daily cap exceeded
   */
  async checkBudget(estimatedCost, db = null) {
    const currentCost = await this.getTodayCost(db);
    const newTotal = currentCost + estimatedCost;

    if (newTotal > DAILY_COST_CAP) {
      const err = new Error(
        `Daily cost cap reached: $${currentCost.toFixed(2)}/$${DAILY_COST_CAP.toFixed(2)}. ` +
        `Estimated additional cost: $${estimatedCost.toFixed(4)}`
      );
      err.code = 'COST_CAP_EXCEEDED';
      err.currentCost = currentCost;
      err.dailyCap = DAILY_COST_CAP;
      logger.error('[CostTracker] Daily cost cap exceeded', {
        currentCost,
        estimatedCost,
        dailyCap: DAILY_COST_CAP,
      });
      throw err;
    }

    if (newTotal > DAILY_COST_CAP * ALERT_THRESHOLD) {
      logger.warn('[CostTracker] Approaching daily budget', {
        current: currentCost.toFixed(4),
        cap: DAILY_COST_CAP,
        percentUsed: ((currentCost / DAILY_COST_CAP) * 100).toFixed(1),
      });
    }

    return true;
  }

  /**
   * Record a cost to the in-memory ledger.
   * DB recording is handled by logGeneration in narrativeGenerationService.
   */
  recordMemoryCost(cost) {
    const today = new Date().toISOString().slice(0, 10);
    if (this._memoryLedger.date !== today) {
      this._memoryLedger = { date: today, total: 0 };
    }
    this._memoryLedger.total += cost;
  }

  /**
   * Get cost from in-memory fallback.
   */
  _getMemoryCost() {
    const today = new Date().toISOString().slice(0, 10);
    if (this._memoryLedger.date !== today) {
      this._memoryLedger = { date: today, total: 0 };
    }
    return this._memoryLedger.total;
  }

  /**
   * Get current budget status.
   */
  async getBudgetStatus(db = null) {
    const currentCost = await this.getTodayCost(db);
    return {
      currentCost: currentCost.toFixed(4),
      dailyCap: DAILY_COST_CAP,
      remaining: (DAILY_COST_CAP - currentCost).toFixed(4),
      percentUsed: ((currentCost / DAILY_COST_CAP) * 100).toFixed(1),
      isOverBudget: currentCost >= DAILY_COST_CAP,
    };
  }
}

module.exports = new CostTracker();
