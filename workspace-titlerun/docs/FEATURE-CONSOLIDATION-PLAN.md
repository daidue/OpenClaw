# TitleRun Feature Consolidation — Ultrathink Analysis

## Executive Summary

**Scope:** 34 features → 14 features (20 features deleted, 59% reduction)

| Metric | Estimate |
|--------|----------|
| Files to delete (backend) | ~45 files |
| Files to delete (frontend) | ~55 files |
| Database tables to drop | ~25 tables |
| npm packages to uninstall | 6 packages |
| Backend LOC removed | ~12,000+ |
| Frontend LOC removed | ~8,000+ |
| Estimated cleanup time | 3-4 hours (6 parallel workstreams) |

**Risk Level:** MEDIUM — Most deleted features are standalone modules with clean boundaries. The main risk areas are: (1) Subscription/Stripe middleware woven into multiple kept routes, (2) shared `checkSubscription` middleware referenced by kept features, and (3) the Intelligence Hub routes file mixing kept and deleted endpoints.

---

## Features — Keep vs Delete Mapping

### ✅ KEEP (14)
| # | Feature | Backend Files | Frontend Files |
|---|---------|--------------|----------------|
| 1 | Sleeper League Sync | `routes/intelligenceHub.js` (connect, sync-league, leagues, all-teams), `services/sleeperService.js`, `services/sleeper/*` | `components/dashboard/SleeperConnect.jsx`, `components/IntelligenceHub/ESPNConnector.jsx` |
| 2 | Team Grades | `routes/intelligenceHub.js` (dashboard), `services/intelligenceHub/teamAnalyzer.js` | `components/reportCard/*` (subset), `pages/ReportCards.jsx` |
| 3 | Power Rankings | `routes/intelligenceHub.js` (dashboard), `services/intelligenceHub/teamAnalyzer.js` | `components/dashboard/IntelligencePowerRankings.jsx` |
| 4 | Trade Opportunities (3 recs) | `routes/intelligenceHub.js` (trade-opportunities), `services/intelligenceHub/tradeFinder.js` | `components/IntelligenceHub/TradeOpportunities.jsx` |
| 5 | Season Outlook | `routes/intelligenceHub.js` (season-outlook), `services/intelligenceHub/seasonOutlook.js` | `components/IntelligenceHub/SeasonOutlook.jsx` |
| 6 | Auto Trade Pitch Generator | `routes/intelligenceHub.js` (trade-pitch), `services/intelligenceHub/tradePitchGenerator.js` | `components/IntelligenceHub/TradePitchModal.jsx` |
| 7 | Counter-Offer Generator | `routes/intelligenceHub.js` (counter-offers), `services/intelligenceHub/counterOfferGenerator.js` | `components/IntelligenceHub/CounterOfferModal.jsx` |
| 8 | Multi-Team Trade Builder | `routes/intelligenceHub.js` (multi-team-trade, multi-team-partners), `services/intelligenceHub/multiTeamTradeBuilder.js` | `components/IntelligenceHub/MultiTeamTradeBuilder.jsx` |
| 9 | Sleeper Trade Deep Linking | `routes/intelligenceHub.js` (sleeper-link), `services/intelligenceHub/sleeperTradeLink.js` | (integrated into trade components) |
| 10 | PWA | `public/sw.js`, `public/manifest.json` | `components/InstallPrompt.jsx`, `hooks/usePWAInstall.js`, `hooks/useServiceWorker.js` |
| 11 | ESPN League Sync | `routes/espnHub.js`, `services/espnService.js`, `services/espnFantasyService.js`, `services/espnPlayerMapper.js` | `components/IntelligenceHub/ESPNConnector.jsx` |
| 12 | Advanced Dynasty Trade Analyzer | `routes/tradeEngine.js`, `services/tradeAnalysisService.js`, `services/tradeFairnessService.js`, `services/tradeFinderService.js` | `components/tradeEngine/*`, `components/tradeFairness/*`, `components/tradeFinder/*`, `pages/TradeBuilder.jsx`, `pages/TradeCalculator.jsx`, `pages/TradeFinder.jsx` |
| 13 | Onboarding Tutorial | `routes/onboarding.js`, `routes/onboardingPreferences.js` | `components/onboarding/*`, `pages/Settings.jsx` |
| 14 | Performance Optimization | Redis caching (`services/cacheService.js`, `services/titlerunCacheService.js`), React Query (`lib/queryClient.ts`), compression (in `index.js`) | React Query hooks, `lib/queryClient.ts`, `lib/queryKeys.ts` |

### 🗑️ DELETE (20)
| # | Feature | Backend Files | Frontend Files | Risk |
|---|---------|--------------|----------------|------|
| 1 | Buy Low/Sell High Alerts | `routes/buySellSignals.js`, `routes/alerts.js`, `services/alertService.js`, `services/edgeDetectionService.js` | `components/AlertCard.jsx`, `components/IntelligenceHub/MomentumAlerts.jsx`, `components/dashboard/BuySellSignals.jsx`, `pages/Alerts.jsx`, `hooks/useAlerts.ts` | LOW |
| 2 | Multi-League Dashboard | `services/intelligenceHub/multiLeagueAggregator.js` | `components/IntelligenceHub/MultiLeagueDashboard.jsx`, `components/IntelligenceHub/UnifiedLeagueSelector.jsx` | LOW |
| 3 | Self-Learning Algorithm | `services/intelligenceHub/tradeTracker.js` (tracking/record-outcome, tracking/accuracy, tracking/history routes in intelligenceHub.js) | (minimal frontend) | LOW |
| 4 | Advanced Owner Profiling | `services/intelligenceHub/advancedOwnerProfiler.js` (owner-profiles advanced routes) | (integrated in IntelligenceHub page) | LOW |
| 5 | Trade Pulse | `services/intelligenceHub/tradePulse.js` (trade-pulse routes) | `components/IntelligenceHub/TradePulse.jsx` | LOW |
| 6 | Live Trade Stream | `services/community/tradeStream.js`, `services/newsWebSocket.js` (ws) | `components/Community/LiveTradeStream.jsx`, `components/Community/PublicTradeFeed.jsx`, `components/Community/ActivityFeed.jsx` | LOW |
| 7 | Expert Commentary Integration | `services/experts/expertRankingsService.js` | `components/PlayerDetail/ExpertConsensus.jsx` | LOW |
| 8 | Startup Draft Simulator | `services/analytics/draftSimulator.js`, `services/analytics/startupDraftAssistant.js` | `components/Analytics/StartupDraftSimulator.jsx` | LOW |
| 9 | Subscription Management (Stripe) | `routes/payments.js`, `services/payments/stripeService.js`, `middleware/checkSubscription.js` | `components/Subscription/*` | **HIGH** |
| 10 | Demo Mode | `services/demoModeService.js`, `src/demo.js` | (minimal) | LOW |
| 11 | Help System | `routes/support.js` (help portions) | `components/Help/HelpCenter.jsx`, `pages/Help.jsx` | LOW |
| 12 | Launch Assets | (marketing files only) | (none in app) | LOW |
| 13 | Commissioner Dashboard | `routes/commissioner.js`, `services/commissioner/leagueHealthAnalyzer.js` | `components/Commissioner/CommissionerDashboard.jsx`, `pages/CommissionerDashboardPage.jsx` | LOW |
| 14 | Automated League Payouts | `services/commissioner/payoutService.js` | `components/Commissioner/PayoutManager.jsx`, `pages/CommissionerPayoutsPage.jsx` | LOW |
| 15 | Punishment Tracker | `routes/punishment.js`, `routes/punishmentTypes.js`, `routes/punishmentVoting.js`, `services/punishmentService.js`, `services/commissioner/punishmentLibrary.js` | `components/Commissioner/PunishmentLibrary.jsx`, `components/PunishmentClock.tsx`, `components/seasonal/PunishmentClock.tsx`, `components/seasonal/PunishmentForm.jsx`, `components/seasonal/PunishmentVerification.jsx`, `components/seasonal/HallOfShame.jsx`, `pages/CommissionerPunishment.jsx`, `pages/HallOfShamePage.jsx`, `pages/PunishmentLibraryPage.jsx`, `hooks/usePunishment.ts` | LOW |
| 16 | League Constitution Generator | `services/commissioner/constitutionGenerator.js` | `components/Commissioner/ConstitutionGenerator.jsx`, `pages/CommissionerConstitutionPage.jsx` | LOW |
| 17 | Trade Veto Analysis | `services/commissioner/tradeVetoAnalyzer.js` | `components/Commissioner/TradeVetoAnalysis.jsx`, `pages/CommissionerTradeVetoPage.jsx` | LOW |
| 18 | League History Timeline | `services/commissioner/leagueHistoryService.js` | `components/Commissioner/LeagueHistoryTimeline.jsx`, `pages/CommissionerHistoryPage.jsx` | LOW |
| 19 | Community Features | `routes/community.js`, `services/community/*` (all 6 files) | `components/Community/*`, `pages/CommunityHub.jsx`, `components/ShareModal.tsx` (if community-only) | MEDIUM |
| 20 | Premium Analytics | `routes/analytics.js`, `services/analytics/*` (all 6 files) | `components/Analytics/*`, `pages/AnalyticsDashboard.jsx` | LOW |

---

## Impact Analysis

### Database Impact

#### Tables to DROP (25 tables)

**Commissioner Tools (Migration 074):**
1. `league_health_snapshots` — Commissioner dashboard
2. `league_dues` — League payouts
3. `league_payouts` — League payouts
4. `league_payout_structures` — Payout templates
5. `league_constitutions` — Constitution generator
6. `trade_veto_analyses` — Trade veto analysis
7. `league_history_events` — League history timeline
8. `commissioner_settings` — Commissioner settings

**Community Features (Migration 079):**
9. `public_trades` — Community trade grading
10. `trade_community_grades` — Community grade voting
11. `trade_of_week_votes` — Trade of the Week
12. `user_referrals` — Referral system
13. `referral_tracking` — Referral tracking
14. `push_subscriptions` — Push notifications

**Subscription/Payments (Migrations 079, 080):**
15. `user_subscriptions` — Stripe subscriptions
16. `payment_history` — Stripe payment history
17. `subscription_events` — Subscription audit trail

**Community Week 7 (Migration 073):**
18. `trade_comments` — Trade comments
19. `trade_likes` — Trade likes
20. `trade_favorites` — Trade saves
21. `expert_rankings` — Expert rankings
22. `user_follows` — User follows
23. `activity_feed` — Activity feed
24. `draft_sessions` — Draft simulator
25. `comment_likes` — Comment likes

**Migration 080 Additional:**
26. `onboarding_progress` — **KEEP** (related to Onboarding Tutorial)
27. `support_tickets` — DELETE (help system)
28. `changelog_entries` — **KEEP** (useful for PWA update notifications)

#### Columns to REMOVE from kept tables
- `users.stripe_customer_id` — Added by migration 080 for Stripe integration

#### Migrations to handle
**DO NOT delete migration files** — migrations are append-only. Instead, create a NEW migration (e.g., `085_feature_consolidation_cleanup.sql`) that:
- DROPs the 25+ tables listed above
- Removes `stripe_customer_id` from `users`

### Backend Impact

#### Routes to DELETE (12 files)
| File | Mount Point | Reason |
|------|-------------|--------|
| `src/routes/alerts.js` | `/api/alerts` | Buy Low/Sell High |
| `src/routes/buySellSignals.js` | `/api/intelligence` | Buy Low/Sell High |
| `src/routes/payments.js` | `/api/payments` | Stripe/Subscriptions |
| `src/routes/commissioner.js` | `/api/commissioner` | Commissioner Dashboard |
| `src/routes/community.js` | `/api/community` | Community Features |
| `src/routes/analytics.js` | `/api/analytics` | Premium Analytics |
| `src/routes/push.js` | `/api/push` | Push Notifications |
| `src/routes/punishment.js` | `/api/punishment` | Punishment Tracker |
| `src/routes/punishmentTypes.js` | `/api/punishment` | Punishment Types |
| `src/routes/punishmentVoting.js` | `/api/punishment` | Punishment Voting |
| `src/routes/support.js` | `/api/support` | Help/Support System |
| `src/routes/seasonal.js` | `/api/seasonal` | Seasonal Gamification (overlaps with punishment) |

#### Endpoints to REMOVE from kept route files

**`src/routes/intelligenceHub.js`** — Remove these routes but KEEP the file:
- `GET /momentum/buy-low-sell-high` (Buy Low/Sell High)
- `GET /momentum/personalized/:leagueId/:rosterId` (Buy Low/Sell High)
- `GET /momentum/player/:playerId` (Buy Low/Sell High)
- `GET /multi-league/aggregate/:sleeperId` (Multi-League Dashboard)
- `GET /multi-league/insights/:sleeperId` (Multi-League Dashboard)
- `POST /tracking/record-outcome` (Self-Learning)
- `GET /tracking/accuracy` (Self-Learning)
- `GET /tracking/history/:leagueId/:rosterId` (Self-Learning)
- `GET /owner-profiles/:leagueId` (keep basic), `POST /owner-profiles/:leagueId/build` (keep basic)
- `POST /owner-profiles/:leagueId/advanced-build` (Advanced Owner Profiling)
- `GET /owner-profiles/:leagueId/:ownerSleeperId/advanced` (Advanced Owner Profiling)
- `GET /trade-pulse/:leagueId` (Trade Pulse)
- `GET /trade-pulse/:leagueId/history` (Trade Pulse)
- `GET /unified-leagues/:sleeperId` (Multi-League)

#### Services to DELETE (35+ files)
```
src/services/alertService.js
src/services/edgeDetectionService.js
src/services/demoModeService.js
src/services/pushNotificationService.js
src/services/newsWebSocket.js          (Live Trade Stream WebSocket)
src/services/socialCardService.js      (Shareable cards)
src/services/seasonalService.js        (Seasonal gamification engine)
src/services/seasonAwardService.js     (Season awards)
src/services/punishmentService.js
src/services/payments/stripeService.js
src/services/community/communityLeaderboards.js
src/services/community/referralService.js
src/services/community/tradeCardGenerator.js
src/services/community/tradeGrader.js
src/services/community/tradeStream.js
src/services/community/userEngagement.js
src/services/commissioner/constitutionGenerator.js
src/services/commissioner/leagueHealthAnalyzer.js
src/services/commissioner/leagueHistoryService.js
src/services/commissioner/payoutService.js
src/services/commissioner/punishmentLibrary.js
src/services/commissioner/tradeVetoAnalyzer.js
src/services/analytics/advancedTradeAnalyzer.js
src/services/analytics/assetTracker.js
src/services/analytics/draftSimulator.js
src/services/analytics/playoffCalculator.js
src/services/analytics/startupDraftAssistant.js
src/services/analytics/tradeHistoryAnalyzer.js
src/services/intelligenceHub/tradePulse.js
src/services/intelligenceHub/advancedOwnerProfiler.js
src/services/intelligenceHub/multiLeagueAggregator.js
src/services/intelligenceHub/tradeTracker.js
src/services/intelligenceHub/valueChangeTracker.js
src/services/experts/expertRankingsService.js
```

#### Middleware to DELETE
```
src/middleware/checkSubscription.js
```

⚠️ **WARNING:** `checkSubscription` is imported by several kept routes (teams, titlerun, players, etc.). These imports must be removed and any `checkSubscription` middleware calls in route chains must be stripped. The app should be fully free-tier now.

#### Files needing import cleanup in `src/index.js`:
Remove these imports and `app.use()` lines:
```
- const commissionerRoutes = require('./routes/commissioner');
- const communityRoutes = require('./routes/community');
- const analyticsRoutes = require('./routes/analytics');
- const pushRoutes = require('./routes/push');
- const paymentRoutes = require('./routes/payments');
- const seasonalRoutes = require('./routes/seasonal');
- const punishmentRoutes = require('./routes/punishment');
- const buySellSignalsRoutes = require('./routes/buySellSignals');
- const alertsRoutes = require('./routes/alerts');

- app.use('/api/alerts', alertsRoutes);
- app.use('/api/intelligence', buySellSignalsRoutes);
- app.use('/api/seasonal', seasonalRoutes);
- app.use('/api/punishment', punishmentRoutes);
- app.use('/api/commissioner', commissionerRoutes);
- app.use('/api/community', communityRoutes);
- app.use('/api/analytics', analyticsRoutes);
- app.use('/api/push', pushRoutes);
- app.use('/api/payments', paymentRoutes);
```

Also remove the Stripe webhook raw body parser line:
```
- app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
```

### Frontend Impact

#### Components to DELETE (directories)
```
src/components/Commissioner/          (6 files — entire directory)
src/components/Community/             (5 files — entire directory)
src/components/Analytics/             (5 files — entire directory)
src/components/Subscription/          (3 files — entire directory)
src/components/Help/                  (1 file — entire directory)
src/components/WallOfShame/           (4 files — entire directory)
```

#### Individual Components to DELETE
```
src/components/AlertCard.jsx
src/components/IntelligenceHub/MomentumAlerts.jsx
src/components/IntelligenceHub/TradePulse.jsx
src/components/IntelligenceHub/MultiLeagueDashboard.jsx
src/components/IntelligenceHub/UnifiedLeagueSelector.jsx
src/components/dashboard/BuySellSignals.jsx
src/components/PlayerDetail/ExpertConsensus.jsx
src/components/PlayerDetail/PlayerMLInsights.jsx    (if ML-only)
src/components/PunishmentClock.tsx
src/components/ShareModal.tsx                       (if community-only)
src/components/seasonal/PunishmentClock.tsx
src/components/seasonal/PunishmentForm.jsx
src/components/seasonal/PunishmentVerification.jsx
src/components/seasonal/HallOfShame.jsx
src/components/seasonal/SPDisplay.jsx               (Season Points — gamification)
src/components/seasonal/SeasonPointsDisplay.tsx
src/components/seasonal/WeeklyStreakDisplay.tsx
src/components/gamification/AchievementCard.tsx
src/components/gamification/AchievementUnlockToast.tsx
src/components/gamification/DailyRewardModal.tsx
src/components/gamification/LevelBadge.jsx
src/components/gamification/SPLevelBadge.tsx
src/components/gamification/StreakDisplay.tsx
src/components/gamification/XPGainAnimation.tsx
src/components/gamification/XPProgressBar.tsx
```

#### Pages to DELETE (17 files)
```
src/pages/Alerts.jsx
src/pages/AnalyticsDashboard.jsx
src/pages/CommissionerConstitutionPage.jsx
src/pages/CommissionerDashboardPage.jsx
src/pages/CommissionerHistoryPage.jsx
src/pages/CommissionerPayoutsPage.jsx
src/pages/CommissionerPunishment.jsx
src/pages/CommissionerTradeVetoPage.jsx
src/pages/CommunityHub.jsx
src/pages/HallOfShamePage.jsx
src/pages/Help.jsx
src/pages/PunishmentLibraryPage.jsx
src/pages/SPHistory.jsx
src/pages/AiChat.jsx               (if AI chat is not in kept features)
```

#### Routes to REMOVE from `App.jsx`
Remove all `<Route>` elements and lazy imports for:
- Commissioner pages (6 routes)
- Community Hub route
- Analytics Dashboard route
- Alerts route
- Help route
- Hall of Shame route
- Punishment Library route
- SP History route
- AI Chat route (if applicable)

#### Frontend Services to DELETE
```
src/services/commissionerApi.js
src/services/punishmentApi.js
src/services/seasonalApi.ts
src/services/achievementService.ts
```

#### Frontend Hooks to DELETE
```
src/hooks/useAlerts.ts
src/hooks/useAudioAlerts.js
src/hooks/usePunishment.ts
src/hooks/useSP.js
src/hooks/useSSE.ts                  (if only used for live stream)
src/hooks/useWeeklyStreak.js
```

#### Frontend Stores to DELETE
```
src/stores/achievementStore.ts
src/stores/gamificationStore.ts
src/stores/seasonalStore.ts
src/stores/aiChatStore.js            (if AI chat deleted)
```

#### Frontend Types to DELETE
```
src/types/achievements.ts
src/types/gamification.ts
src/types/seasonal.ts
```

#### Frontend Constants to DELETE
```
src/constants/punishmentTypes.ts
src/constants/seasonalValues.ts
src/constants/xpValues.ts
src/data/achievements.ts
```

### Package Impact

#### npm packages to UNINSTALL (Backend)
| Package | Used By | Safe to Remove? |
|---------|---------|----------------|
| `stripe` | `services/payments/stripeService.js` | ✅ YES — Subscription deleted |
| `web-push` | `services/pushNotificationService.js` | ✅ YES — Push notifications deleted |
| `ws` | `services/newsWebSocket.js` | ✅ YES — Live trade stream deleted |
| `@resvg/resvg-js` | `services/socialCardService.js`, `services/tradeCardService.js` | ⚠️ MAYBE — `tradeCardService.js` is used by trade engine deep linking. Check if report card social cards are needed. |
| `satori` | `services/socialCardService.js`, `services/tradeCardService.js` | ⚠️ MAYBE — same as above |
| `puppeteer` | `services/stealthBrowserService.js`, scraping | ❌ KEEP — Used by kept scrapers |

#### npm packages to UNINSTALL (Frontend)
| Package | Used By | Safe to Remove? |
|---------|---------|----------------|
| `html2canvas` | Shareable cards (community) | ⚠️ CHECK — may be used by report card sharing too |

### Configuration Impact

#### Environment Variables to REMOVE
```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_ID
STRIPE_PREMIUM_PRICE_ID
VAPID_PUBLIC_KEY           (web-push)
VAPID_PRIVATE_KEY          (web-push)
VAPID_SUBJECT              (web-push)
```

#### Environment Variables to KEEP (used by kept features)
```
DATABASE_URL, REDIS_URL, JWT_SECRET, CORS_ORIGIN, ADMIN_SECRET
SLEEPER_API_BASE_URL (Sleeper sync)
OPENAI_API_KEY (AI-powered trade analysis, insights)
All scraper-related env vars
```

#### Cron Jobs to Review
The `schedulerService.js` and `titlerunScheduler.js` may include jobs for deleted features. Review and disable:
- Any community engagement scoring jobs
- Any subscription renewal check jobs
- Any buy/sell signal generation jobs
- Keep: scraper jobs, value pipeline jobs, cache refresh jobs

---

## Dependency Analysis

### Critical Cross-Dependencies (Kept ↔ Deleted)

#### 1. `checkSubscription` Middleware → Multiple Kept Routes ⚠️ HIGH RISK
**Problem:** `checkSubscription` is imported in ~15 route files including kept ones (teams, players, titlerun, trades, etc.)
**Solution:** Remove ALL `checkSubscription` imports and middleware calls from kept route files. Everything is free tier now.
**Affected kept files:**
- `src/routes/teams.js`
- `src/routes/players.js`
- `src/routes/titlerun.js`
- `src/routes/titlerunValues.js`
- `src/routes/trades.js`
- `src/routes/reportCards.js`
- `src/routes/valueEngineRoutes.js`
- `src/routes/valuationPipeline.js`
- `src/routes/trophyCase.js`
- `src/routes/admin.js`
- `src/routes/push.js` (deleted)

#### 2. `socialCardService` → Report Cards ⚠️ MEDIUM RISK
**Problem:** `src/routes/reportCards.js` lazy-imports `socialCardService` for shareable report card images.
**Solution:** If social sharing of report cards is a kept feature, keep `socialCardService.js` and `tradeCardService.js`. If not, remove and strip the social card generation endpoint from report cards.

#### 3. `intelligenceHub.js` Route File — Mixed Kept/Deleted ⚠️ MEDIUM RISK
**Problem:** Single route file serves both kept features (trade opportunities, season outlook, trade pitch, counter-offer, multi-team trade, sleeper link) AND deleted features (momentum/buy-sell, multi-league, tracking, advanced owner profiling, trade pulse).
**Solution:** Surgically remove deleted route handlers. Keep the file. ~15 route handlers to remove, ~12 to keep.

#### 4. Owner Profiler — Basic vs Advanced
**Problem:** Basic `ownerProfiler.js` is used by kept "Trade Opportunities" feature for trade partner context. Advanced `advancedOwnerProfiler.js` is deleted.
**Solution:** Keep `ownerProfiler.js`, delete `advancedOwnerProfiler.js`. Remove advanced routes from intelligenceHub.js.

#### 5. No Database Migration Dependency Issues
The deleted features' migrations (073, 074, 079, 080) are all additive (CREATE TABLE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS). No kept migration depends on them. Safe to add a cleanup migration that drops the tables.

---

## Risk Assessment

### 🔴 High Risk Deletions (3)

1. **Stripe/Subscription Middleware Removal**
   - `checkSubscription` is woven into 10+ kept route files
   - **Mitigation:** Global search-and-replace of `checkSubscription` import + middleware call. Test all affected routes after removal.
   - **Rollback trigger:** Any kept API endpoint returns 403 "upgrade_required"

2. **Intelligence Hub Route Cleanup**
   - Single file serves 25+ routes; must surgically remove ~15 while keeping ~12
   - **Mitigation:** Line-by-line review. Mark each route handler with KEEP/DELETE comments first. Test all kept Intelligence Hub endpoints.
   - **Rollback trigger:** Any Intelligence Hub kept endpoint returns 404

3. **`src/index.js` Cleanup**
   - This 1,900+ line file has inline migrations, startup logic, and all route mounts
   - **Mitigation:** Remove one import+mount at a time. Run `node -e "require('./src/index')"` after each removal to catch import errors.
   - **Rollback trigger:** Server fails to start

### 🟡 Medium Risk Deletions (4)

4. **Social Card Service** — Used by both deleted (community shareable cards) and kept (report card sharing). Audit usage before deleting.
5. **Seasonal Routes** — Some seasonal features (trophy case, seasonal phase) may be kept. Only delete punishment-related seasonal code.
6. **Frontend App.jsx Route Cleanup** — 942 lines, many routes to remove. Risk of accidentally removing kept routes.
7. **Gamification System** — Trophy case is NOT in kept list but gamification hooks are used by it. Confirm if trophy case stays or goes.

### 🟢 Low Risk Deletions (13)

All standalone features with no cross-dependencies:
- Commissioner Dashboard, Payouts, Constitution, Trade Veto, League History (entire `commissioner/` directory)
- Community Features (entire `community/` directory)
- Premium Analytics (entire `analytics/` directory)
- Buy Low/Sell High Alerts
- Demo Mode
- Help System
- Expert Commentary
- Startup Draft Simulator
- Push Notifications

---

## Execution Plan

### Pre-Work (5 min)
```bash
cd ~/Documents/Claude\ Cowork\ Business/titlerun-api
git checkout -b feature-consolidation
git push -u origin feature-consolidation

cd ~/Documents/Claude\ Cowork\ Business/titlerun-app
git checkout -b feature-consolidation
git push -u origin feature-consolidation
```

### Workstream A: Database Cleanup
**Owner:** Subagent A (database specialist)
**Time Estimate:** 20 min
**Dependencies:** None (runs first, but tables can be dropped independently)

**Tasks:**
1. Create `migrations/085_feature_consolidation_cleanup.sql`:
```sql
-- Feature Consolidation: Drop tables for deleted features
-- Commissioner Tools
DROP TABLE IF EXISTS commissioner_settings CASCADE;
DROP TABLE IF EXISTS league_history_events CASCADE;
DROP TABLE IF EXISTS trade_veto_analyses CASCADE;
DROP TABLE IF EXISTS league_constitutions CASCADE;
DROP TABLE IF EXISTS league_payouts CASCADE;
DROP TABLE IF EXISTS league_dues CASCADE;
DROP TABLE IF EXISTS league_payout_structures CASCADE;
DROP TABLE IF EXISTS league_health_snapshots CASCADE;

-- Community Features
DROP TABLE IF EXISTS comment_likes CASCADE;
DROP TABLE IF EXISTS trade_comments CASCADE;
DROP TABLE IF EXISTS trade_likes CASCADE;
DROP TABLE IF EXISTS trade_favorites CASCADE;
DROP TABLE IF EXISTS trade_of_week_votes CASCADE;
DROP TABLE IF EXISTS trade_community_grades CASCADE;
DROP TABLE IF EXISTS public_trades CASCADE;
DROP TABLE IF EXISTS user_follows CASCADE;
DROP TABLE IF EXISTS activity_feed CASCADE;
DROP TABLE IF EXISTS user_referrals CASCADE;
DROP TABLE IF EXISTS referral_tracking CASCADE;

-- Subscription/Payments
DROP TABLE IF EXISTS subscription_events CASCADE;
DROP TABLE IF EXISTS payment_history CASCADE;
DROP TABLE IF EXISTS user_subscriptions CASCADE;
DROP TABLE IF EXISTS push_subscriptions CASCADE;

-- Draft Simulator
DROP TABLE IF EXISTS draft_sessions CASCADE;

-- Expert Rankings
DROP TABLE IF EXISTS expert_rankings CASCADE;

-- Support (Help System)
DROP TABLE IF EXISTS support_tickets CASCADE;

-- Remove Stripe column from users
ALTER TABLE users DROP COLUMN IF EXISTS stripe_customer_id;
```

2. Create `run-migration-085.js` runner script
3. Test migration against local/staging DB first
4. **DO NOT drop in production until Workstream E passes**

### Workstream B: Backend Cleanup
**Owner:** Subagent B (backend specialist)
**Time Estimate:** 30 min
**Dependencies:** None (can run parallel with A)

**Tasks:**

**Phase B1: Delete standalone route files (5 min)**
```bash
# Delete route files for deleted features
rm src/routes/alerts.js
rm src/routes/buySellSignals.js
rm src/routes/payments.js
rm src/routes/commissioner.js
rm src/routes/community.js
rm src/routes/analytics.js
rm src/routes/push.js
rm src/routes/punishment.js
rm src/routes/punishmentTypes.js
rm src/routes/punishmentVoting.js
rm src/routes/support.js
rm src/routes/seasonal.js
```

**Phase B2: Delete service files (5 min)**
```bash
# Standalone services
rm src/services/alertService.js
rm src/services/edgeDetectionService.js
rm src/services/demoModeService.js
rm src/services/pushNotificationService.js
rm src/services/newsWebSocket.js
rm src/services/punishmentService.js
rm src/services/seasonalService.js
rm src/services/seasonAwardService.js

# Service directories
rm -rf src/services/payments/
rm -rf src/services/community/
rm -rf src/services/commissioner/
rm -rf src/services/analytics/
rm -rf src/services/experts/

# Intelligence Hub services (deleted features only)
rm src/services/intelligenceHub/tradePulse.js
rm src/services/intelligenceHub/advancedOwnerProfiler.js
rm src/services/intelligenceHub/multiLeagueAggregator.js
rm src/services/intelligenceHub/tradeTracker.js
rm src/services/intelligenceHub/valueChangeTracker.js
```

**Phase B3: Clean up `src/index.js` (10 min)**
- Remove all imports for deleted route files
- Remove all `app.use()` mounts for deleted routes
- Remove Stripe webhook raw body parser
- Remove any references to deleted services in startup/shutdown
- Verify: `node -e "require('./src/app')"`

**Phase B4: Clean up `src/routes/intelligenceHub.js` (10 min)**
- Remove imports: `multiLeagueAggregator`, `advancedOwnerProfiler`, `tradePulse`, `tradeTracker`, `valueChangeTracker`
- Remove route handlers for: momentum/*, multi-league/*, tracking/*, advanced owner profiling, trade-pulse/*, unified-leagues/*
- Keep: connect, sync-league, dashboard, leagues, trade-opportunities, season-outlook, trade-pitch, counter-offers, multi-team-trade, multi-team-partners, sleeper-link, all-teams, basic owner-profiles

**Phase B5: Remove `checkSubscription` from all kept routes (5 min)**
```bash
# Find all files using checkSubscription
grep -rn "checkSubscription\|attachSubscriptionInfo" src/routes/ --include="*.js"
```
- Remove import lines
- Remove middleware from route chains (e.g., `router.get('/path', authenticate, checkSubscription, handler)` → `router.get('/path', authenticate, handler)`)
- Delete `src/middleware/checkSubscription.js`

**Phase B6: Delete demo mode (1 min)**
```bash
rm src/demo.js
```

### Workstream C: Frontend Cleanup
**Owner:** Subagent C (frontend specialist)
**Time Estimate:** 30 min
**Dependencies:** None (can run parallel with A, B)

**Phase C1: Delete component directories (5 min)**
```bash
cd ~/Documents/Claude\ Cowork\ Business/titlerun-app
rm -rf src/components/Commissioner/
rm -rf src/components/Community/
rm -rf src/components/Analytics/
rm -rf src/components/Subscription/
rm -rf src/components/Help/
rm -rf src/components/WallOfShame/
rm -rf src/components/gamification/
```

**Phase C2: Delete individual components (5 min)**
```bash
rm src/components/AlertCard.jsx
rm src/components/IntelligenceHub/MomentumAlerts.jsx
rm src/components/IntelligenceHub/TradePulse.jsx
rm src/components/IntelligenceHub/MultiLeagueDashboard.jsx
rm src/components/IntelligenceHub/UnifiedLeagueSelector.jsx
rm src/components/dashboard/BuySellSignals.jsx
rm src/components/PlayerDetail/ExpertConsensus.jsx
rm src/components/PunishmentClock.tsx
rm src/components/seasonal/PunishmentClock.tsx
rm src/components/seasonal/PunishmentForm.jsx
rm src/components/seasonal/PunishmentVerification.jsx
rm src/components/seasonal/HallOfShame.jsx
rm src/components/seasonal/SPDisplay.jsx
rm src/components/seasonal/SeasonPointsDisplay.tsx
rm src/components/seasonal/WeeklyStreakDisplay.tsx
rm src/components/SeasonPointsDisplay.tsx
```

**Phase C3: Delete pages (3 min)**
```bash
rm src/pages/Alerts.jsx
rm src/pages/AnalyticsDashboard.jsx
rm src/pages/CommissionerConstitutionPage.jsx
rm src/pages/CommissionerDashboardPage.jsx
rm src/pages/CommissionerHistoryPage.jsx
rm src/pages/CommissionerPayoutsPage.jsx
rm src/pages/CommissionerPunishment.jsx
rm src/pages/CommissionerTradeVetoPage.jsx
rm src/pages/CommunityHub.jsx
rm src/pages/HallOfShamePage.jsx
rm src/pages/Help.jsx
rm src/pages/PunishmentLibraryPage.jsx
rm src/pages/SPHistory.jsx
```

**Phase C4: Delete services, hooks, stores, types, constants (5 min)**
```bash
# Services
rm src/services/commissionerApi.js
rm src/services/punishmentApi.js
rm src/services/seasonalApi.ts
rm src/services/achievementService.ts

# Hooks
rm src/hooks/useAlerts.ts
rm src/hooks/useAudioAlerts.js
rm src/hooks/usePunishment.ts
rm src/hooks/useSP.js
rm src/hooks/useWeeklyStreak.js

# Stores
rm src/stores/achievementStore.ts
rm src/stores/gamificationStore.ts
rm src/stores/seasonalStore.ts
rm src/stores/aiChatStore.js

# Types
rm src/types/achievements.ts
rm src/types/gamification.ts
rm src/types/seasonal.ts

# Constants
rm src/constants/punishmentTypes.ts
rm src/constants/seasonalValues.ts
rm src/constants/xpValues.ts
rm src/data/achievements.ts
```

**Phase C5: Clean up `App.jsx` (10 min)**
- Remove all lazy imports for deleted pages/components
- Remove all `<Route>` elements for deleted pages
- Remove any conditional rendering of deleted features (SubscriptionBadge, etc.)
- Keep routes for: Home, Dashboard, Teams, TeamDetail, Players, PlayerDetail, Compare, ReportCards, TradeBuilder, TradeCalculator, TradeFinder, TradesHub, TradeHistory, DraftCompanion, DraftCompanionEntry, DraftCompanionByDraftId, IntelligenceHub, TrophyCase, Settings, More, RedraftRankings, Methodology, Login, Signup, Terms, Privacy, ForgotPassword, ResetPassword, PublicReportCard, PublicTradeCard, Activity, Admin

**Phase C6: Clean up component imports in kept files (5 min)**
- Search all remaining files for imports of deleted components
- `grep -rn "from.*Commissioner\|from.*Community\|from.*Analytics\|from.*Subscription\|from.*Help\|from.*AlertCard\|from.*BuySellSignals\|from.*MomentumAlerts\|from.*TradePulse\|from.*MultiLeagueDashboard\|from.*PunishmentClock\|from.*gamification\|from.*WallOfShame" src/ --include="*.jsx" --include="*.tsx" --include="*.js" --include="*.ts"`
- Remove dead imports and any JSX referencing deleted components

### Workstream D: Dependency Cleanup
**Owner:** Subagent D (devops specialist)
**Time Estimate:** 15 min
**Dependencies:** Workstreams B, C complete

**Tasks:**

**Phase D1: Backend package cleanup**
```bash
cd ~/Documents/Claude\ Cowork\ Business/titlerun-api
npm uninstall stripe web-push ws
# Keep puppeteer (scrapers), openai (AI features), satori/@resvg/resvg-js (evaluate if report card cards need them)
```

**Phase D2: Frontend package cleanup**
```bash
cd ~/Documents/Claude\ Cowork\ Business/titlerun-app
# html2canvas — check if still used by kept features before removing
grep -rn "html2canvas" src/ --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx"
# If only used by deleted features:
npm uninstall html2canvas
```

**Phase D3: Remove environment variables**
- Update `.env`, `.env.example`, Railway env vars
- Remove: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `STRIPE_PREMIUM_PRICE_ID`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`

**Phase D4: Verify no broken imports**
```bash
# Backend
cd ~/Documents/Claude\ Cowork\ Business/titlerun-api
node -e "require('./src/app')" 2>&1 | head -20

# Frontend
cd ~/Documents/Claude\ Cowork\ Business/titlerun-app
npx vite build 2>&1 | tail -30
```

### Workstream E: Testing & Verification
**Owner:** Subagent E (QA specialist)
**Time Estimate:** 30 min
**Dependencies:** Workstreams A-D complete

**Smoke Test Checklist — All 14 Kept Features:**

| # | Feature | Test | Pass? |
|---|---------|------|-------|
| 1 | Sleeper League Sync | POST `/api/intelligence-hub/connect` with valid username → 200 | ☐ |
| 2 | Team Grades | GET `/api/intelligence-hub/dashboard/:leagueId` → returns team grades | ☐ |
| 3 | Power Rankings | Same endpoint as above → returns power rankings | ☐ |
| 4 | Trade Opportunities | GET `/api/intelligence-hub/trade-opportunities/:leagueId/:rosterId` → 200 with 3 recommendations | ☐ |
| 5 | Season Outlook | GET `/api/intelligence-hub/season-outlook/:leagueId/:rosterId` → 200 | ☐ |
| 6 | Trade Pitch Generator | POST `/api/intelligence-hub/trade-pitch` → 200 | ☐ |
| 7 | Counter-Offer Generator | POST `/api/intelligence-hub/counter-offers` → 200 | ☐ |
| 8 | Multi-Team Trade Builder | POST `/api/intelligence-hub/multi-team-trade` → 200 | ☐ |
| 9 | Sleeper Trade Deep Linking | POST `/api/intelligence-hub/sleeper-link` → 200 with deep link URL | ☐ |
| 10 | PWA | Service worker registers, install prompt works | ☐ |
| 11 | ESPN League Sync | GET `/api/espn-hub/leagues` → 200 | ☐ |
| 12 | Dynasty Trade Analyzer | POST `/api/trade-engine/analyze` → 200 | ☐ |
| 13 | Onboarding Tutorial | GET `/api/onboarding/status` → 200 | ☐ |
| 14 | Performance | Redis cache hits on repeated requests, gzip compression active | ☐ |

**Additional Tests:**
- [ ] No 404s for kept routes
- [ ] No `checkSubscription` 403 errors (all free now)
- [ ] Frontend builds without errors (`npm run build`)
- [ ] Backend starts without errors (`node src/index.js`)
- [ ] Existing tests pass (`npm test` — may need to delete test files for deleted features)
- [ ] No console errors in browser for core user flow: Login → Home → Intelligence Hub → Trade Builder

### Workstream F: Documentation Update
**Owner:** Subagent F (documentation specialist)
**Time Estimate:** 15 min
**Dependencies:** Workstream E complete

**Tasks:**
1. Update `titlerun-api/CLAUDE.md` — Remove references to deleted features
2. Update `workspace-titlerun/MEMORY.md` — Update "Core Features (Production)" list to reflect 14 features
3. Update `titlerun-app/CLAUDE.md` (if exists) — Remove deleted component references
4. Create `docs/FEATURE-CONSOLIDATION-CHANGELOG.md` documenting what was removed and why
5. Update any README.md files in both repos
6. Update `src/config/featureFlags.ts` — Remove flags for deleted features
7. Remove any feature-specific documentation in `docs/`

---

## Rollback Plan

### Git Strategy
```bash
# Both repos are on feature-consolidation branch
# main branch is untouched and serves as rollback target

# If anything breaks:
git checkout main              # Instant rollback
railway up                     # Redeploy main branch

# If partial rollback needed:
git stash                      # Save current work
git checkout main -- src/path/to/broken/file  # Cherry-pick specific file
```

### Backup Critical Files
Before starting, these files need explicit backup (in addition to git):
```bash
# These are the highest-risk files that will be modified (not deleted)
cp src/index.js src/index.js.backup
cp src/routes/intelligenceHub.js src/routes/intelligenceHub.js.backup
cp src/App.jsx src/App.jsx.backup  # (frontend)
```

### Testing Checkpoints
| After | Verify |
|-------|--------|
| Workstream A | `node run-migration-085.js` succeeds on staging |
| Workstream B | `node -e "require('./src/app')"` succeeds |
| Workstream C | `npm run build` succeeds (frontend) |
| Workstream D | Both repos install cleanly, no missing deps |
| Workstream E | All 14 smoke tests pass |

### Rollback Procedure
1. **If server won't start:** `git checkout main` on API repo, redeploy
2. **If specific feature broken:** `git checkout main -- src/path/to/file`, fix imports
3. **If database migration broke something:** Run rollback SQL (all operations are DROP TABLE which are safe; the data was unused)
4. **Nuclear option:** Reset both repos to `main`, redeploy

---

## Success Criteria

- [ ] All 20 deleted features' code removed from both repos
- [ ] All 14 kept features still functional (smoke tests pass)
- [ ] No dead code remaining (no orphaned imports, no unused components)
- [ ] No unused npm dependencies
- [ ] Backend tests pass (after removing tests for deleted features)
- [ ] Frontend builds without errors
- [ ] `src/index.js` has no references to deleted routes/services
- [ ] `src/App.jsx` has no references to deleted pages/components
- [ ] No `checkSubscription` middleware calls remain in kept code
- [ ] Database cleanup migration ready for production deploy
- [ ] Documentation updated to reflect 14-feature scope
- [ ] Codebase size reduced by ~40-50% (LOC)
- [ ] Railway env vars cleaned up (Stripe, VAPID keys removed)

---

## Workstream Dependency Graph

```
     ┌──────────┐  ┌──────────┐  ┌──────────┐
     │    A      │  │    B     │  │    C     │
     │ Database  │  │ Backend  │  │ Frontend │
     │  20 min   │  │  30 min  │  │  30 min  │
     └────┬─────┘  └────┬─────┘  └────┬─────┘
          │              │              │
          │              └──────┬───────┘
          │                     │
          │              ┌──────┴─────┐
          │              │     D      │
          │              │ Dependencies│
          │              │   15 min   │
          │              └──────┬─────┘
          │                     │
          └─────────┬───────────┘
                    │
             ┌──────┴─────┐
             │     E      │
             │  Testing   │
             │   30 min   │
             └──────┬─────┘
                    │
             ┌──────┴─────┐
             │     F      │
             │    Docs    │
             │   15 min   │
             └────────────┘

A, B, C run in PARALLEL (no dependencies)
D waits for B + C
E waits for A + D
F waits for E

Critical path: B/C (30 min) → D (15 min) → E (30 min) → F (15 min) = ~90 min
With parallel execution: ~90 min total (not 140 min sequential)
```
