---
name: notion-api-builder
description: Build and manage Notion templates via the Notion API
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
