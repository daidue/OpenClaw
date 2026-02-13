---
name: notion-api-builder
description: Build and manage Notion templates programmatically via the Notion API. Use when you hear "build Notion template", "create Notion page via API", "add blocks to Notion", "deploy sidebar navigation", "set up Notion database", or "automate Notion template". Do NOT use for manual Notion editing (use UI), reading pages without modification (use web_fetch), or creating linked database views (API limitation — must be done manually). Requires Notion API integration token with page access. Key capabilities: create pages/databases, set up properties (formulas, relations, rollups), build filtered views, deploy synced blocks, automate Gumroad product pages.
compatibility: Requires Notion API integration token with page access
metadata:
  author: Jeff Daniels
  version: 1.0.0
  category: development
  last_verified: 2026-02-13
---

# Notion API Builder

Build and manage Notion templates programmatically via the Notion API.

## When to Use

- Creating or editing Notion pages/databases via API
- Building template products (e.g., for Gumroad/Whop)
- Dashboard construction with linked databases, formulas, views
- Deploying synced blocks or navigation across multiple pages

## Key Capabilities

- Create pages, databases, and blocks programmatically
- Set up properties: formulas, relations, rollups, selects
- Build filtered/sorted views
- Deploy synced block navigation across pages
- Automate Gumroad product page updates

## When NOT to Use
- Manual Notion editing (just use the Notion UI)
- Reading/viewing Notion pages without modification — use `web_fetch` on the notion.site URL
- When you need to create linked database views — **Notion API cannot create these**, must be done manually in UI
- Deleting blocks on production pages — **NEVER** (cascading deletion incident 2/9). Only ADD or UPDATE.
- Building non-Notion templates (Google Sheets, Airtable, etc.)

## References

| File | Contents |
|------|----------|
| `references/api-patterns.md` | API patterns — pages, blocks, databases, formulas |
| `references/safety-rules.md` | **READ FIRST** — critical safety rules from production incidents |
| `references/gumroad-integration.md` | Gumroad ProseMirror editor automation |
| `references/build-walkthrough.md` | End-to-end template build process |

## Quick Start

1. **Read `references/safety-rules.md`** before touching any production page
2. Get a Notion integration token with access to target pages
3. Use `references/api-patterns.md` for API call patterns
4. Follow `references/build-walkthrough.md` for full template builds

## API Basics

```bash
# Base URL
https://api.notion.com/v1

# Headers (all requests)
Authorization: Bearer <integration_token>
Notion-Version: 2022-06-28
Content-Type: application/json
```

## ⚠️ Critical Rule

**NEVER delete blocks on production Notion pages.** Only ADD or UPDATE.
See `references/safety-rules.md` for the full incident report.

## Trigger Phrases

✅ Should trigger:
- "build Notion template"
- "create Notion page via API"
- "add blocks to Notion"
- "deploy sidebar navigation"
- "set up Notion database"
- "automate Gumroad Notion product"
- "Notion API call for..."

❌ Should NOT trigger:
- "edit this Notion page" (use UI)
- "read this Notion page" (use web_fetch)
- "create linked database view" (API can't do this)
- "manually update Notion"
- "delete Notion blocks" (NEVER on production)
