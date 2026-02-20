# 🚀 Freelance Invoice Tracker — Complete Build Walkthrough

**Total time:** ~6 hours across 3 days  
**Goal:** Launch Tuesday, first sales by Friday

---

## 📍 WHERE EVERYTHING LIVES

| Resource | Path |
|----------|------|
| **This Walkthrough** | You're reading it |
| **Notion Build Guide** | `~/.openclaw/workspace-dev/NOTION_BUILD_GUIDE.md` |
| **Marketing Copy** | `~/.openclaw/workspace-content/MARKETING_ASSETS.md` |
| **Launch Intelligence** | `~/.openclaw/workspace-researcher/LAUNCH_INTELLIGENCE.md` |

---

# FRIDAY EVENING (1.5 hours)

## Step 1: Set Up Your Sales Platform (15 min)

**Choose one:**
- **Gumroad** — gumroad.com (easiest, 10% fee)
- **Whop** — whop.com (3% fee, more features)
- **Lemon Squeezy** — lemonsqueezy.com (good for digital products)

**Do this:**
1. Create account
2. Connect payment method (Stripe/PayPal)
3. Create product listing (leave empty for now — we'll add copy later)
4. Set price: **$37**
5. Save the product URL

---

## Step 2: Open Notion & Create Workspace (15 min)

1. Log into Notion (or create free account)
2. Create new page called **"Freelance Invoice Tracker"**
3. This will be your template — you'll duplicate it for buyers

---

## Step 3: Build Client Database (30 min)

> 📖 **Reference:** `NOTION_BUILD_GUIDE.md` → "Client Database - Detailed Setup"

**Create table with these columns:**

| Column | Type | Notes |
|--------|------|-------|
| Client Name | Title | Primary field |
| Company | Text | Optional |
| Email | Email | |
| Payment Terms | Select | Net 15, Net 30, Net 45, Net 60, Due on Receipt |
| Status | Select | Active, Inactive, On Hold |
| Notes | Text | |

**Leave these for later (they need Invoice database first):**
- Invoices (Relation)
- Total Invoiced (Rollup)
- Total Paid (Rollup)
- Payment Reliability Score (Formula)

---

## Step 4: Build Invoice Database (30 min)

> 📖 **Reference:** `NOTION_BUILD_GUIDE.md` → "Invoice Database - Detailed Setup"

**Create table with these columns:**

| Column | Type | Notes |
|--------|------|-------|
| Invoice Number | Title | e.g., INV-001 |
| Client | Relation | → Link to Client database |
| Status | Select | Draft, Sent, Paid, Overdue, Disputed |
| Invoice Amount | Number | Currency format |
| Paid Amount | Number | Currency format (for partial payments) |
| Date Sent | Date | |
| Due Date | Date | |
| Date Paid | Date | Leave empty until paid |

---

## ✅ FRIDAY CHECKPOINT

You should have:
- [ ] Sales platform account created
- [ ] Notion page created
- [ ] Client database with basic columns
- [ ] Invoice database with basic columns
- [ ] Databases linked (Client ↔ Invoice relation)

**Time spent:** ~1.5 hours  
**Stop here. Fresh eyes tomorrow.**

---

# SATURDAY (3 hours)

## Step 5: Add Formulas to Invoice Database (45 min)

> 📖 **Reference:** `NOTION_BUILD_GUIDE.md` → "Formula Documentation"

**Add these formula columns:**

### Outstanding Amount
```
prop("Invoice Amount") - prop("Paid Amount")
```

### Days Until Due
```
if(empty(prop("Due Date")), 0, dateBetween(prop("Due Date"), now(), "days"))
```

### Days Overdue
```
if(prop("Days Until Due") < 0, abs(prop("Days Until Due")), 0)
```

### Needs Follow-Up (Checkbox-style)
```
if(and(prop("Status") != "Paid", prop("Days Overdue") >= 5), true, false)
```

### Status Indicator (Visual)
```
if(prop("Status") == "Paid", "✅ Paid",
  if(prop("Days Overdue") > 30, "🔴 30+ Days",
    if(prop("Days Overdue") > 14, "🟠 14+ Days", 
      if(prop("Days Overdue") > 0, "🟡 Overdue",
        if(prop("Status") == "Sent", "🔵 Sent", "⚪ Draft")))))
```

---

## Step 6: Add Rollups to Client Database (30 min)

**Now that Invoice database exists, add:**

| Column | Type | Configuration |
|--------|------|---------------|
| Invoices | Relation | → Invoice database |
| Total Invoiced | Rollup | Sum of Invoice Amount |
| Total Paid | Rollup | Sum of Paid Amount |
| Outstanding | Formula | `prop("Total Invoiced") - prop("Total Paid")` |
| Invoice Count | Rollup | Count all |
| Paid Count | Rollup | Count where Status = Paid |
| Reliability Score | Formula | `round((prop("Paid Count") / prop("Invoice Count")) * 100)` |

---

## Step 7: Create Views (45 min)

**In Invoice database, create these views:**

### View 1: All Invoices (Table)
- Default view, no filters
- Sort by Date Sent (newest first)

### View 2: Unpaid (Table)
- Filter: Status ≠ Paid
- Sort by Due Date (soonest first)

### View 3: Overdue (Table) 🔥
- Filter: Days Overdue > 0
- Sort by Days Overdue (highest first)
- This is the money view

### View 4: By Client (Board)
- Group by: Client
- Useful for seeing all work per client

### View 5: Follow-Up Queue (Table)
- Filter: Needs Follow-Up = true
- This is your action list

### View 6: Income Dashboard (Table)
- Show: Invoice Amount, Paid Amount, Status
- Add a "Sum" at bottom of Invoice Amount column
- Group by month for monthly view

---

## Step 8: Add Sample Data (30 min)

**Create 3-4 fake clients:**
- Acme Corp (good payer)
- Slow Pay LLC (always late)
- Quick Client Inc (pays early)

**Create 5-6 fake invoices:**
- 2 Paid
- 2 Sent (one almost due, one just sent)
- 1 Overdue
- 1 Draft

This makes screenshots look real and helps you test the formulas.

---

## Step 9: Polish & Screenshot (30 min)

1. Add icons to your database names (📋 Invoices, 👥 Clients)
2. Add a cover image to the main page
3. Write a brief "How to Use" section at the top
4. Take 5-6 screenshots:
   - Main dashboard view
   - Overdue invoices view
   - Client reliability scores
   - Income summary
   - Adding a new invoice (action shot)

---

## ✅ SATURDAY CHECKPOINT

You should have:
- [ ] All formulas working
- [ ] All views created
- [ ] Sample data populated
- [ ] Screenshots taken
- [ ] Template looks professional

**Time spent:** ~3 hours

---

# SUNDAY (1.5 hours)

## Step 10: Set Up Product Page (30 min)

> 📖 **Reference:** `MARKETING_ASSETS.md` → "Product Page Copy"

**On Gumroad/Whop:**

1. **Product Name:** "Freelance Invoice & Payment Tracker"
2. **Price:** $37
3. **Description:** Copy from MARKETING_ASSETS.md (it's ready to paste)
4. **Images:** Upload your 5-6 screenshots
5. **File:** Export your Notion template as a link or duplicate link

**How to share Notion template:**
- Click "Share" on your template page
- Enable "Share to web"
- Copy the link
- Buyers duplicate it to their own Notion

---

## Step 11: Prep Reddit Posts (30 min)

> 📖 **Reference:** `MARKETING_ASSETS.md` → "Reddit Posts"  
> 📖 **Reference:** `LAUNCH_INTELLIGENCE.md` → "Reddit Launch Strategy"

**Key insight:** Don't launch Tuesday on r/freelance (they ban self-promo).

**Actual strategy:**
1. **Tuesday:** Post in r/Notion's self-promo thread
2. **Wednesday:** Post value content on r/freelance ("How I track invoices as a freelancer" — helpful, not salesy)
3. **Thursday:** Engage in comments, answer questions
4. **Friday:** Soft mention in relevant threads if natural

**Prep now:**
- Save your r/Notion post (ready to paste)
- Save your "value post" for r/freelance
- Save your Twitter thread

---

## Step 12: Schedule Launch (15 min)

**Create calendar reminders:**

| Day | Time | Action |
|-----|------|--------|
| Tuesday | 9 AM EST | Post to r/Notion self-promo thread |
| Tuesday | 10 AM EST | Post Twitter thread |
| Tuesday | All day | Monitor & respond to comments |
| Wednesday | 9 AM EST | Value post on r/freelance |
| Thursday | Check-in | Respond to DMs, questions |
| Friday | Review | Check sales, gather feedback |

---

## Step 13: Test Purchase Flow (15 min)

1. Open your product page in incognito
2. Make sure screenshots load
3. Make sure description looks good on mobile
4. Do a test purchase if platform allows ($0 test)
5. Verify the Notion link works

---

## ✅ SUNDAY CHECKPOINT

You should have:
- [ ] Product page live (can be unlisted until Tuesday)
- [ ] Reddit posts saved and ready
- [ ] Twitter thread ready
- [ ] Calendar reminders set
- [ ] Purchase flow tested

**Time spent:** ~1.5 hours

---

# TUESDAY — LAUNCH DAY

## Morning Routine

**9:00 AM:**
- Post to r/Notion self-promo thread
- Post Twitter thread
- Make product page public (if it wasn't)

**9:00 AM - 12:00 PM:**
- Stay online
- Respond to EVERY comment within 30 min
- Be helpful, not defensive
- Thank people who share

**Afternoon:**
- Check sales
- Respond to any DMs
- Note any questions for FAQ updates

---

# 📊 SUCCESS METRICS

**Week 1 Goal:** 10-20 sales ($370-$740)  
**Month 1 Goal:** 50-100 sales ($1,850-$3,700)  

**If you hit 20 sales in week 1:**
- You've validated the product
- Start planning v2 features or companion products
- Consider raising price to $47

---

# 🆘 IF THINGS GO WRONG

**No sales by Wednesday?**
- Check if your posts are visible (not removed)
- Ask 2-3 freelancer friends for honest feedback
- Try a different angle/subreddit

**Negative feedback?**
- Don't get defensive
- Thank them for the feedback
- Fix legitimate issues
- Some people just hate everything — ignore them

**Tech issues?**
- Notion link broken? Re-share and update product page
- Payment issues? Contact platform support

---

# 🎯 QUICK REFERENCE COMMANDS

**View your files:**
```bash
# Marketing copy
cat ~/.openclaw/workspace-content/MARKETING_ASSETS.md

# Notion build guide
cat ~/.openclaw/workspace-dev/NOTION_BUILD_GUIDE.md

# Launch intelligence
cat ~/.openclaw/workspace-researcher/LAUNCH_INTELLIGENCE.md
```

**Ask Jeff for help:**
- "Show me the Reddit post copy"
- "What's the formula for days overdue?"
- "Review my product page"

---

**You've got this. Build it Friday-Sunday. Launch Tuesday. First sales by Friday.**

🦞
