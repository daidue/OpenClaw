# Notion Template Improvements — Implementation Guide

## Priority 1: Sidebar Reorganization (15 minutes)

### Current State:
Sidebar shows all 16 pages/databases in flat list:
- Start Here
- Quick Wins
- Dashboard
- Clients (database)
- Projects (database)
- Meeting Notes (database)
- Invoices (database)
- Time Entries (database)
- Expenses (database)
- Follow-Up Scripts
- Pricing Your Services
- Invoice PDF Template
- Getting Paid on Time
- Tax Season Prep
- Resources & Guides
- Settings

### Improved Structure:
Use toggle headings to group related pages:

**📊 Core System** (Always visible, top of sidebar)
- Dashboard
- Invoices (database)
- Clients (database)

**📧 Follow-Up Scripts** (Direct child of root, high visibility)

**📚 Getting Started** (Toggle heading, collapsed by default)
- Start Here
- Quick Wins (rename to "Quick Wins — 5 Minutes")
- Settings

**📖 Resources & Guides** (Toggle heading, collapsed by default)
- Pricing Your Services
- Getting Paid on Time — The Complete Guide
- Invoice PDF Template
- Tax Season Prep Checklist

**⚙️ Advanced Features** (Toggle heading, collapsed by default)
- Projects (database)
- Time Entries (database)
- Expenses (database)
- Meeting Notes (database)

### How to Implement:
1. Create new pages with toggle headings (use emoji + bold text)
2. Drag existing pages under appropriate toggle heading
3. Collapse "Resources & Guides" and "Advanced Features" by default
4. Keep "Core System" and "Follow-Up Scripts" always visible

---

## Priority 2: Email Script Template Buttons (30 minutes)

### Current State:
Email scripts have [brackets] requiring manual find/replace:
- [Client Name]
- [Invoice #]
- [Amount]
- [Due Date]
- [Your Name]
- [Your Email]

### Improved State:
Template buttons auto-populate from connected invoice database.

### How to Implement:

#### Step 1: Add Template Button to Each Script
1. Open "Follow-Up Scripts" page
2. In "Friendly Reminder (3 Days Before Due)" section, add a button block
3. Click button → "Add new template"
4. Name: "Generate Reminder Email"

#### Step 2: Configure Button Template
Inside the button template, add text block:
```
Subject: Quick heads-up — Invoice {{prop:Invoice #}} due {{prop:Due Date}}

Hi {{relation:Client:prop:Contact Name}},

Hope you're doing well! Just a friendly reminder that Invoice {{prop:Invoice #}} for {{prop:Amount}} is due on {{prop:Due Date}}.

Let me know if you need anything from my end to process payment.

Thanks!
{{prop:Your Name from Settings}}
{{prop:Your Email from Settings}}
```

#### Step 3: Link Button to Invoice Database
- Add "Select Invoice" relation property to button template
- This allows user to pick which invoice they're following up on
- Button auto-fills all {{prop:xxx}} values from selected invoice

#### Step 4: Repeat for All 5 Scripts
- 3-Day Reminder
- 1st Follow-Up (1-5 days overdue)
- 2nd Reminder (5-14 days overdue)
- 3rd Notice (14-30 days overdue)
- Final Escalation (30+ days overdue)

### Alternative (Simpler) Approach:
If database integration is too complex, create a "Script Generator" database:
- Properties: Client Name, Invoice #, Amount, Due Date
- Each row = one follow-up email
- Use formulas to concatenate email text with properties
- User fills in properties, copies generated email

---

## Priority 3: Add Dashboard Metrics (20 minutes)

### Current State:
Dashboard has database views but no summary metrics.

### Improved State:
Add 4 callout boxes at top of Dashboard page:

#### Metric 1: Total Outstanding
```
💵 Total Outstanding

[Linked database: Invoices]
Filter: Status ≠ Paid, Status ≠ Cancelled
Show: Sum of Outstanding Amount property

OR use callout with manual calculation:
"💵 Total Outstanding: $X,XXX
(Check Invoices → Unpaid view for details)"
```

#### Metric 2: Paid This Month
```
✅ Paid This Month

[Linked database: Invoices]
Filter: Status = Paid, Date Paid is this month
Show: Sum of Amount property

OR use callout:
"✅ Paid This Month: $X,XXX
(Revenue collected so far)"
```

#### Metric 3: Overdue Count
```
🚨 Overdue Invoices

[Linked database: Invoices]
Filter: Status = Overdue OR Days Until Due < 0
Show: Count

OR use callout:
"🚨 Overdue: X invoices
(Follow up immediately using email scripts)"
```

#### Metric 4: Unbilled Time
```
⏱️ Unbilled Time

[Linked database: Time Entries]
Filter: Not linked to any Invoice
Show: Sum of Hours

OR use callout:
"⏱️ Unbilled Time: XX hours
(Don't leave money on the table!)"
```

### How to Implement:
1. Open Dashboard page
2. Add heading: "💵 Quick Stats"
3. Add 2-column layout
4. Add 4 callout blocks (2 per column) with emoji icons
5. Inside each callout, add linked database or formula callout
6. Color-code callouts:
   - Outstanding: Blue background
   - Paid This Month: Green background
   - Overdue: Red background
   - Unbilled Time: Yellow background

---

## Priority 4: Quick Start Path (15 minutes)

### Goal:
Give new users value in 60 seconds without full setup.

### Implementation:
Add to top of "Start Here" page:

```
┌──────────────────────────────────────────┐
│ 🚀 Want value NOW? Skip setup and:       │
│                                          │
│ 1. Click "Dashboard" ← See what's        │
│    possible with sample data            │
│                                          │
│ 2. Click "Follow-Up Scripts" ← Copy      │
│    your first payment reminder          │
│                                          │
│ 3. Click "Clients" ← See how to track    │
│    payment reliability                  │
│                                          │
│ Total time: 2 minutes                    │
│                                          │
│ ✅ Ready to set up for real? Continue    │
│    with Step 1 below.                    │
└──────────────────────────────────────────┘
```

### Why This Matters:
Users who see value immediately are 3x more likely to complete full setup.

---

## Testing Checklist:
- [ ] Sidebar grouped into 4 sections (Core, Scripts, Getting Started, Resources, Advanced)
- [ ] Follow-Up Scripts is second item after Dashboard
- [ ] Advanced section collapsed by default
- [ ] Template buttons auto-fill at least 3 values (Client Name, Invoice #, Amount)
- [ ] Dashboard has 4 metric callouts at top
- [ ] Start Here has "Quick Start" path callout box
- [ ] All 16 original pages still accessible (just reorganized)

## Estimated Total Time: 90 minutes
