# Thumbnail Redesign Brief — For Legibility at 200px

## Current Problem:
The existing thumbnail is a scaled-down version of the cover image (dashboard mockup). At 200px width, the dashboard details become illegible and the value proposition is lost.

## Design Requirements:

### Size & Format:
- **Dimensions:** 600×600px (square, optimized for Gumroad)
- **File type:** PNG with transparency or solid background
- **Max file size:** 500KB

### Visual Hierarchy (Top to Bottom):

**1. The Big Number** (占50% of canvas)
- Text: "**5 SCRIPTS**"
- Font: Bold sans-serif (Inter Black or similar)
- Size: 120px
- Color: White or bright cyan (#00D9FF)
- Purpose: Grab attention at thumbnail size

**2. Product Category** (15% of canvas)
- Text: "Notion Invoice Tracker"
- Font: Medium sans-serif
- Size: 36px
- Color: Light gray (#CCCCCC)
- Purpose: Clarify what it is

**3. Price Arrow** (15% of canvas)
- Text: "$37 →"
- Font: Bold sans-serif
- Size: 48px
- Color: Bright green (#00FF88) or cyan
- Purpose: Show value/affordability

**4. Optional: Notion Logo** (10% of canvas, bottom corner)
- Notion wordmark or icon
- Color: White or light gray
- Purpose: Platform credibility

### Background:
- Solid dark blue (#1E3A5F) matching cover OR
- Gradient: Dark blue → darker blue

### Color Palette:
- Background: Dark blue (#1E3A5F)
- Primary text: White (#FFFFFF)
- Accent numbers: Cyan (#00D9FF) or bright green (#00FF88)
- Secondary text: Light gray (#CCCCCC)

## Layout Example:

```
┌─────────────────────┐
│                     │
│     5 SCRIPTS       │  ← Big, bold, white
│                     │
│  Notion Invoice     │  ← Smaller, gray
│     Tracker         │
│                     │
│      $37 →          │  ← Green/cyan, medium
│                     │
│            [notion] │  ← Logo, corner
└─────────────────────┘
```

## Testing:
Export at 200px width and view on phone to ensure:
- "5 SCRIPTS" is instantly readable
- Price is visible
- Product category is legible
- Overall design is clean, not cluttered

## Comparison:
- **Current thumbnail:** Dashboard mockup (illegible at 200px)
- **New thumbnail:** Number-focused (legible, attention-grabbing)
- **Why it works:** Human eye catches numbers first, then processes context
