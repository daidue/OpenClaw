# TitleRun Improvement Program: Security Hardening

## Mission
Achieve production-grade security through comprehensive OWASP Top 10 compliance, proper authentication/authorization, input validation, secrets management, and automated security testing.

## Scope

### Files You CAN Modify
- `titlerun-api/src/**/*.{js,ts}` (all backend code)
- `titlerun-api/src/middleware/**/*` (auth, validation, rate limiting)
- `titlerun-app/src/**/*.{js,jsx,ts,tsx}` (frontend security)
- `.env.example` (document required secrets)
- `titlerun-api/tests/security/**/*` (security tests)

### Files You CANNOT Modify
- Production `.env` files (read-only for reference)
- Database migrations (unless fixing vulnerabilities)
- CI/CD secrets (GitHub Actions vars)

## Metrics

### Primary Metrics (Must Maintain or Improve)
- **All tests pass**: 100% pass rate
- **Functionality**: No user-facing regressions
- **TypeScript**: Zero errors

### Security Targets
- **OWASP Top 10**: 100% coverage (A01-A10)
- **Authentication**: JWT validation, secure sessions
- **Authorization**: Role-based access control (RBAC)
- **Input validation**: 100% of user inputs validated
- **Secrets**: Zero hardcoded credentials
- **Rate limiting**: All public endpoints protected

### Secondary Metrics (Nice to Have)
- **Security headers**: CSP, HSTS, X-Frame-Options
- **HTTPS only**: No mixed content
- **Dependency vulnerabilities**: 0 critical/high (npm audit)
- **Password strength**: Enforced complexity rules

## Constraints

### Hard Limits
- **No breaking changes**: API contracts must remain stable
- **Performance**: No >10% negative impact on response time
- **Backward compatibility**: Existing tokens/sessions still work
- **Data privacy**: Never log sensitive data (passwords, tokens, PII)

### Soft Limits
- **Security vs UX**: Balance security with user experience
- **Token expiration**: Reasonable (24h access, 7d refresh)
- **Rate limits**: Strict but not user-hostile

## Success Criteria

### Iteration Success
An iteration is successful if:
1. All tests pass (100% pass rate)
2. TypeScript compiles without errors
3. No new security vulnerabilities introduced
4. Security coverage ≥ baseline

### Overall Success
The program succeeds when:
1. OWASP Top 10: 100% compliance
2. 0 critical/high npm audit vulnerabilities
3. All API endpoints require authentication (except public)
4. Input validation on 100% of user inputs
5. Zero hardcoded secrets

## Strategies to Explore

### High-Impact, Low-Risk (OWASP Top 10)

**A01: Broken Access Control**
- [ ] Verify JWT tokens on all protected routes
- [ ] Implement RBAC (user roles: admin, user)
- [ ] Check authorization on every resource access
- [ ] Prevent IDOR (Insecure Direct Object Reference)

**A02: Cryptographic Failures**
- [ ] Use bcrypt for password hashing (cost factor ≥12)
- [ ] HTTPS only (enforce in production)
- [ ] Secure JWT signing (HS256 or RS256)
- [ ] Encrypt sensitive data at rest (if applicable)

**A03: Injection**
- [ ] Parameterized queries (prevent SQL injection)
- [ ] Input validation with Joi/Zod
- [ ] Escape HTML output (prevent XSS)
- [ ] Sanitize user-generated content

**A04: Insecure Design**
- [ ] Security requirements documented
- [ ] Threat modeling for core features
- [ ] Fail securely (errors don't leak info)
- [ ] Rate limiting on sensitive endpoints

**A05: Security Misconfiguration**
- [ ] Remove default credentials
- [ ] Disable debug mode in production
- [ ] Security headers (Helmet.js)
- [ ] Error messages sanitized (no stack traces)

**A06: Vulnerable Components**
- [ ] Run `npm audit` (fix critical/high)
- [ ] Dependabot enabled
- [ ] Keep dependencies up to date
- [ ] Remove unused dependencies

**A07: Authentication Failures**
- [ ] Implement MFA (optional for launch, plan for post-launch)
- [ ] Account lockout after 5 failed attempts
- [ ] Password complexity requirements
- [ ] Secure session management

**A08: Software Integrity Failures**
- [ ] Use SRI (Subresource Integrity) for CDN assets
- [ ] Verify npm package integrity
- [ ] Code signing (if applicable)
- [ ] No eval() or dangerous dynamic code

**A09: Logging & Monitoring Failures**
- [ ] Log all authentication events
- [ ] Log authorization failures
- [ ] Alert on suspicious activity
- [ ] Never log sensitive data

**A10: Server-Side Request Forgery (SSRF)**
- [ ] Validate URLs before fetching
- [ ] Whitelist allowed domains
- [ ] No user-controlled URLs in fetch()
- [ ] Use allowlists, not denylists

### Medium-Impact, Medium-Risk

1. **Rate limiting**: Express-rate-limit on all endpoints (100 req/15min per IP)
2. **CSRF protection**: csurf middleware or SameSite cookies
3. **Content Security Policy**: Helmet CSP header (prevent XSS)
4. **Password reset**: Secure token generation, expiration
5. **Session fixation**: Regenerate session ID after login

### High-Impact, High-Risk (Careful)

1. **OAuth integration**: Add Google/GitHub login (post-launch)
2. **2FA**: TOTP-based MFA (post-launch)
3. **API key rotation**: Automatic key rotation every 90 days
4. **Secrets manager**: AWS Secrets Manager / HashiCorp Vault

### Avoid (Anti-Patterns)

- ❌ Rolling your own crypto (use bcrypt, not custom hashing)
- ❌ Storing passwords in plaintext or MD5/SHA1
- ❌ Using weak JWT secrets (min 256 bits)
- ❌ Trusting user input without validation
- ❌ Logging sensitive data (passwords, tokens, SSNs)
- ❌ Disabling security features "temporarily" (never re-enable)

## Baseline Metrics (Establish First)

Run security audits:
```bash
# npm audit
cd ~/Documents/Claude\ Cowork\ Business/titlerun-api
npm audit --production

# Find hardcoded secrets
grep -r "password\s*=\s*['\"]" src/
grep -r "api_key\s*=\s*['\"]" src/
grep -r "secret\s*=\s*['\"]" src/

# Find SQL injection risks
grep -r "SELECT.*\${" src/
grep -r "INSERT.*\${" src/
grep -r "UPDATE.*\${" src/

# Find XSS risks
grep -r "dangerouslySetInnerHTML" ../titlerun-app/src/
grep -r "innerHTML\s*=" ../titlerun-app/src/

# Check authentication
grep -r "router\.get\|router\.post" src/routes/ | grep -v "auth\|jwt"
```

Record:
- npm audit vulnerabilities: ______ (critical/high)
- Hardcoded secrets: ______ files
- SQL injection risks: ______ instances
- XSS risks: ______ instances
- Unprotected routes: ______ endpoints

## Evaluation Logic

```python
def evaluate_iteration(baseline, experiment):
    # Gate 1: Tests must pass
    if experiment.pass_rate < 1.0:
        return "DISCARD", "Tests failing"
    
    # Gate 2: No type errors
    if experiment.typescript_errors > 0:
        return "DISCARD", "TypeScript errors"
    
    # Gate 3: No new vulnerabilities
    if experiment.npm_audit_high > baseline.npm_audit_high:
        return "DISCARD", "New vulnerabilities introduced"
    
    # Optimization check
    if experiment.npm_audit_high < baseline.npm_audit_high:
        fixed = baseline.npm_audit_high - experiment.npm_audit_high
        return "KEEP", f"Fixed {fixed} high vulnerabilities"
    elif experiment.owasp_coverage > baseline.owasp_coverage:
        improvement = experiment.owasp_coverage - baseline.owasp_coverage
        return "KEEP", f"OWASP coverage +{improvement:.1f}%"
    else:
        return "DISCARD", "No improvement"
```

## Logging Format

Each iteration should log to `improvement-log.jsonl`:

```json
{
  "timestamp": "2026-03-23T00:00:00Z",
  "iteration": 1,
  "program": "security",
  "hypothesis": "Add Helmet.js security headers",
  "changes": ["src/index.js"],
  "metrics": {
    "npm_audit_critical": 0,
    "npm_audit_high": 2,
    "hardcoded_secrets": 0,
    "sql_injection_risks": 0,
    "xss_risks": 1,
    "owasp_coverage_pct": 40,
    "pass_rate": 1.0,
    "typescript_errors": 0
  },
  "baseline": {
    "npm_audit_critical": 0,
    "npm_audit_high": 3,
    "hardcoded_secrets": 1,
    "sql_injection_risks": 2,
    "xss_risks": 3,
    "owasp_coverage_pct": 30
  },
  "verdict": "KEEP",
  "reason": "Fixed 1 high vulnerability, +10% OWASP coverage"
}
```

## Expected Output

At completion, generate a summary report:

```markdown
# Security Hardening — 2026-03-23

## Results
- Iterations: 45
- Duration: 3h 20m
- Improvements kept: 18
- Improvements discarded: 27

## Final Metrics
- npm audit: 0 critical, 0 high (down from 0/3) → **100% fixed** ✅
- Hardcoded secrets: 0 (down from 1) → **100% fixed** ✅
- SQL injection risks: 0 (down from 2) → **100% fixed** ✅
- XSS risks: 0 (down from 3) → **100% fixed** ✅
- OWASP Top 10 coverage: 90% (up from 30%) → **+60%** ✅

## Key Changes

### Authentication & Authorization
1. Added JWT token validation to all protected routes
2. Implemented RBAC (admin, user roles)
3. Added authorization checks on resource access
4. Prevented IDOR vulnerabilities

### Input Validation
1. Added Joi schema validation to all API endpoints
2. Parameterized all SQL queries (prevent injection)
3. Sanitized HTML output (prevent XSS)
4. Added rate limiting (100 req/15min per IP)

### Secrets Management
1. Removed hardcoded API keys (moved to .env)
2. Added .env.example template
3. Documented all required environment variables

### Security Headers
1. Implemented Helmet.js (CSP, HSTS, X-Frame-Options)
2. Enabled HTTPS-only in production
3. Set SameSite=Strict on cookies (CSRF protection)

### Logging & Monitoring
1. Log all authentication events
2. Log authorization failures
3. Never log sensitive data (passwords, tokens)
4. Alert on 5+ failed login attempts

## OWASP Top 10 Compliance

| Item | Status | Notes |
|------|--------|-------|
| A01: Broken Access Control | ✅ | JWT + RBAC implemented |
| A02: Cryptographic Failures | ✅ | bcrypt + HTTPS |
| A03: Injection | ✅ | Parameterized queries + validation |
| A04: Insecure Design | ✅ | Threat modeling + fail-secure |
| A05: Security Misconfiguration | ✅ | Helmet.js + sanitized errors |
| A06: Vulnerable Components | ✅ | 0 critical/high npm audit |
| A07: Authentication Failures | ⚠️ | MFA planned for post-launch |
| A08: Software Integrity | ✅ | SRI on CDN assets |
| A09: Logging Failures | ✅ | Security event logging |
| A10: SSRF | ✅ | URL validation + allowlists |

## Remaining Issues
- A07: MFA not implemented (planned for post-launch)
- Rate limiting: 100 req/15min (may need tuning based on usage)

## Recommendation
MERGE — Production-ready security. OWASP Top 10 compliance at 90%.
```

## Security Testing Checklist

Before marking complete, run:
- [ ] `npm audit --production` (0 critical/high)
- [ ] Test SQL injection (try `'; DROP TABLE users;--`)
- [ ] Test XSS (try `<script>alert('XSS')</script>`)
- [ ] Test CSRF (cross-origin POST request)
- [ ] Test authentication bypass (no token → 401)
- [ ] Test authorization bypass (user role → admin resource → 403)
- [ ] Test rate limiting (100+ requests → 429)
- [ ] Check security headers (Helmet.js active)

## Tools & Commands

```bash
# Run security audit
npm audit --production

# Check for secrets (using gitleaks or manual grep)
grep -rI "password\s*=\s*['\"]" src/
grep -rI "api_key\s*=\s*['\"]" src/
grep -rI "secret\s*=\s*['\"]" src/

# Test SQL injection (with SQLMap or manual)
curl -X POST http://localhost:3001/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"' OR '1'='1"}'

# Test XSS
curl -X POST http://localhost:3001/api/comments \
  -H "Content-Type: application/json" \
  -d '{"text":"<script>alert('XSS')</script>"}'

# Check security headers
curl -I https://api.titlerun.co
# Look for: Strict-Transport-Security, Content-Security-Policy, X-Frame-Options
```

## Next Steps After This Program

If successful:
1. Set up Dependabot for automated vulnerability alerts
2. Add security tests to CI pipeline
3. Schedule monthly security audits
4. Implement MFA (post-launch)
5. Consider penetration testing (professional audit)

---

**Ready to run:** `bash scripts/auto-improve.sh security`
