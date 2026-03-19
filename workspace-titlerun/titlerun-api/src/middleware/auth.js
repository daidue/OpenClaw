/**
 * Authentication Middleware
 *
 * Validates requests have proper authentication.
 * For MVP: validates session token or API key.
 * In production: integrate with Sleeper OAuth or JWT.
 *
 * @module middleware/auth
 */

const logger = require('../utils/logger').child({ service: 'auth' });

/**
 * Require authentication on a route.
 * Checks for Bearer token in Authorization header or session cookie.
 *
 * For MVP, accepts:
 *   - Bearer token in Authorization header
 *   - x-api-key header
 *   - Session cookie (when using web app)
 *
 * In production, replace with JWT validation or Sleeper OAuth.
 */
function requireAuth(req, res, next) {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    if (token && token.length > 0) {
      req.userId = extractUserId(token);
      return next();
    }
  }

  // Check x-api-key header
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey.length > 0) {
    req.userId = 'api-user';
    return next();
  }

  // Check session (for web app users)
  if (req.session && req.session.userId) {
    req.userId = req.session.userId;
    return next();
  }

  // Check if running in development mode (bypass auth)
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    req.userId = 'dev-user';
    return next();
  }

  logger.warn('[Auth] Unauthorized request', {
    ip: req.ip,
    path: req.path,
    method: req.method,
  });

  return res.status(401).json({
    success: false,
    error: 'Authentication required',
  });
}

/**
 * Extract user ID from token.
 * MVP: simple token validation.
 * Production: JWT decode + verify.
 */
function extractUserId(token) {
  // MVP: treat token as user identifier
  // Production: decode JWT, validate signature, extract sub claim
  try {
    // If it looks like a JWT, extract the payload
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      return payload.sub || payload.userId || 'unknown';
    }
    return token.substring(0, 50); // Use token prefix as userId
  } catch {
    return 'unknown';
  }
}

module.exports = { requireAuth, extractUserId };
