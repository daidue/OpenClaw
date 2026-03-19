/**
 * Tests for auth middleware (C1)
 */
const { requireAuth, extractUserId } = require('../auth');

// Mock response
function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('requireAuth', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  test('allows requests with Bearer token', () => {
    const req = {
      headers: { authorization: 'Bearer test-token-123' },
      session: {},
    };
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.userId).toBeDefined();
  });

  test('allows requests with x-api-key', () => {
    const req = {
      headers: { 'x-api-key': 'api-key-456' },
      session: {},
    };
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.userId).toBe('api-user');
  });

  test('allows requests with session userId', () => {
    const req = {
      headers: {},
      session: { userId: 'session-user-789' },
    };
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.userId).toBe('session-user-789');
  });

  test('bypasses auth in development mode', () => {
    process.env.NODE_ENV = 'development';
    const req = { headers: {}, session: {} };
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.userId).toBe('dev-user');
  });

  test('bypasses auth in test mode', () => {
    process.env.NODE_ENV = 'test';
    const req = { headers: {}, session: {} };
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('rejects unauthenticated requests in production', () => {
    process.env.NODE_ENV = 'production';
    const req = { headers: {}, session: {}, ip: '1.2.3.4', path: '/test', method: 'GET' };
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Authentication required' })
    );
  });

  test('rejects empty Bearer token', () => {
    process.env.NODE_ENV = 'production';
    const req = { headers: { authorization: 'Bearer ' }, session: {}, ip: '1.2.3.4', path: '/test', method: 'GET' };
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('extractUserId', () => {
  test('extracts userId from simple token', () => {
    const userId = extractUserId('simple-token');
    expect(userId).toBe('simple-token');
  });

  test('truncates long tokens', () => {
    const longToken = 'a'.repeat(100);
    const userId = extractUserId(longToken);
    expect(userId.length).toBeLessThanOrEqual(50);
  });

  test('handles JWT-like tokens', () => {
    // Create a fake JWT payload
    const payload = Buffer.from(JSON.stringify({ sub: 'user-123', iat: 123 })).toString('base64url');
    const fakeJwt = `header.${payload}.signature`;
    const userId = extractUserId(fakeJwt);
    expect(userId).toBe('user-123');
  });
});
