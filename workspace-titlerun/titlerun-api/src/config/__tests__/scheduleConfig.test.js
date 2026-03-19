/**
 * Tests for scheduleConfig.js (C4)
 */
const { schedules } = require('../scheduleConfig');

describe('scheduleConfig', () => {
  test('has both cron jobs defined', () => {
    expect(schedules).toHaveLength(2);
    expect(schedules[0].name).toBe('refresh-narrative-context');
    expect(schedules[1].name).toBe('pre-generate-narratives');
  });

  test('handlers are async functions (C4 fix)', () => {
    for (const schedule of schedules) {
      expect(typeof schedule.handler).toBe('function');
      // C4: Verify handler actually calls the function (not just returns a reference)
      // The handler should be an async function
      expect(schedule.handler.constructor.name).toBe('AsyncFunction');
    }
  });

  test('refresh handler executes correctly (C4)', async () => {
    // The handler should call refreshNarrativeContext(db)
    // Since we're testing structure, just verify it doesn't throw when called
    // with a mock db that will cause the inner function to return early
    const mockDb = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
    };

    // Mock fetch to prevent real API calls
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    try {
      const result = await schedules[0].handler(mockDb);
      // Should return an object (not a function reference)
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('success');
    } finally {
      global.fetch = originalFetch;
    }
  });

  test('pre-gen handler executes correctly (C4)', async () => {
    const mockDb = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ acquired: false }] }) // Advisory lock fails
        .mockResolvedValueOnce({ rows: [] }), // Unlock
    };

    const result = await schedules[1].handler(mockDb);
    expect(typeof result).toBe('object');
    // Should have been skipped due to lock
    // (or returned stats if lock wasn't needed)
  });

  test('all schedules have valid cron expressions', () => {
    const cronRegex = /^(\*|[\d,\-\/]+)\s+(\*|[\d,\-\/]+)\s+(\*|[\d,\-\/]+)\s+(\*|[\d,\-\/]+)\s+(\*|[\d,\-\/]+)$/;
    for (const schedule of schedules) {
      expect(schedule.schedule).toMatch(cronRegex);
    }
  });

  test('all schedules have timeouts', () => {
    for (const schedule of schedules) {
      expect(schedule.timeout).toBeGreaterThan(0);
    }
  });
});
