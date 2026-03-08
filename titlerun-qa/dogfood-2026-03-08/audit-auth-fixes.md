# Adversarial Audit: Auth System Fixes

**Auditor:** Security Engineer (Opus 4.6)
**Date:** 2026-03-08
**Score:** 62/100

---

## Critical Issues (Block Merge)

### 1. Demo Credentials Hardcoded in Client-Side Code
- **Severity:** Critical
- **File:** `src/pages/Login.jsx:46`
- **Problem:** Demo credentials (`demo@titlerun.co` / `demo1234`) are hardcoded in the frontend source code. Anyone can view-source or inspect the bundle to extract them. If this demo account has any elevated permissions, data access, or if the password pattern reveals internal conventions, it's a security leak. Additionally, the agent noted "needs backend demo user" — **this demo account doesn't exist yet**, meaning the button currently triggers a failed login with no special handling.
- **Fix:**
  1. Create the backend demo user BEFORE deploying this code, or hide the button behind a feature flag
  2. Use an environment variable for demo credentials: `process.env.REACT_APP_DEMO_EMAIL`
  3. Demo account MUST be sandboxed: read-only, no real user data, rate-limited, auto-reset
  4. Add `disabled` state and error toast specifically for demo login failures

### 2. Auth Token Stored in Non-HttpOnly Cookie (XSS Token Theft)
- **Severity:** Critical
- **File:** `src/stores/authStore.js:74-75, 121-122`
- **Problem:** The auth token is set via `document.cookie` with `SameSite=Strict` but **without the `Secure` flag and without `HttpOnly`**. The comment says "HttpOnly-compatible cookie" but `document.cookie` **cannot set HttpOnly cookies** — that's only possible from the server. This means:
  - Any XSS vulnerability gives full token access via `document.cookie`
  - Token is sent over HTTP in non-HTTPS environments (no `Secure` flag)
  - The comment is misleading and may give false security confidence
- **Fix:**
  1. Add `Secure` flag: `SameSite=Strict; Secure; max-age=...`
  2. Remove the misleading "HttpOnly-compatible" comment — this cookie is NOT HttpOnly
  3. For SSE auth, consider a short-lived, scoped token instead of the main auth token
  4. Long-term: have the backend set the cookie with proper HttpOnly + Secure flags

### 3. `/api/auth/reset-password` Missing from AUTH_ENDPOINTS
- **Severity:** Critical
- **File:** `src/services/api.js:77`
- **Problem:** `AUTH_ENDPOINTS` only lists `login`, `register`, and `forgot-password`. The `reset-password` endpoint (`/api/auth/reset-password`) and `validate-reset-token` endpoint (`/api/auth/validate-reset-token`) are NOT included. If the backend returns a 401 for an invalid/expired reset token, it will be treated as "session expired" — the user gets logged out and redirected instead of seeing "Your reset link has expired."
- **Fix:** Add missing endpoints:
  ```js
  const AUTH_ENDPOINTS = [
    '/api/auth/login',
    '/api/auth/register', 
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/validate-reset-token',
  ];
  ```

---

## High Priority (Fix Before Deploy)

### 4. XSS via Unsanitized Backend Error Messages
- **Severity:** High
- **File:** `src/services/api.js:100-106`
- **Problem:** Error messages from the API are extracted and passed directly through to `new Error(errorMessage)`, then displayed in toast notifications. If the backend ever returns HTML or script content in the error message (e.g., via a compromised or misconfigured backend, or a proxy error page), it could be rendered unsafely depending on how the toast component handles strings. The chain is: `data.error.message` → `Error.message` → `authStore.error` → `toast.error(title, error)`.
- **Fix:**
  1. Sanitize error messages before display: strip HTML tags at minimum
  2. Ensure the toast component uses `textContent` not `innerHTML`
  3. Add a max-length check on error messages (e.g., 200 chars) to prevent verbose proxy error pages from leaking

### 5. `isRedirectingToLogin` Race Condition Window
- **Severity:** High
- **File:** `src/services/api.js:67, 126-134`
- **Problem:** The `isRedirectingToLogin` flag uses a 2-second timeout to reset. During this 2-second window, any 401 on a protected endpoint is silently swallowed (the error is thrown but the session-expired event is not dispatched). If the first 401 fires but the `session-expired` event handler doesn't execute (e.g., the listener was removed, or the event loop is busy), subsequent 401s within 2 seconds won't trigger logout either. Also, `isRedirectingToLogin` is module-level state — it persists across component unmounts/remounts.
- **Fix:**
  1. Instead of a timeout, use a proper state check: `if (!isRedirectingToLogin && getAuthToken())`
  2. Reset the flag when login succeeds (in authStore.login) rather than on a timer
  3. Consider dispatching the event for every 401 and letting the listener deduplicate

### 6. Token Stored in Both localStorage AND Zustand Persist (Double Storage)
- **Severity:** High  
- **File:** `src/stores/authStore.js:69, 263-268`
- **Problem:** The auth token is stored in three places: `localStorage.authToken`, Zustand persist (`dpm-auth-storage`), and a cookie. On rehydration (line 270), the Zustand token is copied back to `localStorage.authToken`. This creates sync issues: if one store is cleared but not the other, the user appears logged in but API calls fail (or vice versa). The `logout` function clears `authToken` and the cookie but relies on Zustand persist to clear the persisted store — which may not happen immediately.
- **Fix:**
  1. Use a single source of truth for the token
  2. If keeping localStorage as the source, don't persist `token` in Zustand — read it from localStorage via `getAuthToken()` only
  3. Ensure logout is atomic: clear all three stores in the same tick

### 7. Signup Has No Minimum Password Strength Enforcement
- **Severity:** High
- **File:** `src/pages/Signup.jsx:55-67`
- **Problem:** The password strength indicator is visual-only — it never blocks form submission. A user can sign up with password "a" (score 1, "Weak") and the form will submit. The only validation is the HTML `required` attribute, which just checks non-empty. The confirm-password mismatch check uses a toast but **returns early before submission**, which is correct — but there's no equivalent guard for weak passwords.
- **Fix:**
  ```jsx
  if (passwordStrength.score <= 2) {
    toast.error('Weak Password', 'Please use at least 8 characters with uppercase, lowercase, and numbers.');
    return;
  }
  ```

---

## Medium Priority (Polish)

### 8. ForgotPassword Always Shows Success Even on Error
- **Severity:** Medium
- **File:** `src/pages/ForgotPassword.jsx:35-39`
- **Problem:** The catch block sets `isSubmitted = true` on error, showing "Check your email" even when the API call fails. The TODO comment acknowledges this. While showing success on "user not found" is a valid anti-enumeration pattern, showing success on **network errors** or **500s** is a bug — the email was never sent.
- **Fix:** Differentiate: if the error is a 404/400 (user not found), show success (anti-enumeration). If it's a network error or 5xx, show "Something went wrong, please try again."

### 9. Demo Login Button Shares `isLoading` State with Login Form
- **Severity:** Medium
- **File:** `src/pages/Login.jsx:44-49, 127`
- **Problem:** `handleDemoLogin` uses the same `login()` function from authStore, which sets `isLoading: true`. If a user clicks "Try Demo Account" while a regular login is in progress (or vice versa), both the "Sign In" button and demo button show loading/disabled state. There's no way to distinguish which action is loading. Also, the demo button doesn't have a loading spinner — it just gets `disabled`.
- **Fix:** Either add a separate `isDemoLoading` state, or add a loading spinner to the demo button, or debounce/disable properly.

### 10. `AUTH_ENDPOINTS` Uses `startsWith` — Prefix Collision Risk
- **Severity:** Medium
- **File:** `src/services/api.js:113`
- **Problem:** `AUTH_ENDPOINTS.some(ep => endpoint?.startsWith(ep))` means any endpoint that starts with `/api/auth/login` would match, e.g., `/api/auth/login-history` or `/api/auth/login-attempts`. These hypothetical endpoints might legitimately use 401 for session expiry, but would be incorrectly treated as auth endpoints.
- **Fix:** Use exact match or ensure the check is `endpoint === ep` or `endpoint?.startsWith(ep + '?') || endpoint === ep` to handle query parameters.

### 11. No CSRF Protection
- **Severity:** Medium
- **File:** `src/services/api.js` (general)
- **Problem:** The API uses Bearer token auth via localStorage — this is inherently CSRF-safe for API calls since `fetch` doesn't automatically send localStorage. However, the auth cookie (line 75 in authStore) IS automatically sent with requests, and there's no CSRF token. If the backend ever reads auth from the cookie (for SSE), any site could forge SSE connections.
- **Fix:** For the cookie-based SSE auth path, add a CSRF token or use a different auth mechanism (e.g., SSE URL with a short-lived token parameter).

### 12. No Rate Limiting on Login/Signup Attempts (Client-Side)
- **Severity:** Medium
- **File:** `src/pages/Login.jsx`, `src/pages/Signup.jsx`
- **Problem:** Nothing prevents rapid-fire login attempts from the UI. While the backend should enforce rate limiting, the client should also debounce or limit attempts to provide immediate feedback and reduce server load. The API has rate-limit handling for 429 responses, but login buttons are only gated by `isLoading` — a fast clicker could queue multiple requests.
- **Fix:** Add a simple client-side cooldown after failed attempts (e.g., 1 second after failure, escalating).

---

## Positive Findings

1. **Core 401 differentiation is correct.** The `AUTH_ENDPOINTS` approach is a clean pattern — separating auth failures from session expiry is the right fix for the root cause.
2. **Error message surfacing is well-structured.** The fallback chain (`data.error.message || data.error || data.message || default`) covers common API response formats.
3. **Session expiry uses custom events** — decoupled from the API layer, letting the AuthStore handle the UI. Good separation of concerns.
4. **Toast-based error display** in Login/Signup is better UX than inline errors that can be missed.
5. **Password strength indicator** on Signup is a nice UX addition (just needs enforcement).
6. **Confirm password validation** with real-time visual feedback (check icon, red border) is well done.
7. **Proper autocomplete attributes** on all form fields (`email`, `current-password`, `new-password`, `name`).
8. **Loading states** are handled on both login and signup buttons with spinner animations.

---

## Test Coverage Gaps

1. **No test for AUTH_ENDPOINTS differentiation** — Need a test that mocks a 401 from `/api/auth/login` and verifies it throws `AUTH_INVALID_CREDENTIALS` (not `AUTH_EXPIRED`) and does NOT clear localStorage
2. **No test for demo login** — Button exists but no test for success/failure paths
3. **No test for non-JSON 401 response** — What happens when a proxy returns HTML 401? The `handleResponse` catch block creates a generic error, but it won't get the special auth endpoint treatment (it throws before reaching the 401 check)
4. **No test for session-expired event dispatch** — Should verify the event fires on non-auth 401 and doesn't fire on auth 401
5. **No test for the `isRedirectingToLogin` dedup** — Should verify multiple rapid 401s only dispatch one event
6. **No test for password strength blocking signup** — (Because it doesn't block — see issue #7)
7. **No test for reset-password 401 handling** — This will break per issue #3
8. **No test for cookie token sync** — Verify cookie is set on login and cleared on logout

---

## Recommendations (Priority Order)

1. **Add `/api/auth/reset-password` and `/api/auth/validate-reset-token` to AUTH_ENDPOINTS** — This is a functional bug that will cause bad UX on password reset flows (Critical #3)
2. **Add `Secure` flag to cookie and fix misleading HttpOnly comment** — Easy one-line fix with significant security improvement (Critical #2)
3. **Create the demo user backend or hide the demo button** — Deploying a button that always fails is worse than no button (Critical #1)
4. **Enforce minimum password strength on signup submit** — 3 lines of code, significant security gain (High #7)
5. **Sanitize error messages before display** — Add a `sanitizeErrorMessage()` helper that strips HTML and truncates (High #4)
6. **Write tests for the 401 differentiation logic** — The core fix has zero test coverage
7. **Consider using exact match for AUTH_ENDPOINTS** — Prevents future prefix collision bugs
8. **Fix ForgotPassword to differentiate network errors from anti-enumeration** — Currently misleading on actual failures
