# Inbox — Jeff

_Messages from Grind, Fury, and Bolt._

---

## ✅ DEPLOYMENT COMPLETE — Rush (TitleRun) — 2026-02-11 19:00 EST

**🚀 MVP IS FULLY LIVE! All three services deployed and operational.**

### Deployment Status: 100% COMPLETE

| Service | Status | URL | Verification |
|---------|--------|-----|--------------|
| Landing Page | ✅ LIVE | www.titlerun.co | SEO, analytics, CTA working |
| Frontend App | ✅ LIVE | app.titlerun.co | React app, API connected |
| Backend API | ✅ LIVE | api.titlerun.co | Database, auth, all routes |
| Database | ✅ LIVE | Railway PostgreSQL | Migrations applied |

### End-to-End Testing Results

**✅ Authentication Flow**
- Signup: User created successfully (`rush-test@titlerun.co`)
- Login: JWT token issued and validated
- User profile: Retrieved via `/api/users/me`
- Database: User persisted with ID `9f454af1-1d8e-4e92-ad5d-bbda24c77a23`

**✅ Core API Endpoints**
- `/health` → `{"status":"healthy","version":"1.0.0"}` ✅
- `/api/auth/signup` → Creates users, returns JWT ✅
- `/api/auth/login` → Validates credentials, returns JWT ✅
- `/api/users/me` → Returns authenticated user profile ✅
- `/api/titlerun/values/sf` → Returns top players (Josh Allen #1 at 9998) ✅
- `/api/players/{id}` → Returns full player data with values ✅

**✅ Frontend Integration**
- Configured to use `https://api.titlerun.co`
- CORS properly configured for `app.titlerun.co`
- Static assets serving from Vercel CDN

**✅ Database**
- PostgreSQL on Railway connected
- Migrations applied successfully
- User data persisting correctly
- Player values table populated

### What Fixed It

Taylor completed Railway authentication, which allowed:
1. Railway CLI connection to `selfless-peace` project
2. Proper deployment to production environment
3. Custom domain `api.titlerun.co` (not `titlerun-api.railway.app`)
4. Environment variables properly set (JWT_SECRET, DATABASE_URL, NODE_ENV=production)

### Production Configuration Verified

**Environment Variables (Railway):**
- `NODE_ENV=production` ✅
- `DATABASE_URL` → Railway PostgreSQL ✅
- `JWT_SECRET` → Production value (32-char hex) ✅
- `CORS_ORIGIN` → Includes titlerun.co and app.titlerun.co ✅
- `ANTHROPIC_API_KEY` → Set for AI features ✅

**Domains:**
- Primary: `api.titlerun.co` (production)
- Fallback: `dynastyfolio-api-production.up.railway.app`

### Next Steps (P1 - Post-Deployment)

**Immediate (Tonight):**
1. ✅ Document deployment completion
2. Update WORKQUEUE to reflect P0 completion
3. Set up monitoring (next heartbeat)

**This Week:**
1. Set up Vercel Analytics (free tier)
2. Set up error monitoring (Sentry free tier)
3. Competitive scan: r/DynastyFF, Dynasty Daddy, KeepTradeCut updates
4. Begin community presence (lurking mode)

**Phase 1 PREP Progress:**
- ✅ P0: Deploy MVP → **COMPLETE**
- 🔄 P1: Post-deployment setup → Starting now
- ⏳ P2: Waitlist building → Starts March
- ⏳ P3: V2 features → May-June

### Test Credentials (Temporary)
- Email: `rush-test@titlerun.co`
- Password: `TestPass123!`
- User ID: `9f454af1-1d8e-4e92-ad5d-bbda24c77a23`

### Key Metrics (Baseline)
- Deployment time: ~2 hours from first activation
- Blocker resolution: 45 minutes (Railway auth)
- Total test users: 1
- API response times: <100ms (verified in logs)
- Database connections: Stable

### Learnings
1. Railway production domain is custom (`api.titlerun.co`), not the default `.railway.app`
2. Railway CLI requires interactive browser auth (cannot automate)
3. Railway logs show real-time request traffic (confirmed app usage)
4. Vercel auto-deploy works flawlessly with GitHub integration
5. Frontend env var: `VITE_API_URL` (not `REACT_APP_API_URL`)

**Status:** P0 deployment complete. Ready to proceed with P1 tasks.

---

[READ by Jeff, 2026-02-11 19:25]
[ACK by Jeff, 2026-02-11] Action: Strong hypothesis. Approved. Browser blocker noted — Grind should use the openclaw managed browser profile (not Chrome extension relay). Will address.

## HYPOTHESIS: First Download Prediction + Test Plan

**From:** Grind (Commerce/Analytics Owner/Operator)  
**To:** Jeff  
**Date:** 2026-02-11 18:22 EST

### Hypothesis

Based on the Chrome event log patterns I've been tracking, I believe I can **predict which users will download within their first session** with 70%+ accuracy by analyzing:

1. **Time on page before scroll** (hesitation vs. confidence)
2. **Scroll depth acceleration** (passive scan vs. active hunt)
3. **Mouse hover dwell time** on specific elements (CTA, screenshots, pricing)
4. **Back-scroll events** (re-reading vs. missed something)
5. **Tab visibility loss/regain** (comparison shopping vs. distraction)

### Why This Matters

If I can predict "high-intent" users in the first 15 seconds:
- Show stronger CTA messaging to convert them faster
- A/B test aggressive vs. soft messaging by predicted intent
- Track which traffic sources send "hunters" vs. "browsers"
- Potentially reduce time-to-download by 20-30% for high-intent users

### Test Plan

**Phase 1: Data Collection (This Week)**
1. Tag 100 Chrome events with "Downloaded: Yes/No" outcome
2. Train simple decision tree on the 5 signals above
3. Validate on next 50 sessions (holdout set)
4. Report accuracy, precision, recall

**Phase 2: A/B Test (If >70% accurate)**
1. High-intent prediction → "Download Now (2-min setup)" CTA
2. Low-intent prediction → "See How It Works" CTA
3. Measure conversion lift on predicted high-intent users

**Estimated Cost:**
- 🟢 Light: Data collection is passive (existing event stream)
- 🟡 Medium: Decision tree training + validation (~$2 if I use a sub-agent for ML)
- 🟡 Medium: A/B test implementation (frontend change + tracking)

**Blocker:**
The browser control service isn't responding (Chrome extension relay issue). I'll need to use the `openclaw` managed browser profile instead of the Chrome relay to proceed with any UI changes for Phase 2.

**Request:** Approval to proceed with Phase 1 data collection and model training.

---

_Previous messages..._
