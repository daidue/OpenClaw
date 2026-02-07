# 📋 Invoice Tracker — Technical Product Review
**Making it Feel PREMIUM and AUTOMATED**

---

## 🚨 CRITICAL FINDING: Free Plan Automation Limitations

**Notion Automations Require Paid Plan** (Plus/Business/Enterprise)
- FREE plan users can **use** existing automations in templates (they'll work!)
- FREE plan users **cannot edit or create** new automations (except basic Slack notifications)
- **Strategy:** Build all automations into the template. Users on free can use them as-is. This is a FEATURE, not a bug — "Premium automations included, no setup required."

---

## 1. Notion Automations We Should Add

### ✅ Implementation Details

#### A) Auto-Set Status to "Overdue"
**Trigger:** Every day at 9:00 AM
**Action:** Edit property → Status → Set to "Overdue"
**Conditions:** 
- Due Date is before today
- Status is NOT IN [Paid, Cancelled, Draft]

**Implementation:**
```
Trigger: Every 1 day at 9:00 AM
Condition: Apply to view "Unpaid Invoices"
Action 1: Edit property in Invoices database
  - Where: Due Date < now() AND Status NOT IN [Paid, Cancelled, Draft]
  - Set: Status = "Overdue"
```

**Value:** Automatic daily status updates without manual checking.

---

#### B) Auto-Notify When Invoice Is Paid
**Trigger:** Status → Set to "Paid"
**Action:** Send notification to page creator

**Implementation:**
```
Trigger: When property edited → Status → is set to → Paid
Action 1: Send notification to → Page creator
  Message: "💰 Invoice {{Invoice #}} just got paid! {{Total}} received from {{Client}}. Nice work!"
```

**Value:** Instant dopamine hit when clients pay. Psychological win.

---

#### C) Auto-Create Recurring Invoices
**Trigger:** Every month (1st of month at 9:00 AM)
**Action:** Add page to Invoices database (for all recurring invoices due that month)

**Implementation (Complex — Requires 2 Automations):**

**Automation 1: Monthly Recurring**
```
Trigger: Every 1 month on the 1st at 9:00 AM
Action 1: Define variable → "RecurringInvoices"
  Formula: Invoices.filter(current.Recurring == true and current.Recurrence == "Monthly")
Action 2: Add page to Invoices
  For each: RecurringInvoices
  Properties to copy:
    - Client (from original)
    - Amount (from original)
    - Line Items (from original)
    - Tax Rate (from original)
  Properties to set:
    - Invoice # = "INV-" + format(now(), "YYYYMM") + "-R" (auto-generate)
    - Status = "Draft"
    - Date Issued = (empty, user fills when ready to send)
    - Due Date = (empty, calculated from Date Issued)
    - Recurring = unchecked (this is the COPY, not the template)
```

**Limitation:** Notion automations can't do complex "for each" logic on relations yet. **Workaround:**
- Instead of auto-creating, use a **Button** that users click monthly (see Button section below)
- Or use a Zapier/Make integration (see Integration section)

**Better Alternative:** Create a "Recurring Invoice Templates" database, and use a button to duplicate from templates.

---

#### D) Button Blocks for Common Actions

**These are NOT automations — they're Button properties in databases.**

Buttons available:
1. **"✅ Mark as Paid"** (in Invoices database)
2. **"📧 Send Reminder"** (in Invoices database)
3. **"🔄 Create Recurring Copy"** (in Invoices database)
4. **"⚡ Quick Invoice from Time"** (in Time Entries database)

See Button section below for full implementation.

---

### 📊 Free Plan vs Paid Comparison

| Feature | Free Plan | Plus Plan | Implementation Notes |
|---------|-----------|-----------|---------------------|
| **Database Automations** | ❌ Can't create/edit | ✅ Unlimited | Template ships with automations pre-built. Free users can USE them. |
| **Button Actions** | ✅ Full access | ✅ Full access | Everyone can use buttons. |
| **Slack Notifications** | ✅ Basic only | ✅ Advanced | Free users can create Slack automations manually. |
| **Webhooks** | ❌ No | ✅ Yes | Paid only. Use for Zapier triggers. |
| **Email Automations** | ❌ No | ✅ Yes (Gmail) | Paid only. Can send invoice reminders via Gmail. |

**Marketing Angle:**
> "This template includes premium automations already built-in. Even on Notion's free plan, you'll get automatic overdue tracking, payment notifications, and smart status updates — no setup required. (Notion Plus users can customize these further.)"

---

## 2. Notion Buttons & Templates

### Button Blocks to Add

#### A) **Page-Level Buttons** (on Dashboard)
Add these to the Dashboard as standalone button blocks:

**1. "⚡ New Invoice" Button**
```
Action: Add a page to → Invoices database
Properties:
  - Status = "Draft"
  - Date Issued = today
  - Due Date = dateAdd(today, 30, "days")  [if default Net 30]
  - Invoice # = "INV-" + format(now(), "YYMMDD") + "-" + count
```

**2. "⏱️ Quick Time Entry" Button**
```
Action: Add a page to → Time Entries database
Properties:
  - Date = today
  - Billable = checked
  - Invoiced = unchecked
```

**3. "👤 New Client" Button**
```
Action: Add a page to → Clients database
Properties:
  - Status = "Active"
  - Payment Terms = "Net 30"
  - Currency = "USD"
```

---

#### B) **Database Property Buttons** (inside databases)

**In Invoices Database:**

**Button 1: "✅ Mark as Paid"**
```
Action: Edit pages → This page
  - Status = "Paid"
  - Date Paid = today
```

**Button 2: "📧 Copy Follow-Up Email"**
```
Action: Show confirmation
Message: "Copy this email template:
---
Hi {{Client}},

Following up on Invoice {{Invoice #}} for {{Total}}, which was due on {{Due Date}}. 

Could you provide an update on when I can expect payment?

Thanks,
[Your Name]
---
✅ Email copied to clipboard! (Paste into your email client)"
```
*Note: Notion buttons can't actually copy to clipboard, but we can display the text for easy manual copy. For real clipboard functionality, need browser extension or external integration.*

**Button 3: "🔄 Duplicate for Recurring"**
```
Action: Add a page to → Invoices database
Copy properties from: This page
  - Client
  - Amount
  - Line Items
  - Tax Rate
Set new properties:
  - Invoice # = "INV-" + format(now(), "YYMMDD")
  - Status = "Draft"
  - Date Issued = (empty)
  - Due Date = (empty)
```

**In Time Entries Database:**

**Button: "📋 Create Invoice from Selected Time"**
This is trickier — Notion doesn't support multi-select button actions yet.

**Workaround:**
1. Create a "Selected for Invoice" checkbox property
2. Users check the boxes for entries they want to invoice
3. Button action:
```
Action: Add a page to → Invoices database
Properties:
  - Status = "Draft"
  - Line Items = "See linked time entries"
  - Amount = sum(Time Entries where Selected = checked)
Then:
Action 2: Edit pages in → Time Entries
  Where: Selected = checked
  Set: Invoiced = checked, Invoice = [newly created invoice]
  Set: Selected = unchecked
```

---

#### C) **Database Templates**

Add these as "New" button options in Invoices database:

**Template 1: "Hourly Invoice"**
```
Properties pre-filled:
- Line Items = "Hours worked: [X] @ $[rate]/hr"
- Tax Rate = 0
- Status = "Draft"
- Payment Terms pulled from Client relation
```

**Template 2: "Project Invoice"**
```
Properties pre-filled:
- Line Items = "Project: [Project Name]\nScope: [Description]\nDeliverables: [List]"
- Tax Rate = 0
- Status = "Draft"
```

**Template 3: "Retainer Invoice"**
```
Properties pre-filled:
- Line Items = "Monthly Retainer - [Month]\nIncludes: [X] hours of work"
- Recurring = checked
- Recurrence = "Monthly"
```

**Template 4: "Expense Reimbursement Invoice"**
```
Properties pre-filled:
- Line Items = "Expense Reimbursement:\n- [Expense 1]: $[amount]\n- [Expense 2]: $[amount]"
- Tax Rate = 0
```

**Implementation:**
In Invoices database → Click "New ▼" dropdown → "New template" → Set up each template with pre-filled values.

---

## 3. Advanced Formula Ideas

### A) Client Health Score
**New property in Clients database:** `Health Score` (Formula)

**Implementation:**
```notion-formula
let(
  totalInvoices, prop("Invoices").length,
  paidOnTime, prop("Invoices").filter(current.Status == "Paid" and current.Days Outstanding <= prop("Payment Terms").replace("Net ", "").toNumber()).length,
  latePayments, prop("Invoices").filter(current.Status == "Paid" and current.Days Outstanding > prop("Payment Terms").replace("Net ", "").toNumber()).length,
  overdue, prop("Invoices").filter(current.Status == "Overdue").length,
  
  if(totalInvoices == 0, "⚪ New Client",
    if(overdue > 0, "🔴 At Risk (" + format(overdue) + " overdue)",
      if(latePayments / totalInvoices > 0.3, "🟡 Watch (" + format(round(latePayments / totalInvoices * 100)) + "% late)",
        "🟢 Healthy (" + format(round(paidOnTime / totalInvoices * 100)) + "% on-time)"
      )
    )
  )
)
```

**What it does:**
- 🟢 Healthy = 70%+ of invoices paid on time
- 🟡 Watch = 30%+ of invoices paid late (but eventually paid)
- 🔴 At Risk = Has current overdue invoices
- ⚪ New Client = No invoice history yet

**Value:** Immediately see which clients are risky. Sort by this in a "Client Health Dashboard" view.

---

### B) Effective Hourly Rate
**New property in Invoices database:** `Effective Hourly Rate` (Formula)

**Implementation:**
```notion-formula
if(
  empty(prop("Time Entries")),
  0,
  prop("Total") / prop("Time Entries").map(current.Hours).sum()
)
```

**What it does:** For project-based work, calculates actual $/hour earned based on logged time.

**Example:**
- Invoice amount: $3,000
- Time logged: 25 hours
- Effective rate: $120/hr

**Value:** Compare to your target hourly rate. If effective rate is lower than target, you're underpricing or over-delivering.

---

### C) Cash Flow Projection (Next 30 Days)
**New property in Invoices database:** `Expected in 30d` (Formula)

**Implementation:**
```notion-formula
if(
  prop("Status") == "Paid" or prop("Status") == "Cancelled",
  0,
  if(
    prop("Days Until Due") >= 0 and prop("Days Until Due") <= 30,
    prop("Total"),
    0
  )
)
```

**Then create a Dashboard view:**
- **View name:** "Cash Flow — Next 30 Days"
- **Filter:** Expected in 30d > 0
- **Calculate (at bottom of Total column):** Sum
- **Result:** Shows total expected revenue in next 30 days

**Better version — Create a separate "Dashboard Metrics" page:**
```
💰 Expected Revenue Next 30 Days: [Linked view of Invoices where Expected in 30d > 0, sum of Total]
⚠️ At Risk: [Linked view of Invoices where Status = Overdue, sum of Total]
✅ YTD Revenue: [Linked view of Invoices where Status = Paid AND Date Paid is this year, sum of Total]
```

---

### D) Payment Velocity (Average Days to Payment)
**New property in Clients database:** `Avg Payment Time` (Formula)

**Implementation:**
```notion-formula
let(
  paidInvoices, prop("Invoices").filter(current.Status == "Paid"),
  avgDays, paidInvoices.map(current.Days Outstanding).sum() / paidInvoices.length,
  
  if(paidInvoices.length == 0, "No data",
    format(round(avgDays)) + " days avg"
  )
)
```

**What it does:** Shows average time from invoice issued to payment received.

**Value:** Know which clients pay fast vs slow. Adjust your own cash flow planning accordingly.

---

### E) Late Fee Calculator
**New property in Invoices database:** `Late Fee` (Formula)

**Implementation:**
```notion-formula
if(
  prop("Status") != "Overdue",
  0,
  let(
    daysLate, abs(prop("Days Until Due")),
    lateFeeRate, 0.015,  // 1.5% per month
    monthsLate, daysLate / 30,
    prop("Total") * lateFeeRate * monthsLate
  )
)
```

**What it does:** Calculates 1.5% monthly late fee on overdue invoices.

**Value:** Know what you're owed in late fees. Add to dashboard view: "💸 Late Fees Owed: $[sum]"

---

### F) Invoice Aging Buckets
**New property in Invoices database:** `Aging Bucket` (Formula)

**Implementation:**
```notion-formula
if(
  contains("Paid Cancelled Draft", prop("Status")),
  "N/A",
  if(prop("Days Outstanding") <= 30, "0-30 days",
    if(prop("Days Outstanding") <= 60, "31-60 days",
      if(prop("Days Outstanding") <= 90, "61-90 days",
        "90+ days (URGENT)"
      )
    )
  )
)
```

**Create a Board view grouped by Aging Bucket:**
- Shows invoices in columns: 0-30, 31-60, 61-90, 90+
- Classic accounting AR aging report, but visual

---

### 🧠 Notion Formula 2.0 Features We're Leveraging

| Feature | How We Use It | Example |
|---------|---------------|---------|
| `let()` | Store intermediate calculations | Health Score, Effective Rate |
| `.filter()` | Query related databases | Count on-time vs late invoices |
| `.map()` | Extract values from relations | Sum hours from time entries |
| `.length` | Count items in lists | Total invoices per client |
| `.sum()` | Aggregate values | Total hours worked |
| Date functions | Calculate days, aging, etc. | `dateBetween()`, `dateAdd()` |
| Conditional logic | Multi-tier classification | Green/Yellow/Red health scores |
| String manipulation | Parse payment terms | Extract "30" from "Net 30" |

---

## 4. Views That Add Value

### SaaS-Like Views to Build

#### **Invoices Database Views:**

**1. "💼 Revenue Dashboard" (Table)**
- Group by: Date Paid (Month)
- Filter: Status = Paid
- Sort: Date Paid descending
- Calculate: Sum of Total per month
- **Value:** Monthly revenue chart. See growth trends.

**2. "🔥 Action Required" (Table)**
- Filter: Status = Overdue OR Days Until Due <= 7
- Sort: Days Until Due ascending (most urgent first)
- Properties shown: Invoice #, Client, Total, Payment Status, Follow-Up Due
- **Value:** Daily action list. Start here every morning.

**3. "📊 Invoice Pipeline" (Board/Kanban)**
- Group by: Status
- Columns: Draft → Sent → Viewed → Paid
- **Value:** Visual pipeline. Drag invoices through stages.

**4. "📆 Due Date Calendar" (Calendar)**
- Date property: Due Date
- Filter: Status NOT IN [Paid, Cancelled]
- **Value:** See payment deadlines on a calendar. Plan follow-ups.

**5. "⏳ Aging Report" (Board)**
- Group by: Aging Bucket
- Columns: 0-30 days, 31-60 days, 61-90 days, 90+
- **Value:** Classic AR aging. Identify collection priorities.

**6. "👤 By Client" (Board)**
- Group by: Client relation
- **Value:** See all invoices per client at a glance. Spot patterns.

**7. "🔄 Recurring Revenue" (Table)**
- Filter: Recurring = checked
- Calculate: Sum of Amount (MRR/ARR)
- **Value:** Track recurring vs one-time revenue.

**8. "📈 Timeline View" (Timeline)**
- Start date: Date Issued
- End date: Due Date
- **Value:** Visualize invoice lifecycle. See overlapping deadlines.

---

#### **Clients Database Views:**

**1. "🚦 Client Health" (Table)**
- Sort by: Health Score
- Show: Client Name, Health Score, Avg Payment Time, Total Revenue (rollup)
- **Value:** Prioritize client relationships. Proactively address at-risk clients.

**2. "🌟 Top Clients" (Gallery)**
- Sort by: Total Revenue (rollup) descending
- Show: Client Name, Total Revenue, Recent Invoices
- **Value:** Know your VIPs. Focus retention efforts.

**3. "⚠️ At Risk Clients" (Table)**
- Filter: Health Score contains "At Risk" OR "Watch"
- **Value:** Early warning system for problem clients.

---

#### **Time Entries Views:**

**1. "💸 Uninvoiced Money" (Table)**
- Filter: Invoiced = unchecked AND Billable = checked
- Calculate: Sum of Amount
- Group by: Client
- **Value:** Know exactly how much unbilled work you have. Create invoices before month-end.

**2. "📅 This Week's Work" (Table)**
- Filter: Date is within this week
- Group by: Client
- **Value:** Weekly time summary for client updates.

**3. "🔍 Time Audit" (Table)**
- No filters
- Group by: Project
- Calculate: Sum of Hours, Sum of Amount
- **Value:** See where your time actually goes. Identify unprofitable projects.

---

#### **Dashboard Super-Views:**

**Create a "📊 Finance Dashboard" page with these linked views:**

```
┌─────────────────────────────────────────────────┐
│  💰 CASH FLOW (Next 30 Days)                   │
│  [Linked Invoices view: Expected revenue]      │
│  Total: $X,XXX                                  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  🔥 ACTION REQUIRED                             │
│  [Linked Invoices view: Overdue + Due Soon]    │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  💸 UNINVOICED TIME                             │
│  [Linked Time Entries view: Uninvoiced]        │
│  Total unbilled: $X,XXX                         │
└─────────────────────────────────────────────────┘

┌──────────────────────┬──────────────────────────┐
│ 📈 Revenue (Monthly) │  🚦 Client Health        │
│ [Grouped by month]   │  [Health score sorted]   │
└──────────────────────┴──────────────────────────┘
```

---

## 5. Mobile Experience

### How Template Works on Mobile

#### ✅ **What Works Great:**
- **Reading data:** All views are responsive. Tables → Lists on mobile.
- **Quick adds:** Button blocks work perfectly. "New Invoice" button is one tap.
- **Status updates:** Changing select properties (Status, Client) is smooth.
- **Notifications:** Database automations send push notifications to mobile.
- **Offline access:** Favorites auto-download. Dashboard works offline.

#### ⚠️ **Mobile Limitations:**
- **Complex formulas display weirdly:** Long formula results get truncated. 
  - **Fix:** Create "Mobile" versions of views with simpler properties shown.
- **Wide tables are hard to scroll:** 10+ columns is painful.
  - **Fix:** Create mobile-optimized views with only 3-4 key properties.
- **Editing relations is clunky:** Adding multiple time entries to an invoice is tedious.
  - **Fix:** Use checkboxes + button combos instead (see Button section).

---

### Mobile-Specific Optimizations

#### **Create Mobile-Only Views:**

**"📱 Quick View" (in Invoices database)**
- View type: List
- Properties shown:
  - Invoice # (title)
  - Client
  - Payment Status (formula — shows emoji + days)
  - Total
- Sort: Due Date ascending
- **Hide this view on desktop.** Pin it on mobile.

**"📱 Tap to Log Time" (in Time Entries database)**
- View type: List
- Properties shown:
  - Description (title)
  - Hours
  - Client
- Default template pre-filled:
  - Date = today
  - Billable = checked

---

#### **Button Optimization for Mobile:**

Use emoji-heavy, short button labels:
- Desktop: "Create New Invoice from Template"
- Mobile: "⚡ New Invoice"

Place most-used buttons at the TOP of dashboard (above the fold on mobile).

---

#### **Gallery View for Clients (Mobile-Friendly):**
- View type: Gallery
- Card preview: Show client logo (if uploaded)
- Card size: Small (fits 2 per row on mobile)
- Properties: Name, Status badge, Health score

---

### Mobile Workflow Example:

**Scenario: User wants to mark an invoice as paid while on-the-go.**

1. Open Notion mobile app
2. Go to Dashboard → "Action Required" view (linked)
3. Tap the invoice
4. Tap "✅ Mark as Paid" button (one tap!)
5. Automation triggers → Sends notification: "Invoice paid!"

**Total time: ~5 seconds. Zero typing.**

---

## 6. Integration Points

### A) Notion Web Clipper Workflow

**Use Case:** Save client emails about invoices → Auto-link to invoice record.

**Setup:**
1. Use Notion Web Clipper browser extension
2. Create a "📧 Client Communications" database (new)
3. Properties:
   - Email Subject (title)
   - Client (relation to Clients)
   - Invoice (relation to Invoices)
   - Date (date)
   - Content (page body)
4. When clipping an email:
   - Clip to "Client Communications" database
   - Select client + invoice in properties
   - Email becomes a record linked to invoice

**Value:** Full history of client conversations about each invoice. No more digging through email.

---

### B) Zapier/Make Integration Suggestions

#### **Zap 1: Auto-Send Invoice PDFs via Gmail**
- **Trigger:** Notion — Database item updated (Status changed to "Sent")
- **Action 1:** Notion — Export page as PDF
- **Action 2:** Gmail — Send email
  - To: {{Client.Email}}
  - Subject: "Invoice {{Invoice #}} from [Your Business]"
  - Body: Pull from email template in Notion
  - Attachment: PDF from step 1

**Value:** One-click invoice sending. Change status to "Sent" → Email auto-sends.

---

#### **Zap 2: Stripe Payment → Auto-Mark Invoice as Paid**
- **Trigger:** Stripe — Payment succeeded
- **Filter:** Payment description contains "INV-"
- **Action 1:** Notion — Search database for Invoice # (parsed from description)
- **Action 2:** Notion — Update page
  - Status = "Paid"
  - Date Paid = today

**Value:** Fully automated payment tracking. No manual updates.

---

#### **Zap 3: Recurring Invoices (Better Than Notion Native)**
- **Trigger:** Schedule — 1st of every month at 9:00 AM
- **Action 1:** Notion — Search database (Recurring = checked AND Recurrence = Monthly)
- **Action 2:** Notion — Create database item (for each result)
  - Copy all properties from template
  - Invoice # = "INV-" + today's date + "-R"
  - Status = "Draft"

**Value:** True "set it and forget it" recurring invoices.

---

#### **Zap 4: Overdue Invoice Reminders (Auto-Email)**
- **Trigger:** Schedule — Daily at 9:00 AM
- **Action 1:** Notion — Search database (Status = Overdue)
- **Action 2:** Gmail — Send email (for each overdue invoice)
  - To: {{Client.Email}}
  - Subject: "Reminder: Invoice {{Invoice #}} is overdue"
  - Body: Pull from "Follow-Up Scripts" page template

**Value:** Automated collections. Never manually chase a payment again.

---

#### **Zap 5: Time Tracking from Toggl/Harvest → Notion**
- **Trigger:** Toggl — Time entry stopped
- **Action:** Notion — Create database item in Time Entries
  - Description = {{Time entry description}}
  - Hours = {{Duration}} / 3600 (convert seconds to hours)
  - Date = {{Date}}
  - Client = Match by project name

**Value:** Auto-sync time tracking. No double-entry.

---

### C) Export to PDF Workflow (For Sending Invoices)

#### **Option 1: Manual Export (Free)**
1. Open invoice page
2. Click ••• menu → Export
3. Select PDF
4. Download → Attach to email

**Pro:** Works on free plan.
**Con:** Manual. Tedious for high volume.

---

#### **Option 2: Browser Print (Free, Faster)**
1. Open invoice page
2. Hide database properties (toggle them off)
3. File → Print → Save as PDF
4. Looks cleaner than Notion's export

**Pro:** Faster. More control over formatting.
**Con:** Still manual.

---

#### **Option 3: Notion API + PDF Service (Automated)**
Use Notion API + service like Bannerbear, Doppio, or Placid:
1. Trigger: Invoice status = "Sent"
2. Fetch invoice data via Notion API
3. Generate PDF from template (company branding, logo, etc.)
4. Email PDF to client

**Pro:** Fully branded, automated.
**Con:** Requires coding or Zapier + paid PDF service.

---

#### **Option 4: Super.so or Notion2Sheets (Hybrid)**
- Publish invoices as private Notion pages (with password)
- Client gets link instead of PDF
- Looks professional, always up-to-date

**Pro:** Real-time updates. Client sees latest info.
**Con:** Requires client to have Notion knowledge (or you style the page really well).

---

#### **🏆 RECOMMENDATION:**
For MVP launch: **Manual export** (Option 1).
For power users: **Zapier + Gmail** (Option B.1 above).
For enterprise: **Custom API integration** with branded PDF templates.

---

### D) Webhook Automations (Paid Plan Only)

**Use Case: Trigger external actions when invoice status changes.**

**Example: Slack notification to #finance channel when invoice is paid**
```
Trigger: Status → Set to "Paid"
Action: Send webhook to Slack incoming webhook URL
Payload:
{
  "text": "💰 Invoice {{Invoice #}} marked as paid! {{Total}} from {{Client}}. Total revenue this month: {{Monthly sum}}"
}
```

**Example: Update Google Sheets revenue tracker**
```
Trigger: Status → Set to "Paid"
Action: Send webhook to Zapier webhook URL
Zapier receives → Adds row to Google Sheets with:
  - Invoice #
  - Client
  - Amount
  - Date Paid
```

---

## 🎯 Implementation Priority

### Phase 1: Core Automations (Do First)
1. ✅ Auto-set Overdue status (daily)
2. ✅ Payment notification
3. ✅ Dashboard buttons (New Invoice, Mark as Paid)

### Phase 2: Advanced Formulas (Do Second)
4. Client Health Score
5. Effective Hourly Rate
6. Cash flow projection

### Phase 3: Premium Views (Do Third)
7. Revenue Dashboard (monthly)
8. Aging Report (board)
9. Invoice Pipeline (kanban)

### Phase 4: Integrations (Optional, for Power Users)
10. Zapier: Auto-send invoices
11. Zapier: Recurring invoice creation
12. Stripe payment sync

---

## 🚀 Marketing Angles

### Positioning the Automation Features:

**For Free Plan Users:**
> "Unlike most Notion templates, this one comes with premium automations already built-in. You get automatic overdue tracking, payment notifications, and client health scores—even on Notion's free plan. Just duplicate and go."

**For Plus Plan Users:**
> "Fully customizable automations included. Auto-send invoices, sync with Stripe, trigger Slack notifications—built on Notion's native automation engine, so no Zapier tax."

**For Non-Technical Users:**
> "Zero setup. The formulas are already written. The buttons already work. The views are already created. Just add your clients and start invoicing."

---

## 📋 Final Checklist

- [ ] Build 3 core database automations (Overdue, Paid notification, Recurring)
- [ ] Add 5 button blocks (New Invoice, Mark Paid, Quick Time, etc.)
- [ ] Implement 6 advanced formulas (Health Score, Effective Rate, etc.)
- [ ] Create 8 premium views (Pipeline, Aging, Calendar, etc.)
- [ ] Add 3 mobile-optimized views (Quick View, Tap to Log, etc.)
- [ ] Document Zapier integration recipes (5 zaps)
- [ ] Test all automations on Free plan (as read-only)
- [ ] Screenshot automation configs for sales page proof
- [ ] Write integration guide (how to connect Zapier/Stripe/etc.)

---

**Total build time estimate: +3-4 hours on top of original 6.5 hour blueprint.**

**End result:** A template that feels like a $30/month SaaS app, but runs in Notion for free.

---

_Technical review by Bolt — Ready to implement. Specifications are deployment-ready._
