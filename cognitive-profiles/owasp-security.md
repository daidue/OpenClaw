# Cognitive Profile: OWASP Security Engineer

**Source:** OWASP Top 10, security best practices, production incident patterns

**Domain:** Application security, code review, vulnerability assessment

---

## Decision Framework

### 1. Input Validation (FIRST PRIORITY)
**Question:** Is every user input validated and sanitized?

**Check:**
- Query parameters (`req.query`, `req.params`)
- Request body (`req.body`)
- Headers (especially `User-Agent`, custom headers)
- File uploads
- URL parameters

**Red flags:**
- Direct use of user input in queries
- No type checking
- Client-side validation only
- Trust in "internal" APIs

**Required:**
- Server-side validation ALWAYS
- Whitelist approach (define what's allowed, reject everything else)
- Type checking + length limits
- Sanitization before use (SQL, HTML, shell commands)

---

### 2. Authentication & Authorization
**Question:** Who can access this? Verified at every layer?

**Check:**
- Endpoint authentication (JWT, session, OAuth)
- Authorization checks (role-based, permission-based)
- Client + server enforcement (never trust client only)
- Token expiration + refresh logic

**Red flags:**
- Client-side auth only
- Hardcoded credentials
- Missing authorization checks
- Broad permissions (e.g., "admin" does everything)

**Required:**
- Auth checked on every protected route
- Principle of least privilege
- Token invalidation on logout
- Separate auth from authz (who you are vs what you can do)

---

### 3. Data Exposure
**Question:** Are we leaking sensitive information?

**Check:**
- Error messages (stack traces in production?)
- Logs (passwords, tokens, PII logged?)
- API responses (internal IDs, email addresses exposed?)
- Client-side bundles (API keys, secrets?)

**Red flags:**
- `console.log` with sensitive data
- Stack traces returned to client
- Sequential IDs exposed (e.g., user ID in URL)
- Secrets in environment variables committed to git

**Required:**
- Generic error messages in production
- Structured logging (no sensitive data)
- UUIDs instead of sequential IDs
- Secrets in secret manager (not env vars)

---

### 4. SQL/NoSQL Injection
**Question:** Can user input manipulate database queries?

**Red flags:**
- String concatenation in queries
- Raw SQL with user input
- MongoDB `$where` with user input
- ORM used incorrectly (still vulnerable)

**Required:**
- Parameterized queries ALWAYS
- ORM with proper escaping
- Input validation before queries
- Least-privilege database user (not `root`)

---

### 5. Cross-Site Scripting (XSS)
**Question:** Can user input execute scripts in browser?

**Check:**
- HTML rendering user input
- `innerHTML` or `dangerouslySetInnerHTML`
- Markdown rendering (can embed scripts)
- URL parameters rendered on page

**Red flags:**
- Direct HTML rendering of user input
- `eval()` on user data
- Unescaped template variables

**Required:**
- Escape all user input before rendering
- Use framework's built-in escaping (React, Vue)
- Content Security Policy (CSP) headers
- Sanitize markdown (use libraries like `DOMPurify`)

---

### 6. Cross-Site Request Forgery (CSRF)
**Question:** Can attackers perform actions as authenticated user?

**Check:**
- State-changing requests (POST, PUT, DELETE)
- CSRF tokens on forms
- SameSite cookie attribute
- Double-submit cookie pattern

**Red flags:**
- GET requests change state
- No CSRF protection on forms
- Cookies without SameSite attribute

**Required:**
- CSRF tokens on all state-changing requests
- SameSite=Strict or Lax on cookies
- Origin/Referer header validation

---

### 7. Dependency Vulnerabilities
**Question:** Are third-party libraries safe?

**Check:**
- `npm audit` or `yarn audit`
- Outdated dependencies
- Unmaintained packages
- Known CVEs

**Red flags:**
- Dependencies >2 years old
- Packages with known vulnerabilities
- Transitive dependencies not audited

**Required:**
- Regular dependency updates
- Automated security scans (Dependabot, Snyk)
- Lock files committed (package-lock.json)
- Minimal dependencies (fewer = smaller attack surface)

---

### 8. Cryptography
**Question:** Are we using crypto correctly?

**Red flags:**
- Rolling your own crypto
- MD5 or SHA1 for passwords
- Hardcoded keys
- Weak key length (<256 bits)

**Required:**
- bcrypt/argon2 for passwords (never plain SHA)
- TLS 1.2+ for transport
- Strong key generation (crypto.randomBytes, not Math.random)
- Keys stored in secret manager

---

## Question Sequence (Code Review)

1. **Where does user input enter the system?**
   - Query params, body, headers, files?
2. **Is it validated BEFORE use?**
   - Type, length, format, whitelist?
3. **Where does it go?**
   - Database query? HTML rendering? Shell command? File system?
4. **Is it escaped/parameterized for that context?**
5. **Who can access this?**
   - Auth + authz checked on server?
6. **What could go wrong?**
   - Injection? XSS? Data leak? Privilege escalation?
7. **What's the blast radius if exploited?**
   - Single user? All users? Database compromise?

---

## Severity Classification

### Critical (Block Merge)
- SQL injection
- Authentication bypass
- Hardcoded secrets in code
- Production credentials leaked
- Remote code execution

### High (Fix Before Deploy)
- XSS vulnerabilities
- Missing authorization checks
- Data exposure (PII, tokens)
- CSRF on critical actions
- Weak crypto

### Medium (Fix This Sprint)
- Client-side validation only
- Generic security headers missing (CSP, HSTS)
- Outdated dependencies with CVEs
- Overly broad permissions

### Low (Backlog)
- Missing input validation on non-critical fields
- Verbose error messages (but not stack traces)
- Dependencies >1 year old (no known CVEs)

---

## Production Incident Examples

**Example 1: SQL Injection via Search**
```javascript
// VULNERABLE
const query = `SELECT * FROM users WHERE name LIKE '%${req.query.search}%'`;

// FIX
const query = 'SELECT * FROM users WHERE name LIKE ?';
db.query(query, [`%${req.query.search}%`]);
```

**Impact:** Attacker extracted entire user database

---

**Example 2: XSS in Comments**
```javascript
// VULNERABLE
<div dangerouslySetInnerHTML={{ __html: comment.text }} />

// FIX
<div>{comment.text}</div> // React escapes by default
```

**Impact:** Attacker stole session tokens of all users who viewed comment

---

## What This Framework Consistently Prioritizes

1. **Input validation** (catches 60% of vulnerabilities)
2. **Parameterized queries** (prevents injection)
3. **Server-side checks** (never trust client)
4. **Least privilege** (minimize blast radius)

## What It Consistently Ignores

- Obscurity (never rely on hiding things)
- Client-side security (easily bypassed)
- "Nobody will try that" (they will)

---

## Usage in Skills

When reviewing code for security:

```markdown
Apply OWASP Security framework:
1. Trace user input → where does it enter? where does it go?
2. Check validation → type, length, format, whitelist?
3. Check context escaping → SQL params? HTML escape? Shell escape?
4. Check auth/authz → who can access? verified how?
5. Check data exposure → logs, errors, responses?
6. Severity: Critical/High/Medium/Low
7. Propose specific fix with code example

For EVERY user-input field found, ask:
- Is it validated?
- Is it escaped for its use context?
- What's the worst case if attacker controls it?
```

---

**Last updated:** 2026-03-01  
**Version:** 1.0
