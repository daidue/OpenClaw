# Cognitive Profile: Jakob Nielsen (UX Heuristics)

**Source:** Nielsen Norman Group, 10 Usability Heuristics, UX research

**Domain:** User experience, interface design, usability, interaction patterns

---

## Decision Framework (10 Heuristics)

### 1. Visibility of System Status
**Question:** Does the user know what's happening?

**Check:**
- Loading states
- Progress indicators
- Success/error feedback
- Current location (breadcrumbs, active nav)

**Red flags:**
- No loading indicator on async operations
- Silent failures (error but no message)
- Can't tell if action completed
- No feedback after form submission

**Required:**
- Loading spinner/skeleton on every async operation
- Success toast/confirmation after actions
- Error messages when things fail
- Visual feedback on interactive elements (hover, active states)

**Quantify impact:**
- "User doesn't know if trade submitted → clicks 3x → creates duplicates"
- "No loading state → user thinks app froze → refreshes page → loses work"

---

### 2. Match Between System and Real World
**Question:** Does it use familiar concepts and language?

**Check:**
- Terminology (jargon vs plain language)
- Metaphors (trash can for delete, not "expunge")
- Conventions (red = danger, green = success)
- Natural information flow

**Red flags:**
- Developer jargon in UI ("API error 500")
- Non-standard icons or colors
- Unfamiliar patterns (reinventing common interactions)

**Required:**
- Plain language (not technical terms)
- Standard icons (trash for delete, pencil for edit)
- Conventional color meanings (red/yellow/green)
- Left-to-right, top-to-bottom flow (in Western UIs)

**Example:**
- ❌ "Failed to instantiate trade object"
- ✅ "Couldn't create trade. Please try again."

---

### 3. User Control and Freedom
**Question:** Can the user undo mistakes?

**Check:**
- Undo functionality
- Cancel buttons on actions
- Exit paths from flows
- Confirmation dialogs on destructive actions

**Red flags:**
- No way to undo/revert
- Can't cancel in-progress action
- Trapped in modal (no close button)
- Destructive action with no confirmation

**Required:**
- Undo on non-trivial changes
- Cancel button on all forms
- Close/back buttons on modals
- Confirmation on delete/irreversible actions

**Quantify impact:**
- "User deletes wrong player → no undo → has to rebuild entire trade"

---

### 4. Consistency and Standards
**Question:** Does it match platform conventions and internal patterns?

**Check:**
- UI patterns consistent across app
- Button styles/placement
- Terminology consistent
- Keyboard shortcuts standard

**Red flags:**
- Primary action button changes position
- Same action has different labels ("Submit" vs "Save" vs "Done")
- Custom scrollbar behavior
- Non-standard keyboard shortcuts

**Required:**
- Button hierarchy consistent (primary/secondary/danger)
- Same action = same label everywhere
- Patterns reused (modals, forms, tables)
- Standard shortcuts (Cmd+S save, Cmd+Z undo)

---

### 5. Error Prevention
**Question:** Can we prevent errors before they happen?

**Check:**
- Input validation
- Constraints (max length, allowed formats)
- Smart defaults
- Guard rails on dangerous actions

**Red flags:**
- No validation until form submit (user types invalid data)
- Allows impossible states (e.g., end date before start date)
- Easy to trigger destructive action accidentally
- No defaults on required fields

**Required:**
- Inline validation (real-time feedback)
- Constraints on inputs (date pickers prevent invalid dates)
- Confirmation on destructive actions
- Smart defaults (pre-fill when possible)

**Example:**
- ❌ User can enter negative trade values
- ✅ Input type="number" min="0" with validation

---

### 6. Recognition Rather Than Recall
**Question:** Can the user see options instead of remembering them?

**Check:**
- Dropdown menus (not type-in fields for known options)
- Auto-complete
- Recently used items
- Visible options (not hidden behind ?/help)

**Red flags:**
- Requires remembering syntax ("type 'player:mahomes'")
- Hidden features (only accessible via keyboard shortcut)
- No search history/recent items
- Options buried in settings

**Required:**
- Dropdowns for known options
- Auto-complete for searches
- Recently used items visible
- Common actions visible (not hidden)

**Example:**
- ❌ Type player name exactly correct
- ✅ Dropdown with searchable player list

---

### 7. Flexibility and Efficiency
**Question:** Does it support both novice and expert users?

**Check:**
- Keyboard shortcuts for power users
- Bulk actions
- Quick access to frequent tasks
- Customization

**Red flags:**
- No keyboard navigation
- Can't bulk-edit
- Every action requires multiple clicks
- Can't customize frequently-used features

**Required:**
- Keyboard shortcuts for common actions
- Bulk operations (select multiple, apply action)
- Quick access patterns (right-click menus, command palette)
- Remembers user preferences

**Example:**
- Novice: Clicks through menus
- Expert: Cmd+K to open command palette, types "add player", Enter

---

### 8. Aesthetic and Minimalist Design
**Question:** Does every element serve a purpose?

**Check:**
- Information density (not cluttered)
- Visual hierarchy
- White space
- Unnecessary UI elements

**Red flags:**
- Cluttered interface (too much at once)
- No clear focal point
- Decorative elements with no function
- Competing visual elements

**Required:**
- One primary action per screen
- Clear visual hierarchy (size, color, position)
- White space to separate sections
- Remove unnecessary UI

**Example:**
- ❌ Dashboard with 20 charts, no hierarchy
- ✅ Dashboard with 3-5 key metrics, clear sections

---

### 9. Help Users Recognize, Diagnose, and Recover from Errors
**Question:** Do error messages help the user fix the problem?

**Check:**
- Error messages in plain language
- Explain WHAT went wrong
- Explain HOW to fix it
- Constructive tone (not blaming user)

**Red flags:**
- Generic errors ("Something went wrong")
- Technical jargon ("NullPointerException")
- No guidance on how to fix
- Blaming tone ("You entered invalid data")

**Required:**
- Plain language explanation
- Specific error (not generic)
- Clear next steps to fix
- Helpful tone

**Example:**
- ❌ "Error: Invalid input"
- ✅ "That player isn't available. Try searching for a different player or checking if they're already in the trade."

---

### 10. Help and Documentation
**Question:** Can users get help when stuck?

**Check:**
- Contextual help (tooltips, inline hints)
- Search functionality
- Examples
- Documentation accessible but not intrusive

**Red flags:**
- No help text anywhere
- Documentation in separate PDF (not integrated)
- No examples of expected input
- Help text blocks the interface

**Required:**
- Tooltips on complex features
- Inline hints (placeholder text, helper text)
- Examples shown in context
- Search functionality

**Example:**
- Hover over "Trade Fairness Score" → Tooltip: "How balanced this trade is. Higher = more fair. Scores below 40 are lopsided."

---

## Question Sequence (UX Review)

1. **What's the user trying to do?**
   - Primary goal of this screen/flow?
2. **Can they tell what's happening?**
   - Loading states? Feedback? Current location?
3. **Can they undo mistakes?**
   - Cancel button? Undo? Confirmation on destructive actions?
4. **Is it consistent?**
   - Matches rest of app? Platform conventions?
5. **Can we prevent errors?**
   - Validation? Constraints? Smart defaults?
6. **Is it clear what to do next?**
   - Visible options? Clear primary action?
7. **Is it efficient?**
   - Keyboard shortcuts? Bulk actions?
8. **Is it focused?**
   - One primary goal? Clear hierarchy?
9. **Do errors help the user?**
   - Plain language? How to fix?
10. **Can they get help?**
    - Tooltips? Examples? Inline hints?

---

## Severity Classification

### Critical (Block Merge)
- Silent failures (no error message)
- No way to undo destructive action
- User can create invalid/impossible state
- Primary action not visible/accessible

### High (Fix Before Deploy)
- No loading indicators on async operations
- Generic error messages ("Something went wrong")
- Inconsistent UI patterns
- No keyboard navigation on key workflows

### Medium (Fix This Sprint)
- Missing tooltips on complex features
- No confirmation on destructive actions
- Cluttered interface (too much at once)
- Missing smart defaults

### Low (Backlog)
- Missing keyboard shortcuts on secondary features
- Suboptimal visual hierarchy
- Could use more white space
- Documentation could be more detailed

---

## Production Incident Examples

**Example 1: Silent Failure**
```
User submits trade → API fails → No error message → User thinks it worked
```

**Impact:** User discovers trade wasn't submitted 3 days later. Trust destroyed.

**Fix:**
```javascript
try {
  await submitTrade(trade);
  toast.success("Trade submitted!");
} catch (error) {
  toast.error("Couldn't submit trade. Please try again.");
}
```

---

**Example 2: No Loading State**
```
User clicks "Load Report Card" → No spinner → Waits 10 seconds → Thinks app froze → Refreshes page
```

**Impact:** 40% of users abandon before report loads.

**Fix:**
```javascript
const [loading, setLoading] = useState(false);

async function loadReport() {
  setLoading(true);
  await fetchReport();
  setLoading(false);
}

{loading ? <Spinner /> : <ReportCard />}
```

---

**Example 3: No Undo**
```
User deletes player from trade by accident → No undo → Has to rebuild entire trade
```

**Impact:** 15% of users rage-quit after accidental deletion.

**Fix:**
- Add confirmation dialog on delete
- OR: Add "Undo" toast after delete with 5-second timeout

---

## What This Framework Consistently Prioritizes

1. **User mental model** (match how they think)
2. **Error prevention** (stop mistakes before they happen)
3. **Feedback** (always tell user what's happening)
4. **Recovery** (undo, cancel, go back)

## What It Consistently Ignores

- Developer convenience (UI serves user, not developer)
- "Power user" features that confuse novices (unless progressive disclosure)
- Aesthetic trends (usability > prettiness)

---

## Usage in Skills

When reviewing code for UX:

```markdown
Apply Nielsen UX Heuristics:
1. Visibility: Loading states? Feedback? Current location?
2. Error prevention: Validation? Constraints? Defaults?
3. Error recovery: Undo? Cancel? Clear error messages?
4. Consistency: Matches app patterns? Platform conventions?
5. Efficiency: Keyboard nav? Bulk actions?
6. Clarity: Plain language? Visible options?
7. Severity: Critical/High/Medium/Low
8. Propose specific fix with user impact

For EVERY user action, ask:
- Do they know what's happening?
- Can they recover from mistakes?
- Does it match their mental model?
```

---

**Last updated:** 2026-03-01  
**Version:** 1.0
