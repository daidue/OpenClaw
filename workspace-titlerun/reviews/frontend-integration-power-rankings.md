# Frontend Integration Guide: Power Rankings Value Update

**Updated:** 2026-03-17  
**API Version:** v1 (post value-consistency-fix)  
**Affects:** IntelligencePowerRankings component

---

## What Changed

**Backend now returns:**
```javascript
{
  rank: 1,
  rosterId: 123,
  teamName: "Team Name",
  totalValue: 127499,      // ⭐ NEW: Players + Picks
  playerValue: 99443,      // ⭐ NEW: Players only
  pickValue: 28056,        // ⭐ NEW: Picks only
  score: 127499,           // ⚠️ CHANGED: Now includes picks (was players-only)
  positionValues: { QB: 15000, RB: 20000, WR: 30000, TE: 10000 },
  enrichedWithTitleRun: true,
  format: 'sf',
  previousRank: null,
  isYou: false,
}
```

---

## Required Frontend Updates

### 1. Update Type Definitions (if using TypeScript)

**File:** `src/types/intelligenceHub.ts` (or similar)

```typescript
interface PowerRanking {
  rank: number;
  rosterId: number;
  teamName: string;
  totalValue: number;      // Add this
  playerValue: number;     // Add this
  pickValue: number;       // Add this
  score: number;           // Keep for backward compat
  positionValues: {
    QB: number;
    RB: number;
    WR: number;
    TE: number;
  };
  enrichedWithTitleRun: boolean;
  format: string;
  previousRank: number | null;
  isYou: boolean;
}
```

---

### 2. Update Power Rankings Display Component

**File:** `src/components/IntelligenceHub/IntelligencePowerRankings.jsx`

#### Current Display (Likely)
```jsx
<div className="value">
  {team.score.toLocaleString()} pts
</div>
```

#### Updated Display (Show Breakdown)
```jsx
import { Tooltip, HelpCircle } from '@/components/ui';

<div className="value-breakdown">
  <div className="total-value">
    {team.totalValue.toLocaleString()} pts
  </div>
  
  <Tooltip content={
    <div className="value-tooltip">
      <div className="tooltip-row">
        <span>Players:</span>
        <span>{team.playerValue.toLocaleString()}</span>
      </div>
      <div className="tooltip-row">
        <span>Draft Picks:</span>
        <span>{team.pickValue.toLocaleString()}</span>
      </div>
      <div className="tooltip-divider" />
      <div className="tooltip-row total">
        <span>Total:</span>
        <span>{team.totalValue.toLocaleString()}</span>
      </div>
    </div>
  }>
    <HelpCircle size={14} className="info-icon" />
  </Tooltip>
</div>
```

---

### 3. Add Visual Indicator for Pick Value

**Optional Enhancement:**

```jsx
<div className="value-bar">
  {/* Player value bar */}
  <div 
    className="player-value-segment"
    style={{ 
      width: `${(team.playerValue / team.totalValue) * 100}%`,
      backgroundColor: '#3b82f6' // Blue
    }}
  />
  
  {/* Pick value bar */}
  <div 
    className="pick-value-segment"
    style={{ 
      width: `${(team.pickValue / team.totalValue) * 100}%`,
      backgroundColor: '#10b981' // Green
    }}
  />
</div>
```

**Result:** Visual breakdown showing what % is players vs picks.

---

### 4. Add Help Text / Info Banner

**Show on first load after deploy:**

```jsx
<Alert variant="info" className="power-rankings-update">
  <Info size={16} />
  <div>
    <strong>Updated Rankings:</strong> Power Rankings now include draft pick value. 
    Teams with strong pick portfolios may see their ranking improve.
  </div>
  <Button variant="ghost" size="sm" onClick={dismissBanner}>
    Got it
  </Button>
</Alert>
```

**Store dismiss state in localStorage:**
```javascript
const [showBanner, setShowBanner] = useState(
  !localStorage.getItem('power-rankings-update-dismissed')
);

const dismissBanner = () => {
  localStorage.setItem('power-rankings-update-dismissed', 'true');
  setShowBanner(false);
};
```

---

### 5. Handle Backward Compatibility

**If `playerValue` or `pickValue` are missing (old API response):**

```javascript
const playerValue = team.playerValue ?? team.score ?? 0;
const pickValue = team.pickValue ?? 0;
const totalValue = team.totalValue ?? team.score ?? 0;
```

This ensures the UI doesn't break if hitting an old API version.

---

## UI/UX Recommendations

### Option A: Minimal (Quick Deploy)
- Show `totalValue` as main number
- Add tooltip with player/pick breakdown
- ✅ Fastest to implement
- ✅ Minimal UI change

### Option B: Enhanced (Better UX)
- Show `totalValue` prominently
- Add segmented bar showing player vs pick %
- Show "Top Pick Portfolio" badge for teams with high pick value
- Add filter: "Sort by Player Value" vs "Sort by Pick Value"
- ⚠️ More work, better user experience

---

## Testing Checklist

Before deploying frontend:

- [ ] Power Rankings loads without errors
- [ ] Tooltip shows correct player/pick breakdown
- [ ] Values match backend API response
- [ ] "My Team" highlighting still works
- [ ] Position values display correctly
- [ ] Help banner shows on first load
- [ ] Help banner dismisses correctly
- [ ] No console errors
- [ ] Works on mobile viewport

---

## Example API Response (Real Data)

```json
{
  "success": true,
  "data": {
    "powerRankings": [
      {
        "rank": 1,
        "rosterId": 456,
        "teamName": "Championship Squad",
        "totalValue": 127499,
        "playerValue": 99443,
        "pickValue": 28056,
        "score": 127499,
        "positionValues": {
          "QB": 24000,
          "RB": 28000,
          "WR": 35000,
          "TE": 12443
        },
        "enrichedWithTitleRun": true,
        "format": "sf",
        "previousRank": 2,
        "isYou": true
      },
      // ... more teams
    ]
  }
}
```

---

## FAQ for Frontend Devs

**Q: Why did ranking order change?**  
A: Backend now includes draft picks in `totalValue`. Teams with strong pick portfolios (e.g., multiple 1st rounders) will rank higher.

**Q: Should we show a changelog to users?**  
A: Yes, the info banner (section 4) covers this. Dismiss after first view.

**Q: What if `playerValue` or `pickValue` are missing?**  
A: Use fallback logic (section 5). This shouldn't happen with the new API, but handle gracefully.

**Q: Can we still sort by player value only?**  
A: Yes! Use `team.playerValue` for sorting. You could add a filter toggle.

**Q: Do we need to update Team Detail page?**  
A: No — Team Detail already showed correct values. Only Power Rankings needed fixing.

---

## Support Response Template

If users ask "Why did my rank change?":

> **Updated Rankings (March 2026)**
> 
> We updated Power Rankings to include draft pick value alongside player value. This gives you a complete picture of your team's total asset value.
> 
> **What changed:**
> - Power Rankings now include draft picks
> - Your total value = Players + Picks
> - Teams with strong pick portfolios may see their rank improve
> 
> **Example:**
> - Player Value: 99,443 pts
> - Pick Value: 28,056 pts (18 picks)
> - **Total Value: 127,499 pts**
> 
> Hover over the ℹ️ icon to see your breakdown.

---

## Related Files

**Backend:**
- API route: `src/routes/intelligenceHub.js`
- Service: `src/services/teamValueService.js`

**Frontend (likely locations):**
- Component: `src/components/IntelligenceHub/IntelligencePowerRankings.jsx`
- Types: `src/types/intelligenceHub.ts`
- Styles: `src/styles/intelligence-hub.css`

---

## Timeline

**Backend:** ✅ Complete (deployed to staging)  
**Frontend:** ⏳ Pending (estimated 2-3 hours)  
**QA:** ⏳ Pending (30 minutes)  
**Production:** ⏳ Pending (after QA passes)

---

**Questions?** Check `value-consistency-fix-summary.md` or ping Rush (titlerun agent).
