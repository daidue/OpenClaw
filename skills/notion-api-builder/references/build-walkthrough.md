# Template Build Walkthrough

End-to-end process for building a Notion template product.

## Phase 1: Structure (Day 1)

### 1. Create Main Page
- New Notion page with title, icon, cover image
- This becomes the template buyers will duplicate

### 2. Build Databases
Create in order (relations need targets to exist):

1. **Primary database** (e.g., Clients) — title + basic properties
2. **Secondary database** (e.g., Invoices) — title + basic properties
3. **Link them** — add Relation property on both sides

### 3. Add Database Properties

**Property types by use case:**

| Need | Type |
|------|------|
| Categories/tags | Select or Multi-select |
| Money | Number (dollar format) |
| Dates | Date |
| Links between DBs | Relation |
| Aggregated data | Rollup (needs Relation first) |
| Computed values | Formula |
| Contact info | Email, Phone, URL |

### 4. Add Formulas
Build formulas bottom-up — simple ones first, then formulas that reference other formulas:
1. Basic calculations (e.g., `Outstanding = Invoiced - Paid`)
2. Date math (e.g., `Days Overdue = dateBetween(...)`)
3. Status indicators (e.g., emoji-based visual status)
4. Scoring (e.g., `Reliability = round(Paid/Total * 100)`)

## Phase 2: Views & UX (Day 2)

### 5. Create Database Views
Each view = a different lens on the same data:
- **Default table** — all records, sorted by date
- **Filtered tables** — Overdue, Unpaid, Active only
- **Board view** — group by Status or Category
- **Gallery view** — for visual/card-based browsing

### 6. Build Dashboard
- Top section: callouts with key metrics or links to filtered views
- Middle: quick action buttons (linked to "New Invoice" templates, etc.)
- Bottom: linked database views showing live filtered data
- Use column layouts for side-by-side sections

### 7. Add Navigation
- Create a synced block with navigation links
- Deploy to top of every page via API
- Use toggle headings for collapsible sections (CORE / WORKFLOW / RESOURCES)

### 8. Populate Sample Data
- 3-4 sample entries per database
- Mix of statuses (paid, overdue, draft, active, inactive)
- Realistic names and amounts
- This makes screenshots compelling and tests formulas

## Phase 3: Polish & Launch (Day 3)

### 9. Polish
- Icons on all databases and pages
- Cover images
- "How to Use" section at top
- Consistent color scheme in selects
- Mobile-friendly layout check

### 10. Screenshots
Capture 5-6 images:
- Main dashboard
- Key filtered view (e.g., overdue items)
- Scoring/metrics view
- Adding new record (action shot)
- Mobile view

### 11. Product Listing
- Create Gumroad/Whop listing
- Upload screenshots
- Add marketing copy (see gumroad-integration.md for editor automation)
- Set pricing
- Enable "Share to web" on Notion template + "Allow duplicate"
- Add the Notion duplicate link to the product

### 12. Test
- Open product page in incognito
- Test purchase flow
- Verify Notion duplicate link works
- Check on mobile

## Pricing Guidelines

| Complexity | Price | Examples |
|-----------|-------|---------|
| Single database + views | $9-17 | Simple tracker |
| Multi-DB with relations | $17-37 | Invoice tracker, CRM |
| Full system with dashboard | $37-67 | Business toolkit |
| Lite/free version | $0 (PWYW) | Lead magnet, upsell funnel |

## File Organization

```
projects/<template-name>/
├── build-notes.md       # Decisions, IDs, API keys
├── screenshots/          # Product images
├── marketing/            # Copy, Reddit posts, tweets
└── lite-launch/          # Free version assets (if applicable)
```
