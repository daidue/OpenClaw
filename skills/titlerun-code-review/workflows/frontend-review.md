# Frontend Code Review Workflow

**Loaded when:** Frontend files detected (`.tsx` files in `/app/` OR extension `.tsx`)

---

## Cognitive Frameworks to Load

**Always load these before starting review:**

```markdown
Load ../../cognitive-profiles/nielsen-ux-heuristics.md
Load ../../cognitive-profiles/google-sre-performance.md
Load ../references/titlerun-anti-patterns.md (frontend section)
Load ../references/production-incidents.md
Load ../references/tech-stack.md (React/TanStack Query section)
```

---

## Review Sequence (Execute in Order)

### Step 1: UX Review (Nielsen's 10 Heuristics)

**Apply Nielsen's usability heuristics systematically.**

**For each component changed:**

1. **Visibility of System Status**
   - Are loading states present?
   - Are progress indicators shown for long operations?
   - Is user feedback immediate (button disabled after click)?

2. **Match Between System and Real World**
   - Is terminology user-friendly (not developer jargon)?
   - Are icons intuitive?
   - Is language consistent across the app?

3. **User Control and Freedom**
   - Can users undo actions?
   - Is there a clear "back" or "cancel"?
   - Are destructive actions confirmable?

4. **Consistency and Standards**
   - Do similar actions behave similarly?
   - Are button styles consistent (primary/secondary)?
   - Is spacing/layout consistent with design system?

5. **Error Prevention**
   - Are invalid inputs prevented (disabled states)?
   - Are constraints clear before user acts?
   - Are destructive actions protected (confirmation)?

6. **Recognition Rather Than Recall**
   - Are options visible (not memorized)?
   - Are previous selections remembered?
   - Is navigation clear (breadcrumbs, active states)?

7. **Flexibility and Efficiency**
   - Are keyboard shortcuts available?
   - Are power-user features present?
   - Is pagination/filtering available for large lists?

8. **Aesthetic and Minimalist Design**
   - Is every element necessary?
   - Is visual hierarchy clear?
   - Is cognitive load minimized?

9. **Help Users Recognize, Diagnose, and Recover from Errors**
   - Are error messages clear (not technical)?
   - Do errors suggest solutions?
   - Is recovery path obvious?

10. **Help and Documentation**
    - Are tooltips present for complex features?
    - Is in-app guidance available?
    - Are empty states instructive?

**For each finding:** Use `templates/finding-template.md` format

**Severity:**
- CRITICAL: Blocks user from completing task
- HIGH: Degrades user experience significantly
- MEDIUM: Usability improvement opportunity
- LOW: Polish/refinement

---

### Step 2: Performance Review (React-Specific)

**Apply Google SRE principles to React code:**

**2.1 React Re-Render Optimization**

Check for:
- **`.find()` / `.filter()` / `.map()` without `useMemo`**
  ```tsx
  // BAD: New object every render
  const selectedPlayer = players.find(p => p.id === selectedId);
  
  // GOOD: Memoized
  const selectedPlayer = useMemo(
    () => players.find(p => p.id === selectedId),
    [players, selectedId]
  );
  ```

- **Inline object/array creation in props**
  ```tsx
  // BAD: New object every render
  <Component style={{ margin: 10 }} />
  
  // GOOD: Static or memoized
  const style = useMemo(() => ({ margin: 10 }), []);
  <Component style={style} />
  ```

- **Missing `useCallback` for event handlers passed to children**

**Impact quantification:**
- "Causes X unnecessary re-renders per user interaction"
- "On mobile, triggers infinite loop (see 2026-02-16 incident)"

---

**2.2 Data Fetching Optimization**

Check TanStack Query usage:
- **Missing request deduplication** (multiple identical requests)
- **No staleTime configured** (refetches too aggressively)
- **Missing error boundaries** (crashes on API error)
- **No loading states** (flash of empty content)

---

**2.3 Bundle Size**

Check for:
- **Large libraries imported entirely** (should tree-shake)
  ```tsx
  // BAD
  import _ from 'lodash'; // Entire library!
  
  // GOOD
  import debounce from 'lodash/debounce'; // Just one function
  ```

- **Unused dependencies** in package.json

---

### Step 3: TitleRun-Specific Anti-Patterns

**Load:** `../references/titlerun-anti-patterns.md` (frontend section)

**Check for these patterns (HIGH severity minimum):**

1. **`.find()` without useMemo** (#1 MOBILE BUG)
   - Caused 2026-02-16 infinite loop incident
   - Search for: `.find(` `.filter(` `.map(` in components
   - Verify: wrapped in `useMemo` or `useCallback`

2. **Nested Response Data Access**
   - Frontend expects `response.data.X`
   - Backend sometimes sends `response.data.data.X`
   - Check: API response parsing logic

3. **Missing Request Deduplication**
   - Search for: `useQuery` or `useMutation` calls
   - Verify: deduplication logic present in hooks

4. **Cache-Related Patterns**
   - If code "works in private mode, breaks in regular" → cache bug
   - Check: localStorage usage, TanStack Query cache config

---

### Step 4: React Best Practices

**Keys in lists:**
- Are keys stable (not index)?
- Are keys unique?

**Effect dependencies:**
- Are all dependencies listed in `useEffect` deps array?
- Are infinite loops possible (effect triggers itself)?

**Conditional rendering:**
- Are loading states handled?
- Are error states handled?
- Are empty states handled?

**Accessibility:**
- Are semantic HTML elements used?
- Are ARIA labels present for interactive elements?
- Is keyboard navigation supported?

---

### Step 5: Production Incident Check

**Load:** `../references/production-incidents.md`

**For each frontend incident:**
- Does this code match the pattern?
- If yes → FLAG as CRITICAL with incident reference

**Known incidents:**
- 2026-02-16: `.find()` without useMemo → mobile infinite loop (3 days to diagnose)
- Nested response envelope → "Cannot read property X of undefined" (recurring)

---

### Step 6: Tech Stack Specifics

**Load:** `../references/tech-stack.md` (React/TanStack Query)

**React checks:**
- Are hooks used correctly (not in loops/conditions)?
- Are components properly typed (TypeScript)?
- Are fragments used instead of unnecessary `<div>` wrappers?

**TanStack Query checks:**
- Are queries defined with proper keys?
- Is `staleTime` configured (not default 0)?
- Are mutations invalidating correct queries?
- Is optimistic UI used for instant feedback?

**TypeScript checks:**
- Are component props typed?
- Are event handlers typed correctly?
- Are `any` types avoided?

---

## Output Format

**Collect all findings using:** `../templates/finding-template.md`

**Structure:**
```markdown
## Frontend Review Results

**Files reviewed:** X files, Y lines

**Findings by severity:**
- CRITICAL: X issues
- HIGH: Y issues
- MEDIUM: Z issues
- LOW: W issues

### CRITICAL ISSUES

[Use finding-template.md for each]

### HIGH ISSUES

[Use finding-template.md for each]

[etc.]
```

---

## Frontend-Specific Severity Guidelines

| Issue Type | Severity | Rationale |
|------------|----------|-----------|
| `.find()` without useMemo | HIGH | Caused production incident (mobile) |
| Missing error boundary | CRITICAL | Crashes entire app on error |
| No loading state | HIGH | Poor UX, looks broken |
| Missing error state | HIGH | User doesn't know what went wrong |
| Bundle bloat (>500KB) | MEDIUM | Slow initial load |
| Missing accessibility | MEDIUM | Excludes users |
| Inconsistent styling | LOW | Polish issue, not blocking |

---

**Version:** 1.0.0  
**Last updated:** 2026-03-01
